'use client';

import { useMemo, useState } from 'react';
import type { Airport, FlightOffer, MenuItem, TenantConfig } from '@/lib/config';
import { DEFAULT_COPY, resolveCopy } from '@/lib/config';
import type { Tenant } from '@/lib/tenants';

type TabKey =
  | 'brand'
  | 'theme'
  | 'copy'
  | 'menu'
  | 'airports'
  | 'flights'
  | 'rules'
  | 'contact'
  | 'preview';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'brand', label: '品牌' },
  { key: 'theme', label: '主題' },
  { key: 'copy', label: '文案' },
  { key: 'menu', label: '選單' },
  { key: 'airports', label: '機場' },
  { key: 'flights', label: '航班' },
  { key: 'rules', label: '訂票規則' },
  { key: 'contact', label: '聯絡與功能' },
  { key: 'preview', label: '預覽' },
];

const COLOR_FIELDS: Array<{ key: keyof TenantConfig['theme']; label: string }> = [
  { key: 'background', label: '背景' },
  { key: 'surface', label: '卡片' },
  { key: 'foreground', label: '文字' },
  { key: 'muted', label: '次要文字' },
  { key: 'primary', label: '主色' },
  { key: 'primaryHover', label: '主色（hover）' },
  { key: 'primaryLight', label: '主色（淺底）' },
  { key: 'border', label: '邊框' },
  { key: 'accent', label: '點綴色' },
];

/**
 * 租戶設定編輯器：所有欄位都會寫回 tenant.config，
 * 前台立刻依新規則渲染——這就是「後台設定驅動前臺呈現」的核心。
 */
