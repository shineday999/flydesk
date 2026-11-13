import { loadTenantPage } from '@/lib/page-helpers';
import { translate } from '@/lib/config';
import { Icon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function SupportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { config, locale, copy } = await loadTenantPage(slug);
  const t = (key: string) => translate(copy, key, locale, config.defaultLocale);
  const { contact } = config;

  const rows = [
    contact.whatsapp
      ? {
          label: t('support.whatsapp'),
          value: contact.whatsapp,
          href: `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`,
          icon: 'chat',
        }
      : null,
    contact.email
      ? { label: t('support.email'), value: contact.email, href: `mailto:${contact.email}`, icon: 'sparkles' }
      : null,
    contact.line
      ? {
          label: t('support.line'),
          value: contact.line,
          href: contact.officialAccountUrl || undefined,
          icon: 'chat',
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; href?: string; icon: string }>;

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">{t('support.title')}</h2>
            <p className="card-sub">{config.brand.name}{config.brand.nameAccent}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">{t('common.error')}</div>
        ) : (
          <div className="stack">
            {rows.map((row) => (
              <div className="summary-row" key={row.label}>
                <span className="summary-key row">
                  <span className="menu-icon" style={{ width: 26, height: 26 }}>
                    <Icon name={row.icon} size={14} />
                  </span>
                  {row.label}
                </span>
                {row.href ? (
                  <a className="btn sm ghost" href={row.href} target="_blank" rel="noopener noreferrer">
                    {row.value}
                  </a>
                ) : (
                  <span>{row.value}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {contact.address ? (
          <p className="small muted" style={{ marginTop: 14 }}>
            {t('transfer.pickup')}：{contact.address}
          </p>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="spread">
          <span className="small muted">{t('support.hours')}</span>
          <span className="badge">09:00 – 21:00</span>
        </div>
      </div>
    </>
  );
}
