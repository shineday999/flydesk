/**
 * 租戶設定模型（Tenant Config Schema）
 *
 * 這是整個 SaaS 的核心：後台編輯的每一個欄位都會落到這份 JSON，
 * 前台再把它翻譯成 CSS 變數、文案、選單與航班庫存。
 *
 * 純 TypeScript、不依賴 Node API，因此可直接用 `node --test` 測試。
 */

export const SUPPORTED_LOCALES = ['zh-TW', 'id-ID', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocalizedText = Record<string, string>;

export interface BrandConfig {
  /** 主品牌名，例如 acme */
  name: string;
  /** 品牌名的點綴尾綴，例如 fly. */
  nameAccent: string;
  /** 副標，例如 TAIWAN → HOME */
  tagline: string;
  /** 文字 Logo（emoji 或符號） */
  logoEmoji: string;
  /** 圖片 Logo URL（僅允許 http/https） */
  logoUrl: string;
}

export type HeroLayout = 'split' | 'centered' | 'banner';

export interface ThemeConfig {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  border: string;
  accent: string;
  radius: number;
  fontStack: string;
  heroLayout: HeroLayout;
}

export interface MenuItem {
  id: string;
  /** 站內路徑，必須以 / 開頭 */
  href: string;
  /** 圖示 key，由前端映射到 SVG */
  icon: string;
  enabled: boolean;
  label: LocalizedText;
}

export interface Airport {
  code: string;
  name: LocalizedText;
  city: LocalizedText;
  country: string;
  role: 'origin' | 'destination' | 'both';
}

export interface FlightOffer {
  id: string;
  origin: string;
  destination: string;
  airline: string;
  flightNo: string;
  /** HH:mm */
  departureTime: string;
  arrivalTime: string;
  durationMin: number;
  price: number;
  currency: string;
  cabin: string;
  baggage: string;
  seatsLeft: number;
  active: boolean;
}

export interface BookingRules {
  maxAdults: number;
  luggageOptions: string[];
  serviceFee: number;
  currency: string;
  tripTypes: Array<'one-way' | 'roundtrip'>;
}

export interface ContactConfig {
  whatsapp: string;
  email: string;
  line: string;
  officialAccountUrl: string;
  address: string;
}

export interface DemoConfig {
  enabled: boolean;
  notice: LocalizedText;
}

export interface TenantConfig {
  brand: BrandConfig;
  theme: ThemeConfig;
  locales: string[];
  defaultLocale: string;
  /** 覆寫用的文案表，key 見 DEFAULT_COPY */
  copy: Record<string, LocalizedText>;
  menu: MenuItem[];
  features: Record<string, boolean>;
  contact: ContactConfig;
  airports: Airport[];
  flights: FlightOffer[];
  booking: BookingRules;
  demo: DemoConfig;
}

/* ------------------------------------------------------------------ *
 * 內建預設
 * ------------------------------------------------------------------ */

export const DEFAULT_THEME: ThemeConfig = {
  background: '#f4f8f8',
  surface: '#ffffff',
  foreground: '#16302f',
  muted: '#5f7a78',
  primary: '#126e70',
  primaryHover: '#0d5759',
  primaryLight: '#e3f1f1',
  border: '#d6e5e4',
  accent: '#b9743a',
  radius: 14,
  fontStack:
    "'Inter', 'Noto Sans TC', 'PingFang TC', 'Noto Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  heroLayout: 'split',
};

export const DEFAULT_MENU: MenuItem[] = [
  { id: 'booking', href: '/booking', icon: 'plane', enabled: true, label: { 'zh-TW': '訂機票', 'id-ID': 'Beli tiket' } },
  { id: 'orders', href: '/orders', icon: 'ticket', enabled: true, label: { 'zh-TW': '我的訂單', 'id-ID': 'Tiket saya' } },
  { id: 'transfer', href: '/transfer', icon: 'car', enabled: true, label: { 'zh-TW': '機場接送', 'id-ID': 'Jemput airport' } },
  { id: 'support', href: '/support', icon: 'chat', enabled: true, label: { 'zh-TW': '聯絡客服', 'id-ID': 'Hubungi tim' } },
];

/** 內建文案：後台未覆寫的 key 會落到這裡。 */
export const DEFAULT_COPY: Record<string, LocalizedText> = {
  'nav.home': { 'zh-TW': '首頁', 'id-ID': 'Beranda' },
  'nav.booking': { 'zh-TW': '訂機票', 'id-ID': 'Beli tiket' },
  'nav.orders': { 'zh-TW': '我的訂單', 'id-ID': 'Tiket saya' },
  'nav.transfer': { 'zh-TW': '機場接送', 'id-ID': 'Jemput airport' },
  'nav.support': { 'zh-TW': '聯絡客服', 'id-ID': 'Hubungi tim' },
  'nav.guide': { 'zh-TW': '使用說明', 'id-ID': 'Cara pakai' },
  'home.kicker': { 'zh-TW': '出發旅程', 'id-ID': 'Saat berangkat' },
  'home.title': { 'zh-TW': '出發更簡單，旅程更安心。', 'id-ID': 'Berangkat lebih tenang' },
  'home.subtitle': {
    'zh-TW': '訂票、付款與查看機票，同一頁完成。',
    'id-ID': 'Pesan, bayar, dan lihat tiket dalam satu halaman.',
  },
  'home.cta': { 'zh-TW': '開始訂票', 'id-ID': 'Mulai memesan' },
  'home.routeTitle': { 'zh-TW': '可訂航線', 'id-ID': 'Rute tersedia' },
  'home.quickTitle': { 'zh-TW': '今天想做什麼？', 'id-ID': 'Apa yang ingin Anda lakukan?' },
  'booking.title': { 'zh-TW': '訂票', 'id-ID': 'Beli tiket' },
  'booking.subtitle': { 'zh-TW': '搜尋並預訂航班', 'id-ID': 'Cari dan pesan penerbangan' },
  'booking.step1': { 'zh-TW': '選擇航班', 'id-ID': 'Pilih MASKapai' },
  'booking.step2': { 'zh-TW': '填寫資料', 'id-ID': 'Isi data' },
  'booking.step3': { 'zh-TW': '付款取票', 'id-ID': 'Pembayaran' },
  'booking.tripType': { 'zh-TW': '票種', 'id-ID': 'Tipe perjalanan' },
  'booking.roundtrip': { 'zh-TW': '來回', 'id-ID': 'Bolak-balik' },
  'booking.oneway': { 'zh-TW': '單程', 'id-ID': 'Sekali jalan' },
  'booking.origin': { 'zh-TW': '出發機場', 'id-ID': 'Bandara asal' },
  'booking.destination': { 'zh-TW': '抵達機場', 'id-ID': 'Bandara tujuan' },
  'booking.departure': { 'zh-TW': '出發日期', 'id-ID': 'Tanggal berangkat' },
  'booking.return': { 'zh-TW': '回程日期', 'id-ID': 'Tanggal kembali' },
  'booking.adults': { 'zh-TW': '成人', 'id-ID': 'Dewasa' },
  'booking.search': { 'zh-TW': '搜尋航班', 'id-ID': 'Cari penerbangan' },
  'booking.select': { 'zh-TW': '選擇', 'id-ID': 'Pilih ini' },
  'booking.noResult': {
    'zh-TW': '沒有符合的航班，換個日期或機場試試。',
    'id-ID': 'Belum ada penerbangan yang sesuai, coba tanggal lain.',
  },
  'booking.passengerTitle': { 'zh-TW': '旅客資訊', 'id-ID': 'Informasi penumpang' },
  'booking.name': { 'zh-TW': '姓名', 'id-ID': 'Nama' },
  'booking.passport': { 'zh-TW': '證件號碼', 'id-ID': 'Nomor identitas' },
  'booking.phone': { 'zh-TW': '手機號碼', 'id-ID': 'Nomor telepon' },
  'booking.email': { 'zh-TW': '電子郵件', 'id-ID': 'Surel' },
  'booking.luggage': { 'zh-TW': '行李方案', 'id-ID': 'Pilihan bagasi' },
  'booking.notes': { 'zh-TW': '備註', 'id-ID': 'Catatan' },
  'booking.next': { 'zh-TW': '繼續', 'id-ID': 'Lanjut' },
  'booking.back': { 'zh-TW': '上一步', 'id-ID': 'Sebelumnya' },
  'booking.confirm': { 'zh-TW': '建立訂單', 'id-ID': 'Buat pesanan' },
  'booking.demoNote': {
    'zh-TW': '免登入即可試用，請填寫範例資料，不需要真實證件。',
    'id-ID': 'Coba tanpa login, gunakan data contoh tanpa dokumen asli.',
  },
  'booking.summary': { 'zh-TW': '訂單明細', 'id-ID': 'Detail pesanan' },
  'booking.total': { 'zh-TW': '合計', 'id-ID': 'Total' },
  'booking.serviceFee': { 'zh-TW': '服務費', 'id-ID': 'Biaya layanan' },
  'booking.created': { 'zh-TW': '訂單已成立', 'id-ID': 'Pesanan telah dibuat' },
  'booking.reference': { 'zh-TW': '訂單代號', 'id-ID': 'Kode pesanan' },
  'booking.download': { 'zh-TW': '下載範例機票', 'id-ID': 'Unduh tiket demo' },
  'orders.title': { 'zh-TW': '我的訂單', 'id-ID': 'Tiket saya' },
  'orders.empty': { 'zh-TW': '還沒有訂單。', 'id-ID': 'Belum ada tiket.' },
  'orders.status': { 'zh-TW': '狀態', 'id-ID': 'Status' },
  'orders.amount': { 'zh-TW': '金額', 'id-ID': 'Jumlah' },
  'orders.date': { 'zh-TW': '建立時間', 'id-ID': 'Tanggal' },
  'transfer.title': { 'zh-TW': '接送服務', 'id-ID': 'Layanan jemput' },
  'transfer.subtitle': {
    'zh-TW': '輸入訂單代號查詢接送安排。',
    'id-ID': 'Masukkan kode pesanan untuk melihat jadwal jemput.',
  },
  'transfer.lookup': { 'zh-TW': '查詢', 'id-ID': 'Cari' },
  'transfer.pickup': { 'zh-TW': '上車地點', 'id-ID': 'Lokasi keberangkatan' },
  'transfer.district': { 'zh-TW': '行政區', 'id-ID': 'Wilayah' },
  'transfer.address': { 'zh-TW': '詳細地址', 'id-ID': 'Alamat lengkap' },
  'support.title': { 'zh-TW': '客服', 'id-ID': 'Hubungi tim' },
  'support.whatsapp': { 'zh-TW': 'WhatsApp', 'id-ID': 'WhatsApp' },
  'support.email': { 'zh-TW': '電子郵件', 'id-ID': 'Surel' },
  'support.line': { 'zh-TW': 'LINE 官方帳號', 'id-ID': 'Akun LINE resmi' },
  'support.hours': { 'zh-TW': '服務時間', 'id-ID': 'Jam layanan' },
  'guide.title': { 'zh-TW': '使用說明', 'id-ID': 'Cara pakai' },
  'common.demo': {
    'zh-TW': '示範模式 · 不會實際訂位或收款',
    'id-ID': 'Mode demo · tidak memesan atau membayar sungguhan',
  },
  'common.language': { 'zh-TW': '語言', 'id-ID': 'Bahasa' },
  'common.loading': { 'zh-TW': '載入中…', 'id-ID': 'Memuat…' },
  'common.error': { 'zh-TW': '發生錯誤，請稍後再試。', 'id-ID': 'Terjadi kesalahan, coba lagi nanti.' },
};

export const DEFAULT_FEATURES: Record<string, boolean> = {
  booking: true,
  orders: true,
  transfer: true,
  support: true,
  guide: true,
  demoBanner: true,
};

export const DEFAULT_CONTACT: ContactConfig = {
  whatsapp: '',
  email: '',
  line: '',
  officialAccountUrl: '',
  address: '',
};

export const DEFAULT_BOOKING_RULES: BookingRules = {
  maxAdults: 4,
  luggageOptions: ['手提 7kg（不含）', '托運 23kg × 1', '托運 23kg × 2'],
  serviceFee: 0,
  currency: 'TWD',
  tripTypes: ['one-way', 'roundtrip'],
};

export const DEFAULT_DEMO: DemoConfig = {
  enabled: true,
  notice: {
    'zh-TW': '流程示範 · 不會實際訂位或收款',
    'id-ID': 'Mode demo · tanpa pemesanan atau pembayaran nyata',
  },
};

/* ------------------------------------------------------------------ *
 * 消毒工具（所有來自後台的資料都必須過這關）
 * ------------------------------------------------------------------ */

const MAX_TEXT = 200;
const MAX_LONG_TEXT = 500;
const MAX_URL = 300;

export function clampText(value: unknown, max = MAX_TEXT, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

/** 只允許 #rgb / #rrggbb 色碼。 */
export function clampHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return v;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  return fallback;
}

/** 只允許 http/https 外部連結；其餘一律清空。 */
export function clampExternalUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (!v) return '';
  if (v.length > MAX_URL) return '';
  let parsed: URL;
  try {
    parsed = new URL(v);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  return parsed.toString().slice(0, MAX_URL);
}

/** 站內路徑：必須以單一 / 開頭，禁止 // 與 protocol-relative。 */
export function clampInternalPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (!v.startsWith('/') || v.startsWith('//')) return fallback;
  if (/[\s"'<>\\]/.test(v)) return fallback;
  return v.slice(0, MAX_URL);
}

export function clampBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function clampLocalized(
  value: unknown,
  locales: string[],
  max = MAX_LONG_TEXT,
): LocalizedText {
  const out: LocalizedText = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [locale, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!locales.includes(locale)) continue;
    if (typeof raw !== 'string') continue;
    out[locale] = raw.trim().slice(0, max);
  }
  return out;
}

export function clampTime(value: unknown, fallback = '08:00'): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return v;
  return fallback;
}

