import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyAdminSession } from '@/lib/auth';
import { fail, isSameOrigin, json } from '@/lib/http';
import { createTenant, ensureSeeded, getTenantByDomain, listTenants, writeAudit } from '@/lib/tenants';
import { clampText, normalizeConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<string | null> {
  const store = await cookies();
  return await verifyAdminSession(store.get(SESSION_COOKIE)?.value);
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return fail('UNAUTHORIZED', 401);
  await ensureSeeded();
  return json({ tenants: await listTenants() });
}

/** 新增租戶。 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail('ORIGIN_MISMATCH', 403);
  const user = await requireAdmin();
  if (!user) return fail('UNAUTHORIZED', 401);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail('INVALID_JSON', 400);
  }

  const slug = clampText(body.slug, 40, '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const name = clampText(body.name, 60, '');
  if (!slug) return fail('INVALID_SLUG', 400, 'Slug must be a-z 0-9 and dash');
  if (!name) return fail('INVALID_NAME', 400);

  const existing = (await listTenants()).find((t) => t.slug === slug);
  if (existing) return fail('SLUG_TAKEN', 409);

  // 網域：只接受小寫主機名稱（不含協定、路徑、連接埠），且不得與其他租戶重複。
  const domain = clampText(body.domain, 120, '').toLowerCase();
  if (domain) {
    if (!/^(?=.{1,120}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) {
      return fail('INVALID_DOMAIN', 400, 'Domain must be a bare hostname like shop.example.com');
    }
    if (await getTenantByDomain(domain)) return fail('DOMAIN_TAKEN', 409);
  }

  let tenant;
  try {
    tenant = await createTenant({
      slug,
      name,
      domain: domain || null,
      plan: clampText(body.plan, 20, 'demo'),
      config: normalizeConfig(body.config),
    });
  } catch (err) {
    // 檢查與寫入之間若有並行請求搶先建立，資料庫的 UNIQUE 會擋下，這裡回 409 而非 500。
    if (err instanceof Error && /UNIQUE|constraint/i.test(err.message)) {
      return fail('SLUG_TAKEN', 409);
    }
    throw err;
  }

  await writeAudit(tenant.id, user, 'tenant.create', `slug=${tenant.slug}`);
  return json({ tenant }, { status: 201 });
}
