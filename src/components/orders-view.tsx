'use client';

import { useEffect, useState } from 'react';
import type { OrderRecord } from '@/lib/orders';
import { translate } from '@/lib/config';

interface OrderDto {
  id: string;
  reference: string;
  status: string;
  currency: string;
  total: number;
  createdAt: string;
  payload: Record<string, unknown>;
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function OrdersView({
  slug,
  locale,
  copy,
  fallbackLocale,
}: {
  slug: string;
  locale: string;
  copy: Record<string, Record<string, string>>;
  fallbackLocale: string;
}) {
  const t = (key: string) => translate(copy, key, locale, fallbackLocale);
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/orders', { headers: { 'x-tenant-slug': slug } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.code ?? 'ERROR');
        if (alive) setOrders(data.orders ?? []);
      })
      .catch(() => {
        if (alive) setError(t('common.error'));
      });
    return () => {
      alive = false;
    };
  }, [slug, t]);

  if (error) return <div className="empty-state">{error}</div>;
  if (!orders) return <div className="empty-state">{t('common.loading')}</div>;
  if (orders.length === 0) return <div className="empty-state">{t('orders.empty')}</div>;

  return (
    <table className="table">
      <thead>
        <tr>
          <th>{t('booking.reference')}</th>
          <th>{t('booking.origin')} → {t('booking.destination')}</th>
          <th>{t('orders.status')}</th>
          <th>{t('orders.amount')}</th>
          <th>{t('orders.date')}</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => {
          const search = (o.payload?.search ?? {}) as Record<string, unknown>;
          return (
            <tr key={o.id}>
              <td>
                <strong>{o.reference}</strong>
              </td>
              <td>
                {String(search.origin ?? '—')} → {String(search.destination ?? '—')}
                <div className="small muted">{String(search.departureDate ?? '')}</div>
              </td>
              <td>
                <span className={`badge${o.status === 'demo_booked' ? ' warn' : ''}`}>
                  {o.status}
                </span>
              </td>
              <td>{money(o.total, o.currency)}</td>
              <td className="small muted">
                {new Date(o.createdAt).toLocaleString(locale)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