export function clampAirportCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(v)) return '';
  return v;
}

/* ------------------------------------------------------------------ *
 * 設定正規化
 * ------------------------------------------------------------------ */

function normalizeBrand(raw: unknown): BrandConfig {
  const b = (raw ?? {}) as Record<string, unknown>;
  return {
    name: clampText(b.name, 40, 'Flydesk'),
    nameAccent: clampText(b.nameAccent, 20, ''),
    tagline: clampText(b.tagline, 60, ''),
    logoEmoji: clampText(b.logoEmoji, 8, '✈️'),
    logoUrl: clampExternalUrl(b.logoUrl),
  };
}

function normalizeTheme(raw: unknown): ThemeConfig {
  const t = (raw ?? {}) as Record<string, unknown>;
  const layout = t.heroLayout;
  return {
    background: clampHexColor(t.background, DEFAULT_THEME.background),
    surface: clampHexColor(t.surface, DEFAULT_THEME.surface),
    foreground: clampHexColor(t.foreground, DEFAULT_THEME.foreground),
    muted: clampHexColor(t.muted, DEFAULT_THEME.muted),
    primary: clampHexColor(t.primary, DEFAULT_THEME.primary),
    primaryHover: clampHexColor(t.primaryHover, DEFAULT_THEME.primaryHover),
    primaryLight: clampHexColor(t.primaryLight, DEFAULT_THEME.primaryLight),
    border: clampHexColor(t.border, DEFAULT_THEME.border),
    accent: clampHexColor(t.accent, DEFAULT_THEME.accent),
    radius: clampNumber(t.radius, 0, 48, DEFAULT_THEME.radius),
    fontStack: clampText(t.fontStack, 300, DEFAULT_THEME.fontStack),
    heroLayout:
      layout === 'centered' || layout === 'banner' || layout === 'split'
        ? layout
        : DEFAULT_THEME.heroLayout,
  };
}

