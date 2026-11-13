import { randomUUID } from 'node:crypto';
import { getDb, nowIso } from './db';
import { normalizeConfig, type TenantConfig } from './config';

/** 對外可用的租戶檢視欄位（不含 config JSON）。 */
export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant extends TenantSummary {
  config: TenantConfig;
}

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
  config: string;
  created_at: string;
  updated_at: string;
}

function toTenant(row: TenantRow): Tenant {
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(row.config);
  } catch {
    parsed = {};
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    domain: row.domain,
    status: row.status,
    plan: row.plan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    config: normalizeConfig(parsed),
  };
}

export function listTenants(): TenantSummary[] {
  const rows = getDb()
    .prepare('SELECT * FROM tenants ORDER BY created_at ASC')
    .all() as unknown as TenantRow[];
  return rows.map((r) => toTenant(r));
}

export function getTenantById(id: string): Tenant | null {
  const row = getDb()
    .prepare('SELECT * FROM tenants WHERE id = ?')
    .get(id) as unknown as TenantRow | undefined;
  return row ? toTenant(row) : null;
}

export function getTenantBySlug(slug: string): Tenant | null {
  const row = getDb()
    .prepare('SELECT * FROM tenants WHERE slug = ?')
    .get(slug) as unknown as TenantRow | undefined;
  return row ? toTenant(row) : null;
}

export function getTenantByDomain(domain: string): Tenant | null {
  const row = getDb()
    .prepare('SELECT * FROM tenants WHERE domain = ?')
    .get(domain) as unknown as TenantRow | undefined;
  return row ? toTenant(row) : null;
}

