> **本檔內容已合併至 [`FLYDESK.md`](FLYDESK.md)（單一權威交棒文件）。**
> 維護時兩邊都要更新；若有衝突以 `FLYDESK.md` 為準。

# 工作進度與待辦事項

> 最後更新：2026-11-13
> 專案：`/home/abc/claude/flydesk`（Flydesk — 多租戶白標訂票 SaaS）
> 狀態：**核心功能完成並實測通過；已遷移至 Cloudflare Workers + D1 並上線。**
> 完整交棒內容請見 [`FLYDESK.md`](FLYDESK.md)。

---

## 一、任務來源

建立一個多租戶白標訂票 SaaS：**透過一個後台設定不同使用者的前臺呈現**。
使用者指定兩項要求：

1. 前台要有完整的 RWD，但**畫面不要拉太長** → 採緊湊單屏版面
2. 額外要求更新本機的 MCP connector 工具（REA、craft-anything）

---

## 二、已完成並實測通過

### 2.1 多租戶引擎

| 項目 | 位置 | 狀態 |
|---|---|---|
| 租戶設定模型、正規化、消毒 | `src/lib/config.ts` | 完成 |
| 設定合併語意（PATCH 不會清空其他區段） | `config.mergeConfig()` | 完成（測試把關） |
| 主題 token → CSS 變數 | `config.themeCssVariables()` | 完成 |
| 租戶解析（網域／子網域／路徑／預設） | `src/lib/tenant-resolve.ts` | 完成 |
| 資料層（Cloudflare D1，async all/first/run/batch） | `src/lib/db.ts` | 完成 |
| 後台驗證（HMAC 比對、httpOnly session） | `src/lib/auth.ts` | 完成 |
| 同源檢查、速率限制 | `src/lib/http.ts` | 完成 |

### 2.2 前台（每租戶共用引擎）

`/t/{slug}` 首頁、`/booking` 三步訂票、`/orders`、`/transfer`、`/support`、`/guide`。
所有顏色／文案／選單／機場／航班／價格皆由租戶設定驅動。

### 2.3 後台

`/admin` 登入、`/admin/tenants` 租戶清單與新增、`/admin/tenants/:id` 編輯器
（品牌／主題／文案／選單／機場／航班／規則／聯絡與功能／預覽九個分頁 + iframe 即時預覽）、
操作紀錄（audit log）。

### 2.4 安全審計

`docs/security-audit.md` — OWASP Top 10 (2021) 與 CWE Top 25 (2023) 逐項評估，
含證據位置、殘餘風險、部署前必做清單與已知且已接受的風險。
審計同步完成的硬化：production 未設定 `ADMIN_PASSWORD` 時拒絕啟動。

### 2.5 驗證結果（皆已實測）

- `npm test`：**12/12 通過**（消毒、合併、文案 fallback、搜尋驗證、報價篩選）
- `npm run typecheck`：乾淨（0 error）
- 航班 API：合法查詢回報價、非法機場回 `INVALID_SEARCH`
- 訂單 API：建立 → cookie 列出 → 代號查詢 → **跨租戶隔離回空**
- 後台 API：錯密碼 `INVALID_CREDENTIALS`、未登入 `UNAUTHORIZED`
- **後台改設定 → 前台即時生效**：改租戶的品牌名／主色，前台 HTML 的
  `--primary` 與品牌名同步改變（實測值 `#b91c1c`）
- 視覺驗證：桌機 1440×900、手機 390×844、第二租戶截圖皆已人工檢視

### 2.6 過程中修掉的三個真實缺陷

1. **PATCH 整份覆寫**：後台只改一個欄位會把機場／航班庫存清空 → 改為合併語意 + 補測試。
2. **cookie 未落地**：訂單 API 用 `NextResponse.json(..., {headers})` 轉拋 Set-Cookie，
   導致 demo session cookie 遺失、訂單列表讀不到 → 改為在最終 response 上 `cookies.set()`。
3. **型別錯誤**：TSX 內識別字漏字（`slug` 誤寫成 `lug`）→ 已修正。

---

## 三、待辦事項

### P0（上線前必做）

