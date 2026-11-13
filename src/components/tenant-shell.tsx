'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { TenantConfig } from '@/lib/config';
import { translate } from '@/lib/config';
import { localeLabel } from '@/lib/locales';
import { LocaleSwitcher } from './locale-switcher';
import { Icon } from './icons';

/**
 * 租戶前台外框：頁首 + 側欄（桌面）/ 底部導覽（手機）。
 * 所有可見文字與顏色都來自 tenant config。
 */
export function TenantShell({
  slug,
  config,
  locale,
  copy,
  children,
}: {
  slug: string;
  config: TenantConfig;
  locale: string;
  copy: Record<string, Record<string, string>>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const base = `/t/${slug}`;
  const activePath = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : '/';

  const t = (key: string) => translate(copy, key, locale, config.defaultLocale);

  const menu = config.menu.filter(
    (item) => item.enabled && config.features[item.id] !== false,
  );

  const demoNotice = config.demo.enabled
    ? translate(copy, 'common.demo', locale, config.defaultLocale) ||
      config.demo.notice[locale] ||
      ''
    : '';

  const labelFor = (item: { id: string; label: Record<string, string> }) =>
    item.label[locale] ??
    item.label[config.defaultLocale] ??
    item.label['en-US'] ??
    t(`nav.${item.id}`);

  return (
    <div className="shell">
      <header className="app-header">
        <Link className="brand" href={base} aria-label={config.brand.name}>
          <span className="brand-icon">
            {config.brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.brand.logoUrl} alt="" />
            ) : (
              <span aria-hidden="true">{config.brand.logoEmoji || '✈️'}</span>
            )}
          </span>
          <span>
            <span className="brand-word">
              {config.brand.name}
              {config.brand.nameAccent ? (
                <span className="accent">{config.brand.nameAccent}</span>
              ) : null}
            </span>
            {config.brand.tagline ? (
              <span className="brand-caption">{config.brand.tagline}</span>
            ) : null}
          </span>
        </Link>

        <div className="header-right">
          <LocaleSwitcher
            locales={config.locales}
            current={locale}
            labels={Object.fromEntries(
              config.locales.map((l) => [l, localeLabel(l)]),
            )}
          />
          {config.demo.enabled ? (
            <span className="mode-pill">{demoNotice}</span>
          ) : null}
        </div>
      </header>

      <div className="workspace">
        <aside className="rail">
          <div className="rail-card">
            <div className="rail-title">
              <Icon name="chat" size={17} />
              <span>{t('home.kicker')}</span>
            </div>
            <p className="rail-sub">{t('home.subtitle')}</p>

            <nav className="menu-grid">
              {menu.map((item) => {
                const href = `${base}${item.href === '/' ? '' : item.href}`;
                const isActive =
                  activePath === item.href ||
                  (item.href !== '/' && activePath.startsWith(item.href));
                return (
                  <Link
                    key={item.id}
                    className="menu-tile"
                    href={href}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="menu-icon">
                      <Icon name={item.icon} size={16} />
                    </span>
                    <span className="menu-label">{labelFor(item)}</span>
                  </Link>
                );
              })}
            </nav>

            {config.demo.enabled ? (
              <div className="rail-note">
                <Icon name="shield" size={15} />
                <span>{demoNotice}</span>
              </div>
            ) : null}

            {config.features.support !== false && config.contact.whatsapp ? (
              <div className="rail-note">
                <Icon name="arrowRight" size={15} />
                <a
                  className="rail-link"
                  href={`https://wa.me/${config.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('nav.support')}
                </a>
              </div>
            ) : null}
          </div>
        </aside>

        <main>{children}</main>
      </div>

      <nav className="mobile-nav">
        {menu.map((item) => {
          const href = `${base}${item.href === '/' ? '' : item.href}`;
          const isActive =
            activePath === item.href ||
            (item.href !== '/' && activePath.startsWith(item.href));
          return (
            <Link key={item.id} href={href} aria-current={isActive ? 'page' : undefined}>
              <Icon name={item.icon} size={18} />
              <span>{labelFor(item)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
