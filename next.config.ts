import type { NextConfig } from 'next';

/**
 * 正式環境啟動檢查（僅在 `next start` 階段執行，建置不受影響）。
 * 缺少必要憑證時直接拒絕啟動，避免以預設密碼上線。
 */
if (process.env.NEXT_PHASE === 'phase-production-server') {
  const missing: string[] = [];
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!adminPassword || adminPassword.length < 8) missing.push('ADMIN_PASSWORD (>=8 chars)');
  if (!sessionSecret || sessionSecret.length < 16) missing.push('SESSION_SECRET (>=16 chars)');
  if (missing.length > 0) {
    throw new Error(
      `[flydesk] Refusing to start in production without: ${missing.join(', ')}`,
    );
  }
}

/**
 * 安全標頭（OWASP A05 / A03）。
 * frame-ancestors 'self' 允許後台預覽用 iframe 內嵌自己的租戶頁面。
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
