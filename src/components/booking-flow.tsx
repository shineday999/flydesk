'use client';

import { useMemo, useState } from 'react';
import type { FlightOffer, TenantConfig } from '@/lib/config';
import { todayIn, translate } from '@/lib/config';
import { Icon } from './icons';

type Step = 'search' | 'results' | 'passenger' | 'confirm' | 'done';

interface SearchState {
  tripType: 'one-way' | 'roundtrip';
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
}

interface PassengerState {
  name: string;
  passport: string;
  phone: string;
  email: string;
  luggage: string;
  notes: string;
  addressConfirmed: boolean;
}

export interface OrderResult {
  id: string;
  reference: string;
  total: number;
  currency: string;
  status: string;
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

/**
 * 三步驟訂票流程：搜尋 → 選航班 → 旅客資料 → 確認 → 完成。
 * 版面刻意壓縮：桌面上可一屏看完，手機則收合為底部導覽 + 單欄表單。
 */
export function BookingFlow({
  slug,
  config,
  locale,
  copy,
}: {
  slug: string;
  config: TenantConfig;
  locale: string;
  copy: Record<string, Record<string, string>>;
}) {
  const t = (key: string) => translate(copy, key, locale, config.defaultLocale);

  const origins = config.airports.filter((a) => a.role !== 'destination');
  const destinations = config.airports.filter((a) => a.role !== 'origin');
  const minDate = todayIn();

  const [step, setStep] = useState<Step>('search');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [offer, setOffer] = useState<FlightOffer | null>(null);
  const [order, setOrder] = useState<OrderResult | null>(null);

  const [search, setSearch] = useState<SearchState>({
    tripType: config.booking.tripTypes[0] ?? 'one-way',
    origin: origins[0]?.code ?? '',
    destination: destinations[0]?.code ?? '',
    departureDate: '',
    returnDate: '',
    adults: 1,
  });

  const [passenger, setPassenger] = useState<PassengerState>({
    name: '',
    passport: '',
    phone: '',
    email: '',
    luggage: config.booking.luggageOptions[0] ?? '',
    notes: '',
    addressConfirmed: false,
  });

  const airportLabel = useMemo(
    () => (code: string): { code: string; city: string; name: string } => {
      const a = config.airports.find((x) => x.code === code);
      if (!a) return { code, city: '', name: '' };
      const city = a.city[locale] ?? a.city[config.defaultLocale] ?? '';
      const name = a.name[locale] ?? a.name[config.defaultLocale] ?? '';
      return { code, city, name };
    },
    [config.airports, config.defaultLocale, locale],
  );

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-slug': slug },
        body: JSON.stringify(search),
      });
      const data = (await res.json()) as Record<string, any>;
      if (!res.ok) {
        setError(data.message ?? data.code ?? t('common.error'));
        return;
      }
      setOffers(data.offers ?? []);
      setStep('results');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!offer) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-slug': slug },
        body: JSON.stringify({ search, offerId: offer.id, passenger }),
      });
      const data = (await res.json()) as Record<string, any>;
      if (!res.ok) {
        setError(data.message ?? data.code ?? t('common.error'));
        return;
      }
      setOrder(data.order);
      setStep('done');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  function downloadTicket() {
    if (!order) return;
    const lines = [
      `${config.brand.name}${config.brand.nameAccent} — DEMO TICKET`,
      `Reference: ${order.reference}`,
      `Status: ${order.status}`,
      `Total: ${money(order.total, order.currency)}`,
      '',
      'This is a demo ticket. No payment was taken.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.reference}-DEMO.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  const steps: Array<{ key: Step; label: string }> = [
    { key: 'search', label: t('booking.step1') },
    { key: 'passenger', label: t('booking.step2') },
    { key: 'confirm', label: t('booking.step3') },
  ];

  const stepState = (key: Step): 'todo' | 'active' | 'done' => {
    const order3 = ['search', 'passenger', 'confirm'];
    const current = step === 'results' ? 'search' : step === 'done' ? 'confirm' : step;
    const i = order3.indexOf(current);
    const j = order3.indexOf(key);
    if (j < i) return 'done';
    if (j === i) return 'active';
    return 'todo';
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">{t('booking.title')}</h2>
          <p className="card-sub">{t('booking.subtitle')}</p>
        </div>
      </div>

      <div className="steps">
        {steps.map((s, index) => (
          <div key={s.key} style={{ display: 'contents' }}>
            <div className="step" data-state={stepState(s.key)}>
              <span className="step-index">
                {stepState(s.key) === 'done' ? (
                  <Icon name="check" size={12} />
                ) : (
                  index + 1
                )}
              </span>
              <span>{s.label}</span>
            </div>
            {index < steps.length - 1 ? <span className="step-bar" /> : null}
          </div>
        ))}
      </div>

      {config.demo.enabled ? (
        <div className="notice">
          <span className="notice-dot" />
          <span>{t('booking.demoNote')}</span>
        </div>
      ) : null}

      {error ? (
        <div className="notice" style={{ background: '#fdecea', borderColor: '#f5c6c2', color: '#a12318' }}>
          <span className="notice-dot" />
          <span>{error}</span>
        </div>
      ) : null}

      {step === 'search' ? (
        <form onSubmit={runSearch}>
          {config.booking.tripTypes.length > 1 ? (
            <div className="field" style={{ marginBottom: 12 }}>
              <span className="field-label">{t('booking.tripType')}</span>
              <div className="segmented">
                {config.booking.tripTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={search.tripType === type}
                    onClick={() =>
                      setSearch((s) => ({
                        ...s,
                        tripType: type,
                        returnDate: type === 'one-way' ? '' : s.returnDate,
                      }))
                    }
                  >
                    {type === 'roundtrip' ? t('booking.roundtrip') : t('booking.oneway')}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="field-grid">
            <div className="field">
              <span className="field-label">{t('booking.origin')}</span>
              <div className="pick-grid">
                {origins.map((a) => {
                  const label = airportLabel(a.code);
                  return (
                    <button
                      key={a.code}
                      type="button"
                      className="pick"
                      aria-pressed={search.origin === a.code}
                      onClick={() => setSearch((s) => ({ ...s, origin: a.code }))}
                    >
                      <span>
                        <span className="pick-code">{a.code}</span>
                        <span className="pick-name" style={{ display: 'block' }}>
                          {label.city}
                        </span>
                      </span>
                      {search.origin === a.code ? (
                        <Icon name="check" size={15} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <span className="field-label">{t('booking.destination')}</span>
              <div className="pick-grid">
                {destinations.map((a) => {
                  const label = airportLabel(a.code);
                  return (
                    <button
                      key={a.code}
                      type="button"
                      className="pick"
                      aria-pressed={search.destination === a.code}
                      onClick={() => setSearch((s) => ({ ...s, destination: a.code }))}
                    >
                      <span>
                        <span className="pick-code">{a.code}</span>
                        <span className="pick-name" style={{ display: 'block' }}>
                          {label.city}
                        </span>
                      </span>
                      {search.destination === a.code ? (
                        <Icon name="check" size={15} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="dep">
                {t('booking.departure')}
              </label>
              <input
                id="dep"
                className="input"
                type="date"
                min={minDate}
                value={search.departureDate}
                onChange={(e) =>
                  setSearch((s) => ({ ...s, departureDate: e.target.value }))
                }
                required
              />
            </div>

            {search.tripType === 'roundtrip' ? (
              <div className="field">
                <label className="field-label" htmlFor="ret">
                  {t('booking.return')}
                </label>
                <input
                  id="ret"
                  className="input"
                  type="date"
                  min={search.departureDate || minDate}
                  value={search.returnDate}
                  onChange={(e) =>
                    setSearch((s) => ({ ...s, returnDate: e.target.value }))
                  }
                  required
                />
              </div>
            ) : null}

            <div className="field">
              <label className="field-label" htmlFor="adults">
                {t('booking.adults')}
              </label>
              <select
                id="adults"
                className="select"
                value={search.adults}
                onChange={(e) =>
                  setSearch((s) => ({ ...s, adults: Number(e.target.value) }))
                }
              >
                {Array.from({ length: config.booking.maxAdults }, (_, i) => i + 1).map(
                  (n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn" type="submit" disabled={busy}>
              <Icon name="search" size={16} />
              {busy ? t('common.loading') : t('booking.search')}
            </button>
          </div>
        </form>
      ) : null}

      {step === 'results' ? (
        <>
          {offers.length === 0 ? (
            <div className="empty-state">{t('booking.noResult')}</div>
          ) : (
            <div className="offer-list">
              {offers.map((o) => {
                const from = airportLabel(o.origin);
                const to = airportLabel(o.destination);
                return (
                  <div className="offer" key={o.id}>
                    <div>
                      <div className="offer-time">{o.departureTime}</div>
                      <div className="offer-meta">
                        {o.origin} → {o.destination}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                        {o.airline} {o.flightNo}
                      </div>
                      <div className="offer-meta">
                        {o.departureTime} – {o.arrivalTime} · {Math.floor(o.durationMin / 60)}h{' '}
                        {o.durationMin % 60}m · {o.baggage || '—'} · {from.city} → {to.city}
                      </div>
                    </div>
                    <div className="offer-price">
                      <div className="offer-amount">{money(o.price, o.currency)}</div>
                      <button
                        className="btn sm"
                        type="button"
                        onClick={() => {
                          setOffer(o);
                          setStep('passenger');
                        }}
                      >
                        {t('booking.select')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="form-actions">
            <button className="btn ghost" type="button" onClick={() => setStep('search')}>
              <Icon name="arrowLeft" size={15} />
              {t('booking.back')}
            </button>
          </div>
        </>
      ) : null}

      {step === 'passenger' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep('confirm');
          }}
        >
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>{t('booking.passengerTitle')}</h3>
          <div className="field-grid cols-3">
            <div className="field">
              <label className="field-label" htmlFor="pname">
                {t('booking.name')}
              </label>
              <input
                id="pname"
                className="input"
                value={passenger.name}
                maxLength={80}
                onChange={(e) => setPassenger((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ppass">
                {t('booking.passport')}
              </label>
              <input
                id="ppass"
                className="input"
                value={passenger.passport}
                maxLength={32}
                onChange={(e) => setPassenger((p) => ({ ...p, passport: e.target.value }))}
                placeholder="DEMO-000000"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="pphone">
                {t('booking.phone')}
              </label>
              <input
                id="pphone"
                className="input"
                inputMode="tel"
                value={passenger.phone}
                maxLength={32}
                onChange={(e) => setPassenger((p) => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="pemail">
                {t('booking.email')}
              </label>
              <input
                id="pemail"
                className="input"
                type="email"
                value={passenger.email}
                maxLength={120}
                onChange={(e) => setPassenger((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="plug">
                {t('booking.luggage')}
              </label>
              <select
                id="plug"
                className="select"
                value={passenger.luggage}
                onChange={(e) => setPassenger((p) => ({ ...p, luggage: e.target.value }))}
              >
                {config.booking.luggageOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="pnotes">
                {t('booking.notes')}
              </label>
              <input
                id="pnotes"
                className="input"
                value={passenger.notes}
                maxLength={200}
                onChange={(e) => setPassenger((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn ghost" type="button" onClick={() => setStep('results')}>
              <Icon name="arrowLeft" size={15} />
              {t('booking.back')}
            </button>
            <button className="btn" type="submit">
              {t('booking.next')}
              <Icon name="arrowRight" size={15} />
            </button>
          </div>
        </form>
      ) : null}

      {step === 'confirm' && offer ? (
        <form onSubmit={createOrder}>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>{t('booking.summary')}</h3>
          <div className="summary">
            <div className="summary-row">
              <span className="summary-key">{t('booking.origin')} → {t('booking.destination')}</span>
              <span>
                {offer.origin} → {offer.destination}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-key">{offer.airline}</span>
              <span>
                {offer.flightNo} · {offer.departureTime}–{offer.arrivalTime}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-key">{t('booking.departure')}</span>
              <span>
                {search.departureDate}
                {search.tripType === 'roundtrip' ? ` → ${search.returnDate}` : ''}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-key">{t('booking.name')}</span>
              <span>
                {passenger.name} × {search.adults}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-key">{t('booking.luggage')}</span>
              <span>{passenger.luggage}</span>
            </div>
            <div className="summary-row">
              <span className="summary-key">{t('booking.serviceFee')}</span>
              <span>{money(config.booking.serviceFee, config.booking.currency)}</span>
            </div>
            <div className="summary-row total">
              <span>{t('booking.total')}</span>
              <span>
                {money(
                  offer.price * search.adults + config.booking.serviceFee,
                  offer.currency,
                )}
              </span>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn ghost" type="button" onClick={() => setStep('passenger')}>
              <Icon name="arrowLeft" size={15} />
              {t('booking.back')}
            </button>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? t('common.loading') : t('booking.confirm')}
            </button>
          </div>
        </form>
      ) : null}

      {step === 'done' && order ? (
        <div>
          <div className="notice info">
            <span className="notice-dot" />
            <span>
              {t('booking.created')} · {t('booking.reference')}: <strong>{order.reference}</strong>
            </span>
          </div>
          <div className="form-actions">
            <button className="btn ghost" type="button" onClick={downloadTicket}>
              {t('booking.download')}
            </button>
            <a className="btn" href={`/t/${slug}/orders`}>
              {t('nav.orders')}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
