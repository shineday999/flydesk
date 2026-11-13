import type { ReactNode } from 'react';
import './admin.css';

export const dynamic = 'force-dynamic';

/** 後台外框（深色）。登入頁與各功能頁共用同一個 chrome。 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="adm-body">
      <div className="adm-shell">
        <header className="adm-top">
          <a className="adm-logo" href="/admin">
            <span>✈</span>
            Flydesk Console
          </a>
          <nav className="adm-nav">
            <a className="adm-link" href="/admin/tenants">
              租戶
            </a>
            <a className="adm-link" href="/" target="_blank" rel="noopener noreferrer">
              前台
            </a>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