export function createTenant(input: {
  slug: string;
  name: string;
  domain?: string | null;
  plan?: string;
  config: unknown;
}): Tenant {
  const id = randomUUID();
  const now = nowIso();
  const config = normalizeConfig(input.config);
  getDb()
    .prepare(
      `INSERT INTO tenants (id, slug, name, domain, status, plan, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.slug,
      input.name,
      input.domain ?? null,
      input.plan ?? 'demo',
      JSON.stringify(config),
      now,
      now,
    );
  const tenant = getTenantById(id);
  if (!tenant) throw new Error('Tenant creation failed');
  return tenant;
}

export function updateTenantConfig(id: string, rawConfig: unknown): Tenant | null {
  const existing = getTenantById(id);
  if (!existing) return null;
  const config = normalizeConfig(rawConfig);
  getDb()
    .prepare('UPDATE tenants SET config = ?, updated_at = ?, name = ? WHERE id = ?')
    .run(JSON.stringify(config), nowIso(), existing.config.brand.name || existing.name, id);
  return getTenantById(id);
}

export function setTenantStatus(id: string, status: 'active' | 'suspended'): void {
  getDb()
    .prepare('UPDATE tenants SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, nowIso(), id);
}

export function writeAudit(
  tenantId: string | null,
  actor: string,
  action: string,
  detail?: string,
): void {
  getDb()
    .prepare(
      'INSERT INTO audit_log (tenant_id, actor, action, detail, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(tenantId, actor, action, detail ?? null, nowIso());
}

export function listAudit(limit = 100): Array<{
  id: number;
  tenantId: string | null;
  actor: string;
  action: string;
  detail: string | null;
  createdAt: string;
}> {
  const rows = getDb()
    .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?')
    .all(limit) as unknown as Array<{
    id: number;
    tenant_id: string | null;
    actor: string;
    action: string;
    detail: string | null;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    actor: r.actor,
    action: r.action,
    detail: r.detail,
    createdAt: r.created_at,
  }));
}

/* ------------------------------------------------------------------ *
 * 種子資料
 * ------------------------------------------------------------------ */

function meridianConfig(): Record<string, unknown> {
  return {
    brand: {
      name: 'meridian',
      nameAccent: 'way.',
      tagline: 'ASIA ↔ EUROPE',
      logoEmoji: '🧭',
    },
    theme: {
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
      heroLayout: 'split',
    },
    locales: ['zh-TW', 'id-ID'],
    defaultLocale: 'id-ID',
    menu: [
      {
        id: 'booking',
        href: '/booking',
        icon: 'plane',
        enabled: true,
        label: { 'zh-TW': '訂機票', 'id-ID': 'Beli tiket' },
      },
      {
        id: 'orders',
        href: '/orders',
        icon: 'ticket',
        enabled: true,
        label: { 'zh-TW': '我的訂單', 'id-ID': 'Tiket saya' },
      },
      {
        id: 'transfer',
        href: '/transfer',
        icon: 'car',
        enabled: true,
        label: { 'zh-TW': '機場接送', 'id-ID': 'Jemput airport' },
      },
      {
        id: 'support',
        href: '/support',
        icon: 'chat',
        enabled: true,
        label: { 'zh-TW': '聯絡客服', 'id-ID': 'Hubungi tim' },
      },
    ],
    contact: {
      whatsapp: '+886912345678',
      email: 'care@meridianway.example',
      line: '@meridianway',
      address: 'Taoyuan, Taiwan',
    },
    airports: [
      {
        code: 'TPE',
        name: { 'zh-TW': '桃園國際機場', 'id-ID': 'Bandara Taoyuan' },
        city: { 'zh-TW': '桃園', 'id-ID': 'Taoyuan' },
        country: 'TW',
        role: 'origin',
      },
      {
        code: 'KHH',
        name: { 'zh-TW': '高雄國際機場', 'id-ID': 'Bandara Kaohsiung' },
        city: { 'zh-TW': '高雄', 'id-ID': 'Kaohsiung' },
        country: 'TW',
        role: 'origin',
      },
      {
        code: 'BKK',
        name: { 'zh-TW': '曼谷素萬那普機場', 'id-ID': 'Bangkok Suvarnabhumi' },
        city: { 'zh-TW': '曼谷', 'id-ID': 'Bangkok' },
        country: 'TH',
        role: 'destination',
      },
      {
        code: 'SIN',
        name: { 'zh-TW': '新加坡樟宜機場', 'id-ID': 'Singapura Changi' },
        city: { 'zh-TW': '新加坡', 'id-ID': 'Singapura' },
        country: 'SG',
        role: 'destination',
      },
    ],
    flights: [
      {
        id: 'mr-tpe-bkk-1',
        origin: 'TPE',
        destination: 'BKK',
        airline: 'Meridian Air',
        flightNo: 'MR1107',
        departureTime: '08:00',
        arrivalTime: '11:40',
        durationMin: 220,
        price: 8200,
        currency: 'TWD',
        cabin: '經濟艙 Economy',
        baggage: '托運 23kg × 1',
        seatsLeft: 6,
        active: true,
      },
      {
        id: 'mr-tpe-bkk-2',
        origin: 'TPE',
        destination: 'BKK',
        airline: 'Meridian Air',
        flightNo: 'MR1113',
        departureTime: '13:30',
        arrivalTime: '17:10',
        durationMin: 220,
        price: 8900,
        currency: 'TWD',
        cabin: '經濟艙 Economy',
        baggage: '托運 23kg × 1',
        seatsLeft: 3,
        active: true,
      },
      {
        id: 'mr-khh-bkk-1',
        origin: 'KHH',
        destination: 'BKK',
        airline: 'Meridian Air',
        flightNo: 'MR2107',
        departureTime: '09:15',
        arrivalTime: '12:55',
        durationMin: 220,
        price: 8600,
        currency: 'TWD',
        cabin: '經濟艙 Economy',
        baggage: '托運 23kg × 1',
        seatsLeft: 8,
        active: true,
      },
      {
        id: 'mr-tpe-sin-1',
        origin: 'TPE',
        destination: 'SIN',
        airline: 'Meridian Air',
        flightNo: 'MR1207',
        departureTime: '07:30',
        arrivalTime: '11:45',
        durationMin: 255,
        price: 7900,
        currency: 'TWD',
        cabin: '經濟艙 Economy',
        baggage: '托運 23kg × 1',
        seatsLeft: 5,
        active: true,
      },
      {
        id: 'mr-khh-sin-1',
        origin: 'KHH',
        destination: 'SIN',
        airline: 'Meridian Air',
        flightNo: 'MR2207',
        departureTime: '10:40',
        arrivalTime: '14:55',
        durationMin: 255,
        price: 8300,
        currency: 'TWD',
        cabin: '經濟艙 Economy',
        baggage: '托運 23kg × 1',
        seatsLeft: 4,
        active: true,
      },
    ],
    booking: {
      maxAdults: 4,
      luggageOptions: ['手提 7kg（不含）', '托運 23kg × 1', '托運 23kg × 2'],
      serviceFee: 350,
      currency: 'TWD',
      tripTypes: ['one-way', 'roundtrip'],
    },
  };
}
function auroraConfig(): Record<string, unknown> {
  return {
    brand: {
      name: 'aurora',
      nameAccent: 'air',
      tagline: 'NORDIC → ASIA',
      logoEmoji: '🛫',
    },
    theme: {
      background: '#f7f7fb',
      surface: '#ffffff',
      foreground: '#1e2233',
      muted: '#6b7080',
      primary: '#3b4ce0',
      primaryHover: '#2c39b8',
      primaryLight: '#eceefc',
      border: '#e2e4ef',
      accent: '#d97706',
      radius: 12,
      heroLayout: 'centered',
    },
    locales: ['zh-TW', 'en-US'],
    defaultLocale: 'zh-TW',
    menu: [
      {
        id: 'booking',
        href: '/booking',
        icon: 'plane',
        enabled: true,
        label: { 'zh-TW': '訂位', 'en-US': 'Book a flight' },
      },
      {
        id: 'orders',
        href: '/orders',
        icon: 'ticket',
        enabled: true,
        label: { 'zh-TW': '訂單', 'en-US': 'My orders' },
      },
      {
        id: 'support',
        href: '/support',
        icon: 'chat',
        enabled: true,
        label: { 'zh-TW': '客服', 'en-US': 'Support' },
      },
      {
        id: 'transfer',
        href: '/transfer',
        icon: 'car',
        enabled: false,
        label: { 'zh-TW': '接送', 'en-US': 'Transfer' },
      },
    ],
    contact: {
      whatsapp: '+4722000000',
      email: 'care@auroraair.example',
      line: '',
      address: 'Oslo, Norway',
    },
    airports: [
      {
        code: 'OSL',
        name: { 'zh-TW': '奧斯陸機場', 'en-US': 'Oslo Airport' },
        city: { 'zh-TW': '奧斯陸', 'en-US': 'Oslo' },
        country: 'NO',
        role: 'origin',
      },
      {
        code: 'BKK',
        name: { 'zh-TW': '曼谷素萬那普', 'en-US': 'Bangkok Suvarnabhumi' },
        city: { 'zh-TW': '曼谷', 'en-US': 'Bangkok' },
        country: 'TH',
        role: 'destination',
      },
    ],
    flights: [
      {
        id: 'aur-osl-bkk-1',
        origin: 'OSL',
        destination: 'BKK',
        airline: 'Aurora Air',
        flightNo: 'AU771',
        departureTime: '06:20',
        arrivalTime: '13:05',
        durationMin: 645,
        price: 21000,
        currency: 'TWD',
        cabin: '經濟艙 Economy',
        baggage: '托運 23kg × 1',
        seatsLeft: 9,
        active: true,
      },
    ],
    booking: {
      maxAdults: 2,
      luggageOptions: ['手提 8kg', '托運 20kg × 1'],
      serviceFee: 0,
      currency: 'TWD',
      tripTypes: ['one-way'],
    },
  };
}

/** 若資料庫尚未有租戶，寫入兩個示範租戶：品牌色與功能皆不同。 */
export function ensureSeeded(): void {
  const count = (
    getDb().prepare('SELECT COUNT(*) AS n FROM tenants').get() as unknown as { n: number }
  ).n;
  if (count > 0) return;
  createTenant({
    slug: 'meridian',
    name: 'Meridian Way',
    plan: 'demo',
    config: meridianConfig(),
  });
  createTenant({
    slug: 'aurora',
    name: 'Aurora Air',
    plan: 'demo',
    config: auroraConfig(),
  });
}
