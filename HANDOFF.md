> **本檔內容已合併至 [`FLYDESK.md`](FLYDESK.md)（單一權威交棒文件）。**
> 維護時兩邊都要更新；若有衝突以 `FLYDESK.md` 為準。

# Flydesk 專案交棒說明

> 給接手後續作業的 AI／開發者。寫於 2026-11-13。
> 本文件是**權威交接來源**：專案路徑、架構、已知缺陷、待辦與操作陷阱都在這裡。
> 另有 `PROGRESS.md`（進度紀錄）與 `README.md`（使用說明）可參考，但若三份有衝突，以本文件為準。

---

## 0. 一分鐘摘要

| 項目 | 值 |
|---|---|
| 專案根目錄 | `/home/abc/claude/flydesk` |
| Git repo | `https://github.com/shineday999/claude-workspace.git`（**monorepo**，flydesk 是其中一個子目錄） |
| 分支 | `feat/flydesk-multi-tenant-saas`（已推送到 origin） |
| PR | https://github.com/shineday999/claude-workspace/pull/1 （狀態 MERGEABLE / CLEAN，**無 CI workflow，所以沒有 checks**） |
| 線上站台 | `https://sabre.us.ci` |
| 租戶入口 | `https://sabre.us.ci/t/meridian`、`https://sabre.us.ci/t/aurora` |
| 後台 | `https://sabre.us.ci/admin` |
| Worker 名稱 | `flydesk`（端點 `https://flydesk.sss2020ci297.workers.dev`） |
| D1 資料庫 | 名稱 `flydesk`，ID `f47a080d-6f80-4795-b231-fa85e9b1914e` |
| Cloudflare 帳號 | `sss2020ci297@gmail.com` |
| 架構 | Cloudflare Workers（vinext 建置）→ D1，**站台完全由邊緣提供，不依賴任何自家主機** |
| 套件管理 | npm（`package-lock.json` 已提交） |

**產品定位**：多租戶白標（white-label）訂票 SaaS。一個後台設定出每個使用者自己的前台——
品牌、主題色、文案、選單、機場、航班與價格全部由後台驅動，同一套引擎同時服務多個品牌。
目前是**學術研究用的示範級**產品：單一管理員、無 RBAC、示範訂單流程（無真實金流）。

---

## 1. 專案在檔案系統的位置（最重要）

