# Flydesk — 專案完整交棒文件（單一權威來源）

> 給接手後續作業的 AI／開發者。寫於 2026-11-13。
>
> 本檔由 `README.md`、`PROGRESS.md`、`HANDOFF.md`、`docs/security-audit.md` 四份文件合併而成，
> 是**唯一的權威交接來源**：專案位置、架構、操作指令、踩過的坑、待辦、安全審計全都在這裡。
> 若其他檔案與本檔有衝突，以本檔為準。

---

## 目錄

1. [一分鐘摘要](#1-一分鐘摘要)
2. [專案在檔案系統的位置](#2-專案在檔案系統的位置)
3. [快速開始與指令](#3-快速開始與指令)
4. [核心架構](#4-核心架構)
5. [功能頁面與 API](#5-功能頁面與-api)
6. [資料層與 Schema](#6-資料層與-schema)
7. [部署與維運](#7-部署與維運)
8. [踩過的坑](#8-踩過的坑)
9. [待辦（優先順序）](#9-待辦優先順序)
10. [已驗證的事項](#10-已驗證的事項)
11. [產品限制（誠實揭露）](#11-產品限制誠實揭露)
12. [安全審計報告](#12-安全審計報告)
13. [接手者注意事項](#13-接手者注意事項)
14. [歷史與產出](#14-歷史與產出)

---

## 1. 一分鐘摘要

| 項目 | 值 |
|---|---|
| 專案根目錄 | `/home/abc/claude/flydesk` |
| Git repo | `https://github.com/shineday999/flydesk.git`（**獨立 repo**，私有） |
| 分支 | `main`（單一分支，直接推 main） |
| 歷史沿革 | 2026-11-13 從 monorepo `shineday999/claude-workspace` 抽出獨立；原 PR #1 已關閉 |
| 線上站台 | `https://sabre.us.ci` |
| 租戶入口 | `https://sabre.us.ci/t/meridian`、`https://sabre.us.ci/t/aurora` |
| 後台 | `https://sabre.us.ci/admin` |
| Worker 名稱 | `flydesk`（端點 `https://flydesk.sss2020ci297.workers.dev`） |
| D1 資料庫 | 名稱 `flydesk`，ID `f47a080d-6f80-4795-b231-fa85e9b1914e` |
| Cloudflare 帳號 | `sss2020ci297@gmail.com` |
| 架構 | Cloudflare Workers（vinext 建置）→ D1，**站台完全由邊緣提供，不依賴任何自家主機** |
| 套件管理 | npm（`package-lock.json` 已提交） |
| 本機開發埠 | `http://localhost:4310` |

**產品定位**：多租戶白標（white-label）訂票 SaaS。一個後台設定出每個使用者自己的前台——
品牌、主題色、文案、選單、機場、航班與價格全部由後台驅動，同一套引擎同時服務多個品牌。

**目前等級**：學術研究用的**示範級**產品。單一管理員、無 RBAC、示範訂單流程（無真實金流）、
無報價有效期限。

---

## 2. 專案在檔案系統的位置

```
/home/abc/claude/flydesk/          ← 專案根目錄（cd 進來就在這裡）
                                      ★ 這就是獨立 repo 的根，自己有 .git

├── package.json                  npm scripts 都在這（dev/build/deploy/test/typecheck）
├── cloudflare.config.ts          ★ Worker + D1 + secret binding 的唯一正式宣告處
├── vite.config.ts                Vite（@cloudflare/vite-plugin + vinext）
├── next.config.ts                Next 相容設定（安全標頭也設在這）
├── tsconfig.json                 TypeScript
├── .dev.vars                     ★ 本機憑證（已 gitignore，**不可 commit**）
├── .dev.vars.example             憑證範本（含長度下限說明，可 commit）
├── .gitignore
├── FLYDESK.md                    ★ 本檔，單一權威交棒文件
├── README.md / PROGRESS.md / HANDOFF.md / docs/security-audit.md
│                                 （原始文件，內容已合併進本檔）
│
├── src/
│   ├── lib/                      ★ 核心邏輯，全部在這
│   │   ├── config.ts             租戶設定模型／型別／常數（DEFAULT_THEME/DEFAULT_MENU/DEFAULT_COPY）
│   │   │                         ＋ normalizeConfig() 消毒、mergeConfig() 合併、
│   │   │                         themeCssVariables()、validateSearch()
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
│   └── wrangler.d1.jsonc         ★wrangler CLI 專用設定（見 §8 陷阱 1）
├── tests/config.test.ts          12 項單元測試（node --test）
└── docs/
    ├── security-audit.md         OWASP + CWE 審計（內容已合併至本檔 §12）
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
| `/data2/hermes-profiles/profiles/xiaxiq/.env` | Gmail SMTP 憑證（發信用） |

---

## 3. 快速開始與指令

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
除非你想重置。重置方式：刪掉本機 state 目錄（位置見 §8 陷阱 2），重啟 dev server 即可。

| 指令 | 說明 |
|---|---|
| `npm run dev` | 開發伺服器（Vite + workerd + 本機 D1，port 4310） |
| `npm run build` / `npm start` | 生產建置／本機預覽 |
| `npm run deploy` | 部署到 Cloudflare Workers（`vinext-cloudflare deploy`） |
| `npm test` | 單元測試（`node --test`，12 項） |
| `npm run typecheck` | TypeScript 檢查 |
| `npm run cf:types` | 產生 Workers 型別（`.cloudflare/types`） |
| `npm run d1:schema` / `npm run d1:seed` | 套用 D1 schema / 寫入示範租戶 |
| `npm run d1:migration` | 由 `src/lib/schema.ts` 重新產生 `migrations/0001_init.sql` |
| `scripts/restore-d1.sh` | 把備份匯入本機 D1 並對照線上筆數（災難復原演練） |

**示範租戶**：

| Slug | 特徵 |
|---|---|
| `meridian` | 藍綠色、雙語（`zh-TW` / `id-ID`）、桃園／高雄 → 曼谷／新加坡 |
| `aurora` | 靛藍色、置中版面、`zh-TW` / `en-US`、奧斯陸 → 曼谷、接送功能關閉 |

---

## 4. 核心架構

### 4.1 兩層模型

```
引擎（共用，每個租戶都用同一份）          租戶設定（個別，存在 D1 的 tenants.config JSON）
─────────────────────────────────         ─────────────────────────────────────────────────
版面、訂票流程、API、資料層                 brand / theme / locales / copy / menu /
                                          features / contact / airports / flights /
                                          booking 規則 / demo
```

`TenantConfig` 結構：

```ts
interface TenantConfig {
  brand:   { name, nameAccent, tagline, logoEmoji, logoUrl }
  theme:   { background, surface, foreground, muted, primary, primaryHover,
             primaryLight, border, accent, radius, fontStack, heroLayout }
  locales: string[];  defaultLocale: string
  copy:    Record<string, Record<locale, string>>   // 覆寫用的文案表
  menu:    MenuItem[]      // 選單項目（可停用、改名、換 icon）
  features: Record<string, boolean>  // booking / orders / transfer / support / guide
  contact: { whatsapp, email, line, officialAccountUrl, address }
  airports: Airport[]     // 機場庫存
  flights:  FlightOffer[] // 航班庫存與價格
  booking: { maxAdults, luggageOptions, serviceFee, currency, tripTypes }
  demo:    { enabled, notice }
}
```

### 4.2 主題機制

後台存的是**語意化 token**，前台轉成 CSS 變數，版面本身永遠只引用變數。
因此換主題**不需要重新建置任何前端檔案**，後台改完立刻生效。

```
後台 #126e70 ──▶ config.theme.primary ──▶ :root{--primary:#126e70}
                                            └─▶ .btn / .menu-icon / .tag / .offer-amount …
```

### 4.3 設定更新的合併語意

`PATCH /api/admin/tenants/:id` 採「**區段合併、陣列整份替換**」（實作在 `src/lib/config.ts` 的 `mergeConfig()`）：

- `brand` / `theme` / `booking` / `contact` / `demo` / `features` → 逐欄位覆寫
- `copy` → 逐 key 合併
- `menu` / `airports` / `flights` → **有送才整份替換，沒送則保留**

> ⚠️ 這個語意是被真實 bug 逼出來的：早期 PATCH 是整份覆寫，後台改一個欄位就把機場／航班
> 庫存清空。已有單元測試把關，改動 `mergeConfig()` 時務必跑 `npm test`。

後端在寫入前一律呼叫 `normalizeConfig()` 消毒：色碼只收 `#rgb/#rrggbb`、外部 URL 只收
`http/https`、站內路徑禁止 protocol-relative、字串與陣列長度上限、未知欄位丟棄。

### 4.4 租戶解析順序

（`src/lib/tenant-resolve.ts`）

1. **自訂網域** — `tenants.domain` 命中 `Host`
2. **子網域** — `acme.example.com` → slug `acme`
3. **路徑** — `/t/{slug}`
4. **預設租戶** — `DEFAULT_TENANT_SLUG` 環境變數，未設定則取第一個租戶

> 根路徑 `/` 會依主機名稱自動轉址到對應租戶，部署到 Cloudflare Workers 時，
> 只要綁不同自訂網域即可對應不同品牌，不需要改程式。

---

## 5. 功能頁面與 API

### 前台頁面

| 路徑 | 說明 |
|---|---|
| `/t/{slug}` | 首頁：hero（版面可切 split / centered / banner）+ 航線摘要 |
| `/t/{slug}/booking` | 三步訂票：搜尋 → 選航班 → 旅客資料 → 確認 → 完成 |
| `/t/{slug}/orders` | 訂單列表（以示範工作階段 cookie 辨識） |
| `/t/{slug}/transfer` | 機場接送：以訂單代號查詢行程 |
| `/t/{slug}/support` | 客服聯絡（WhatsApp / Email / LINE） |
| `/t/{slug}/guide` | 使用說明 |

**版面刻意做成「緊湊單屏」**（使用者明確要求的 RWD 方向）：桌機是 268px 側欄 + 主欄，
表單兩欄並排；手機（≤900px）側欄轉為底部導覽、表單收成單欄，減少垂直捲動。

### API

| Method | Path | 說明 |
|---|---|---|
| POST | `/api/flights` | 搜尋航班（依租戶機場與庫存驗證） |
| POST | `/api/orders` | 建立示範訂單（自動簽發 demo session cookie） |
| GET | `/api/orders` | 列出工作階段訂單；`?reference=` 可查單筆 |
| POST | `/api/admin/login` | 後台登入（httpOnly + SameSite cookie） |
| DELETE | `/api/admin/login` | 登出 |
| GET/POST | `/api/admin/tenants` | 租戶清單 / 新增 |
| GET/PATCH | `/api/admin/tenants/:id` | 讀取 / 更新租戶設定 |

公開 API 以 `x-tenant-slug` 標頭指定租戶；變更性請求會檢查 `Origin` 同源。

### 後台

`/admin` 登入、`/admin/tenants` 租戶清單與新增、`/admin/tenants/:id` 編輯器
（品牌／主題／文案／選單／機場／航班／規則／聯絡與功能／預覽九個分-tab + iframe 即時預覽）、
操作紀錄（audit log）。

### API 呼叫注意（實測踩過）

- 航班搜尋是 **POST 不是 GET**
- 租戶需以 **`x-tenant-slug` 標頭**指定
- 搜尋欄位名是 **`departureDate`** / `tripType` / `adults`（不是 `depart`）
- `POST /api/admin/tenants/:id` 的 body 必須包成 **`{config:{...}}`**；
  未包時後端會直接回傳現況（回 200 但毫無變化）

---

## 6. 資料層與 Schema

資料層為 Cloudflare D1，介面刻意保持極簡（只有 `all` / `first` / `run` / `batch`），
日後若要換其他資料庫，只需改 `src/lib/db.ts`。

```
tenants(id, slug, name, domain, status, plan, config JSON, created_at, updated_at)
admin_sessions(id, user, ip, created_at, expires_at)
demo_sessions(id, tenant_id, ip, user_agent, created_at, expires_at)
orders(id, tenant_id, session_id, reference, status, currency, total, payload JSON, created_at)
audit_log(id, tenant_id, actor, action, detail, created_at)
```

- schema 定義於 `src/lib/schema.ts`（**單一來源**），`migrations/0001_init.sql` 由
  `scripts/generate-migration.mjs` 依它產生。改 schema 要重產 migration，不要手改 SQL 檔。
- 執行期 `ensureSchema()` 會自我初始化，與正式 migration 永遠是同一份定義。
- D1 不支援多敘述字串，schema 逐條執行，`CREATE TABLE IF NOT EXISTS` 可安全重跑。

---

## 7. 部署與維運

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

### 已完成的 zone 準備

1. 解除 zone 的暫停（paused）狀態 — 暫停時流量不經 Cloudflare 代理
2. 移除原本的佔位 A 記錄（`192.0.2.1`，註記「Placeholder for Worker route」）
3. 先以 Cloudflare Tunnel 驗證端到端流程，再切換為 Worker 自訂網域
   （`PUT /accounts/{id}/workers/domains`，由 Cloudflare 建立 CNAME 與憑證）

### 排程（user-level systemd，只用於備份與監控，站台本身不需要主機）

| 項目 | 內容 |
|---|---|
| 健康檢查 | `flydesk-healthcheck.timer`（每 15 分鐘）檢查公開網域與 Worker 端點；腳本 `/home/abc/.config/flydesk/healthcheck.sh` |
| 資料備份 | `flydesk-backup.timer`（每日 03:30）`wrangler d1 export`，保留 14 份於 `/home/abc/.flydesk-backups`；腳本 `/home/abc/.config/flydesk/backup-d1.mjs` |

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
真正回灌線上必須人工確認後另外下：
`wrangler d1 execute DB --remote --config scripts/wrangler.d1.jsonc --file=...`

**已驗證**：備份檔匯入本機後，租戶 2／訂單 2／稽核 4／工作階段 2，與線上遠端 D1 完全一致。

### 環境變數

| 變數 | 用途 | 本機來源 | 線上來源 |
|---|---|---|---|
| `ADMIN_PASSWORD` | 後台密碼 | `.dev.vars` | Worker secret（`wrangler secret put`） |
| `SESSION_SECRET` | session 簽章金鑰 | `.dev.vars` | Worker secret（`wrangler secret put`） |
| `DEFAULT_TENANT_SLUG` | 無主機名稱時的預設租戶 | 程式內建 | 程式內建 |

> **為什麼一定要在 `cloudflare.config.ts` 宣告 secret binding？**
> Workers 的本機開發只會把 `.dev.vars` 的值送進**已宣告的 binding**（miniflare 的
> `resolveLocalBindings` 逐一比對 `env` 宣告）。沒有宣告的變數不會出現在 worker 的
> `env` 裡，於是程式讀不到憑證、頁面整片 500。`bindings.secret()` 只宣告「這個
> binding 需要 secret 值」，實際值仍由 `.dev.vars`（本機）或 `wrangler secret put`（線上）提供。

---

## 8. 踩過的坑

重複踩一次都很浪費時間，逐條列在此。

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

`Missing required secrets: ADMIN_PASSWORD, SESSION_SECRET` 的根因不是「`.dev.vars` 沒寫」，
而是 **Workers 本機開發只把 `.dev.vars` 的值對應到 `cloudflare.config.ts` 中已宣告的 binding**。
沒宣告的變數根本不進 worker 的 `env`。

`bindings.secret()` 只宣告「這個 binding 需要 secret 值」，實際值仍由 `.dev.vars`（本機）
或 `wrangler secret put`（線上）提供。**改了 env 宣告後 `.dev.vars` 的鍵名也必須對得上。**

### 陷阱 4 — `cf` CLI 與 wrangler 是兩套認證

`npm run deploy` 走 `cf deploy --prebuilt`，`cf` CLI 需要獨立認證（`cf auth login`）。
若只有 wrangler 已登入，可沿用它的 OAuth token：

```bash
export CLOUDFLARE_API_TOKEN=$(grep -E "^oauth_token" ~/.wrangler/config/default.toml | cut -d'"' -f2)
```

### 陷阱 5 — wrangler 設定檔向上搜尋遮蔽

wrangler 4 會從 cwd 向上找 `json→jsonc→toml`。`/home/abc/wrangler.jsonc` 曾遮蔽其他專案的
設定，deploy 時要明確 `--config`。在 flydesk 目錄下跑 wrangler 指令時注意這點。

### 陷阱 6 — `pkill -f "vite dev"` 會誤殺自己的 shell

用 `ss -ltnp | grep ':4310'` 取 PID 再 kill，不要用 pkill 配寬鬆 pattern。

### 陷阱 7 — `ensureSeeded()` 與 `updateTenantConfig()` 的行為

`ensureSeeded()` 用 `first()` 判斷是否已存在種子租戶；`updateTenantConfig()` 是**整份覆寫**
（合併語意在 `mergeConfig()` 裡做，不要重複實作）。改這兩個函式前先讀懂呼叫鏈。

---

## 9. 待辦（優先順序）

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

這是 §12.3 部署前必做清單中**唯一未勾**的檢查項，應補跑並把結果寫回審計段落。

### P0 — 補審計事件

`auth.login` / `auth.failed` 尚未寫入 `audit_log`；也未接結構化日誌（JSON）。

### P1 — 產品完整性

- 自訂網域流程：目前只記錄 `tenants.domain` 欄位，缺自動憑證簽發與 DNS 驗證
- 訂單查詢分頁：訂單列表目前無分頁
- 後台編輯器的「未儲存離開提醒」：目前離開分頁會遺失變更
- 訂單狀態流程：`booked / demo_booked` 之後若接上付款閘道需補 `paid / cancelled / expired`
- 報價有效期限：`PRICE_CHANGED` / `QUOTE_EXPIRED` 情境尚未實作
- 無障礙細修：步驟指示器在窄螢幕已隱藏文字，但 focus 順序與 aria 標記尚未稽核
- 即時客服通道：LINE／WhatsApp Business API

### P2 — 部署與研究延伸

- 自訂網域多租戶部署：Pages custom domain + worker route
- A/B 測試主題：同一租戶兩組主題分流，量測轉換率
- 視覺回歸測試：把目前手動截圖流程（headless Chrome `--screenshot`）包成 CI 腳本

---

## 10. 已驗證的事項

**不要重做這些測試。**

### 本機（清空 D1 全新啟動）

`/` 307、`/t/meridian` 200、`/t/aurora` 200、`/t/meridian/booking` 200、`/admin` 200；
自動建表 + 種子資料正常。
`npm test` 12/12、`npm run typecheck` 0 error、`npm run build` 成功（16 條路由）。

### 線上（版本 `401a7171`）

| 項目 | 結果 |
|---|---|
| 全部路由 | 200 |
| 後台登入 | 正確密碼 200、錯誤密碼 401 `INVALID_CREDENTIALS` |
| 未登入 API | 401 `UNAUTHORIZED` |
| 端到端下單 | 訂單 `SBW7CN8K`、總價 16150 TWD、cookie 落地、訂單列表回 1 筆 |
| 跨租戶隔離 | meridian 的 cookie 在 aurora 查無訂單；以 aurora 取 meridian 的 offer → 404 `OFFER_NOT_FOUND` |
| 安全標頭 | CSP、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`、`Cross-Origin-Opener-Policy` 皆存在 |
| 後台改設定即時生效 | PATCH `theme.primary` → 前台 `--primary` 立即改變，且機場庫存未被清空（mergeConfig 生效） |

### 視覺

桌機 1440×900、手機 390×844、第二租戶截圖都已人工檢視，截圖在 `docs/screenshots/`。

### 單元測試涵蓋

消毒（`javascript:`／`data:` URL、`//evil.example.com` protocol-relative、非法色碼、超長字串）、
`mergeConfig()` 合併語意、文案 fallback、搜尋驗證、報價篩選。

---

## 11. 產品限制（誠實揭露）

別在文件裡寫得太漂亮，以下是實際狀況：

- 速率限制是記憶體實作，多實例部署需改 KV / Durable Object
- 單一管理員、無 RBAC；適用於研究示範
- 示範流程無報價有效期限、訂單狀態僅 `demo_booked`；接上真實金流需補齊
- 示範租戶資料（meridian / aurora）是種子資料，不是真實航班庫存
- 示範工作階段以 cookie 識別訂單，未綁定裝置或指紋；同一瀏覽器共用時訂單互相可見

---

## 12. 安全審計報告

- 專案：Flydesk（多租戶白標訂票 SaaS）
- 審計日期：2026-11-13
- 範圍：`flydesk/src/**`（前端、API、資料層、後台）、`next.config.ts`
- 基準：**OWASP Top 10 (2021)** + **CWE Top 25 (2023)**
- 狀態：**可部署至正式環境**，前提是滿足「部署前必做」清單

風險分級：**高** = 可導致遠端程式執行／跨租戶資料外洩／認證繞過；
**中** = 需要特定前提才能利用；**低** = 強化建議。

### 12.1 摘要

| 項目 | 結果 |
|---|---|
| OWASP Top 10 涵蓋 | 10/10 已評估；8 項無重大缺失，2 項為「設計上接受」且已記錄風險 |
| CWE Top 25 涵蓋 | 25/25 已評估；23 項無缺失或已緩解，2 項標記為待改善 |
| 阻擋部署的缺失 | 0（前提：正式環境必須設定 `ADMIN_PASSWORD` 與 `SESSION_SECRET`） |
| 已實測項目 | 同源檢查、速率限制、租戶隔離、密碼比對、cookie 屬性、設定消毒（12 項單元測試） |

### 12.2 OWASP Top 10 (2021)

#### A01 — 存取控制失效（Broken Access Control）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 後台頁面保護 | ✅ 已緩解 | `src/app/admin/tenants/page.tsx`、`src/app/admin/tenants/[id]/page.tsx` 於伺服器端檢查 `verifyAdminSession()`，未登入一律 `redirect('/admin')` |
| 後台 API 保護 | ✅ 已緩解 | `src/app/api/admin/tenants/route.ts`、`[id]/route.ts` 以 `requireAdmin()` 守護，未登入回 `401 UNAUTHORIZED` |
| 租戶資料隔離 | ✅ 已緩解 | `demo_sessions.tenant_id` 與 `orders.tenant_id` 均為外鍵；`listOrdersBySession(sessionId, tenantId)` 與 `findOrderByReference(reference, tenantId)` 一律帶租戶條件；實測跨租戶查詢回空 |
| 停用租戶 | ✅ 已緩解 | `status !== 'active'` 的租戶在 `loadTenantPage()` 與 API 皆視為不存在（404） |
| IDOR | ✅ 已緩解 | 訂單、機場、航班皆以租戶範圍查詢，無法跨租戶引用他租戶的 `offerId`（`POST /api/orders` 以 `tenant.config.flights.find()` 限定） |
| 功能開關 | ✅ 已緩解 | `features` 旗標同時在伺服器端渲染與前端選單生效，停用功能不會因繞過 UI 而暴露 |

**殘餘風險（中）**：`admin_sessions` 無角色／權限模型，後台為單一管理員。適合研究示範，不適合多人組織；若要多人共用需加 RBAC。

#### A02 — 加密機制失效（Cryptographic Failures）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 密碼儲存 | ✅ 已緩解 | 不存明文；以 `HMAC-SHA256(SESSION_SECRET, "pw:" + password)` 比對（`src/lib/auth.ts`） |
| 定時安全比對 | ✅ 已緩解 | `timingSafeEqual()`（長度不同先回 false，避免長度洩漏） |
| Session token | ✅ 已緩解 | 隨機 24 bytes 亂數 + HMAC 簽章；簽章不符即拒絕 |
| 傳輸加密 | ✅ 已緩解 | 部署層需由 Cloudflare 提供 TLS（本專案僅處理應用層） |
| 敏感資料外洩 | ✅ 已緩解 | `Cache-Control: no-store`（`src/lib/http.ts` 的 `json()`）、`/admin/*` 額外設定 no-store（`next.config.ts`） |
| 憑證落地 | ✅ 已緩解 | `ADMIN_PASSWORD` / `SESSION_SECRET` 以 `bindings.secret()` 宣告為 secret binding（`cloudflare.config.ts`），值只存在於 `.dev.vars`（已 gitignore）或 Worker secrets（`wrangler secret put`）；設定檔與版控中皆無憑證值 |

**殘餘風險（低）**：示範工作階段 cookie `flydesk_demo` 承載訂單識別，未加密但為隨機 id 且綁租戶，風險等同 session id。

#### A03 — 注入（Injection）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| SQL 注入 | ✅ 無缺失 | 全部查詢使用 `prepare()` + 具名參數綁定（`src/lib/db.ts`、`src/lib/tenants.ts`、`src/lib/orders.ts`），無字串拼接 SQL |
| XSS | ✅ 已緩解 | React 以 JSX 預設跳脫輸出；無 `dangerouslySetInnerHTML`（唯一例外為租戶主題 CSS 變數注入，值已由 `clampHexColor()` 限定為 `#rgb`/`#rrggbb`） |
| 樣式注入 | ✅ 已緩解 | 主題值僅允許色碼；`fontStack` 經 `clampText(300)` 截斷，內容不含 `url()`／`expression()` |
| 指令注入 | ✅ 無缺失 | 專案不執行任何 shell／子行程；`npm` 指令僅存在於 `package.json` scripts |
| 路徑穿越 | ✅ 無缺失 | 租戶 slug 經 `[^a-z0-9-]` 過濾；無以使用者輸入組檔案路徑的行為 |
| Header 注入 | ✅ 已緩解 | `clampText()` 移除換行與控制字元；JSON 回應由框架序列化 |

**驗證**：`tests/config.test.ts` 覆蓋 `javascript:`／`data:` URL、`//evil.example.com` protocol-relative 路徑、非法色碼、超長字串。

#### A04 — 不安全的設計（Insecure Design）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 租戶設定邊界 | ✅ 已緩解 | 設定 schema 固定（`TenantConfig`），後台只能寫入已知欄位；`normalizeConfig()` 丟棄未知欄位並套用長度／數值上下限 |
| 部分更新語意 | ✅ 已緩解 | `mergeConfig()` 採「區段合併、陣列整份替換」，避免只改一項就清空庫存（曾有此缺陷，已修並補測試） |
| 訂單金額 | ✅ 已緩解 | 金額由伺服器端以 `offer.price * adults + serviceFee` 計算，不採前端回傳值 |
| 報價有效期限 | ⚠️ 待改善（中） | 目前示範流程無報價過期機制；`PRICE_CHANGED`／`QUOTE_EXPIRED` 情境尚未實作，接上真實報價時必須補 |
| 訂單狀態機 | ⚠️ 待改善（低） | 僅 `demo_booked`／`booked`；接上付款閘道需補 `paid`／`cancelled`／`expired` 與合法轉移規則 |

#### A05 — 安全設定錯誤（Security Misconfiguration）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 安全標頭 | ✅ 已緩解 | `next.config.ts` 設定 CSP、`X-Content-Type-Options`、`X-Frame-Options: SAMEORIGIN`、`Referrer-Policy`、`Permissions-Policy`、`Cross-Origin-Opener-Policy`；CSP 含 `object-src 'none'`、`base-uri 'self'`、`frame-ancestors 'self'` |
| 框架指紋 | ✅ 已緩解 | `poweredByHeader: false` |
| 錯誤資訊洩漏 | ✅ 已緩解 | API 以代碼字串回應（`INVALID_SEARCH` 等），不回傳堆疊或 SQL |
| 生產環境密鑰 | ✅ 已緩解 | `SESSION_SECRET` 未設定時 `secret()` 於 production 直接拋錯；`ADMIN_PASSWORD` 未設定時於 production 直接拋錯。Workers 上沒有 `NODE_ENV`，因此改為**任何環境都要求兩個憑證**，缺一即拒絕啟動（`src/lib/db.ts` 的 `assertRequiredSecrets`） |
| 依賴風險 | ⚠️ 待確認（低） | `npm audit` 於安裝時未執行稽核（`--no-audit`）；正式部署前應執行 `npm audit --omit=dev` 並記錄結果 |
| 開發模式外洩 | ✅ 已緩解 | 程式碼不保留任何預設憑證：任何環境（含本機開發）都必須由環境提供 `ADMIN_PASSWORD` / `SESSION_SECRET`，缺一即拒絕啟動；本機以 `.dev.vars`（已 gitignore）提供 |

#### A06 — 易受攻擊與過時的元件（Vulnerable and Outdated Components）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 依賴版本 | ✅ 可接受 | `next@^15.5.0`、`react@^19.1.0`、`vinext@^1.4`；無原生相依 |
| 供應鏈 | ⚠️ 待改善（低） | 未設定 lockfile 稽核政策；建議 CI 加入 `npm audit --audit-level=high` 與 Dependabot |
| 執行環境 | ✅ 已緩解 | Cloudflare Workers（workerd）＋ D1；無本機檔案系統相依，站台由邊緣提供 |

#### A07 — 認證與識別失效（Identification and Authentication Failures）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 密碼比對 | ✅ 已緩解 | HMAC + `timingSafeEqual`；錯誤回應統一為 `INVALID_CREDENTIALS`（不區分使用者存在與否） |
| 暴力破解 | ✅ 已緩解 | 登入以 IP 為鍵限流 5 次／10 分鐘（`src/lib/http.ts` `rateLimit`），超過回 `429 RATE_LIMITED` |
| Session 管理 | ✅ 已緩解 | `httpOnly` + `SameSite=Lax` + `Secure`（production）+ `Path=/`；8 小時到期（`admin_sessions.expires_at`），過期即刪除 |
| 登出 | ✅ 已緩解 | `DELETE /api/admin/login` 刪除資料庫 session 並清除 cookie |
| 預設憑證 | ✅ 已緩解 | 程式碼無任何預設密碼：未設定 `ADMIN_PASSWORD` / `SESSION_SECRET` 即拒絕啟動（任何環境） |
| 密碼策略 | ⚠️ 待改善（低） | 無最小長度／複雜度檢查（密碼由環境變數提供，非使用者註冊） |
| MFA | ➖ 不適用 | 本系統無一般使用者註冊流程，後台為受信任維運者單一入口；接上多租戶帳號系統時需補 |

#### A08 — 軟體與資料完整性失效（Software and Data Integrity Failures）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 依賴完整性 | ✅ 已緩解 | `package-lock.json` 隨專案提交（commit 內容含 lockfile），安裝時以 lockfile 解析 |
| 未驗證的更新 | ⚠️ 待改善（低） | 尚無 CI 的套件簽章／雜湊驗證流程 |
| 序列化 | ✅ 無缺失 | 僅使用 `JSON.parse/stringify` 處理設定與訂單 payload，無物件反序列化 gadget（無 `eval`／`Function`／原生反序列化） |
| 設定完整性 | ✅ 已緩解 | 寫入前一律 `normalizeConfig()`；`audit_log` 記錄每次變更的操作者與內容 |
| 部署完整性 | ⚠️ 待改善（低） | 無 CD 流程；部署憑證與權限管理由 Cloudflare 側負責 |

#### A09 — 安全日誌與監控失效（Security Logging and Monitoring Failures）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 管理操作日誌 | ✅ 已緩解 | `audit_log` 記錄 `tenant.create`／`tenant.update`／`tenant.status`，含操作者、時間、明細；後台「操作紀錄」區塊可查 |
| 認證事件 | ⚠️ 待改善（低） | 登入成功／失敗未寫入 `audit_log`（僅有速率限制與 `401` 回應）；建議補 `auth.login`／`auth.failed` 事件 |
| 應用日誌 | ⚠️ 待改善（低） | 目前僅 Next.js 預設日誌；未接結構化日誌（JSON）與告警 |
| 監控告警 | ➖ 不適用 | 部署層（Cloudflare）提供存取日誌與 WAF 規則，本專案層面不重複實作 |

#### A10 — 伺服器端請求偽造（SSRF）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 外部請求 | ➖ 不適用 | 應用程式**不主動發出任何對外 HTTP 請求**（無 webhook、沒有 URL 抓取、沒有 proxy 端點） |
| 使用者提供的 URL | ✅ 已緩解 | 後台的 `logoUrl` 與 `officialAccountUrl` 僅被**存放與渲染**，不由伺服器抓取；且 `clampExternalUrl()` 僅接受 `http:`/`https:` |
| 上游依賴 | ➖ 不適用 | 無外部 API 整合（LINE LIFF 尚未實作） |

### 12.3 CWE Top 25 (2023)

| # | CWE | 適用性 | 狀態 | 說明 |
|---|---|---|---|---|
| 1 | CWE-787 越界寫入 | ➖ 不適用 | ✅ | TypeScript/JavaScript 執行環境，無手動記憶體操作 |
| 2 | CWE-79 XSS | 適用 | ✅ 已緩解 | React 預設跳脫；無 `dangerouslySetInnerHTML` 使用者可控資料（唯一例外為經白名單驗證的色碼） |
| 3 | CWE-89 SQL 注入 | 適用 | ✅ 已緩解 | 全部 `prepare()` + 參數綁定；無字串拼接 |
| 4 | CWE-416 釋放後使用 | ➖ 不適用 | ✅ | 無手動記憶體管理 |
| 5 | CWE-78 OS 指令注入 | 適用 | ✅ 無缺失 | 不執行外部指令 |
| 6 | CWE-20 輸入驗證不當 | 適用 | ✅ 已緩解 | `normalizeConfig()` 與 `validateSearch()` 為唯一寫入／查詢閘道；12 項單元測試涵蓋邊界 |
| 7 | CWE-125 越界讀取 | ➖ 不適用 | ✅ | 同 CWE-787 |
| 8 | CWE-22 路徑穿越 | 適用 | ✅ 無缺失 | 無使用者輸入組檔案路徑；slug 過濾為 `[a-z0-9-]` |
| 9 | CWE-352 CSRF | 適用 | ✅ 已緩解 | 所有變更性端點檢查 `Origin` 同源（`isSameOrigin()`）；cookie 為 `SameSite=Lax`；後台 session 為 `httpOnly` |
| 10 | CWE-434 不受限制的檔案上傳 | 適用 | ✅ 無缺失 | 系統不接收任何檔案上傳 |
| 11 | CWE-862 缺少授權 | 適用 | ✅ 已緩解 | 見 A01；後台端點統一 `requireAdmin()` |
| 12 | CWE-476 NULL 指標解參考 | 適用 | ✅ 已緩解 | TypeScript 嚴格模式 + `strictNullChecks`；`notFound()` 處理不存在的租戶 |
| 13 | CWE-287 認證不當 | 適用 | ✅ 已緩解 | 見 A07 |
| 14 | CWE-190 整數溢出 | 適用 | ✅ 已緩解 | `clampNumber()` 限制範圍（座位 0–999、成人 1–9、價格上限 1e7）；JS 為雙精度浮點，無整數溢位風險 |
| 15 | CWE-502 不受信任資料反序列化 | 適用 | ✅ 無缺失 | 僅 `JSON.parse`，且對外來字串以 try/catch 包覆並退回空物件 |
| 16 | CWE-77 指令注入 | 適用 | ✅ 無缺失 | 同 CWE-78 |
| 17 | CWE-119 記憶體邊界限制不當 | ➖ 不適用 | ✅ | 同 CWE-787 |
| 18 | CWE-798 硬編碼憑證 | 適用 | ✅ 已緩解 | 原始碼無任何硬編碼密碼；憑證一律由環境提供（`.dev.vars`／Worker secret），缺一即拒絕啟動 |
| 19 | CWE-918 SSRF | 適用 | ✅ 無缺失 | 見 A10 |
| 20 | CWE-306 關鍵功能缺少認證 | 適用 | ✅ 已緩解 | 後台頁面與 API 皆有認證守衛；公開 API 為刻意公開的租戶前台功能，具速率限制與同源檢查 |
| 21 | CWE-362 競爭條件 | 適用 | ⚠️ 待改善（低） | 速率限制為單一實例的記憶體實作；Workers 的 isolate 為多實例，**須改為 KV／Durable Object** 才不會被各實例分開計數。D1 端寫入由 Cloudflare 保證交易一致性 |
| 22 | CWE-269 權限管理不當 | 適用 | ⚠️ 待改善（低） | 單一管理員角色，無細粒度權限；租戶隔離已實作 |
| 23 | CWE-94 程式碼注入 | 適用 | ✅ 無缺失 | 無 `eval`、`new Function`、`dangerouslySetInnerHTML` 使用者資料 |
| 24 | CWE-863 授權不正確 | 適用 | ✅ 已緩解 | 同 CWE-862 |
| 25 | CWE-209 錯誤訊息揭露資訊 | 適用 | ✅ 已緩解 | API 回應僅含代碼字串與驗證訊息，不含堆疊、SQL 或路徑 |

### 12.4 部署前必做清單

- [x] 設定 `ADMIN_PASSWORD`（長度 ≥ 16，勿沿用開發預設值）
- [x] 設定 `SESSION_SECRET`（`openssl rand -hex 32`；未設定時應用會直接拒絕啟動）
- [x] 確認正式環境建置（Workers 無 `NODE_ENV`，一律以 Worker secret 注入）
- [ ] 執行 `npm audit --omit=dev`，高風險項目歸零
- [x] 執行 `npm run build` 並以正式建置重跑一次端到端流程
- [x] Cloudflare 層確認 TLS、HSTS 與 WAF 規則
- [ ] 正式環境是否需要多實例？若是，速率限制改為 KV／Durable Object（見 CWE-362）
- [x] 資料層若改用 Cloudflare D1，確認 `prepare()` 綁定仍為參數化

### 12.5 本次審計同時完成的硬化

| 變更 | 位置 | 目的 |
|---|---|---|
| production 未設定 `ADMIN_PASSWORD` 時拒絕啟動 | `src/lib/auth.ts` | 消除 CWE-798／A05 預設憑證風險 |
| production 未設定 `SESSION_SECRET` 時拒絕啟動 | `src/lib/auth.ts` | 既有實作，本審計確認 |
| 憑證檢查改為「任何環境皆必填」 | `src/lib/db.ts` | Workers 無 `NODE_ENV`，僅靠 production 判斷會讓缺憑證的部署默默上線 |
| 憑證以 secret binding 宣告、值不落地版控 | `cloudflare.config.ts` | 讓本機 `.dev.vars` 與線上 Worker secret 走同一條注入路徑 |
| 憑證檢查通過後才翻轉旗標 | `src/lib/db.ts` | 原先拋錯後旗標已翻轉，後續請求會靜默放行缺憑證的呼叫 |
| schema 初始化改為 Promise 記憶化 | `src/lib/db.ts` | 原以 boolean 旗標在 DDL await 前翻轉，平行請求會 SELECT 尚未建立的表 |

### 12.6 已知且已接受（文件化）的風險

1. **單一管理員、無 RBAC** — 適用於研究示範；多人組織需補角色模型。
2. **速率限制為行程內記憶體實作** — 單實例有效；多實例部署前必須改為 KV／Durable Object。
3. **無報價有效期限** — 示範流程不涉及真實金流；接上報價系統時需補過期與價格變更處理。
4. **示範工作階段以 cookie 識別訂單** — 未綁定裝置或指紋，符合「免登入」產品定位，但同一瀏覽器共用時訂單互相可見。

### 12.7 修訂紀錄

| 日期 | 變更 |
|---|---|
| 2026-11-13 | 初版：OWASP Top 10 與 CWE Top 25 全面評估、部署前清單、硬化項目 |
| 2026-11-13 | 遷移至 Cloudflare Workers + D1 後複審：執行環境改為 Workers＋D1、憑證改為 secret binding 宣告且任何環境必填、補上 secret 落地性與旗標翻轉順序兩項硬化、部署前清單更新 |
| 2026-11-13 | 併入 schema Promise 記憶化硬化；本文檔併入 README／PROGRESS／HANDOFF 成單一交棒文件 |

---

---

## 複審紀錄（2026-11-13）

### 已修正

| 嚴重度 | 問題 | 處置 |
|---|---|---|
| 高 | `GET /api/orders?reference=` 不需登入，卻回傳完整訂單：含旅客護照／電話／Email，以及 `sessionId`（即 `flydesk_demo` cookie 的值）。知道或猜中編號的人可取得個資，並用 `sessionId` 冒用該工作階段讀取其所有訂單 | 新增 `toPublicOrder()`：所有回應移除 `sessionId`；編號查詢只有訂單所屬工作階段才回傳 `passenger` |
| 中 | `clientIp()` 直接信任 `x-forwarded-for` 第一段，攻擊者可隨意偽造，繞過登入與下單的速率限制 | 優先使用 Cloudflare 提供的 `cf-connecting-ip`，其餘僅作本機開發備援 |
| 中 | `auth.ts` 讀 `globalThis.env`，`db.ts` 讀 `cloudflare:workers` 的 `env`。Workers 上前者不存在，可能出現啟動檢查通過、登入卻讀不到 `ADMIN_PASSWORD` | `auth.ts` 改讀同一個 `env` 來源（保留 `process.env` 備援） |
| 中 | 訂單編號僅 6 碼（約 2^30），可被枚舉；`POST /api/orders` 未驗證日期、行程類型、人數與旅客必填欄位 | 編號改為 10 碼（約 2^50，舊編號仍可查）；下單改用與航班搜尋相同的 `validateSearch()`，並要求姓名、電話、有效 Email |
| 低 | 過期的 `admin_sessions`／`demo_sessions` 只在被讀取時才刪除；建立租戶時網域未驗證格式與唯一性，slug 競態會回 500 | 登入時清過期後台 session、建立示範 session 時約 1/20 機率清理；網域限定為合法主機名稱且不得重複；slug 競態改回 409 |
| 高 | 後台登入暴力破解：限流只在記憶體，Workers 多 isolate 下形同無效 | 登入失敗寫入 D1 `login_failures`：每 IP 10 分鐘 5 次、全站 10 分鐘 40 次；被擋時只讀不寫，避免灌爆 D1 寫入額度。取捨：全站上限被打滿時管理員也會被鎖 10 分鐘 |
| 高 | `npm audit --omit=dev` 7 項（1 高 6 中）：`next` 內建 `postcss <= 8.5.22`、`satori` 的 `fflate` | `package.json` 加 `overrides`（`postcss ^8.5.32`、`fflate ^0.8.2`），audit 歸零；型別檢查、測試、`npm run build` 皆通過 |

### 尚未處理（需要決策）

- **訂單與航班 API 的速率限制仍是單一 isolate 的記憶體計數**：Workers 上實際上限會被稀釋。這兩個端點風險較低（編號已加長、個資已遮蔽）；若要精確限流需用 Durable Object、KV 或 Cloudflare WAF 規則，可能產生費用，故未處理。
- **旅客護照以明文存入 D1**；示範用途可接受，接真實訂單前需加密或不存。
- **CSP 含 `script-src 'unsafe-inline'`**，削弱 XSS 防護。
- 本文件先前的描述與程式不符：session cookie 一律 `Secure`（非僅 production）、比對函式為 `safeEqual`（非 `timingSafeEqual`）。


## 13. 接手者注意事項

1. **全域偏好**：全程繁體中文回覆。每次專案開發須遵守四站式 SDLC
   （構思可行性 → 設計規劃含 TDD → 開發驗證 → 部署前審計）。
   **部署前必須通過 OWASP Top 10 + CWE Top 25 安全審計（含不適用項說明）**，
   審計內容見本檔 §12，改動安全相關行為時要同步更新。
2. **原始碼禁止留痕**：本專案為從零撰寫的獨立實作。**檔案、註解與 commit message 只描述本專案
   自身的設計與決策，不提及任何其他站台的來源**。已全專案 grep 確認乾淨，改動時請維持。
3. **不要 commit 憑證**：`.dev.vars` 已 gitignore。程式碼裡不得出現任何預設憑證值
   （`ADMIN_PASSWORD` / `SESSION_SECRET` 缺任一就拒絕啟動，這是刻意設計）。
4. **改 `src/lib/schema.ts` 後要重產 migration**：`npm run d1:migration`，
   不要手改 `migrations/0001_init.sql`。
5. **改 `mergeConfig()` 後必跑 `npm test`**：有單元測試專門把關陣列整份替換的語意。
6. **部署後一定要實測**：部署成功 ≠ 功能正常。先 `curl` 各路由，再跑一次線上端到端
   （搜尋 → 下單 → cookie → 訂單列表 → 跨租戶隔離），見 §10。
7. **改完要 commit 並推送**到本 repo 的 `main`。本 repo 是獨立 repo，不再依賴外部 PR 流程。
8. **本機與線上是同一套程式碼**：沒有 staging 環境。本機 D1 與線上 D1 是不同資料庫，
   線上資料只有備份可回灌。

---

## 14. 歷史與產出

### 遷移軌跡

| 階段 | 架構 | 原因 |
|---|---|---|
| 初版 | Next.js + `node:sqlite`，主機常駐 | 快速驗證多租戶模型 |
| 第二版 | Cloudflare Tunnel → 主機 | 讓網域先上線（但站台依賴主機） |
| 現況 | Cloudflare Workers + D1 | 消除主機依賴，站台由邊緣提供 |

### 過程中修掉的三個真實缺陷（初始版本）

1. **PATCH 整份覆寫**：後台只改一個欄位會把機場／航班庫存清空 → 改為合併語意 + 補測試。
2. **cookie 未落地**：訂單 API 用 `NextResponse.json(..., {headers})` 轉拋 Set-Cookie，
   導致 demo session cookie 遺失、訂單列表讀不到 → 改為在最終 response 上 `cookies.set()`。
3. **型別錯誤**：TSX 內識別字漏字（`slug` 誤寫成 `lug`）→ 已修正。

### Workers + D1 遷移收尾時修掉的兩個缺陷

| # | 症狀 | 根因 | 修法 |
|---|---|---|---|
| 1 | 本機 `npm run dev` 全站 500：`Missing required secrets: ADMIN_PASSWORD, SESSION_SECRET` | `.dev.vars` 存在且內容正確，但**未宣告的變數不會進 worker env**（miniflare 的 `resolveLocalBindings` 只把 `.dev.vars` 的值對應到 `env` 中已宣告的 binding） | 在 `cloudflare.config.ts` 以 `bindings.secret()` 宣告 `ADMIN_PASSWORD` / `SESSION_SECRET` |
| 2 | 本機 `npm run dev` 500：`D1_ERROR: no such table: tenants` | `ensureSchema()` 以 boolean 旗標 `schemaReady` 記憶化，但旗標在 DDL `await` **之前**就翻轉；同一次 render 的平行查詢因此跳過建表等待，直接 SELECT 尚未建立的表 | 改以 **Promise 記憶化**（`schemaPromise`），所有並行呼叫等待同一份建表工作 |

附帶修正：`ensureSecrets()` 原本在檢查**之前**就翻轉旗標，一旦拋錯後續呼叫會靜默放行缺憑證的請求；現改為檢查通過才設旗標。

### Git 產出

| Commit | 內容 |
|---|---|
| `a1ebfaa` | 多租戶白標訂票 SaaS 初始實作 |
| `4fccc4d` | production 缺少憑證時拒絕啟動 |
| `9dd6146` | 記錄 sabre.us.ci 線上部署方式與 zone 準備過程 |
| `f9e6b30` | 遷移至 Cloudflare Workers + D1 |
| `ea25b00` | 記錄 Workers + D1 遷移收尾成果與產出 |
| `7ce6aa8` | 補上 D1 備份還原流程並實測驗證 |
| `c7655be` | 新增 HANDOFF.md 專案交棒說明 |
| `5f28a37` | 四份文件合併為單一交棒文件 FLYDESK.md |
| （最新） | 抽出為獨立 repo，更新文件中的 repo 資訊 |

> 這些 hash 是**抽出獨立 repo 後**的版本（`git subtree split --prefix=flydesk` 會改寫 commit hash）。
> 在原 monorepo 中對應的 hash 為 `f2ef50b / 908f48b / eb6ec9d / ad82587 / 342084d / 418c63d / e362f06 / 687ce56`。

線上版本：`401a7171-e70e-4f6b-aec9-bdb9b6869291`

### 從 monorepo 抽出的過程

2026-11-13 專案從 `shineday999/claude-workspace`（多專案共用一個 repo）抽出為獨立 repo：

```bash
# 在 monorepo 根目錄
git subtree split --prefix=flydesk -b flydesk-standalone   # 保留 8 筆歷史，檔案移到根目錄
cd flydesk && git init -b main && git fetch /home/abc/claude flydesk-standalone
git reset --hard FETCH_HEAD
gh repo create shineday999/flydesk --private --source=. --remote=origin --push
```

monorepo 端則是把 `flydesk/` 加進 `.gitignore`（`main` 從未合併過 flydesk，所以只需忽略目錄，
monorepo 的 git 歷史仍保留全部紀錄），並關閉原 PR #1。

### Connector 更新狀態

| 工具 | 更新前 | 目前 | 備註 |
|---|---|---|---|
| **REA**（npm `rea-agents`） | 6.4.0 | **6.9.0** | 已升級並驗證可執行 |
| **craft-anything-cli** | 0.4.0 | **0.6.1** | 由上游 tag v0.6.1 建置安裝完成 |

- REA 6.9.0 要求 Node `>=22.23.4 / >=24.22.1 / >=26.12.1`；
  系統 Node 24.22.1 符合（`rea` 的 shebang 為 `/usr/bin/env node`），
  但 `/data2/hermes-profiles/tools/node-26.7.0` 內的 Node 26.7.0 **不符合**，
  若 MCP 啟動時 PATH 指到該目錄會失敗，需把該 Node 升到 26.12.1+ 或改用系統 Node。
- craft-anything 升級完成後需重啟 MCP 伺服器才會生效。