- [x] **正式建置驗證**：`npm run build` + `npm start`（已於 Workers 線上驗證）
- [x] **產生正式憑證**：`ADMIN_PASSWORD`（≥16 字元）與 `SESSION_SECRET`（存於 Worker secrets）
- [x] **`npm audit --omit=dev`** → **0 vulnerabilities**（2026-11-13，以 `overrides` 修正 `postcss` / `fflate`）
- [x] **登入端速率限制跨實例化**：改存 D1 `login_failures`（每 IP 10 分鐘 5 次、全站 10 分鐘 40 次），已線上實測第 6 次回 429
- [ ] **公開 API 的速率限制跨實例化**：`src/lib/http.ts` 仍是記憶體 Map（航班搜尋、下單）→ 換 KV / Durable Object
- [ ] **補審計事件**：`auth.login` / `auth.failed` 寫入 `audit_log`；接上結構化日誌

### P1（產品完整性）

- [ ] **自訂網域流程**：目前只記錄 `tenants.domain` 欄位，缺自動憑證簽發與 DNS 驗證
- [ ] **訂單查詢分頁**：訂單列表目前無分頁
- [ ] **後台編輯器的「未儲存離開提醒」**：目前離開分頁會遺失變更
- [ ] **訂單狀態流程**：`booked / demo_booked` 之後若接上付款閘道需補 `paid / cancelled / expired`
- [ ] **報價有效期限**：`PRICE_CHANGED` / `QUOTE_EXPIRED` 情境尚未實作
- [ ] **無障礙細修**：步驟指示器在窄螢幕已隱藏文字，但 focus 順序與 aria 標記尚未稽核
- [ ] **即時客服通道**：LINE／WhatsApp Business API

### P2（部署與研究延伸）

- [ ] **Cloudflare D1 遷移**：把 `src/lib/db.ts` 與 `src/lib/orders.ts` 的 `prepare/bind` 抽成 repository 介面，再接 D1
- [ ] **自訂網域多租戶部署**：Pages custom domain + worker route
- [ ] **A/B 測試主題**：同一租戶兩組主題分流，量測轉換率
- [ ] **視覺回歸測試**：把目前手動截圖流程（headless Chrome `--screenshot`）包成 CI 腳本

---

## 四、檔案導覽

```
flydesk/
├── src/lib/config.ts          租戶設定模型、正規化、合併、驗證（純 TS，可單測）
├── src/lib/db.ts              D1 存取層（all / first / run / batch）
├── src/lib/seed-config.ts     示範租戶初始設定（純資料）
├── migrations/0001_init.sql   D1 schema
├── scripts/seed-d1.mjs         寫入示範租戶到 D1
├── src/lib/tenants.ts         租戶 CRUD + 種子資料（meridian / aurora）
├── src/lib/auth.ts            後台 session（HMAC 簽章 + httpOnly cookie）
├── src/lib/http.ts            同源檢查、JSON 回應、記憶體速率限制
├── src/lib/orders.ts          訂單資料存取
├── src/lib/tenant-resolve.ts  主機名稱 → 租戶
├── src/lib/locale.ts          語系解析（cookie > Accept-Language > 預設）
├── src/components/            tenant-shell / booking-flow / orders-view /
│                              transfer-view / tenant-editor / icons
├── src/app/t/[slug]/          租戶前台（home / booking / orders / transfer / support / guide）
├── src/app/admin/             後台（登入 / 租戶清單 / 編輯器）
├── src/app/api/               flights / orders / admin/*
├── tests/config.test.ts       12 項單元測試
└── docs/security-audit.md     OWASP + CWE 審計
```

## 五、執行方式

```bash
cd /home/abc/claude/flydesk
npm install
npm run dev          # http://localhost:4310
npm test
```

租戶：`/t/meridian`、`/t/aurora`；後台 `/admin`（本機密碼取自 `.dev.vars` 的 `ADMIN_PASSWORD`）。

## 六、環境變數

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

## 七、Connector 更新狀態

| 工具 | 更新前 | 目前 | 備註 |
|---|---|---|---|
| **REA**（npm `rea-agents`） | 6.4.0 | **6.9.0** | 已升級並驗證可執行 |
| **craft-anything-cli** | 0.4.0 | **0.6.1** | 由上游 tag v0.6.1 建置安裝完成 |

- REA 6.9.0 要求 Node `>=22.23.4 / >=24.22.1 / >=26.12.1`；
  系統 Node 24.22.1 符合（`rea` 的 shebang 為 `/usr/bin/env node`），
  但 `/data2/hermes-profiles/tools/node-26.7.0` 內的 Node 26.7.0 **不符合**，
  若 MCP 啟動時 PATH 指到該目錄會失敗，需把該 Node 升到 26.12.1+ 或改用系統 Node。
