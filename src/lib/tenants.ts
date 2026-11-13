import { all, first, nowIso, run } from './db';
import { normalizeConfig, type TenantConfig } from './config';
import { auroraConfig, meridianConfig } from './seed-config';

/** 對外可用的租戶檢視欄位（不含 config JSON）。 */
export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant extends TenantSummary {
  config: TenantConfig;
}

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
  config: string;
  created_at: string;
  updated_at: string;
}

function toTenant(row: TenantRow): Tenant {
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(row.config);
  } catch {
    parsed = {};
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    domain: row.domain,
    status: row.status,
    plan: row.plan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    config: normalizeConfig(parsed),
  };
}

export async function listTenants(): Promise<TenantSummary[]> {
  const rows = await all<TenantRow>('SELECT * FROM tenants ORDER BY created_at ASC');
  return rows.map((r) => toTenant(r));
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const row = await first<TenantRow>('SELECT * FROM tenants WHERE id = ?', [id]);
  return row ? toTenant(row) : null;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const row = await first<TenantRow>('SELECT * FROM tenants WHERE slug = ?', [slug]);
  return row ? toTenant(row) : null;
}

export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const row = await first<TenantRow>('SELECT * FROM tenants WHERE domain = ?', [domain]);
  return row ? toTenant(row) : null;
}

export async function createTenant(input: {
  slug: string;
  name: string;
  domain?: string | null;
  plan?: string;
  config: unknown;
}): Promise<Tenant> {
  const id = crypto.randomUUID();
  const now = nowIso();
  const config = normalizeConfig(input.config);
  await run(
    `INSERT INTO tenants (id, slug, name, domain, status, plan, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    [
      id,
      input.slug,
      input.name,
      input.domain ?? null,
      input.plan ?? 'demo',
      JSON.stringify(config),
      now,
      now,
    ],
  );
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error('Tenant creation failed');
  return tenant;
}

export async function updateTenantConfig(
  id: string,
  rawConfig: unknown,
): Promise<Tenant | null> {
  const existing = await getTenantById(id);
  if (!existing) return null;
  const config = normalizeConfig(rawConfig);
  await run('UPDATE tenants SET config = ?, updated_at = ?, name = ? WHERE id = ?', [
    JSON.stringify(config),
    nowIso(),
    existing.config.brand.name || existing.name,
    id,
  ]);
  return getTenantById(id);
}

export async function setTenantStatus(
  id: string,
  status: 'active' | 'suspended',
): Promise<void> {
  await run('UPDATE tenants SET status = ?, updated_at = ? WHERE id = ?', [
    status,
    nowIso(),
    id,
  ]);
}

export async function writeAudit(
  tenantId: string | null,
  actor: string,
  action: string,
  detail?: string,
): Promise<void> {
  await run(
    'INSERT INTO audit_log (tenant_id, actor, action, detail, created_at) VALUES (?, ?, ?, ?, ?)',
    [tenantId, actor, action, detail ?? null, nowIso()],
  );
}

export async function listAudit(
  limit = 100,
): Promise<
  Array<{
    id: number;
    tenantId: string | null;
    actor: string;
    action: string;
    detail: string | null;
    createdAt: string;
  }>
> {
  const rows = await all<{
    id: number;
    tenant_id: string | null;
    actor: string;
    action: string;
    detail: string | null;
    created_at: string;
  }>('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?', [limit]);
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    actor: r.actor,
    action: r.action,
    detail: r.detail,
    createdAt: r.created_at,
  }));
}

/* ------------------------------------------------------------------ *
 * 種子資料
 * ------------------------------------------------------------------ */


/** 若資料庫尚未有租戶，寫入兩個示範租戶：品牌色與功能皆不同。 */
export async function ensureSeeded(): Promise<void> {
  const row = await first<{ n: number }>('SELECT COUNT(*) AS n FROM tenants');
  if ((row?.n ?? 0) > 0) return;
  await createTenant({
    slug: 'meridian',
    name: 'Meridian Way',
    plan: 'demo',
    config: meridianConfig(),
  });
  await createTenant({
    slug: 'aurora',
    name: 'Aurora Air',
    plan: 'demo',
    config: auroraConfig(),
  });
}

