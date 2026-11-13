import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { SESSION_COOKIE, verifyAdminSession } from '@/lib/auth';
import { getTenantById } from '@/lib/tenants';
import { TenantEditor } from '@/components/tenant-editor';

export const dynamic = 'force-dynamic';

export default async function TenantEditPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const user = await verifyAdminSession(store.get(SESSION_COOKIE)?.value);
  if (!user) redirect('/admin');

  const { id } = await params;
  const tenant = await getTenantById(id);
  if (!tenant) notFound();

  return <TenantEditor tenant={tenant} />;
}