function normalizeMenu(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return DEFAULT_MENU.map((m) => ({ ...m, label: { ...m.label } }));
  const out: MenuItem[] = [];
  for (const item of raw.slice(0, 12)) {
    const m = (item ?? {}) as Record<string, unknown>;
    const id = clampText(m.id, 30, '');
    if (!id) continue;
    out.push({
      id,
      href: clampInternalPath(m.href, '/'),
      icon: clampText(m.icon, 30, 'ticket'),
      enabled: clampBool(m.enabled, true),
      label: clampLocalized(m.label, SUPPORTED_LOCALES as unknown as string[], 60),
    });
  }
  return out.length ? out : DEFAULT_MENU.map((m) => ({ ...m, label: { ...m.label } }));
}

function normalizeAirports(raw: unknown): Airport[] {
  if (!Array.isArray(raw)) return [];
  const out: Airport[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 60)) {
    const a = (item ?? {}) as Record<string, unknown>;
    const code = clampAirportCode(a.code);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const role = a.role;
    out.push({
      code,
      name: clampLocalized(a.name, SUPPORTED_LOCALES as unknown as string[], 80),
      city: clampLocalized(a.city, SUPPORTED_LOCALES as unknown as string[], 80),
      country: clampText(a.country, 40, ''),
      role:
        role === 'origin' || role === 'destination' || role === 'both'
          ? role
          : 'both',
    });
  }
  return out;
}

