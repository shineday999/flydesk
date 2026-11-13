# Flydesk — 多租戶白標訂票 SaaS

> 一個後台，設定出每個使用者自己的前台。
> 白標（white-label）訂票引擎：品牌、主題、文案、選單、機場、航班與價格，
> 全部由後台設定驅動；同一套程式碼同時服務多個品牌。

Flydesk 把「訂票系統」拆成兩層：

| 層 | 內容 | 位置 |
|---|---|---|
| **引擎**（共用） | 版面、訂票流程、API、資料庫 | `src/app/t/[slug]/*`、`src/lib/*` |
| **租戶設定**（個別） | 品牌、主題色、文案、選單、機場、航班、價格、規則 | `tenants.config`（JSON） |

後台改一份設定，前台立刻變。

---

## 快速開始

```bash
npm install
npm run dev          # http://localhost:4310
```

首次啟動會自動建立 `.data/flydesk.db`（Node 內建 `node:sqlite`，零原生相依）
並寫入兩個示範租戶：

- `/t/meridian` — 藍綠色、雙語（`zh-TW` / `id-ID`）、桃園／高雄 → 曼谷／新加坡
- `/t/aurora` — 靛藍色、置中版面、`zh-TW` / `en-US`、奧斯陸 → 曼谷、接送功能關閉

後台在 `/admin`，預設密碼 `flydesk-admin`（可用環境變數 `ADMIN_PASSWORD` 覆蓋；
正式環境未設定 `ADMIN_PASSWORD` 會直接拒絕啟動）。

```bash
export ADMIN_PASSWORD='your-strong-password'
export SESSION_SECRET="$(openssl rand -hex 32)"   # production 必填
```

| 指令 | 說明 |
|---|---|
| `npm run dev` | 開發伺服器（port 4310） |
| `npm run build` / `npm start` | 生產建置／啟動 |
| `npm test` | 單元測試（`node --test`，12 項） |
| `npm run typecheck` | TypeScript 檢查 |

---

## 多租戶模型

### 租戶解析順序

1. **自訂網域** — `tenants.domain` 命中 `Host`
2. **子網域** — `acme.example.com` → slug `acme`
3. **路徑** — `/t/{slug}`
4. **預設租戶** — `DEFAULT_TENANT_SLUG` 環境變數，未設定則取第一個租戶

> 根路徑 `/` 會依主機名稱自動轉址到對應租戶，部署到 Cloudflare Pages 時，
> 只要綁不同自訂網域即可對應不同品牌，不需要改程式。

### 設定結構（`src/lib/config.ts`）

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
  flights:  FlightOffer[]  // 航班庫存與價格
  booking: { maxAdults, luggageOptions, serviceFee, currency, tripTypes }
  demo:    { enabled, notice }
}
```

### 主題機制

後台存的是語意化 token，前台轉成 CSS 變數（`themeCssVariables()`），
版面本身永遠只引用變數，因此換主題不需要重新建置任何前端檔案：

```
後台 #126e70 ──▶ config.theme.primary ──▶ :root{--primary:#126e70}
                                            └─▶ .btn / .menu-icon / .tag / .offer-amount …
```

### 設定更新的合併語意

`PATCH /api/admin/tenants/:id` 採「區段合併、陣列整份替換」：

- `brand` / `theme` / `booking` / `contact` / `demo` / `features` → 逐欄位覆寫
- `copy` → 逐 key 合併
- `menu` / `airports` / `flights` → 有送才整份替換，沒送則保留

後端在寫入前一律呼叫 `normalizeConfig()` 消毒（色碼、URL、路徑、長度、上限、
未知欄位），`mergeConfig()` 的行為有單元測試把關。

---

## 前台頁面

| 路徑 | 說明 |
|---|---|
| `/t/{slug}` | 首頁：hero（版面可切 split / centered / banner）+ 航線摘要 |
| `/t/{slug}/booking` | 三步訂票：搜尋 → 選航班 → 旅客資料 → 確認 → 完成 |
| `/t/{slug}/orders` | 訂單列表（以示範工作階段 cookie 辨識） |
| `/t/{slug}/transfer` | 機場接送：以訂單代號查詢行程 |
| `/t/{slug}/support` | 客服聯絡（WhatsApp / Email / LINE） |
| `/t/{slug}/guide` | 使用說明 |

**版面刻意做成「緊湊單屏」**：桌機是 268px 側欄 + 主欄，表單兩欄並排；
手機（≤900px）側欄轉為底部導覽、表單收成單欄，減少垂直捲動。

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

---

## 資料層

預設使用 Node 內建 `node:sqlite`（`src/lib/db.ts`），schema：

```
tenants(id, slug, name, domain, status, plan, config JSON, created_at, updated_at)
admin_sessions(id, user, ip, created_at, expires_at)
demo_sessions(id, tenant_id, ip, user_agent, created_at, expires_at)
orders(id, tenant_id, session_id, reference, status, currency, total, payload JSON, created_at)
audit_log(id, tenant_id, actor, action, detail, created_at)
```

**換成 Cloudflare D1**：只需替換 `src/lib/db.ts` 與 `src/lib/orders.ts` 內的
`prepare/bind` 呼叫，其餘程式碼不動。D1 部署時請把 `node:sqlite` 相關程式碼
抽成 repository 介面。

---

## 文件

- [`docs/security-audit.md`](docs/security-audit.md) — OWASP Top 10 + CWE Top 25 審計與部署前清單
- [`docs/screenshots/`](docs/screenshots/) — 前台與後台畫面
- [`PROGRESS.md`](PROGRESS.md) — 進度與待辦

## 授權

MIT
