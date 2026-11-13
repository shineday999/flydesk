import { createOrder, findOrderByReference, listOrdersBySession, toPublicOrder } from '@/lib/orders';
import { getTenantBySlug } from '@/lib/tenants';
import { createDemoSession, demoCookieOptions, getDemoSession, DEMO_COOKIE } from '@/lib/demo-session';
import { clientIp, fail, isSameOrigin, json, rateLimit } from '@/lib/http';
import { clampText } from '@/lib/config';

export const dynamic = 'force-dynamic';

async function tenantFrom(req: Request) {
  const slug = req.headers.get('x-tenant-slug') ?? '';
  const tenant = await getTenantBySlug(slug);
  return tenant && tenant.status === 'active' ? tenant : null;
}

/** 建立訂單（示範流程，不會實際收款）。 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail('ORIGIN_MISMATCH', 403);

  const ip = clientIp(req);
  if (!rateLimit(`order:${ip}`, 20, 60_000)) return fail('RATE_LIMITED', 429);

  const tenant = await tenantFrom(req);
  if (!tenant) return fail('TENANT_NOT_FOUND', 404);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail('INVALID_JSON', 400);
  }

  const offerId = clampText(body.offerId, 60, '');
  const offer = tenant.config.flights.find((f) => f.id === offerId && f.active);
  if (!offer) return fail('OFFER_NOT_FOUND', 404);

  const search = (body.search ?? {}) as Record<string, unknown>;
  const passenger = (body.passenger ?? {}) as Record<string, unknown>;
  const adults = Number(search.adults);
  const count = Number.isInteger(adults) && adults >= 1 && adults <= tenant.config.booking.maxAdults ? adults : 1;

  const total = offer.price * count + tenant.config.booking.serviceFee;

  let sessionId = await getDemoSession(req, tenant.id);
  let issueCookie = false;
  if (!sessionId) {
    sessionId = await createDemoSession(tenant.id, ip, req.headers.get('user-agent'));
    issueCookie = true;
  }

  const order = await createOrder({
    tenantId: tenant.id,
    sessionId,
    currency: offer.currency,
    total,
    status: tenant.config.demo.enabled ? 'demo_booked' : 'booked',
    payload: {
      search: {
        origin: offer.origin,
        destination: offer.destination,
        tripType: search.tripType === 'roundtrip' ? 'roundtrip' : 'one-way',
        departureDate: clampText(search.departureDate, 20, ''),
        returnDate: clampText(search.returnDate, 20, ''),
        adults: count,
      },
      offer,
      passenger: {
        name: clampText(passenger.name, 80, ''),
        passport: clampText(passenger.passport, 32, ''),
        phone: clampText(passenger.phone, 32, ''),
        email: clampText(passenger.email, 120, ''),
        luggage: clampText(passenger.luggage, 60, ''),
        notes: clampText(passenger.notes, 200, ''),
      },
    },
  });

  const res = json({ order: toPublicOrder(order, { includePassenger: true }) });
  if (issueCookie) {
    res.cookies.set(DEMO_COOKIE, sessionId, demoCookieOptions());
  }
  return res;
}

/** 列出目前示範工作階段的訂單；也支援以訂單編號查詢（接送頁使用）。 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`orders:${ip}`, 120, 60_000)) return fail('RATE_LIMITED', 429);

  const tenant = await tenantFrom(req);
  if (!tenant) return fail('TENANT_NOT_FOUND', 404);

  const url = new URL(req.url);
  const reference = clampText(url.searchParams.get('reference') ?? '', 20, '').toUpperCase();

  const sessionId = await getDemoSession(req, tenant.id);

  if (reference) {
    const order = await findOrderByReference(reference, tenant.id);
    if (!order) return fail('ORDER_NOT_FOUND', 404);
    // 編號查詢不需登入，因此只有訂單所屬的工作階段才看得到旅客個資。
    const owned = sessionId !== null && order.sessionId === sessionId;
    return json({ order: toPublicOrder(order, { includePassenger: owned }) });
  }

  if (!sessionId) return json({ orders: [] });
  const orders = await listOrdersBySession(sessionId, tenant.id);
  return json({ orders: orders.map((o) => toPublicOrder(o, { includePassenger: true })) });
}