function normalizeFlights(raw: unknown): FlightOffer[] {
  if (!Array.isArray(raw)) return [];
  const out: FlightOffer[] = [];
  for (const item of raw.slice(0, 500)) {
    const f = (item ?? {}) as Record<string, unknown>;
    const origin = clampAirportCode(f.origin);
    const destination = clampAirportCode(f.destination);
    if (!origin || !destination || origin === destination) continue;
    const id = clampText(f.id, 40, '') || `f${out.length + 1}`;
    out.push({
      id,
      origin,
      destination,
      airline: clampText(f.airline, 60, ''),
      flightNo: clampText(f.flightNo, 20, ''),
      departureTime: clampTime(f.departureTime),
      arrivalTime: clampTime(f.arrivalTime),
      durationMin: clampNumber(f.durationMin, 30, 1440, 240),
      price: clampNumber(f.price, 0, 10_000_000, 0),
      currency: clampText(f.currency, 8, 'TWD').toUpperCase(),
      cabin: clampText(f.cabin, 40, ''),
      baggage: clampText(f.baggage, 60, ''),
      seatsLeft: clampNumber(f.seatsLeft, 0, 999, 0),
      active: clampBool(f.active, true),
    });
  }
  return out;
}

function normalizeCopy(raw: unknown, locales: string[]): Record<string, LocalizedText> {
  const out: Record<string, LocalizedText> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-zA-Z0-9_.-]{1,60}$/.test(key)) continue;
    const localized = clampLocalized(value, locales, MAX_LONG_TEXT);
    if (Object.keys(localized).length) out[key] = localized;
  }
  return out;
}

