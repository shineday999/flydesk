import { env as workersEnv } from 'cloudflare:workers';
import { first, nowIso, run } from './db';
import { SCHEMA_STATEMENTS } from './schema';

/**
 * 後台驗證。
 *
 * 密碼以 HMAC-SHA256（以 SESSION_SECRET 為金鑰）比對，避免明文與可逆編碼；
 * 會話 token 為 HMAC 簽章的隨機 id，存在 admin_sessions 表並設定到期時間。
 *
 * 使用 Web Crypto（globalThis.crypto）而非 node:crypto，
 * 以免依賴 Workers 的 nodejs_compat 相容層。
 */

const SESSION_COOKIE = 'flydesk_admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function secret(): string {
  const s = envValue('SESSION_SECRET');
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET must be set (at least 16 chars)');
  }
  return s;
}

/** 同時支援 Workers 綁定與本機環境變數。 */
function envValue(key: string): string | undefined {
  // 與 db.ts 的 assertRequiredSecrets 讀同一個來源（cloudflare:workers 的 env）。
  // 舊寫法讀 globalThis.env，Workers 上並不存在，會讓啟動檢查通過、登入卻讀不到密碼。
  const fromWorkers = (workersEnv as unknown as Record<string, unknown> | undefined)?.[key];
  if (typeof fromWorkers === 'string') return fromWorkers;
  const fromProcess =
    typeof process !== 'undefined' ? process.env?.[key] : undefined;
  return typeof fromProcess === 'string' ? fromProcess : undefined;
}

/**
 * 後台密碼。
 *
 * 一律要求由環境提供，不保留任何預設值（CWE-798 / OWASP A05）；
 * 本機開發的值放在 .dev.vars（不進版控）。
 */
export function adminPassword(): string {
  const configured = envValue('ADMIN_PASSWORD');
  if (!configured || configured.length < 8) {
    throw new Error('ADMIN_PASSWORD must be set (at least 8 chars)');
  }
  return configured;
}

async function hmacHex(secretValue: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretValue),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 長度固定時的定長比較，避免逐字元短路洩漏。 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  return hmacHex(secret(), `pw:${password}`);
}

function randomHex(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createAdminSession(user: string, ip: string | null): Promise<string> {
  const id = randomHex(24);
  const now = Date.now();
  await run(
    'INSERT INTO admin_sessions (id, user, ip, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
    [id, user, ip, new Date(now).toISOString(), new Date(now + SESSION_TTL_MS).toISOString()],
  );
  // 順手清掉已過期的後台 session（登入很少發生，成本可忽略）。
  await run('DELETE FROM admin_sessions WHERE expires_at < ?', [new Date(now).toISOString()]);
  return `${id}.${await hmacHex(secret(), id)}`;
}

export async function verifyAdminSession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const [id, mac] = token.split('.');
  if (!id || !mac) return null;
  if (!safeEqual(await hmacHex(secret(), id), mac)) return null;
  const row = await first<{ user: string; expires_at: string }>(
    'SELECT user, expires_at FROM admin_sessions WHERE id = ?',
    [id],
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await run('DELETE FROM admin_sessions WHERE id = ?', [id]);
    return null;
  }
  return row.user;
}

export async function destroyAdminSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  const id = token.split('.')[0];
  if (id) await run('DELETE FROM admin_sessions WHERE id = ?', [id]);
}

export function adminCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: true,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export { SESSION_COOKIE, nowIso };


/* ------------------------------------------------------------------ *
 * 登入失敗限流（存在 D1，跨 isolate 共用）
 *
 * 記憶體計數在 Workers 上每個 isolate 各算各的，擋不住暴力破解。這裡把「失敗」
 * 寫進 D1：每個 IP 10 分鐘內最多 5 次失敗，全站 10 分鐘內最多 40 次失敗
 * （分散式猜密碼的總量上限）。被擋住時只讀不寫，攻擊者無法藉此灌爆 D1 寫入額度。
 * ------------------------------------------------------------------ */

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_PER_IP = 5;
const LOGIN_MAX_GLOBAL = 40;

let loginTablePromise: Promise<void> | null = null;

/** 既有資料庫可能是在這張表加入之前建立的，所以這裡獨立確保它存在。 */
function ensureLoginTable(): Promise<void> {
  if (!loginTablePromise) {
    const stmts = SCHEMA_STATEMENTS.filter((q) => q.includes('login_failures'));
    loginTablePromise = (async () => {
      for (const q of stmts) await run(q);
    })().catch((err) => {
      loginTablePromise = null;
      throw err;
    });
  }
  return loginTablePromise;
}

export async function isLoginBlocked(ip: string): Promise<boolean> {
  await ensureLoginTable();
  const since = Date.now() - LOGIN_WINDOW_MS;
  const perIp = await first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM login_failures WHERE ip = ? AND at > ?',
    [ip, since],
  );
  if ((perIp?.n ?? 0) >= LOGIN_MAX_PER_IP) return true;
  const total = await first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM login_failures WHERE at > ?',
    [since],
  );
  return (total?.n ?? 0) >= LOGIN_MAX_GLOBAL;
}

export async function recordLoginFailure(ip: string): Promise<void> {
  await ensureLoginTable();
  const now = Date.now();
  await run('INSERT INTO login_failures (ip, at) VALUES (?, ?)', [ip, now]);
  await run('DELETE FROM login_failures WHERE at < ?', [now - LOGIN_WINDOW_MS]);
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await ensureLoginTable();
  await run('DELETE FROM login_failures WHERE ip = ?', [ip]);
}
