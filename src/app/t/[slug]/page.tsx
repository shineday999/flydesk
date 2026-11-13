import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ensureSeeded, getTenantBySlug } from '@/lib/tenants';
import { resolveCopy, translate } from '@/lib/config';
import { resolveLocale } from '@/lib/locale';
import { Icon } from '@/components/icons';

export const dynamic = 'force-dynamic';

/** 租戶首頁：緊湊的 hero + 路線摘要，單屏可見。 */
export default async function TenantHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await ensureSeeded();
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const config = tenant.config;
  const locale = await resolveLocale(config.locales, config.defaultLocale);
  const copy = resolveCopy(config);
  const t = (key: string) => translate(copy, key, locale, config.defaultLocale);

  const origins = config.airports.filter((a) => a.role !== 'destination');
  const destinations = config.airports.filter((a) => a.role !== 'origin');
  const routes = origins.slice(0, 2).map((o) => ({
    from: o.code,
    to: destinations[0]?.code ?? '',
  }));

  return (
    <>
      <div className="card">
        <div className="hero" data-layout={config.theme.heroLayout}>
          <div>
            <span className="kicker">
              <Icon name="sparkles" size={14} />
              {t('home.kicker')}
            </span>
            <h1 className="hero-title">{t('home.title')}</h1>
            <p className="hero-sub">{t('home.subtitle')}</p>
            <div className="hero-tags">
              {routes.map((r) => (
                <span className="tag" key={`${r.from}-${r.to}`}>
                  {r.from} → {r.to}
                </span>
              ))}
              <span className="tag">{t('home.routeTitle')}</span>
            </div>
            {config.features.booking !== false ? (
              <div style={{ marginTop: 16 }}>
                <Link className="btn" href={`/t/${slug}/booking`}>
                  <Icon name="plane" size={16} />
                  {t('home.cta')}
                </Link>
              </div>
            ) : null}
          </div>

          <div className="hero-visual">
            {config.airports.slice(0, 4).map((a) => (
              <div className="route-pill" key={a.code}>
                <div className="route-code">{a.code}</div>
                <div className="route-city">
                  {a.city[locale] ?? a.city[config.defaultLocale] ?? a.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {config.demo.enabled ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="spread">
            <div className="row">
              <span className="menu-icon">
                <Icon name="shield" size={16} />
              </span>
              <span className="small muted">{t('common.demo')}</span>
            </div>
            {config.features.support !== false ? (
              <Link className="btn ghost sm" href={`/t/${slug}/support`}>
                {t('nav.support')}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
