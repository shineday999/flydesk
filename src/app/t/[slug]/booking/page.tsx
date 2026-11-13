import { loadTenantPage } from '@/lib/page-helpers';
import { BookingFlow } from '@/components/booking-flow';

export const dynamic = 'force-dynamic';

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { config, locale, copy } = await loadTenantPage(slug);
  return <BookingFlow slug={slug} config={config} locale={locale} copy={copy} />;
}
