import { loadTenantPage } from '@/lib/page-helpers';
import { translate } from '@/lib/config';
import { TransferView } from '@/components/transfer-view';

export const dynamic = 'force-dynamic';

export default async function TransferPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { config, locale, copy } = await loadTenantPage(slug);
  const t = (key: string) => translate(copy, key, locale, config.defaultLocale);

  return (
    <>
      <div className="card-head">
        <div>
          <h2 className="card-title">{t('transfer.title')}</h2>
          <p className="card-sub">{t('transfer.subtitle')}</p>
        </div>
      </div>
      <TransferView slug={slug} locale={locale} copy={copy} fallbackLocale={config.defaultLocale} />
    </>
  );
}
