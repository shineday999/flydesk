import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyAdminSession } from '@/lib/auth';
import { fail, isSameOrigin, json } from '@/lib/http';
import { getTenantById, setTenantStatus, updateTenantConfig, writeAudit } from '@/lib/tenants';
import { mergeConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<string | null> {
  const store = await cookies();
  return await verifyAdminSession(store.get(SESSION_COOKIE)?.value);
}

/** 更新租戶設定（整份 config 覆寫，寫入前一律重新消毒）。 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return fail('ORIGIN_MISMATCH', 403);
  const user = await requireAdmin();
  if (!user) return fail('UNAUTHORIZED', 401);

  const { id } = await ctx.params;
  const tenant = await getTenantById(id);
  if (!tenant) return fail('TENANT_NOT_FOUND', 404);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail('INVALID_JSON', 400);
  }

  if (body.status === 'suspended' || body.status === 'active') {
    await setTenantStatus(tenant.id, body.status);
    await writeAudit(tenant.id, user, 'tenant.status', body.status);
  }

  if (body.config === undefined) {
    return json({ tenant: await getTenantById(tenant.id) });
  }

  // 合併語意：只更新後台實際送出的欄位，機場/航班等未送出的資料保留。
  const config = mergeConfig(tenant.config, body.config);
  const updated = await updateTenantConfig(tenant.id, config);
  await writeAudit(tenant.id, user, 'tenant.update', `brand=${config.brand.name}`);
  return json({ tenant: updated });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return fail('UNAUTHORIZED', 401);
  const { id } = await ctx.params;
  const tenant = await getTenantById(id);
  if (!tenant) return fail('TENANT_NOT_FOUND', 404);
  return json({ tenant });
}