```
/home/abc/claude/flydesk/          ← 專案根目錄（cd 進來就在這裡）
├── package.json                  npm scripts 都在這（dev/build/deploy/test/typecheck）
├── cloudflare.config.ts          ★ Worker + D1 + secret binding 的唯一正式宣告處
├── vite.config.ts                Vite（@cloudflare/vite-plugin + vinext）
├── next.config.ts                Next 相容設定
├── tsconfig.json                 TypeScript
├── .dev.vars                     ★ 本機憑證（已 gitignore，**不可 commit**）
├── .dev.vars.example             憑證範本（含長度下限說明，可 commit）
├── .gitignore
├── README.md                     使用說明
├── PROGRESS.md                   進度與歷史待辦
├── HANDOFF.md                    ★ 本檔，交棒說明
│
├── src/
│   ├── lib/                      ★ 核心邏輯，全部在這
│   │   ├── config.ts             租戶設定模型／型別／常數（DEFAULT_THEME/DEFAULT_MENU/DEFAULT_COPY）
│   │   ├── schema.ts             D1 schema 單一來源（migrations 由它產生）
│   │   ├── db.ts                 D1 存取層 + 憑證檢查 + schema 自我初始化
│   │   ├── tenants.ts            租戶 CRUD + ensureSeeded() + audit log
│   │   ├── orders.ts             訂單資料存取
│   │   ├── auth.ts               後台 session（Web Crypto HMAC，無 node:crypto 相依）
│   │   ├── http.ts               同源檢查、JSON 回應、記憶體速率限制 ★待改造
│   │   ├── demo-session.ts       示範訂單工作階段 cookie
│   │   ├── tenant-resolve.ts     主機名稱 → 租戶
│   │   ├── locale.ts / locales.ts 語系解析與文案
│   │   ├── page-helpers.ts       頁面共用的資料讀取
│   │   └── seed-config.ts        示範租戶初始設定（純資料）
│   ├── app/
│   │   ├── page.tsx              根路徑（依主機名稱轉址到租戶）
│   │   ├── layout.tsx / globals.css
│   │   ├── t/[slug]/             ★租戶前台（共用引擎）
│   │   │   ├── layout.tsx        外框（tenant-shell）
│   │   │   ├── page.tsx          首頁（hero：split/centered/banner）
│   │   │   ├── booking/page.tsx  三步訂票
│   │   │   ├── orders/page.tsx   訂單列表
│   │   │   ├── transfer/page.tsx 機場接送
│   │   │   ├── support/page.tsx  客服聯絡
│   │   │   └── guide/page.tsx    使用說明
│   │   ├── admin/                ★後台
│   │   │   ├── page.tsx          登入頁
│   │   │   ├── login-form.tsx / create-tenant-form.tsx
│   │   │   ├── layout.tsx / admin.css
│   │   │   └── tenants/
│   │   │       ├── page.tsx      租戶清單
│   │   │       └── [id]/page.tsx 九分頁設定編輯器
│   │   └── api/
│   │       ├── flights/route.ts  POST 搜尋航班
│   │       ├── orders/route.ts   POST 建立訂單 / GET 列表或查單
│   │       └── admin/
│   │           ├── login/route.ts              POST 登入 / DELETE 登出
│   │           └── tenants/route.ts, [id]/route.ts   GET/POST/PATCH
│   └── components/               tenant-shell / booking-flow / orders-view /
│                                 transfer-view / tenant-editor / icons / locale-switcher
│
├── migrations/0001_init.sql      D1 schema（由 scripts/generate-migration.mjs 產生，勿手改）
├── scripts/
│   ├── seed-d1.mjs               寫入示範租戶到 D1
│   ├── generate-migration.mjs    由 src/lib/schema.ts 產生 migrations/
│   ├── restore-d1.sh             ★災難復原演練（還原本機 D1 並對照線上筆數）
│   └── wrangler.d1.jsonc         ★wrangler CLI 專用設定（見 §5 陷阱 1）
├── tests/config.test.ts          12 項單元測試（node --test）
└── docs/
    ├── security-audit.md         ★OWASP Top 10 + CWE Top 25 審計（部署前必讀）
    └── screenshots/              5 張畫面截圖
```

**專案外的相關檔案**（也在這台機器上）：

| 路徑 | 用途 |
|---|---|
| `/home/abc/.config/systemd/user/flydesk-*.service` / `.timer` | 健康檢查與 D1 備份排程（user-level systemd） |
| `/home/abc/.config/flydesk/healthcheck.sh` | 健康檢查腳本 |
| `/home/abc/.config/flydesk/backup-d1.mjs` | D1 匯出腳本 |
| `/home/abc/.flydesk-backups/` | 備份存放（保留 14 份） |
| `/home/abc/.wrangler/config/default.toml` | wrangler OAuth token（`oauth_token`） |
| `/home/abc/claude/flydesk/.claude/launch.json` | Claude 桌面版的 dev server 啟動設定 |

---

## 2. 核心架構：兩層模型

```
引擎（共用，每個租戶都用同一份）          租戶設定（個別，存在 D1 的 tenants.config JSON）
─────────────────────────────────         ─────────────────────────────────────────────────
版面、訂票流程、API、資料層                 brand / theme / locales / copy / menu /
                                          features / contact / airports / flights /
                                          booking 規則 / demo
```

**主題機制**：後台存語意化 token（如 `theme.primary`）→ `config.themeCssVariables()` 轉成 CSS 變數
（`:root{--primary:#126e70}`）→ 版面永遠只引用變數。所以換主題**不需要重新建置任何前端檔案**，
後台改完立刻生效。

