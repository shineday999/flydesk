import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ensureSeeded } from '@/lib/tenants';
import { defaultTenant, resolveTenantFromHost } from '@/lib/tenant-resolve';

export const dynamic = 'force-dynamic';

/**
 * 根路徑：依主機名稱解析租戶後轉址到 /t/{slug}。
 * 這樣部署在 Cloudflare Pages / Workers 時，可用自訂網域或 subdomain
 * 直接對應到不同租戶，不必修改任何程式碼。
 */
export default async function RootPage() {
  await ensureSeeded();
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const tenant = (await resolveTenantFromHost(host)) ?? (await defaultTenant());

  if (!tenant) {
    return (
      <main style={{ padding: 40, maxWidth: 640, margin: '0 auto' }}>
        <h1>Flydesk</h1>
        <p className="muted">尚未建立任何租戶。請到 /admin 建立第一個租戶。</p>
        <a className="btn" href="/admin">
          前往後台
        </a>
      </main>
    );
  }

  redirect(`/t/${tenant.slug}`);
}
