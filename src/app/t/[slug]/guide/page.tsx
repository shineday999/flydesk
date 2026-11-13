import { loadTenantPage } from '@/lib/page-helpers';
import { translate } from '@/lib/config';
import { Icon } from '@/components/icons';

export const dynamic = 'force-dynamic';

const STEPS = [
  { icon: 'search', title: 'booking.step1', body: 'booking.demoNote' },
  { icon: 'ticket', title: 'booking.step2', body: 'booking.summary' },
  { icon: 'shield', title: 'booking.step3', body: 'common.demo' },
];

/** 使用說明頁：由功能開關決定是否顯示。 */
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { config, locale, copy } = await loadTenantPage(slug);
  const t = (key: string) => translate(copy, key, locale, config.defaultLocale);

  if (config.features.guide === false) {
    return <div className="empty-state">{t('common.error')}</div>;
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">{t('guide.title')}</h2>
          <p className="card-sub">{config.brand.name}{config.brand.nameAccent}</p>
        </div>
      </div>
      <div className="stack">
        {STEPS.map((s, index) => (
          <div className="summary-row" key={s.title}>
            <span className="summary-key row">
              <span className="menu-icon" style={{ width: 28, height: 28 }}>
                <Icon name={s.icon} size={15} />
              </span>
              {index + 1}. {t(s.title)}
            </span>
            <span className="small muted">{t(s.body)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