**設定更新語意**（`PATCH /api/admin/tenants/:id`，實作在 `src/lib/config.ts` 的 `mergeConfig()`）：
- `brand` / `theme` / `booking` / `contact` / `demo` / `features` → 逐欄位覆寫
- `copy` → 逐 key 合併
- `menu` / `airports` / `flights` → **有送才整份替換，沒送則保留**

> ⚠️ 這個語意是被真實 bug 逼出來的：早期 PATCH 是整份覆寫，後台改一個欄位就把機場／航班
> 庫存清空。已有單元測試把關，改動 `mergeConfig()` 時務必跑 `npm test`。

**租戶解析順序**（`src/lib/tenant-resolve.ts`）：
自訂網域 `tenants.domain` → 子網域 `acme.example.com` → 路徑 `/t/{slug}` → `DEFAULT_TENANT_SLUG`（未設則取第一個）。

---

## 3. 已知缺陷與待改處（接手後的優先順序）

### P0 — 速率限制跨實例化（唯一剩下的實質安全弱點，CWE-362）

`src/lib/http.ts:66` 是行程內 `Map<string, Bucket>` 實作。Cloudflare Workers 是多 isolate 部署，
每個 isolate 各有一份 Map → 攻擊者只要把請求打散到不同 isolate，登入限流（5 次／10 分鐘）就會被稀釋。

改法選項：
- **KV**（免費方案可用）：`bindings.kv()`，每次請求讀寫計數。延遲較高、計數非嚴格原子。
- **Durable Objects**（免費方案可用）：強一致計數，但需要 DO class + binding，改動較大。
- **Workers 原生 Rate Limiting binding**（`bindings.rateLimit()`）：最省事，但**需要 Workers 付費方案**。
  → 走這條路前**必須先確認帳號方案等級**，這是使用者的範圍決定，不要自行假設。

### P0 — 監控告警管道

健康檢查（`flydesk-healthcheck.timer`，每 15 分鐘）只寫 journald，站台掛掉不會通知到人。
需要接外部通知管道（email / webhook）。注意全域偏好：發信用 **nodemailer + Gmail SMTP**
（`latte.xiaxia@gmail.com`），憑證讀自 `/data2/hermes-profiles/profiles/xiaxiq/.env`，
腳本放 `/home/abc/.claude/temp/email-sender/`。

### P0 — 憑證輪替

`ADMIN_PASSWORD` / `SESSION_SECRET` 目前是自動產生後就沒動過，應納入密碼管理與定期輪替。

### P0 — `npm audit --omit=dev` 尚未執行

這是 `docs/security-audit.md` 部署前必做清單中**唯一未勾**的檢查項，應補跑並把結果寫回審計文件。

### P1 — 其他產品完整性項目（見 `PROGRESS.md` 第三節）

自訂網域的憑證自動簽發與 DNS 驗證、訂單列表分頁、後台編輯器的未儲存離開提醒、
訂單狀態流程（`paid/cancelled/expired`）、報價有效期限（`PRICE_CHANGED` / `QUOTE_EXPIRED`）、
無障礙細修（focus 順序與 aria 標記）、即時客服通道（LINE / WhatsApp Business API）。

---

## 4. 本機開發流程

```bash
cd /home/abc/claude/flydesk
npm install

# 憑證（本機 .dev.vars，已 gitignore；線上用 wrangler secret put）
cp .dev.vars.example .dev.vars
# 然後把 ADMIN_PASSWORD 改成自己的值（>=8 字元）、SESSION_SECRET（>=16 字元）

npm run dev          # http://localhost:4310（workerd + 本機 D1）
npm test             # 12/12
npm run typecheck    # 0 error
npm run build        # 正式建置
```

**本機 D1 是自動初始化的**：首次啟動時 `src/lib/db.ts` 的 `ensureSchema()` 會建表，
`ensureSeeded()` 會寫入兩個示範租戶。所以本機不需要手動跑 `d1:schema` / `d1:seed`，
除非你想重置。

