import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDb, nowIso } from './db';

/**
 * 後台驗證。
 *
 * 密碼以 HMAC-SHA256（以 SESSION_SECRET 為金鑰）比對，避免明文與可逆編碼；
 * 會話 token 為 HMAC 簽章的隨機 id，存在 admin_sessions 表並設定到期時間。
 */

const SESSION_COOKIE = 'flydesk_admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // 開發模式 fallback：正式環境應設定 SESSION_SECRET。
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return 'flydesk-dev-secret-do-not-use-in-production';
}

export function adminPassword(): string {
  const configured = process.env.ADMIN_PASSWORD;
  if (configured && configured.length >= 8) return configured;
  // 正式環境不得使用預設值啟動（CWE-798 / OWASP A05）。
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD must be set (at least 8 chars) in production');
  }
  return 'flydesk-admin';
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

export function hashPassword(password: string): string {
  return sign(`pw:${password}`);
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createAdminSession(user: string, ip: string | null): string {
  const id = randomBytes(24).toString('hex');
  const now = Date.now();
  getDb()
    .prepare(
      'INSERT INTO admin_sessions (id, user, ip, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(id, user, ip, new Date(now).toISOString(), new Date(now + SESSION_TTL_MS).toISOString());
  return `${id}.${sign(id)}`;
}

export function verifyAdminSession(token: string | undefined | null): string | null {
  if (!token) return null;
  const [id, mac] = token.split('.');
  if (!id || !mac) return null;
  if (!safeEqual(sign(id), mac)) return null;
  const row = getDb()
    .prepare('SELECT user, expires_at FROM admin_sessions WHERE id = ?')
    .get(id) as unknown as { user: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    getDb().prepare('DELETE FROM admin_sessions WHERE id = ?').run(id);
    return null;
  }
  return row.user;
}

export function destroyAdminSession(token: string | undefined | null): void {
  if (!token) return;
  const id = token.split('.')[0];
  if (id) getDb().prepare('DELETE FROM admin_sessions WHERE id = ?').run(id);
}

export function adminCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export { SESSION_COOKIE };
export { nowIso };