- craft-anything 升級完成後需重啟 MCP 伺服器才會生效。

---

## 八、線上部署（已上線）

| 項目 | 值 |
|---|---|
| 網域 | `https://sabre.us.ci`（zone `sabre.us.ci`，帳號 sss2020ci297@gmail.com） |
| 租戶入口 | `https://sabre.us.ci/t/meridian`、`/t/aurora` |
| 後台 | `https://sabre.us.ci/admin` |
| 架構 | Cloudflare Workers（vinext 建置）→ D1；**由 Cloudflare 邊緣提供，不依賴自家主機** |
| Worker | 名稱 `flydesk`，端點 `https://flydesk.sss2020ci297.workers.dev` |
| 資料庫 | Cloudflare D1 `flydesk`（`f47a080d-6f80-4795-b231-fa85e9b1914e`） |
| 憑證 | Worker secrets：`ADMIN_PASSWORD`、`SESSION_SECRET`（`wrangler secret put --name flydesk`） |
| 建置 | `npm run build`（Vite + vinext）→ `npm run deploy` |
| 資料 | `migrations/0001_init.sql`（schema）、`scripts/seed-d1.mjs`（示範租戶） |

常用指令：

```bash
npm run deploy                      # 建置並部署
wrangler d1 execute flydesk --remote --command "SELECT slug FROM tenants"
wrangler secret list --name flydesk
wrangler d1 export flydesk --remote --output /tmp/flydesk.sql
```

> `npm run deploy` 走 `cf deploy --prebuilt`，`cf` CLI 需獨立認證（`cf auth login`）。
> 若只有 wrangler 已登入，可沿用其 OAuth token：
> `export CLOUDFLARE_API_TOKEN=$(grep -E "^oauth_token" ~/.wrangler/config/default.toml | cut -d'"' -f2)`

### 維運（1kw 主機上的排程，僅用於備份與監控）

| 項目 | 內容 |
|---|---|
| 健康檢查 | `flydesk-healthcheck.timer`（每 15 分鐘）檢查公開網域與 Worker 端點；腳本 `/home/abc/.config/flydesk/healthcheck.sh` |
| 資料備份 | `flydesk-backup.timer`（每日 03:30）以 `wrangler d1 export` 匯出 SQL，保留 14 份於 `/home/abc/.flydesk-backups`；腳本 `/home/abc/.config/flydesk/backup-d1.mjs` |

```bash
systemctl --user list-timers | grep flydesk
journalctl --user -u flydesk-healthcheck.service -n 20
```

### 已完成的 zone 準備

1. 解除 zone 的暫停（paused）狀態 — 暫停時流量不經 Cloudflare 代理
2. 移除原本的佔位 A 記錄（`192.0.2.1`，註記「Placeholder for Worker route」）
3. 先以 Cloudflare Tunnel 驗證端到端流程，再切換為 Worker 自訂網域
   （`PUT /accounts/{id}/workers/domains`，由 Cloudflare 建立 CNAME 與憑證）

### 遷移軌跡

| 階段 | 架構 | 原因 |
|---|---|---|
| 初版 | Next.js + `node:sqlite`，主機常駐 | 快速驗證多租戶模型 |
| 第二版 | Cloudflare Tunnel → 主機 | 讓網域先上線（但站台依賴主機） |
| 現況 | Cloudflare Workers + D1 | 消除主機依賴，站台由邊緣提供 |

### 待辦（部署相關）

- [x] **憑證輪替**：正式憑證已產出並記錄於 `/home/abc/.config/flydesk/env`（權限 600）；**定期輪替機制仍未建立**
- [x] **D1 備份還原流程驗證**：已實測還原（2026-11-13），流程與踩到的坑見下節
- [x] **速率限制跨實例化（登入端）**：已改用 D1 `login_failures`（2026-11-13）；**公開 API 仍為記憶體實作**
- [ ] **監控告警**：健康檢查僅寫 journal，尚未接通知管道

### D1 備份與還原（已實測）

| 項目 | 內容 |
|---|---|
| 排程 | `flydesk-backup.timer`（每日 03:30），腳本 `/home/abc/.config/flydesk/backup-d1.mjs` → `wrangler d1 export flydesk --remote`，保留 14 份於 `/home/abc/.flydesk-backups` |
| 還原 | `flydesk/scripts/restore-d1.sh`（匯入本機 D1 並對照線上筆數） |
| 輔助設定 | `flydesk/scripts/wrangler.d1.jsonc` |

