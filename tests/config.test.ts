import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  clampExternalUrl,
  clampHexColor,
  clampInternalPath,
  clampLocalized,
  clampNumber,
  clampText,
  findOffers,
  mergeConfig,
  normalizeConfig,
  resolveCopy,
  themeCssVariables,
  translate,
  validateSearch,
} from '../src/lib/config.ts';

test('clampHexColor 只接受 #rgb / #rrggbb', () => {
  assert.equal(clampHexColor('#0f7a6a', '#000000'), '#0f7a6a');
  assert.equal(clampHexColor('#ABC', '#000000'), '#abc');
  assert.equal(clampHexColor('red', '#000000'), '#000000');
  assert.equal(clampHexColor('#12345', '#000000'), '#000000');
  assert.equal(clampHexColor('javascript:alert(1)', '#000000'), '#000000');
});

test('clampExternalUrl 擋掉 javascript: 與 data: 協定', () => {
  assert.equal(clampExternalUrl('javascript:alert(1)'), '');
  assert.equal(clampExternalUrl('data:text/html,<script>'), '');
  assert.equal(clampExternalUrl('https://example.com/logo.png'), 'https://example.com/logo.png');
  assert.equal(clampExternalUrl('/relative'), '');
});

test('clampInternalPath 只接受站內絕對路徑', () => {
  assert.equal(clampInternalPath('/booking'), '/booking');
  assert.equal(clampInternalPath('//evil.example.com'), '/');
  assert.equal(clampInternalPath('https://evil.example.com'), '/');
  assert.equal(clampInternalPath('/a b'), '/');
});

test('clampText / clampNumber 會截斷並套用上下限', () => {
  assert.equal(clampText('x'.repeat(500), 10).length, 10);
  assert.equal(clampText(42 as unknown as string, 10, 'fallback'), 'fallback');
  assert.equal(clampNumber(9999, 0, 10, 5), 10);
  assert.equal(clampNumber(-1, 0, 10, 5), 0);
  assert.equal(clampNumber('abc' as unknown as number, 0, 10, 5), 5);
});

test('clampLocalized 只保留允許的語系', () => {
  const out = clampLocalized({ 'zh-TW': '你好', 'fr-FR': 'Bonjour' }, ['zh-TW', 'id-ID']);
  assert.deepEqual(out, { 'zh-TW': '你好' });
});

test('normalizeConfig 會丟棄未知欄位並套用預設', () => {
  const config = normalizeConfig({
    brand: { name: '測試', nameAccent: '', tagline: 'x', logoEmoji: '🛫', logoUrl: 'javascript:x' },
    theme: { primary: 'not-a-color', radius: 999 },
    locales: ['zh-TW', 'xx-XX'],
    defaultLocale: 'xx-XX',
    copy: { 'home.title': { 'zh-TW': '標題' }, 'bad key!': { 'zh-TW': 'x' } },
    airports: [{ code: 'tpe', name: {}, city: {}, country: 'TW', role: 'origin' }, { code: 'T1' }],
    flights: [{ origin: 'TPE', destination: 'TPE' }, { origin: 'TPE', destination: 'BKK', price: 100 }],
    booking: { maxAdults: 99, serviceFee: -5 },
    features: { booking: 'false', bogus: true },
  });

  assert.equal(config.brand.name, '測試');
  assert.equal(config.brand.logoUrl, '');
  assert.equal(config.theme.primary, '#126e70', '非法色碼應退回預設');
  assert.equal(config.theme.radius, 48);
  assert.deepEqual(config.locales, ['zh-TW']);
  assert.equal(config.defaultLocale, 'zh-TW');
  assert.ok('home.title' in config.copy);
  assert.ok(!('bad key!' in config.copy));
  assert.equal(config.airports.length, 1);
  assert.equal(config.airports[0].code, 'TPE');
  assert.equal(config.flights.length, 1);
  assert.equal(config.booking.maxAdults, 9);
  assert.equal(config.booking.serviceFee, 0);
  assert.equal(config.features.booking, false);
  assert.ok(!('bogus' in config.features));
});

test('translate 依序退回 default 語系與內建文案', () => {
  const copy = resolveCopy(normalizeConfig({ locales: ['zh-TW', 'id-ID'] }));
  assert.equal(translate(copy, 'home.title', 'id-ID', 'zh-TW'), 'Berangkat lebih tenang');
  assert.equal(translate(copy, 'home.title', 'zh-TW', 'zh-TW'), '出發更簡單，旅程更安心。');
  assert.equal(translate(copy, 'missing.key', 'id-ID', 'zh-TW'), 'missing.key');
});

