import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ensureSeeded, getTenantBySlug } from '@/lib/tenants';
import { resolveCopy, themeCssVariables } from '@/lib/config';
import { resolveLocale } from '@/lib/locale';
import { TenantShell } from '@/components/tenant-shell';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  ensureSeeded();
  const tenant = getTenantBySlug(slug);
  if (!tenant) return { title: 'Not found' };
  const { brand } = tenant.config;
  return {
    title: `${brand.name}${brand.nameAccent} · ${brand.tagline || '訂票示範'}`,
    description: tenant.config.demo.enabled
      ? '流程示範版本，不會實際收款或出票。'
      : '線上訂票與訂單查詢。',
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  ensureSeeded();
  const tenant = getTenantBySlug(slug);
  if (!tenant || tenant.status !== 'active') notFound();

  const config = tenant.config;
  const locale = await resolveLocale(config.locales, config.defaultLocale);
  const copy = resolveCopy(config);

  return (
    <>
      <style
        id="tenant-theme"
        dangerouslySetInnerHTML={{ __html: `:root{${themeCssVariables(config)}}` }}
      />
      <TenantShell slug={slug} config={config} locale={locale} copy={copy}>
        {children}
      </TenantShell>
    </>
  );
}
