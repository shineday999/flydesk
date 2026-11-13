import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyAdminSession } from '@/lib/auth';
import { fail, isSameOrigin, json } from '@/lib/http';
import { createTenant, ensureSeeded, listTenants, writeAudit } from '@/lib/tenants';
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

  const tenant = await createTenant({
    slug,
    name,
    domain: clampText(body.domain, 120, '') || null,
    plan: clampText(body.plan, 20, 'demo'),
    config: normalizeConfig(body.config),
  });

  await writeAudit(tenant.id, user, 'tenant.create', `slug=${tenant.slug}`);
  return json({ tenant }, { status: 201 });
}
