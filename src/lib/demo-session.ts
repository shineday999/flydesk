import { randomBytes } from 'node:crypto';
import { getDb, nowIso } from './db';
import { readCookie } from './http';

/**
 * 終端使用者的「免登入示範工作階段」。
 *
 * 示範 session 以 cookie 承載，並把 tenant_id 綁在 session 上，
 * 避免同一瀏覽器在不同租戶之間共用訂單。
 */

export const DEMO_COOKIE = 'flydesk_demo';
const TTL_MS = 12 * 60 * 60 * 1000;

export function createDemoSession(
  tenantId: string,
  ip: string | null,
  userAgent: string | null,
): string {
  const id = randomBytes(18).toString('hex');
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO demo_sessions (id, tenant_id, ip, user_agent, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      tenantId,
      ip,
      userAgent,
      new Date(now).toISOString(),
      new Date(now + TTL_MS).toISOString(),
    );
  return id;
}

export function getDemoSession(req: Request, tenantId: string): string | null {
  const id = readCookie(req, DEMO_COOKIE);
  if (!id) return null;
  const row = getDb()
    .prepare('SELECT id, tenant_id, expires_at FROM demo_sessions WHERE id = ?')
    .get(id) as unknown as { id: string; tenant_id: string; expires_at: string } | undefined;
  if (!row) return null;
  if (row.tenant_id !== tenantId) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    getDb().prepare('DELETE FROM demo_sessions WHERE id = ?').run(row.id);
    return null;
  }
  return row.id;
}

export function demoCookieOptions() {
  return {
    name: DEMO_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(TTL_MS / 1000),
  };
}

export { nowIso };
