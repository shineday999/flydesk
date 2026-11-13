import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from './auth';

/**
 * HTTP 層共用工具：同源檢查（CSRF 緩解）、JSON 回應、簡易速率限制。
 */

export function json(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  });
}

export function fail(code: string, status = 400, message?: string): NextResponse {
  return json({ code, message: message ?? code }, { status });
}

/**
 * 同源檢查：變更性請求必須來自同源，避免 CSRF。
 * 瀏覽器 fetch 一定會帶 Origin；缺少 Origin 時以 Sec-Fetch-Site 判斷。
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host) return false;

  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const site = req.headers.get('sec-fetch-site');
  if (site === 'same-origin' || site === 'none') return true;
  return false;
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/* ------------------------------------------------------------------ *
 * 記憶體速率限制（單實例適用；多實例部署請改用 KV / Durable Object）
 * ------------------------------------------------------------------ */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}

export { SESSION_COOKIE };
