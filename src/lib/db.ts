import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * 資料層。
 *
 * 預設使用 Node 內建的 `node:sqlite`（零原生相依），
 * 資料庫檔案位置由 FLYDESK_DB_PATH 指定，預設 ./.data/flydesk.db。
 *
 * 換成 Cloudflare D1 時，只要把這四個函式換成 D1 的 prepare/bind 即可，
 * 上層（tenants.ts / api routes）完全不用動。
 */

export const DB_PATH =
  process.env.FLYDESK_DB_PATH ?? path.join(process.cwd(), '.data', 'flydesk.db');

let db: DatabaseSync | null = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  domain      TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  plan        TEXT NOT NULL DEFAULT 'demo',
  config      TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id          TEXT PRIMARY KEY,
  user        TEXT NOT NULL,
  ip          TEXT,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_sessions (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  reference   TEXT NOT NULL,
  status      TEXT NOT NULL,
  currency    TEXT NOT NULL,
  total       REAL NOT NULL,
  payload     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id   TEXT,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  detail      TEXT,
  created_at  TEXT NOT NULL
);
`;

export function getDb(): DatabaseSync {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  if (dir && dir !== '.' && !DB_PATH.startsWith(':memory:')) {
    mkdirSync(dir, { recursive: true });
  }
  db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  return db;
}

/** 測試用：重置連線（避免跨測試共用同一個檔案）。 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
