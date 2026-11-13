#!/usr/bin/env node
/**
 * 由 src/lib/schema.ts 產生 migrations/0001_init.sql，
 * 確保「執行期自我初始化」與「正式 migration」永遠是同一份定義。
 *
 * 用法：npm run d1:migration
 */
import { writeFileSync } from 'node:fs';
import { SCHEMA_STATEMENTS } from '../src/lib/schema.ts';

const header = `-- Flydesk schema（Cloudflare D1）
-- 本檔由 scripts/generate-migration.mjs 依 src/lib/schema.ts 產生，請勿手改。
-- 套用：npm run d1:schema（遠端）/ npm run d1:schema:local（本機）

`;

const target = new URL('../migrations/0001_init.sql', import.meta.url);
writeFileSync(target, header + SCHEMA_STATEMENTS.join(';\n') + ';\n', 'utf8');
console.log(`migrations/0001_init.sql 已更新（${SCHEMA_STATEMENTS.length} 個敘述）`);
