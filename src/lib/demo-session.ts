import { first, nowIso, run } from './db';
import { readCookie } from './http';

/**
 * 終端使用者的「免登入示範工作階段」。
 *
 * 示範 session 以 cookie 承載，並把 tenant_id 綁在 session 上，
 * 避免同一瀏覽器在不同租戶之間共用訂單。
 */

export const DEMO_COOKIE = 'flydesk_demo';
const TTL_MS = 12 * 60 * 60 * 1000;

export async function createDemoSession(
  tenantId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<string> {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const id = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  const now = Date.now();
  await run(
    `INSERT INTO demo_sessions (id, tenant_id, ip, user_agent, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      ip,
      userAgent,
      new Date(now).toISOString(),
      new Date(now + TTL_MS).toISOString(),
    ],
  );
  // 約每 20 次建立一次，順手清掉已過期的示範 session，避免資料表無限成長。
  if (bytes[0] % 20 === 0) {
    await run('DELETE FROM demo_sessions WHERE expires_at < ?', [new Date(now).toISOString()]);
  }
  return id;
}

export async function getDemoSession(
  req: Request,
  tenantId: string,
): Promise<string | null> {
  const id = readCookie(req, DEMO_COOKIE);
  if (!id) return null;
  const row = await first<{ id: string; tenant_id: string; expires_at: string }>(
    'SELECT id, tenant_id, expires_at FROM demo_sessions WHERE id = ?',
    [id],
  );
  if (!row) return null;
  if (row.tenant_id !== tenantId) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await run('DELETE FROM demo_sessions WHERE id = ?', [row.id]);
    return null;
  }
  return row.id;
}

export function demoCookieOptions() {
  return {
    name: DEMO_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: true,
    path: '/',
    maxAge: Math.floor(TTL_MS / 1000),
  };
}

export { nowIso };