**踩到的兩個坑**

1. 專案以 `cloudflare.config.ts` 宣告綁定，**wrangler CLI 不讀這個格式**；`--remote` 可用
   資料庫名稱指定，但 `--local` 必須在 wrangler 設定檔中找到 `d1_databases` 宣告，
   否則直接報「Couldn't find a D1 DB …」。因此另備 `scripts/wrangler.d1.jsonc`。
2. `wrangler d1 execute --local` 的 state 落在**設定檔所在目錄**旁（`scripts/.wrangler/state`），
   不是專案根目錄。重複匯入會撞「table already exists」。還原腳本改用
   `--persist-to scripts/.wrangler-d1-restore` 並在匯入前清空，確保可重複執行。

**驗證結果**：備份檔匯入本機後，租戶 2／訂單 2／稽核 4／工作階段 2，與線上遠端 D1 完全一致。

---

## 九、Workers + D1 遷移收尾（2026-11-13）

### 修掉的兩個真實缺陷

| # | 症狀 | 根因 | 修法 |
|---|---|---|---|
| 1 | 本機 `npm run dev` 全站 500：`Missing required secrets: ADMIN_PASSWORD, SESSION_SECRET` | `.dev.vars` 存在且內容正確，但**未宣告的變數不會進 worker env**（miniflare 的 `resolveLocalBindings` 只把 `.dev.vars` 的值對應到 `env` 中已宣告的 binding） | 在 `cloudflare.config.ts` 以 `bindings.secret()` 宣告 `ADMIN_PASSWORD` / `SESSION_SECRET` |
| 2 | 本機 `npm run dev` 500：`D1_ERROR: no such table: tenants` | `ensureSchema()` 以 boolean 旗標 `schemaReady` 記憶化，但旗標在 DDL `await` **之前**就翻轉；同一次 render 的平行查詢因此跳過建表等待，直接 SELECT 尚未建立的表 | 改以 **Promise 記憶化**（`schemaPromise`），所有並行呼叫等待同一份建表工作 |

附帶修正：`ensureSecrets()` 原本在檢查**之前**就翻轉旗標，一旦拋錯後續呼叫會靜默放行缺憑證的請求；現改為檢查通過才設旗標。

### 驗證結果（本輪全部實測）

| 項目 | 結果 |
|---|---|
| 本機 `npm run dev`（**清空本機 D1 後全新啟動**） | 自動建表 + 種子資料，`/` 307、`/t/meridian` 200、`/t/aurora` 200、`/t/meridian/booking` 200、`/admin` 200 |
| `npm test` | 12/12 通過 |
| `npm run typecheck` | 無錯誤 |
| `npm run build` | 成功（16 條路由） |
| 線上部署 | 版本 `401a7171`，`https://sabre.us.ci` 全部路由 200 |
| 線上後台登入 | 正確密碼 200、錯誤密碼 401 `INVALID_CREDENTIALS` |
| 線上航班搜尋 / 下單 | 訂單 `SBW7CN8K`、總價 16150 TWD、cookie 落地、訂單列表回 1 筆 |
| 跨租戶隔離 | meridian 的 cookie 在 aurora 查無訂單；以 aurora 取 meridian 的 offer → 404 `OFFER_NOT_FOUND` |
| 安全標頭 | CSP、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`、`Cross-Origin-Opener-Policy` 皆存在 |
| 後台未登入 | 401 `UNAUTHORIZED` |
| 後台改設定即時生效 | PATCH `theme.primary` → 前台 `--primary` 立即改變，且機場庫存未被清空（mergeConfig 生效） |

### 尚未完成

- 上面「待辦（部署相關）」四項

### 本輪產出

- 遷移 commit（抽出獨立 repo 後為 `f9e6b30`，原 monorepo 為 `ad82587`）
- 2026-11-13 專案已從 monorepo `shineday999/claude-workspace` 抽出為**獨立 repo**
  `https://github.com/shineday999/flydesk.git`（private），原 PR #1 已關閉。
  抽取方式：`git subtree split --prefix=flydesk`（8 筆歷史完整保留，hash 因改寫而變動）
- 線上版本：`401a7171-e70e-4f6b-aec9-bdb9b6869291`（初版上線）

