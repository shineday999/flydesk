// 產生「單一檔案交棒包」：Part 0 使用說明 + Part 1 交棒說明 + Part 2 完整原始碼。
// 用途：把專案交給沒有本機檔案系統的接手者（例如線上版 Claude）時，
//       對方只靠這一個附件就能理解專案並重建程式碼。
//
// 用法：node scripts/build-handoff-pack.mjs
// 產出：FLYDESK-HANDOFF-PACK.md（單檔）與 FLYDESK-HANDOFF-PACK.zip（目錄樹版）
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'FLYDESK-HANDOFF-PACK.md');

const EXT = {
  '.ts': 'typescript', '.tsx': 'tsx', '.css': 'css', '.mjs': 'javascript',
  '.sh': 'bash', '.sql': 'sql', '.jsonc': 'jsonc', '.json': 'json',
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.wrangler', '.cloudflare', '.vinext', '.git', 'docs'].includes(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// 收集要內嵌的原始碼檔案
const files = [
  'package.json', 'cloudflare.config.ts', 'vite.config.ts', 'next.config.ts',
  'tsconfig.json', '.dev.vars.example', '.gitignore', 'FLYDESK.md',
  ...walk(join(ROOT, 'src')).map(p => relative(ROOT, p)),
  ...walk(join(ROOT, 'tests')).map(p => relative(ROOT, p)),
  ...walk(join(ROOT, 'scripts')).map(p => relative(ROOT, p)),  // 含本腳本自身
  ...walk(join(ROOT, 'migrations')).map(p => relative(ROOT, p)),
].sort();

const lang = f => EXT[f.slice(f.lastIndexOf('.'))] ?? 'text';

let code = '';
for (const f of files) {
  const body = readFileSync(join(ROOT, f), 'utf8');
  code += `\n### \`${f}\`\n\n\`\`\`${lang(f)}\n${body.replace(/\n+$/, '')}\n\`\`\`\n\n`;
}

const docs = readFileSync(join(ROOT, 'FLYDESK.md'), 'utf8');

const head = `# Flydesk — 專案完整交棒包（單一檔案，含完整原始碼）

> 本檔是**自足式**的：文件 + 每一個原始檔的完整內容都在這裡。
> 收件者不需要、也無法再存取任何外部檔案系統或 Git 倉庫
> （原始倉庫為私有 repo，匿名存取回 404）。
>
> 生成時間：2026-11-13 ｜ 專案：Flydesk（多租戶白標訂票 SaaS）
> 檔案大小見文末統計。

---

## Part 0 — 給收到這份文件的人

### 0.1 這是什麼

一個**多租戶白標訂票 SaaS** 的完整交棒包。同一套共用引擎，透過後台設定驅動出每個租戶
自己的前台（品牌、主題色、文案、選單、機場、航班與價格）。已上線於 \`https://sabre.us.ci\`。

### 0.2 怎麼用這份文件

1. **Part 1** 是交棒說明：專案位置、架構、操作指令、踩過的坑、待辦、安全審計。
   先讀這裡建立全局理解。
2. **Part 2** 是**完整原始碼**，每個檔案以 \`### \\\`路徑\\\`\` 標題分隔。
   要動哪個檔案就從哪個標題開始讀，**不要一次通讀**。

### 0.3 建議直接貼給 Claude 的開場白

\`\`\`\`
我有一個已上線的專案要接手（多租戶白標訂票 SaaS，Cloudflare Workers + D1）。
附件是完整交棒包：Part 1 是交棒說明，Part 2 是每一個原始檔的完整內容。

請先只讀 Part 1，然後回答：
1. 你對這個架構的理解（引擎層／租戶設定層怎麼分的？主題機制怎麼運作？）
2. 目前最大的三個技術債或風險是什麼，請依你讀到的證據排序
3. 如果要動手，你想先從哪個檔案下手、為什麼

注意：這個 repo 目前沒有 CI，測試用 \`npm test\`（node --test，12 項）、
型別用 \`npm run typecheck\`、建置用 \`npm run build\`。
部署到 Workers 用 \`npm run deploy\`（需 CLOUDFLARE_API_TOKEN）。
別把 \`.dev.vars\` 的值寫進任何檔案。
\`\`\`

### 0.4 如果你只有這份文件、沒有本機環境

可以完整重建專案：Part 2 內含所有檔案內容，依相對路徑寫回即可。
重建步驟：

\`\`\`bash
mkdir -p flydesk && cd flydesk
# 把 Part 2 內各檔案寫回相對路徑
cp .dev.vars.example .dev.vars   # 然後填入 ADMIN_PASSWORD / SESSION_SECRET
npm install
npm test        # 應為 12/12
npm run typecheck
npm run build
\`\`\`

---

## Part 1 — 交棒說明

`;

const foot = `
---

## 統計

| 項目 | 值 |
|---|---|
| Part 1（交棒說明） | ${docs.split('\n').length} 行 |
| Part 2（原始碼） | ${files.length} 個檔案 / ${code.split('\n').length} 行 |
| 合計 | ${(docs.split('\n').length + code.split('\n').length + 150).toLocaleString()} 行 |

### Part 2 收錄的檔案清單

${files.map(f => `- \`${f}\``).join('\n')}
`;

writeFileSync(OUT, head + docs + '\n---\n\n## Part 2 — 完整原始碼\n' + code + foot);
console.log('written', OUT);

// 同時產生 zip 版（保留目錄樹，供需要按路徑定位檔案的接手者）
const ZIP = OUT.replace(/\.md$/, '.zip');
try {
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, cpSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const stage = mkdtempSync(join(tmpdir(), 'flydesk-pack-'));
  const dir = join(stage, 'flydesk');
  mkdirSync(dir, { recursive: true });
  for (const f of files) {
    const dest = join(dir, f);
    mkdirSync(join(dest, '..'), { recursive: true });
    cpSync(join(ROOT, f), dest);
  }
  cpSync(join(ROOT, 'docs'), join(dir, 'docs'), { recursive: true });
  cpSync(OUT, join(stage, OUT.split('/').pop()));
  execFileSync('zip', ['-qr', ZIP, '.'], { cwd: stage });
  rmSync(stage, { recursive: true, force: true });
  console.log('written', ZIP);
} catch (err) {
  console.warn('zip 未產生（需要 zip 指令）：', err.message);
}
