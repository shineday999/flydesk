import { env } from 'cloudflare:workers';
import { SCHEMA_STATEMENTS } from './schema';

/**
 * 資料層：Cloudflare D1（async）。
 *
 * 執行環境為 workerd（vinext dev / Workers）。本機開發同樣使用 D1，
 * 只是資料落在 wrangler 的本機狀態目錄（.wrangler/state），可用
 * `wrangler d1 execute flydesk --local` 直接查詢。
 *
 * 介面刻意保持極簡（all / first / run），方便日後換回其他資料庫。
 */

export interface DbExecutor {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  first<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

/** D1 只接受 null / number / string / ArrayBuffer 類型的綁定參數。 */
function normalizeParams(params: unknown[]): unknown[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (typeof p === 'number' || typeof p === 'string') return p;
    if (p instanceof Date) return p.toISOString();
    return JSON.stringify(p);
  });
}

function db() {
  const binding = env?.DB;
  if (!binding) {
    throw new Error(
      'D1 binding "DB" 未設定。請確認 cloudflare.config.ts 的 env.DB 與 wrangler/vinext 設定。',
    );
  }
  return binding;
}

export async function all<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  ensureSecrets();
  await ensureSchema();
  const stmt = db().prepare(sql);
  const bound = params.length ? stmt.bind(...normalizeParams(params)) : stmt;
  const result = await bound.all<T>();
  return (result?.results ?? []) as T[];
}

export async function first<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  ensureSecrets();
  await ensureSchema();
  const stmt = db().prepare(sql);
  const bound = params.length ? stmt.bind(...normalizeParams(params)) : stmt;
  const row = await bound.first<T>();
  return (row ?? null) as T | null;
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  ensureSecrets();
  await ensureSchema();
  const stmt = db().prepare(sql);
  const bound = params.length ? stmt.bind(...normalizeParams(params)) : stmt;
  await bound.run();
}

/** 批次寫入：同一組操作會一起提交。 */
export async function batch(
  statements: Array<{ sql: string; params?: unknown[] }>,
): Promise<void> {
  const prepared = statements.map((s) =>
    s.params && s.params.length
      ? db().prepare(s.sql).bind(...normalizeParams(s.params))
      : db().prepare(s.sql),
  );
  if (prepared.length) await db().batch(prepared);
}

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 必要憑證檢查。
 *
 * 不分環境一律要求 ADMIN_PASSWORD 與 SESSION_SECRET：
 * Workers 上沒有 NODE_ENV，僅靠 production 判斷會讓缺憑證的部署默默
 * 以預設密碼上線。本機開發則由 .dev.vars 提供開發用值。
 */
export function assertRequiredSecrets(): void {
  const vars = env as unknown as Record<string, string | undefined>;
  const adminPassword = vars?.ADMIN_PASSWORD;
  const sessionSecret = vars?.SESSION_SECRET;
  const missing: string[] = [];
  if (!adminPassword || adminPassword.length < 8) missing.push('ADMIN_PASSWORD (>=8 chars)');
  if (!sessionSecret || sessionSecret.length < 16) missing.push('SESSION_SECRET (>=16 chars)');
  if (missing.length > 0) {
    throw new Error(`[flydesk] Missing required secrets: ${missing.join(', ')}`);
  }
}

let secretsChecked = false;

function ensureSecrets(): void {
  if (secretsChecked) return;
  // 檢查通過後才設旗標：若這裡拋錯，後續呼叫仍會再次檢查並拋出，
  // 不會因為旗標已翻轉而靜默放行缺少憑證的請求。
  assertRequiredSecrets();
  secretsChecked = true;
}

let schemaPromise: Promise<void> | null = null;

/**
 * 確認 schema 存在。
 *
 * 本機開發的 D1 為記憶體型別、重啟即清空；正式環境若尚未套用 migration
 * 也會在此補上，因此第一次查詢時自動建立。
 *
 * 以 Promise 記憶化（而非 boolean 旗標）：同一個 isolate 內若有多個請求
 * 平行進來，彼此必須等待同一份建表工作完成，否則後到的查詢會在表還沒
 * 建好時就去 SELECT，得到 "no such table: tenants"。
 */
function ensureSchema(): Promise<void> {
  if (!schemaPromise) schemaPromise = createSchema();
  return schemaPromise;
}

async function createSchema(): Promise<void> {
  try {
    const row = await db()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tenants'")
      .first<{ name: string }>();
    if (row) return;
  } catch {
    // 查詢本身失敗時仍嘗試建立（下方會拋出真正的錯誤）
  }
  // D1 不支援多敘述字串，逐條執行；CREATE TABLE IF NOT EXISTS 可安全重跑。
  for (const statement of SCHEMA_STATEMENTS) {
    await db().prepare(statement).run();
  }
}