test('resolveCopy 會以租戶覆寫取代內建文案', () => {
  const config = normalizeConfig({
    locales: ['zh-TW'],
    copy: { 'home.title': { 'zh-TW': '自訂標題' } },
  });
  const copy = resolveCopy(config);
  assert.equal(translate(copy, 'home.title', 'zh-TW', 'zh-TW'), '自訂標題');
});

test('themeCssVariables 輸出可注入的 CSS 變數', () => {
  const config = normalizeConfig({ theme: { primary: '#123456' } });
  const css = themeCssVariables(config);
  assert.match(css, /--primary:#123456/);
  assert.match(css, /--radius:14px/);
  assert.ok(!css.includes('\n'));
});

test('validateSearch 擋掉未服務的機場與過去日期', () => {
  const config = normalizeConfig({
    airports: [
      { code: 'TPE', name: {}, city: {}, country: 'TW', role: 'origin' },
      { code: 'BKK', name: {}, city: {}, country: 'ID', role: 'destination' },
    ],
    booking: { maxAdults: 2 },
  });

  const today = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const past = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);

  assert.deepEqual(
    validateSearch(config, {
      origin: 'TPE',
      destination: 'BKK',
      tripType: 'one-way',
      departureDate: today,
      adults: 1,
    }),
    [],
  );

  assert.ok(validateSearch(config, { origin: 'XXX', destination: 'BKK', tripType: 'one-way', departureDate: today, adults: 1 }).length > 0);
  assert.ok(validateSearch(config, { origin: 'TPE', destination: 'BKK', tripType: 'one-way', departureDate: past, adults: 1 }).length > 0);
  assert.ok(validateSearch(config, { origin: 'TPE', destination: 'TPE', tripType: 'one-way', departureDate: today, adults: 1 }).length > 0);
  assert.ok(validateSearch(config, { origin: 'TPE', destination: 'BKK', tripType: 'one-way', departureDate: today, adults: 9 }).length > 0);
  assert.ok(validateSearch(config, { origin: 'TPE', destination: 'BKK', tripType: 'roundtrip', departureDate: today, adults: 1 }).length > 0);
});

test('mergeConfig 只覆寫送出的欄位並保留機場與航班庫存', () => {
  const existing = normalizeConfig({
    brand: { name: 'Aurora', nameAccent: 'air', tagline: 'NORDIC' },
    airports: [{ code: 'OSL', name: {}, city: {}, country: 'NO', role: 'origin' }],
    flights: [{ origin: 'OSL', destination: 'BKK', price: 100 }],
    booking: { maxAdults: 2 },
  });

  const merged = mergeConfig(existing, {
    brand: { name: 'Aurora Air' },
    theme: { primary: '#b91c1c' },
  });

  assert.equal(merged.brand.name, 'Aurora Air');
  assert.equal(merged.brand.tagline, 'NORDIC', '未送出的品牌欄位應保留');
  assert.equal(merged.theme.primary, '#b91c1c');
  assert.equal(merged.airports.length, 1, '機場庫存不應被清空');
  assert.equal(merged.flights.length, 1, '航班庫存不應被清空');
  assert.equal(merged.booking.maxAdults, 2);
});

test('findOffers 只回傳符合航線且有座位的航班', () => {
  const config = normalizeConfig({
    airports: [
      { code: 'TPE', name: {}, city: {}, country: 'TW', role: 'origin' },
      { code: 'BKK', name: {}, city: {}, country: 'ID', role: 'destination' },
    ],
    flights: [
      { id: 'a', origin: 'TPE', destination: 'BKK', price: 100, seatsLeft: 5, active: true },
      { id: 'b', origin: 'TPE', destination: 'BKK', price: 80, seatsLeft: 1, active: true },
      { id: 'c', origin: 'TPE', destination: 'BKK', price: 50, seatsLeft: 5, active: false },
      { id: 'd', origin: 'KHH', destination: 'BKK', price: 40, seatsLeft: 5, active: true },
    ],
  });

  const offers = findOffers(config, {
    origin: 'TPE',
    destination: 'BKK',
    tripType: 'one-way',
    departureDate: '2030-01-01',
    adults: 2,
  });

  assert.deepEqual(offers.map((o) => o.id), ['a'], '座位不足與未上架者應被排除');
});