function normalizeBookingRules(raw: unknown): BookingRules {
  const b = (raw ?? {}) as Record<string, unknown>;
  const tripTypes = Array.isArray(b.tripTypes)
    ? b.tripTypes.filter((t): t is 'one-way' | 'roundtrip' => t === 'one-way' || t === 'roundtrip')
    : DEFAULT_BOOKING_RULES.tripTypes;
  const luggage = Array.isArray(b.luggageOptions)
    ? b.luggageOptions
        .map((l) => clampText(l, 60, ''))
        .filter(Boolean)
        .slice(0, 10)
    : DEFAULT_BOOKING_RULES.luggageOptions;
  return {
    maxAdults: clampNumber(b.maxAdults, 1, 9, DEFAULT_BOOKING_RULES.maxAdults),
    luggageOptions: luggage.length ? luggage : DEFAULT_BOOKING_RULES.luggageOptions,
    serviceFee: clampNumber(b.serviceFee, 0, 100_000, DEFAULT_BOOKING_RULES.serviceFee),
    currency: clampText(b.currency, 8, 'TWD').toUpperCase(),
    tripTypes: tripTypes.length ? tripTypes : DEFAULT_BOOKING_RULES.tripTypes,
  };
}

function normalizeContact(raw: unknown): ContactConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  return {
    whatsapp: clampText(c.whatsapp, 40, DEFAULT_CONTACT.whatsapp),
    email: clampText(c.email, 120, DEFAULT_CONTACT.email),
    line: clampText(c.line, 60, DEFAULT_CONTACT.line),
    officialAccountUrl: clampExternalUrl(c.officialAccountUrl),
    address: clampText(c.address, 200, DEFAULT_CONTACT.address),
  };
}

function normalizeDemo(raw: unknown, locales: string[]): DemoConfig {
  const d = (raw ?? {}) as Record<string, unknown>;
  const notice = clampLocalized(d.notice, locales, MAX_LONG_TEXT);
  return {
    enabled: clampBool(d.enabled, DEFAULT_DEMO.enabled),
    notice: Object.keys(notice).length ? notice : { ...DEFAULT_DEMO.notice },
  };
}

