import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifyAdminSession } from '@/lib/auth';
import { ensureSeeded, listAudit, listTenants } from '@/lib/tenants';
import { CreateTenantForm } from '../create-tenant-form';

export const dynamic = 'force-dynamic';

export default async function TenantsPage() {
  const store = await cookies();
  const user = await verifyAdminSession(store.get(SESSION_COOKIE)?.value);
  if (!user) redirect('/admin');

  await ensureSeeded();
  const tenants = await listTenants();
  const audit = await listAudit(12);

  return (
    <>
      <div className="adm-card">
        <h1 className="adm-title">租戶</h1>
        <p className="adm-sub">
          每個租戶擁有的品牌、主題、文案、選單與航班庫存都獨立儲存；
          前台依主機名稱或路徑 /t/&lt;slug&gt; 對應。
        </p>

        <table className="adm-table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>租戶</th>
              <th>Slug</th>
              <th>網域</th>
              <th>方案</th>
              <th>狀態</th>
              <th>更新時間</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.name}</strong>
                </td>
                <td>
                  <code>{t.slug}</code>
                </td>
                <td className="adm-muted">{t.domain ?? '—'}</td>
                <td className="adm-muted">{t.plan}</td>
                <td>
                  <span className={`adm-chip${t.status === 'active' ? '' : ' off'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="adm-muted">{new Date(t.updatedAt).toLocaleString('zh-TW')}</td>
                <td>
                  <a className="adm-btn ghost sm" href={`/admin/tenants/${t.id}`}>
                    編輯
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="adm-card">
        <h2 className="adm-title">新增租戶</h2>
        <p className="adm-sub">建立後會自動套用預設主題，可再進入編輯頁微調。</p>
        <CreateTenantForm />
      </div>

      <div className="adm-card">
        <h2 className="adm-title">操作紀錄</h2>
        <table className="adm-table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>時間</th>
              <th>操作者</th>
              <th>動作</th>
              <th>內容</th>
            </tr>
          </thead>
          <tbody>
            {audit.length === 0 ? (
              <tr>
                <td colSpan={4} className="adm-muted">
                  尚無紀錄
                </td>
              </tr>
            ) : (
              audit.map((a) => (
                <tr key={a.id}>
                  <td className="adm-muted">{new Date(a.createdAt).toLocaleString('zh-TW')}</td>
                  <td>{a.actor}</td>
                  <td>{a.action}</td>
                  <td className="adm-muted">{a.detail ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
