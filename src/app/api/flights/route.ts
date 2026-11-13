import { findOffers, normalizeSearch, validateSearch } from '@/lib/config';
import { getTenantBySlug } from '@/lib/tenants';
import { clientIp, fail, isSameOrigin, json, rateLimit } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * 航班搜尋。租戶由 x-tenant-slug 標頭指定（前端一律帶自己的 slug）。
 * 驗證規則完全由租戶設定決定：機場清單、單程/來回、成人上限、日期。
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail('ORIGIN_MISMATCH', 403);

  const ip = clientIp(req);
  if (!rateLimit(`flights:${ip}`, 90, 60_000)) {
    return fail('RATE_LIMITED', 429);
  }

  const slug = req.headers.get('x-tenant-slug') ?? '';
  const tenant = getTenantBySlug(slug);
  if (!tenant || tenant.status !== 'active') return fail('TENANT_NOT_FOUND', 404);

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_JSON', 400);
  }

  const errors = validateSearch(tenant.config, body);
  if (errors.length) return fail('INVALID_SEARCH', 400, errors.join(' '));

  const search = normalizeSearch(body);
  const offers = findOffers(tenant.config, search);
  return json({ offers, currency: tenant.config.booking.currency });
}
