import { cookies, headers } from 'next/headers';

export const LOCALE_COOKIE = 'flydesk_locale';

/**
 * 決定本次請求要使用的語系：
 * cookie > 瀏覽器 Accept-Language > 租戶預設語系。
 */
export async function resolveLocale(
  allowed: string[],
  fallback: string,
): Promise<string> {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (fromCookie && allowed.includes(fromCookie)) return fromCookie;

  const h = await headers();
  const header = h.get('accept-language') ?? '';
  const parsed = header
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase())
    .filter(Boolean);

  for (const want of parsed) {
    const exact = allowed.find((a) => a.toLowerCase() === want);
    if (exact) return exact;
    const prefix = want.split('-')[0];
    const loose = allowed.find((a) => a.toLowerCase().split('-')[0] === prefix);
    if (loose) return loose;
  }
  return allowed.includes(fallback) ? fallback : allowed[0] ?? 'zh-TW';
}