export function normalizeConfig(raw: unknown): TenantConfig {
  const source = (raw ?? {}) as Record<string, unknown>;
  const localesRaw = Array.isArray(source.locales)
    ? source.locales.filter(
        (l): l is string => typeof l === 'string' && SUPPORTED_LOCALES.includes(l as SupportedLocale),
      )
    : [];
  const locales = localesRaw.length ? Array.from(new Set(localesRaw)) : ['zh-TW', 'id-ID'];
  const defaultLocale = locales.includes(String(source.defaultLocale))
    ? String(source.defaultLocale)
    : locales[0];

  const featuresRaw = (source.features ?? {}) as Record<string, unknown>;
  const features: Record<string, boolean> = { ...DEFAULT_FEATURES };
  for (const key of Object.keys(DEFAULT_FEATURES)) {
    features[key] = clampBool(featuresRaw[key], DEFAULT_FEATURES[key]);
  }

  return {
    brand: normalizeBrand(source.brand),
    theme: normalizeTheme(source.theme),
    locales,
    defaultLocale,
    copy: normalizeCopy(source.copy, locales),
    menu: normalizeMenu(source.menu),
    features,
    contact: normalizeContact(source.contact),
    airports: normalizeAirports(source.airports),
    flights: normalizeFlights(source.flights),
    booking: normalizeBookingRules(source.booking),
    demo: normalizeDemo(source.demo, locales),
  };
}

/* ------------------------------------------------------------------ *
 * 文案解析與主題輸出
 * ------------------------------------------------------------------ */

/** 合併內建文案與租戶覆寫；回傳的每一個 key 都至少有一個語系值。 */
export function resolveCopy(config: TenantConfig): Record<string, LocalizedText> {
  const merged: Record<string, LocalizedText> = {};
  for (const [key, value] of Object.entries(DEFAULT_COPY)) {
    merged[key] = { ...value };
  }
  for (const [key, value] of Object.entries(config.copy)) {
    merged[key] = { ...(merged[key] ?? {}), ...value };
  }
  return merged;
}

/** 多語系取值：找不到時依序退回 defaultLocale、en-US、第一個可用值。 */
export function translate(
  copy: Record<string, LocalizedText>,
  key: string,
  locale: string,
  fallbackLocale?: string,
): string {
  const entry = copy[key];
  if (!entry) return key;
  const candidates = [locale, fallbackLocale, 'en-US', 'zh-TW'].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const value = entry[candidate];
    if (typeof value === 'string' && value.trim()) return value;
  }
  const first = Object.values(entry).find((v) => typeof v === 'string' && v.trim());
  return first ?? key;
}

/** 產生注入前台 <style> 的 CSS 變數。 */
export function themeCssVariables(config: TenantConfig): string {
  const t = config.theme;
  return [
    `--bg:${t.background}`,
    `--surface:${t.surface}`,
    `--fg:${t.foreground}`,
    `--muted:${t.muted}`,
    `--primary:${t.primary}`,
    `--primary-hover:${t.primaryHover}`,
    `--primary-light:${t.primaryLight}`,
    `--border:${t.border}`,
    `--accent:${t.accent}`,
    `--radius:${t.radius}px`,
    `--font:${t.fontStack}`,
  ].join(';');
}

/* ------------------------------------------------------------------ *
 * 搜尋驗證（伺服器端權威，client 端重用同一套規則）
 * ------------------------------------------------------------------ */

export interface SearchInput {
  origin: string;
  destination: string;
  tripType: 'one-way' | 'roundtrip';
  departureDate: string;
  returnDate?: string;
  adults: number;
}

