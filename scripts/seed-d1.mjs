#!/usr/bin/env node
/**
 * 把示範租戶寫入 D1。
 *
 * 用法：
 *   node scripts/seed-d1.mjs            # 遠端 D1
 *   node scripts/seed-d1.mjs --local     # 本機 D1（wrangler 本機狀態）
 *
 * 設定來源為 src/lib/seed-config.ts，與應用程式在資料庫為空時自動建立的內容一致。
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const { normalizeConfig } = await import('../src/lib/config.ts');
const { meridianConfig, auroraConfig } = await import('../src/lib/seed-config.ts');

const local = process.argv.includes('--local');
const dbName = 'flydesk';

const tenants = [
  { slug: 'meridian', name: 'Meridian Way', config: meridianConfig() },
  { slug: 'aurora', name: 'Aurora Air', config: auroraConfig() },
];

const now = new Date().toISOString();
const esc = (value) => String(value).replace(/'/g, "''");

const statements = [];
for (const t of tenants) {
  const config = normalizeConfig(t.config);
  statements.push(
    `INSERT OR REPLACE INTO tenants (id, slug, name, domain, status, plan, config, created_at, updated_at)
     VALUES ('${randomUUID()}', '${esc(t.slug)}', '${esc(t.name)}', NULL, 'active', 'demo', '${esc(
       JSON.stringify(config),
     )}', '${now}', '${now}');`,
  );
}

const sqlFile = '/tmp/flydesk-seed.sql';
writeFileSync(sqlFile, statements.join('\n'), 'utf8');

const args = ['d1', 'execute', dbName, '--file=' + sqlFile];
if (local) args.push('--local');
else args.push('--remote');

console.log(`seeding ${dbName} (${local ? 'local' : 'remote'}) …`);
const out = execFileSync('wrangler', args, { encoding: 'utf8' });
console.log(out.trim().split('\n').slice(-6).join('\n'));
console.log(`done → ${tenants.map((x) => x.slug).join(', ')}`);
