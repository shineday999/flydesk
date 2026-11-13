'use client';

import { useState } from 'react';
import { translate } from '@/lib/config';

interface OrderDto {
  reference: string;
  status: string;
  total: number;
  currency: string;
  payload: Record<string, unknown>;
}

/** 機場接送：輸入訂單編號查詢行程。 */
export function TransferView({
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
  const [reference, setReference] = useState('');
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch(
        `/api/orders?reference=${encodeURIComponent(reference.trim().toUpperCase())}`,
        { headers: { 'x-tenant-slug': slug } },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.code === 'ORDER_NOT_FOUND' ? t('orders.empty') : t('common.error'));
        return;
      }
      setOrder(data.order);
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <form onSubmit={lookup} className="field-grid">
        <div className="field">
          <label className="field-label" htmlFor="ref">
            {t('booking.reference')}
          </label>
          <input
            id="ref"
            className="input"
            value={reference}
            maxLength={20}
            placeholder="SBXXXXXX"
            onChange={(e) => setReference(e.target.value)}
            required
          />
        </div>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? t('common.loading') : t('transfer.lookup')}
          </button>
        </div>
      </form>

      {error ? <p className="error-text" style={{ marginTop: 12 }}>{error}</p> : null}

      {order ? (
        <div className="summary" style={{ marginTop: 16 }}>
          <div className="summary-row">
            <span className="summary-key">{t('booking.reference')}</span>
            <span>
              <strong>{order.reference}</strong>
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-key">{t('orders.status')}</span>
            <span>
              <span className="badge">{order.status}</span>
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-key">{t('transfer.pickup')}</span>
            <span>{t('transfer.pickup')} · {t('transfer.district')}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
