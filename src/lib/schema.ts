/**
 * 資料庫 schema（單一來源）。
 *
 * 同一份定義用於兩處：
 *  - 執行期自我初始化（首次查詢時若缺表則建立，見 src/lib/db.ts）
 *  - 產生 migrations/0001_init.sql（npm run d1:migration）
 */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS tenants (
     id          TEXT PRIMARY KEY,
     slug        TEXT NOT NULL UNIQUE,
     name        TEXT NOT NULL,
     domain      TEXT,
     status      TEXT NOT NULL DEFAULT 'active',
     plan        TEXT NOT NULL DEFAULT 'demo',
     config      TEXT NOT NULL,
     created_at  TEXT NOT NULL,
     updated_at  TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
     id          TEXT PRIMARY KEY,
     user        TEXT NOT NULL,
     ip          TEXT,
     created_at  TEXT NOT NULL,
     expires_at  TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS demo_sessions (
     id          TEXT PRIMARY KEY,
     tenant_id   TEXT NOT NULL,
     ip          TEXT,
     user_agent  TEXT,
     created_at  TEXT NOT NULL,
     expires_at  TEXT NOT NULL,
     FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS orders (
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
   )`,
  'CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id)',
  `CREATE TABLE IF NOT EXISTS login_failures (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     ip          TEXT NOT NULL,
     at          INTEGER NOT NULL
   )`,
  'CREATE INDEX IF NOT EXISTS idx_login_failures_ip ON login_failures(ip, at)',
  `CREATE TABLE IF NOT EXISTS audit_log (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     tenant_id   TEXT,
     actor       TEXT NOT NULL,
     action      TEXT NOT NULL,
     detail      TEXT,
     created_at  TEXT NOT NULL
   )`,
];
