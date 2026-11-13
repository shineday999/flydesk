import { loadTenantPage } from '@/lib/page-helpers';
import { translate } from '@/lib/config';
import { OrdersView } from '@/components/orders-view';

export const dynamic = 'force-dynamic';

/** 訂單列表：以示範工作階段 cookie 辨識使用者。 */
export default async function OrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { config, locale, copy } = await loadTenantPage(slug);
  const t = (key: string) => translate(copy, key, locale, config.defaultLocale);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">{t('orders.title')}</h2>
          <p className="card-sub">{config.brand.name}{config.brand.nameAccent}</p>
        </div>
      </div>
      <OrdersView slug={slug} locale={locale} copy={copy} fallbackLocale={config.defaultLocale} />
    </div>
  );
}
