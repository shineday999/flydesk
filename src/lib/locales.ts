/**
 * 語系常數（純前端 / 前後端共用，不可引入 next/headers）。
 */

export const LOCALE_LABELS: Record<string, string> = {
  'zh-TW': '中文',
  'id-ID': 'Bahasa Indonesia',
  'en-US': 'English',
};

export function localeLabel(locale: string): string {
  return LOCALE_LABELS[locale] ?? locale;
}
