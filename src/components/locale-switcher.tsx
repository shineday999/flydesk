'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * 語系切換：把選擇寫進 cookie 後重新整理，
 * 讓伺服器端重新渲染出對應語言的文案。
 */
export function LocaleSwitcher({
  locales,
  current,
  labels,
}: {
  locales: string[];
  current: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(next: string) {
    if (next === current) return;
    document.cookie = `flydesk_locale=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="language-label" role="group" aria-label="language">
      {locales.map((locale, index) => (
        <span key={locale}>
          {index > 0 ? '＋ ' : ''}
          <button
            type="button"
            onClick={() => pick(locale)}
            disabled={pending}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              font: 'inherit',
              color: locale === current ? 'var(--primary)' : 'inherit',
              fontWeight: locale === current ? 700 : 500,
            }}
          >
            {labels[locale] ?? locale}
          </button>
        </span>
      ))}
    </div>
  );
}
