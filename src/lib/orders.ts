import { all, first, nowIso, run } from './db';

export interface OrderRecord {
  id: string;
  tenantId: string;
  sessionId: string;
  reference: string;
  status: string;
  currency: string;
  total: number;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface OrderRow {
  id: string;
  tenant_id: string;
  session_id: string;
  reference: string;
  status: string;
  currency: string;
  total: number;
  payload: string;
  created_at: string;
}

function toOrder(row: OrderRow): OrderRecord {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(row.payload);
  } catch {
    payload = {};
  }
  return {
    id: row.id,
    tenantId: row.tenant_id,
    sessionId: row.session_id,
    reference: row.reference,
    status: row.status,
    currency: row.currency,
    total: row.total,
    payload,
    createdAt: row.created_at,
  };
}

function makeReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // 10 碼 × 32 字母表 ≈ 2^50 種組合；字母表長度剛好 32，取餘數不會有偏差。
  // （舊的 6 碼編號仍可查詢，查詢是整串比對。）
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `SB${out}`;
}

export async function createOrder(input: {
  tenantId: string;
  sessionId: string;
  currency: string;
  total: number;
  status?: string;
  payload: Record<string, unknown>;
}): Promise<OrderRecord> {
  const id = crypto.randomUUID();
  const reference = makeReference();
  const created = nowIso();
  await run(
    `INSERT INTO orders (id, tenant_id, session_id, reference, status, currency, total, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.tenantId,
      input.sessionId,
      reference,
      input.status ?? 'booked',
      input.currency,
      input.total,
      JSON.stringify(input.payload),
      created,
    ],
  );
  return {
    id,
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    reference,
    status: input.status ?? 'booked',
    currency: input.currency,
    total: input.total,
    payload: input.payload,
    createdAt: created,
  };
}

export async function listOrdersBySession(
  sessionId: string,
  tenantId: string,
): Promise<OrderRecord[]> {
  const rows = await all<OrderRow>(
    'SELECT * FROM orders WHERE session_id = ? AND tenant_id = ? ORDER BY created_at DESC',
    [sessionId, tenantId],
  );
  return rows.map(toOrder);
}

export async function getOrderById(id: string, tenantId: string): Promise<OrderRecord | null> {
  const row = await first<OrderRow>('SELECT * FROM orders WHERE id = ? AND tenant_id = ?', [
    id,
    tenantId,
  ]);
  return row ? toOrder(row) : null;
}

export async function findOrderByReference(
  reference: string,
  tenantId: string,
): Promise<OrderRecord | null> {
  const row = await first<OrderRow>(
    'SELECT * FROM orders WHERE reference = ? AND tenant_id = ?',
    [reference, tenantId],
  );
  return row ? toOrder(row) : null;
}

/**
 * 對外回應用的訂單檢視。
 *
 * - 一律移除 sessionId：它就是 flydesk_demo cookie 的值，外洩等於交出該工作階段。
 * - 以訂單編號查詢（任何知道編號的人都能呼叫）時不得回傳旅客個資，
 *   只有持有該訂單所屬工作階段的人（includePassenger=true）才拿得到護照／電話／Email。
 */
export type PublicOrder = Omit<OrderRecord, 'sessionId'>;

export function toPublicOrder(
  order: OrderRecord,
  opts: { includePassenger: boolean },
): PublicOrder {
  const { sessionId: _sessionId, payload, ...rest } = order;
  if (opts.includePassenger) return { ...rest, payload };
  const { passenger: _passenger, ...safePayload } = payload;
  return { ...rest, payload: safePayload };
}
