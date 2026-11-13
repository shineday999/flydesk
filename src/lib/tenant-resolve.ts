import { getTenantByDomain, getTenantBySlug, listTenants } from './tenants';
import type { Tenant } from './tenants';

/**
 * 租戶解析順序：
 *  1. 自訂網域（domains 表 / tenants.domain）
 *  2. 主機 subdomain（acme.example.com → slug acme）
 *  3. 路徑 /t/{slug}
 *  4. 預設租戶
 */
export async function resolveTenantFromHost(hostHeader: string | null): Promise<Tenant | null> {
  if (!hostHeader) return null;
  const host = hostHeader.split(':')[0].toLowerCase();
  if (!host) return null;

  const byDomain = await getTenantByDomain(host);
  if (byDomain) return byDomain;

  const labels = host.split('.');
  if (labels.length >= 3) {
    const subdomain = labels[0];
    const bySlug = await getTenantBySlug(subdomain);
    if (bySlug) return bySlug;
  }
  return null;
}

export async function defaultTenant(): Promise<Tenant | null> {
  const preferred = process.env.DEFAULT_TENANT_SLUG;
  if (preferred) {
    const tenant = await getTenantBySlug(preferred);
    if (tenant) return tenant;
  }
  const all = await listTenants();
  return all.length ? await getTenantBySlug(all[0].slug) : null;
}