重置本機 D1：刪掉本機 state 目錄（位置見 §5 陷阱 2），重啟 dev server 即可。

---

## 5. 踩過的坑（重複踩一次都很浪費時間）

### 陷阱 1 — wrangler CLI 不讀 `cloudflare.config.ts`

專案用 `cf/config` 的 `defineConfig` 宣告綁定，**wrangler CLI 不會讀這個格式**。
`--remote` 可以用資料庫名稱指定，但 `--local` 必須在 **wrangler 格式**的設定檔裡找到
`d1_databases` 宣告，否則直接報 `Couldn't find a D1 DB ...`。

解法：另備 `scripts/wrangler.d1.jsonc`（只給 wrangler CLI 用），用 `--config` 指定：

```bash
wrangler d1 execute DB --local --config scripts/wrangler.d1.jsonc --command "SELECT 1"
```

### 陷阱 2 — wrangler 本機 state 落在「設定檔所在目錄」旁

`wrangler d1 execute --local` 的 state 落在**設定檔旁**（`scripts/.wrangler/state`），
**不是專案根目錄**。所以重複匯入同一份 SQL 會撞 `table tenants already exists`。

`scripts/restore-d1.sh` 的解法是用專屬目錄 `--persist-to scripts/.wrangler-d1-restore`，
並在匯入前 `rm -rf`，確保可重複執行。這兩個目錄都已加進 `.gitignore`。

### 陷阱 3 — secret binding 沒宣告 → 整片 500

`Missing required secrets: ADMIN_PASSWORD, SESSION_SECRET` 的根因不是「.dev.vars 沒寫」，
而是 **Workers 本機開發只把 `.dev.vars` 的值對應到 `cloudflare.config.ts` 中已宣告的 binding**
（miniflare 的 `resolveLocalBindings` 逐一比對 `env` 宣告）。沒宣告的變數根本不進 worker 的 `env`。

`bindings.secret()` 只宣告「這個 binding 需要 secret 值」，實際值仍由 `.dev.vars`（本機）
或 `wrangler secret put`（線上）提供。**改了 env 宣告後 `.dev.vars` 的鍵名也必須對得上。**

### 陷阱 4 — `cf` CLI 與 wrangler 是兩套認證

`npm run deploy` 走 `cf deploy --prebuilt`，`cf` CLI 需要獨立認證（`cf auth login`）。
若只有 wrangler 已登入，可沿用它的 OAuth token：

```bash
export CLOUDFLARE_API_TOKEN=$(grep -E "^oauth_token" ~/.wrangler/config/default.toml | cut -d'"' -f2)
```

### 陷阱 5 — `npm audit` / `wrangler` 的設定檔向上搜尋遮蔽

wrangler 4 會從 cwd 向上找 `json→jsonc→toml`。`/home/abc/wrangler.jsonc` 曾遮蔽其他專案的
設定，deploy 時要明確 `--config`。在 flydesk 目錄下跑 wrangler 指令時注意這點。

### 陷阱 6 — `pkill -f "vite dev"` 會誤殺自己的 shell

用 `ss -ltnp | grep ':4310'` 取 PID 再 kill，不要用 pkill 配寬鬆 pattern。

---

## 6. 部署與維運

### 部署

```bash
cd /home/abc/claude/flydesk
npm run build
npm run deploy       # = vinext-cloudflare deploy（需 CLOUDFLARE_API_TOKEN 或 cf 已認證）
```

### D1 操作（線上）

```bash
wrangler d1 execute flydesk --remote --command "SELECT slug FROM tenants"
wrangler d1 export flydesk --remote --output /tmp/flydesk.sql
wrangler secret list --name flydesk
```

### 排程（user-level systemd，只用於備份與監控，站台本身不需要主機）

| 項目 | 內容 |
|---|---|
| 健康檢查 | `flydesk-healthcheck.timer`（每 15 分鐘）檢查公開網域與 Worker 端點 |
| 資料備份 | `flydesk-backup.timer`（每日 03:30）`wrangler d1 export`，保留 14 份於 `/home/abc/.flydesk-backups` |