---

## 十、安全複審修正與重新部署（2026-11-13）

線上版 Claude 依交棒包做了一輪安全複審，提出 4 個 commit 的修正，已全部套用、驗證並部署。
原始 patch 保留於 `flydesk-review-fixes.patch`（未進版控）。

| # | 嚴重度 | 問題 | 處置 |
|---|---|---|---|
| 1 | 高 | `GET /api/orders?reference=` 不需登入卻回傳完整訂單，含旅客護照／電話／Email 與 `sessionId`（即 cookie 值） | 新增 `toPublicOrder()`：所有回應移除 `sessionId`；編號查詢只有訂單所屬工作階段才回傳 `passenger` |
| 2 | 中 | `clientIp()` 信任可偽造的 `x-forwarded-for`，可繞過限流 | 改用 Cloudflare 覆寫的 `cf-connecting-ip`，其餘僅作本機備援 |
| 3 | 中 | `auth.ts` 讀 `globalThis.env`、`db.ts` 讀 `cloudflare:workers`，可能「啟動檢查通過、登入讀不到密碼」 | 統一改讀 `cloudflare:workers` 的 `env` |
| 4 | 中 | 訂單編號僅 6 碼（約 2^30）可被枚舉；下單未驗證日期與旅客欄位 | 編號改 10 碼（約 2^50）；下單沿用 `validateSearch()` 並要求姓名／電話／Email |
| 5 | 低 | 過期 session 只在被讀取時才刪；租戶網域未驗證、slug 競態回 500 | 登入與建 session 時順手清理；網域限定合法主機名稱且唯一；競態回 409 |
| 6 | 高 | 登入限流只在記憶體，Workers 多 isolate 下形同無效 | 登入失敗寫入 D1 `login_failures`：每 IP 10 分鐘 5 次、全站 10 分鐘 40 次 |
| 7 | 高 | `npm audit --omit=dev` 7 項（1 高 6 中）：`next` 內建 `postcss <= 8.5.22`、`satori` 的 `fflate` | `package.json` 加 `overrides`，audit 歸零 |

### 驗證結果（線上，版本 `62b03c2a`）

| 項目 | 結果 |
|---|---|
| `npm audit --omit=dev` / `npm test` / `npm run typecheck` / `npm run build` | 0 vulnerabilities ／ 12/12 ／ 0 error ／ 成功（16 條路由） |
| 後台登入（正式密碼） | 200；帶 cookie 取租戶清單 200 |
| 訂單建立 | 200，編號 12 碼，回應不含 `sessionId`、含旅客個資 |
| **編號查詢（無 cookie）** | 200，不含 `sessionId`、旅客個資已遮蔽（訂單存在與金額仍可見，屬已知限制） |
| 下單輸入驗證 | 缺姓名 → 400 `INVALID_PASSENGER`；過去日期 → 400 `INVALID_SEARCH` |
| 租戶網域驗證 | 非法網域 → 400 `INVALID_DOMAIN`；重複 slug → 409 `SLUG_TAKEN` |
| **D1 跨 isolate 登入限流** | 連續 5 次錯誤後第 6 次 → 429 `RATE_LIMITED` |
| 正式 D1 資料 | 測試租戶／訂單已清除，回復 2 租戶／2 訂單／0 限流紀錄 |

> ⚠️ **操作陷阱**：登入限流會把管理員自己也鎖住（同一 IP 連錯 5 次就鎖 10 分鐘）。
> 解鎖：`wrangler d1 execute flydesk --remote --command "DELETE FROM login_failures"`。
> 測試務必清理，否則管理員會被鎖在門外。

### 過程中的兩個操作陷阱

1. **wrangler OAuth token 會過期**：本次部署前 token 已過期（`expiration_time` 已過），
   `cf deploy` 回 `Invalid access token [code: 9109]`。解法：先跑 `wrangler whoami`
   觸發自動刷新，再取新的 `oauth_token` 設為 `CLOUDFLARE_API_TOKEN`。
2. **`git am` 套用外部 patch**：patch 由外部產生，context 與本地不一致時 `git am` 會報
   「patch does not apply」但仍可能以 3-way 方式完成，且留下 `next=1` 的殘留狀態。
   套用後務必驗證：`git log` 確認四個 commit 都在，並用乾淨副本 `git apply --3way`
   重跑一次比對樹是否一致。

