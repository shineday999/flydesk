import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifyAdminSession } from '@/lib/auth';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const store = await cookies();
  const user = verifyAdminSession(store.get(SESSION_COOKIE)?.value);
  if (user) redirect('/admin/tenants');

  return (
    <div className="adm-login">
      <div className="adm-card">
        <h1 className="adm-title">後台登入</h1>
        <p className="adm-sub">
          請輸入管理密碼。預設值取自環境變數 <code>ADMIN_PASSWORD</code>，
          未設定時為 <code>flydesk-admin</code>（僅限開發環境）。
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
