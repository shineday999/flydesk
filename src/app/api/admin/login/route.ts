import { adminCookieOptions, adminPassword, createAdminSession, destroyAdminSession, hashPassword, safeEqual, verifyAdminSession, SESSION_COOKIE } from '@/lib/auth';
import { clientIp, fail, isSameOrigin, json, rateLimit } from '@/lib/http';
import { readCookie } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** 後台登入：以 HMAC 比對密碼，成功後簽發 httpOnly session cookie。 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail('ORIGIN_MISMATCH', 403);

  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 5, 10 * 60_000)) {
    return fail('RATE_LIMITED', 429, 'Too many attempts');
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail('INVALID_JSON', 400);
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !safeEqual(hashPassword(password), hashPassword(adminPassword()))) {
    return fail('INVALID_CREDENTIALS', 401);
  }

  const token = createAdminSession('admin', ip);
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, adminCookieOptions());
  return res;
}

export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return fail('ORIGIN_MISMATCH', 403);
  destroyAdminSession(readCookie(req, SESSION_COOKIE));
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...adminCookieOptions(), maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  const user = verifyAdminSession(readCookie(req, SESSION_COOKIE));
  return json({ authenticated: Boolean(user), user });
}