```bash
systemctl --user list-timers | grep flydesk
journalctl --user -u flydesk-healthcheck.service -n 20
```

### 災難復原演練

```bash
scripts/restore-d1.sh                      # 用最新一份備份
scripts/restore-d1.sh /path/to/backup.sql  # 指定備份
```

匯入的是**本機** D1，不動線上資料；腳本會印出本機與線上筆數對照。
真正回灌線上必須人工確認後另外下 `wrangler d1 execute DB --remote --config scripts/wrangler.d1.jsonc --file=...`。

---

## 7. 已驗證的事項（不要重做這些測試）

**本機（清空 D1 全新啟動）**：`/` 307、`/t/meridian` 200、`/t/aurora` 200、
`/t/meridian/booking` 200、`/admin` 200；自動建表 + 種子資料正常。
`npm test` 12/12、`npm run typecheck` 0 error、`npm run build` 成功（16 條路由）。

**線上（版本 `401a7171`）**：全部路由 200；後台正確密碼 200、錯誤密碼 401 `INVALID_CREDENTIALS`、
未登入 API 401 `UNAUTHORIZED`；端到端下單成功（訂單 `SBW7CN8K` / 16150 TWD）、cookie 落地、
訂單列表回 1 筆；**跨租戶隔離**（meridian 的 cookie 在 aurora 查無訂單；以 aurora 取 meridian 的
offer → 404 `OFFER_NOT_FOUND`）；安全標頭齊全（CSP / X-Content-Type-Options / X-Frame-Options /
Referrer-Policy / Permissions-Policy / Cross-Origin-Opener-Policy）；
**後台改主色 → 前台 `--primary` 即時變化且機場庫存沒被清空**。

**視覺**：桌機 1440×900、手機 390×844、第二租戶截圖都已人工檢視，截圖在 `docs/screenshots/`。

---

## 8. 已知的產品限制（誠實揭露，別在文件裡寫得太漂亮）

- 速率限制是記憶體實作，多實例部署需改 KV / Durable Object
- 單一管理員、無 RBAC；適用於研究示範
- 示範流程無報價有效期限、訂單狀態僅 `demo_booked`；接上真實金流需補齊
- 示範租戶資料（meridian / aurora）是種子資料，不是真實航班庫存

---

## 9. 給接手者的注意事項

1. **全域偏好**：全程繁體中文回覆。每次專案開發須遵守四站式 SDLC
   （構思可行性 → 設計規劃含 TDD → 開發驗證 → 部署前審計）。
   **部署前必須通過 OWASP Top 10 + CWE Top 25 安全審計（含不適用項說明）**，
   審計文件在 `docs/security-audit.md`，改動安全相關行為時要同步更新那份文件。
2. **原始碼禁止留痕**：本專案為從零撰寫的獨立實作。**檔案、註解與 commit message 只描述本專案
   自身的設計與決策，不提及任何其他站台的來源**。已全專案 grep 確認乾淨，改動時請維持。
3. **不要 commit 憑證**：`.dev.vars` 已 gitignore。程式碼裡不得出現任何預設憑證值
   （`ADMIN_PASSWORD` / `SESSION_SECRET` 缺任一就拒絕啟動，這是刻意設計）。
4. **改 `src/lib/schema.ts` 後要重產 migration**：`npm run d1:migration`，
   不要手改 `migrations/0001_init.sql`。
5. **改 `mergeConfig()` 後必跑 `npm test`**：有單元測試專門把關陣列整份替換的語意。
6. **部署後一定要實測**：部署成功 ≠ 功能正常。先 `curl` 各路由，再跑一次線上端到端
   （搜尋 → 下單 → cookie → 訂單列表 → 跨租戶隔離），見 §7。
7. **改完要 commit 並推送**到 `feat/flydesk-multi-tenant-saas`，PR #1 的說明要同步更新。
