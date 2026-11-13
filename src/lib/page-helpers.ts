import { notFound } from 'next/navigation';
import { ensureSeeded, getTenantBySlug } from './tenants';
import { resolveCopy } from './config';
import { resolveLocale } from './locale';

/** 頁面共用的載入流程：取租戶 → 決定語系 → 解析文案。 */
export async function loadTenantPage(slug: string) {
  await ensureSeeded();
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status !== 'active') notFound();
  const config = tenant.config;
  const locale = await resolveLocale(config.locales, config.defaultLocale);
  const copy = resolveCopy(config);
  return { slug, tenant, config, locale, copy };
}