export function TenantEditor({ tenant }: { tenant: Tenant }) {
  const [config, setConfig] = useState<TenantConfig>(tenant.config);
  const [tab, setTab] = useState<TabKey>('brand');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [copyKey, setCopyKey] = useState<string>('home.title');
  const slug = tenant.slug;

  const resolved = useMemo(() => resolveCopy(config), [config]);
  const locales = config.locales;

  function patch<T extends object>(fn: (prev: TenantConfig) => T): void {
    setConfig((prev) => ({ ...prev, ...fn(prev) }));
  }

  async function save() {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ kind: 'err', text: data.code ?? '儲存失敗' });
        return;
      }
      setConfig(data.tenant.config);
      setPreviewKey((k) => k + 1);
      setToast({ kind: 'ok', text: '已儲存，前台已更新' });
    } catch {
      setToast({ kind: 'err', text: '儲存失敗，請稍後再試' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3200);
    }
  }

  function setCopyValue(key: string, locale: string, value: string) {
    patch((prev) => ({
      copy: {
        ...prev.copy,
        [key]: { ...(prev.copy[key] ?? {}), [locale]: value },
      },
    }));
  }

  function updateMenu(index: number, next: Partial<MenuItem>) {
    patch((prev) => ({
      menu: prev.menu.map((m, i) => (i === index ? { ...m, ...next } : m)),
    }));
  }

  function updateMenuLabel(index: number, locale: string, value: string) {
    patch((prev) => ({
      menu: prev.menu.map((m, i) =>
        i === index ? { ...m, label: { ...m.label, [locale]: value } } : m,
      ),
    }));
  }

  function updateAirport(index: number, next: Partial<Airport>) {
    patch((prev) => ({
      airports: prev.airports.map((a, i) => (i === index ? { ...a, ...next } : a)),
    }));
  }

  function updateFlight(index: number, next: Partial<FlightOffer>) {
    patch((prev) => ({
      flights: prev.flights.map((f, i) => (i === index ? { ...f, ...next } : f)),
    }));
  }

  const dirty = JSON.stringify(config) !== JSON.stringify(tenant.config);

  return (
    <>
      <div className="adm-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 className="adm-title">
              {config.brand.name}
              {config.brand.nameAccent}
            </h1>
            <p className="adm-sub">
              slug <code>{tenant.slug}</code> · 前台：
              <a href={`/t/${tenant.slug}`} target="_blank" rel="noopener noreferrer">
                /t/{tenant.slug}
              </a>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {dirty ? <span className="adm-chip off">有未儲存的變更</span> : null}
            <button className="adm-btn ghost sm" onClick={() => setPreviewKey((k) => k + 1)}>
              重新載入預覽
            </button>
            <button className="adm-btn" onClick={save} disabled={saving}>
              {saving ? '儲存中…' : '儲存設定'}
            </button>
          </div>
        </div>

        <div className="adm-tabs" style={{ marginTop: 14 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className="adm-tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'brand' ? (
          <div className="adm-grid">
            <div className="adm-field">
              <label className="adm-label">品牌名</label>
              <input
                className="adm-input"
                value={config.brand.name}
                maxLength={40}
                onChange={(e) =>
                  patch((p) => ({ brand: { ...p.brand, name: e.target.value } }))
                }
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">名稱尾綴（著色）</label>
              <input
                className="adm-input"
                value={config.brand.nameAccent}
                maxLength={20}
                onChange={(e) =>
                  patch((p) => ({ brand: { ...p.brand, nameAccent: e.target.value } }))
                }
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">副標</label>
              <input
                className="adm-input"
                value={config.brand.tagline}
                maxLength={60}
                onChange={(e) =>
                  patch((p) => ({ brand: { ...p.brand, tagline: e.target.value } }))
                }
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">Logo 符號</label>
              <input
                className="adm-input"
                value={config.brand.logoEmoji}
                maxLength={8}
                onChange={(e) =>
                  patch((p) => ({ brand: { ...p.brand, logoEmoji: e.target.value } }))
                }
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">Logo 圖片網址</label>
              <input
                className="adm-input"
                value={config.brand.logoUrl}
                maxLength={300}
                placeholder="https://…"
                onChange={(e) =>
                  patch((p) => ({ brand: { ...p.brand, logoUrl: e.target.value } }))
                }
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">語系（逗號分隔）</label>
              <input
                className="adm-input"
                defaultValue={config.locales.join(', ')}
                onBlur={(e) => {
                  const next = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  patch((p) => ({
                    locales: next.length ? next : p.locales,
                    defaultLocale: next.includes(p.defaultLocale) ? p.defaultLocale : next[0],
                  }));
                }}
              />
            </div>
          </div>
        ) : null}

        {tab === 'theme' ? (
          <>
            <div className="adm-grid">
              {COLOR_FIELDS.map((f) => (
                <div className="adm-field" key={String(f.key)}>
                  <label className="adm-label">{f.label}</label>
                  <div className="adm-color">
                    <input
                      type="color"
                      value={String(config.theme[f.key])}
                      onChange={(e) =>
                        patch((p) => ({
                          theme: { ...p.theme, [f.key]: e.target.value },
                        }))
                      }
                    />
                    <input
                      className="adm-input"
                      value={String(config.theme[f.key])}
                      maxLength={9}
                      onChange={(e) =>
                        patch((p) => ({
                          theme: { ...p.theme, [f.key]: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
              <div className="adm-field">
                <label className="adm-label">圓角 (px)</label>
                <input
                  className="adm-input"
                  type="number"
                  min={0}
                  max={48}
                  value={config.theme.radius}
                  onChange={(e) =>
                    patch((p) => ({
                      theme: { ...p.theme, radius: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div className="adm-field">
                <label className="adm-label">首頁版面</label>
                <select
                  className="adm-select"
                  value={config.theme.heroLayout}
                  onChange={(e) =>
                    patch((p) => ({
                      theme: {
                        ...p.theme,
                        heroLayout: e.target.value as TenantConfig['theme']['heroLayout'],
                      },
                    }))
                  }
                >
                  <option value="split">左右分欄</option>
                  <option value="centered">置中</option>
                  <option value="banner">橫幅</option>
                </select>
              </div>
              <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
                <label className="adm-label">字體堆疊</label>
                <input
                  className="adm-input"
                  value={config.theme.fontStack}
                  maxLength={300}
                  onChange={(e) =>
                    patch((p) => ({ theme: { ...p.theme, fontStack: e.target.value } }))
                  }
                />
              </div>
            </div>
            <p className="adm-muted" style={{ marginTop: 10 }}>
              色彩僅接受 #rgb / #rrggbb，非法值會自動退回上一個合法值。
            </p>
          </>
        ) : null}

        {tab === 'copy' ? (
          <>
            <div className="adm-field" style={{ maxWidth: 320 }}>
              <label className="adm-label">文案項目</label>
              <select
                className="adm-select"
                value={copyKey}
                onChange={(e) => setCopyKey(e.target.value)}
              >
                {Object.keys(DEFAULT_COPY).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="adm-grid" style={{ marginTop: 12 }}>
              {locales.map((locale) => (
                <div className="adm-field" key={locale}>
                  <label className="adm-label">{locale}</label>
                  <textarea
                    className="adm-input"
                    rows={3}
                    maxLength={500}
                    value={resolved[copyKey]?.[locale] ?? ''}
                    onChange={(e) => setCopyValue(copyKey, locale, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <p className="adm-muted" style={{ marginTop: 10 }}>
              留空則沿用系統內建文案。字串在送出時會被截斷並去除空白，避免注入或版面爆版。
            </p>
          </>
        ) : null}

        {tab === 'menu' ? (
          <div>
            {config.menu.map((item, index) => (
              <div className="adm-row" key={item.id}>
                <label className="adm-switch">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => updateMenu(index, { enabled: e.target.checked })}
                  />
                  <strong>{item.id}</strong>
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {locales.map((locale) => (
                    <input
                      key={locale}
                      className="adm-input"
                      style={{ width: 170 }}
                      placeholder={locale}
                      value={item.label[locale] ?? ''}
                      maxLength={60}
                      onChange={(e) => updateMenuLabel(index, locale, e.target.value)}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="adm-input"
                    style={{ width: 120 }}
                    value={item.href}
                    maxLength={120}
                    onChange={(e) => updateMenu(index, { href: e.target.value })}
                  />
                  <input
                    className="adm-input"
                    style={{ width: 110 }}
                    value={item.icon}
                    maxLength={30}
                    onChange={(e) => updateMenu(index, { icon: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'airports' ? (
          <div>
            {config.airports.map((a, index) => (
              <div className="adm-row" key={`${a.code}-${index}`}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="adm-input"
                    style={{ width: 90 }}
                    value={a.code}
                    maxLength={3}
                    onChange={(e) =>
                      updateAirport(index, { code: e.target.value.toUpperCase() })
                    }
                  />
                  <select
                    className="adm-select"
                    style={{ width: 120 }}
                    value={a.role}
                    onChange={(e) =>
                      updateAirport(index, {
                        role: e.target.value as Airport['role'],
                      })
                    }
                  >
                    <option value="origin">出發</option>
                    <option value="destination">抵達</option>
                    <option value="both">兩者皆是</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {locales.map((locale) => (
                    <input
                      key={locale}
                      className="adm-input"
                      style={{ width: 170 }}
                      placeholder={`城市 / ${locale}`}
                      value={a.city[locale] ?? ''}
                      maxLength={80}
                      onChange={(e) =>
                        updateAirport(index, {
                          city: { ...a.city, [locale]: e.target.value },
                        })
                      }
                    />
                  ))}
                </div>
                <button
                  className="adm-btn danger sm"
                  onClick={() =>
                    patch((p) => ({
                      airports: p.airports.filter((_, i) => i !== index),
                    }))
                  }
                >
                  刪除
                </button>
              </div>
            ))}
            <button
              className="adm-btn ghost sm"
              style={{ marginTop: 12 }}
              onClick={() =>
                patch((p) => ({
                  airports: [
                    ...p.airports,
                    {
                      code: '',
                      name: {},
                      city: {},
                      country: '',
                      role: 'both' as const,
                    },
                  ],
                }))
              }
            >
              新增機場
            </button>
          </div>
        ) : null}

        {tab === 'flights' ? (
          <div>
            {config.flights.map((f, index) => (
              <div className="adm-row" key={`${f.id}-${index}`}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <input
                    className="adm-input"
                    style={{ width: 74 }}
                    placeholder="起飛"
                    value={f.origin}
                    maxLength={3}
                    onChange={(e) => updateFlight(index, { origin: e.target.value.toUpperCase() })}
                  />
                  <input
                    className="adm-input"
                    style={{ width: 74 }}
                    placeholder="抵達"
                    value={f.destination}
                    maxLength={3}
                    onChange={(e) =>
                      updateFlight(index, { destination: e.target.value.toUpperCase() })
                    }
                  />
                  <input
                    className="adm-input"
                    style={{ width: 96 }}
                    placeholder="航班號"
                    value={f.flightNo}
                    maxLength={20}
                    onChange={(e) => updateFlight(index, { flightNo: e.target.value })}
                  />
                  <input
                    className="adm-input"
                    style={{ width: 92 }}
                    type="time"
                    value={f.departureTime}
                    onChange={(e) => updateFlight(index, { departureTime: e.target.value })}
                  />
                  <input
                    className="adm-input"
                    style={{ width: 92 }}
                    type="time"
                    value={f.arrivalTime}
                    onChange={(e) => updateFlight(index, { arrivalTime: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <input
                    className="adm-input"
                    style={{ width: 110 }}
                    type="number"
                    min={0}
                    value={f.price}
                    onChange={(e) => updateFlight(index, { price: Number(e.target.value) })}
                  />
                  <input
                    className="adm-input"
                    style={{ width: 78 }}
                    type="number"
                    min={0}
                    max={999}
                    value={f.seatsLeft}
                    onChange={(e) => updateFlight(index, { seatsLeft: Number(e.target.value) })}
                  />
                  <label className="adm-switch">
                    <input
                      type="checkbox"
                      checked={f.active}
                      onChange={(e) => updateFlight(index, { active: e.target.checked })}
                    />
                    上架
                  </label>
                </div>
                <button
                  className="adm-btn danger sm"
                  onClick={() =>
                    patch((p) => ({ flights: p.flights.filter((_, i) => i !== index) }))
                  }
                >
                  刪除
                </button>
              </div>
            ))}
            <button
              className="adm-btn ghost sm"
              style={{ marginTop: 12 }}
              onClick={() =>
                patch((p) => ({
                  flights: [
                    ...p.flights,
                    {
                      id: `f${Date.now().toString(36)}`,
                      origin: p.airports[0]?.code ?? '',
                      destination: p.airports[1]?.code ?? '',
                      airline: '',
                      flightNo: '',
                      departureTime: '08:00',
                      arrivalTime: '13:00',
                      durationMin: 300,
                      price: 0,
                      currency: p.booking.currency,
                      cabin: '經濟艙 Economy',
                      baggage: '托運 23kg × 1',
                      seatsLeft: 9,
                      active: true,
                    },
                  ],
                }))
              }
            >
              新增航班
            </button>
          </div>
        ) : null}

        {tab === 'rules' ? (
          <div className="adm-grid">
            <div className="adm-field">
              <label className="adm-label">最多成人數</label>
              <input
                className="adm-input"
                type="number"
                min={1}
                max={9}
                value={config.booking.maxAdults}
                onChange={(e) =>
                  patch((p) => ({
                    booking: { ...p.booking, maxAdults: Number(e.target.value) },
                  }))
                }
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">服務費</label>
              <input
                className="adm-input"
                type="number"
                min={0}
                value={config.booking.serviceFee}
                onChange={(e) =>
                  patch((p) => ({
                    booking: { ...p.booking, serviceFee: Number(e.target.value) },
                  }))
                }
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">幣別</label>
              <input
                className="adm-input"
                value={config.booking.currency}
                maxLength={8}
                onChange={(e) =>
                  patch((p) => ({
                    booking: { ...p.booking, currency: e.target.value.toUpperCase() },
                  }))
                }
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">旅程類型</label>
              <label className="adm-switch">
                <input
                  type="checkbox"
                  checked={config.booking.tripTypes.includes('one-way')}
                  onChange={(e) =>
                    patch((p) => ({
                      booking: {
                        ...p.booking,
                        tripTypes: e.target.checked
                          ? [...p.booking.tripTypes, 'one-way']
                          : p.booking.tripTypes.filter((x) => x !== 'one-way'),
                      },
                    }))
                  }
                />
                單程
              </label>
              <label className="adm-switch">
                <input
                  type="checkbox"
                  checked={config.booking.tripTypes.includes('roundtrip')}
                  onChange={(e) =>
                    patch((p) => ({
                      booking: {
                        ...p.booking,
                        tripTypes: e.target.checked
                          ? [...p.booking.tripTypes, 'roundtrip']
                          : p.booking.tripTypes.filter((x) => x !== 'roundtrip'),
                      },
                    }))
                  }
                />
                來回
              </label>
            </div>
            <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <label className="adm-label">行李選項（每行一項）</label>
              <textarea
                className="adm-input"
                rows={4}
                defaultValue={config.booking.luggageOptions.join('\n')}
                onBlur={(e) =>
                  patch((p) => ({
                    booking: {
                      ...p.booking,
                      luggageOptions: e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  }))
                }
              />
            </div>
          </div>
        ) : null}

        {tab === 'contact' ? (
          <>
            <div className="adm-grid">
              <div className="adm-field">
                <label className="adm-label">WhatsApp</label>
                <input
                  className="adm-input"
                  value={config.contact.whatsapp}
                  maxLength={40}
                  onChange={(e) =>
                    patch((p) => ({ contact: { ...p.contact, whatsapp: e.target.value } }))
                  }
                />
              </div>
              <div className="adm-field">
                <label className="adm-label">電子郵件</label>
                <input
                  className="adm-input"
                  value={config.contact.email}
                  maxLength={120}
                  onChange={(e) =>
                    patch((p) => ({ contact: { ...p.contact, email: e.target.value } }))
                  }
                />
              </div>
              <div className="adm-field">
                <label className="adm-label">LINE</label>
                <input
                  className="adm-input"
                  value={config.contact.line}
                  maxLength={60}
                  onChange={(e) =>
                    patch((p) => ({ contact: { ...p.contact, line: e.target.value } }))
                  }
                />
              </div>
              <div className="adm-field">
                <label className="adm-label">地址</label>
                <input
                  className="adm-input"
                  value={config.contact.address}
                  maxLength={200}
                  onChange={(e) =>
                    patch((p) => ({ contact: { ...p.contact, address: e.target.value } }))
                  }
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 className="adm-title" style={{ fontSize: 14 }}>
                功能開關
              </h3>
              {Object.keys(config.features).map((key) => (
                <label className="adm-row adm-switch" key={key}>
                  <span>{key}</span>
                  <input
                    type="checkbox"
                    checked={config.features[key]}
                    onChange={(e) =>
                      patch((p) => ({
                        features: { ...p.features, [key]: e.target.checked },
                      }))
                    }
                  />
                </label>
              ))}
              <label className="adm-row adm-switch">
                <span>demo 模式（顯示示範警語）</span>
                <input
                  type="checkbox"
                  checked={config.demo.enabled}
                  onChange={(e) =>
                    patch((p) => ({ demo: { ...p.demo, enabled: e.target.checked } }))
                  }
                />
              </label>
            </div>
          </>
        ) : null}

        {tab === 'preview' ? (
          <>
            <p className="adm-sub" style={{ marginBottom: 10 }}>
              這是訪客實際看到的頁面。儲存後按「重新載入預覽」即可檢視最新設定。
            </p>
            <iframe
              key={`${previewKey}-${slug}`}
              className="adm-preview"
              src={`/t/${slug}`}
              title="租戶前台預覽"
            />
          </>
        ) : null}
      </div>

      {toast ? <div className={`adm-toast ${toast.kind}`}>{toast.text}</div> : null}
    </>
  );
}
