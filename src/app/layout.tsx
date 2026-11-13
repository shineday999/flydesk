import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flydesk — 多租戶白標訂票 SaaS',
  description:
    '後台設定驅動前台呈現的多租戶訂票 SaaS：每個租戶可以擁有自己的品牌、主題、文案、選單與航班庫存。',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