export function isIsoDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayIn(timeZone = 'Asia/Taipei'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * 驗證搜尋條件。回傳錯誤訊息陣列，空陣列代表通過。
 * 規則嚴格：起源/目的地必須在租戶機場清單內，日期不得為過去。
 */
export function validateSearch(config: TenantConfig, input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['Search must be an object.'];
  }
  const s = input as Record<string, unknown>;
  const origin = clampAirportCode(s.origin);
  const destination = clampAirportCode(s.destination);
  const tripType = s.tripType === 'roundtrip' ? 'roundtrip' : 'one-way';
  const departureDate = typeof s.departureDate === 'string' ? s.departureDate : '';
  const returnDate = typeof s.returnDate === 'string' ? s.returnDate : '';
  const adults = Number(s.adults);

  const codes = new Set(config.airports.map((a) => a.code));
  if (!origin || !codes.has(origin)) errors.push('Origin is not served by this tenant.');
  if (!destination || !codes.has(destination)) errors.push('Destination is not served by this tenant.');
  if (origin && destination && origin === destination) {
    errors.push('Origin and destination must differ.');
  }
  if (!config.booking.tripTypes.includes(tripType)) {
    errors.push('Trip type is not offered by this tenant.');
  }
  if (!Number.isInteger(adults) || adults < 1 || adults > config.booking.maxAdults) {
    errors.push(`Passenger count must be between 1 and ${config.booking.maxAdults}.`);
  }
  const today = todayIn();
  if (!isIsoDate(departureDate)) {
    errors.push('Departure date must be a valid YYYY-MM-DD date.');
  } else if (departureDate < today) {
    errors.push('Departure date cannot be in the past.');
  }
  if (tripType === 'roundtrip') {
    if (!isIsoDate(returnDate)) {
      errors.push('Round trips require a valid return date.');
    } else if (isIsoDate(departureDate) && returnDate < departureDate) {
      errors.push('Return date cannot be before departure.');
    }
  }
  return errors;
}

/** 把未受信任的輸入轉成安全的搜尋條件（僅供伺服器端使用）。 */
export function normalizeSearch(raw: unknown): SearchInput {
  const s = (raw ?? {}) as Record<string, unknown>;
  const adults = Number(s.adults);
  return {
    origin: clampAirportCode(s.origin),
    destination: clampAirportCode(s.destination),
    tripType: s.tripType === 'roundtrip' ? 'roundtrip' : 'one-way',
    departureDate: typeof s.departureDate === 'string' ? s.departureDate : '',
    returnDate: typeof s.returnDate === 'string' ? s.returnDate : undefined,
    adults: Number.isInteger(adults) ? adults : 1,
  };
}

/**
 * 合併後台送來的設定片段 onto 既有設定。
 *
 * 語意採「區段合併、陣列整份替換」：
 *  - brand / theme / booking / contact / demo / features：逐欄位覆寫
 *  - copy：逐 key 合併
 *  - menu / airports / flights：後台有送就整份替換，沒送則保留
 * 這樣 PATCH 只更新某個區段時，不會把其他區段清空。
 */
export function mergeConfig(existing: TenantConfig, incoming: unknown): TenantConfig {
  const next = (incoming ?? {}) as Record<string, unknown>;
  const current = existing as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...current };

  for (const section of [
    'brand',
    'theme',
    'booking',
    'contact',
    'demo',
    'features',
  ] as const) {
    const value = next[section];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[section] = {
        ...(current[section] as Record<string, unknown> | undefined),
        ...(value as Record<string, unknown>),
      };
    }
  }

  if (next.copy && typeof next.copy === 'object' && !Array.isArray(next.copy)) {
    const incomingCopy = next.copy as Record<string, unknown>;
    const currentCopy = (current.copy ?? {}) as Record<string, unknown>;
    const copy: Record<string, unknown> = { ...currentCopy };
    for (const [key, value] of Object.entries(incomingCopy)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        copy[key] = {
          ...((currentCopy[key] as Record<string, unknown> | undefined) ?? {}),
          ...(value as Record<string, unknown>),
        };
      } else {
        copy[key] = value;
      }
    }
    merged.copy = copy;
  }

  for (const list of ['menu', 'airports', 'flights'] as const) {
    if (Array.isArray(next[list])) merged[list] = next[list];
  }

  if (Array.isArray(next.locales) && next.locales.length) merged.locales = next.locales;
  if (typeof next.defaultLocale === 'string') merged.defaultLocale = next.defaultLocale;

  return normalizeConfig(merged);
}

/** 依租戶航班庫存挑出符合條件的報價。 */
export function findOffers(
  config: TenantConfig,
  input: SearchInput,
): FlightOffer[] {
  const flights = config.flights.filter(
    (f) =>
      f.active &&
      f.origin === input.origin &&
      f.destination === input.destination &&
      f.seatsLeft >= input.adults,
  );
  return flights.sort((a, b) => a.price - b.price);
}
