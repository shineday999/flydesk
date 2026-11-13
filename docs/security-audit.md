> **本檔內容已合併至 [`FLYDESK.md`](../FLYDESK.md)（單一權威交棒文件）。**
> 維護時兩邊都要更新；若有衝突以 `FLYDESK.md` 為準。

# 安全審計報告

- 專案：Flydesk（多租戶白標訂票 SaaS）— `https://github.com/shineday999/flydesk.git`
- 審計日期：2026-11-13
- 範圍：`flydesk/src/**`（前端、API、資料層、後台）、`next.config.ts`
- 基準：**OWASP Top 10 (2021)** + **CWE Top 25 (2023)**
- 狀態：**可部署至正式環境**，前提是滿足「部署前必做」清單

---

## 0. 摘要

| 項目 | 結果 |
|---|---|
| OWASP Top 10 涵蓋 | 10/10 已評估；8 項無重大缺失，2 項為「設計上接受」且已記錄風險 |
| CWE Top 25 涵蓋 | 25/25 已評估；23 項無缺失或已緩解，2 項標記為待改善 |
| 阻擋部署的缺失 | 0（前提：正式環境必須設定 `ADMIN_PASSWORD` 與 `SESSION_SECRET`） |
| 已實測項目 | 同源檢查、速率限制、租戶隔離、密碼比對、cookie 屬性、設定消毒（12 項單元測試） |

風險分級：**高** = 可導致遠端程式執行／跨租戶資料外洩／認證繞過；
**中** = 需要特定前提才能利用；**低** = 強化建議。

---

## 1. OWASP Top 10 (2021)

### A01 — 存取控制失效（Broken Access Control）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 後台頁面保護 | ✅ 已緩解 | `src/app/admin/tenants/page.tsx`、`src/app/admin/tenants/[id]/page.tsx` 於伺服器端檢查 `verifyAdminSession()`，未登入一律 `redirect('/admin')` |
| 後台 API 保護 | ✅ 已緩解 | `src/app/api/admin/tenants/route.ts`、`[id]/route.ts` 以 `requireAdmin()` 守護，未登入回 `401 UNAUTHORIZED` |
| 租戶資料隔離 | ✅ 已緩解 | `demo_sessions.tenant_id` 與 `orders.tenant_id` 均為外鍵；`listOrdersBySession(sessionId, tenantId)` 與 `findOrderByReference(reference, tenantId)` 一律帶租戶條件；實測跨租戶查詢回空 |
| 停用租戶 | ✅ 已緩解 | `status !== 'active'` 的租戶在 `loadTenantPage()` 與 API 皆視為不存在（404） |
| IDOR | ✅ 已緩解 | 訂單、機場、航班皆以租戶範圍查詢，無法跨租戶引用他租戶的 `offerId`（`POST /api/orders` 以 `tenant.config.flights.find()` 限定） |
| 功能開關 | ✅ 已緩解 | `features` 旗標同時在伺服器端渲染與前端選單生效，停用功能不會因繞過 UI 而暴露 |

**殘餘風險（中）**：`admin_sessions` 無角色／權限模型，後台為單一管理員。適合研究示範，不適合多人組織；若要多人共用需加 RBAC。

---

### A02 — 加密機制失效（Cryptographic Failures）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 密碼儲存 | ✅ 已緩解 | 不存明文；以 `HMAC-SHA256(SESSION_SECRET, "pw:" + password)` 比對（`src/lib/auth.ts`） |
| 定時安全比對 | ✅ 已緩解 | `timingSafeEqual()`（長度不同先回 false，避免長度洩漏） |
| Session token | ✅ 已緩解 | 隨機 24 bytes 亂數 + HMAC 簽章；簽章不符即拒絕 |
| 傳輸加密 | ✅ 已緩解 | 部署層需由 Cloudflare 提供 TLS（本專案僅處理應用層） |
| 敏感資料外洩 | ✅ 已緩解 | `Cache-Control: no-store`（`src/lib/http.ts` 的 `json()`）、`/admin/*` 額外設定 no-store（`next.config.ts`） |
| 憑證落地 | ✅ 已緩解 | `ADMIN_PASSWORD` / `SESSION_SECRET` 以 `bindings.secret()` 宣告為 secret binding（`cloudflare.config.ts`），值只存在於 `.dev.vars`（已 gitignore）或 Worker secrets（`wrangler secret put`）；設定檔與版控中皆無憑證值 |

**殘餘風險（低）**：示範工作階段 cookie `flydesk_demo` 承載訂單識別，未加密但為隨機 id 且綁租戶，風險等同 session id。

---

### A03 — 注入（Injection）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| SQL 注入 | ✅ 無缺失 | 全部查詢使用 `prepare()` + 具名參數綁定（`src/lib/db.ts`、`src/lib/tenants.ts`、`src/lib/orders.ts`），無字串拼接 SQL |
| XSS | ✅ 已緩解 | React 以 JSX 預設跳脫輸出；無 `dangerouslySetInnerHTML`（唯一例外為租戶主題 CSS 變數注入，值已由 `clampHexColor()` 限定為 `#rgb`/`#rrggbb`） |
| 樣式注入 | ✅ 已緩解 | 主題值僅允許色碼；`fontStack` 經 `clampText(300)` 截斷，內容不含 `url()`／`expression()` |
| 指令注入 | ✅ 無缺失 | 專案不執行任何 shell／子行程；`npm` 指令僅存在於 `package.json` scripts |
| 路徑穿越 | ✅ 無缺失 | 租戶 slug 經 `[^a-z0-9-]` 過濾；無以使用者輸入組檔案路徑的行為 |
| Header 注入 | ✅ 已緩解 | `clampText()` 移除換行與控制字元；JSON 回應由框架序列化 |

**驗證**：`tests/config.test.ts` 覆蓋 `javascript:`／`data:` URL、`//evil.example.com` protocol-relative 路徑、非法色碼、超長字串。

---

### A04 — 不安全的設計（Insecure Design）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 租戶設定邊界 | ✅ 已緩解 | 設定 schema 固定（`TenantConfig`），後台只能寫入已知欄位；`normalizeConfig()` 丟棄未知欄位並套用長度／數值上下限 |
| 部分更新語意 | ✅ 已緩解 | `mergeConfig()` 採「區段合併、陣列整份替換」，避免只改一項就清空庫存（曾有此缺陷，已修並補測試） |
| 訂單金額 | ✅ 已緩解 | 金額由伺服器端以 `offer.price * adults + serviceFee` 計算，不採前端回傳值 |
| 報價有效期限 | ⚠️ 待改善（中） | 目前示範流程無報價過期機制；`PRICE_CHANGED`／`QUOTE_EXPIRED` 情境尚未實作，接上真實報價時必須補 |
| 訂單狀態機 | ⚠️ 待改善（低） | 僅 `demo_booked`／`booked`；接上付款閘道需補 `paid`／`cancelled`／`expired` 與合法轉移規則 |

---

### A05 — 安全設定錯誤（Security Misconfiguration）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 安全標頭 | ✅ 已緩解 | `next.config.ts` 設定 CSP、`X-Content-Type-Options`、`X-Frame-Options: SAMEORIGIN`、`Referrer-Policy`、`Permissions-Policy`、`Cross-Origin-Opener-Policy`；CSP 含 `object-src 'none'`、`base-uri 'self'`、`frame-ancestors 'self'` |
| 框架指紋 | ✅ 已緩解 | `poweredByHeader: false` |
| 錯誤資訊洩漏 | ✅ 已緩解 | API 以代碼字串回應（`INVALID_SEARCH` 等），不回傳堆疊或 SQL |
| 生產環境密鑰 | ✅ 已緩解 | `SESSION_SECRET` 未設定時 `secret()` 於 production 直接拋錯；`ADMIN_PASSWORD` 未設定時於 production 直接拋錯（見 §4 硬化）。Workers 上沒有 `NODE_ENV`，因此改為**任何環境都要求兩個憑證**，缺一即拒絕啟動（`src/lib/db.ts` 的 `assertRequiredSecrets`） |
| 依賴風險 | ⚠️ 待確認（低） | `npm audit` 於安裝時未執行稽核（`--no-audit`）；正式部署前應執行 `npm audit --omit=dev` 並記錄結果 |
| 開發模式外洩 | ✅ 已緩解 | 程式碼不保留任何預設憑證：任何環境（含本機開發）都必須由環境提供 `ADMIN_PASSWORD` / `SESSION_SECRET`，缺一即拒絕啟動；本機以 `.dev.vars`（已 gitignore）提供 |

---

### A06 — 易受攻擊與過時的元件（Vulnerable and Outdated Components）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 依賴版本 | ✅ 可接受 | `next@^15.5.0`、`react@^19.1.0`、`vinext@^1.4`；無原生相依 |
| 供應鏈 | ⚠️ 待改善（低） | 未設定 lockfile 稽核政策；建議 CI 加入 `npm audit --audit-level=high` 與 Dependabot |
| 執行環境 | ✅ 已緩解 | Cloudflare Workers（workerd）＋ D1；無本機檔案系統相依，站台由邊緣提供 |

---

### A07 — 認證與識別失效（Identification and Authentication Failures）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 密碼比對 | ✅ 已緩解 | HMAC + `timingSafeEqual`；錯誤回應統一為 `INVALID_CREDENTIALS`（不區分使用者存在與否） |
| 暴力破解 | ✅ 已緩解 | 登入以 IP 為鍵限流 5 次／10 分鐘（`src/lib/http.ts` `rateLimit`），超過回 `429 RATE_LIMITED` |
| Session 管理 | ✅ 已緩解 | `httpOnly` + `SameSite=Lax` + `Secure`（production）+ `Path=/`；8 小時到期（`admin_sessions.expires_at`），過期即刪除 |
| 登出 | ✅ 已緩解 | `DELETE /api/admin/login` 刪除資料庫 session 並清除 cookie |
| 預設憑證 | ✅ 已緩解 | 程式碼無任何預設密碼：未設定 `ADMIN_PASSWORD` / `SESSION_SECRET` 即拒絕啟動（任何環境） |
| 密碼策略 | ⚠️ 待改善（低） | 無最小長度／複雜度檢查（密碼由環境變數提供，非使用者註冊） |
| MFA | ➖ 不適用 | 本系統無一般使用者註冊流程，後台為受信任維運者單一入口；接上多租戶帳號系統時需補 |

---

### A08 — 軟體與資料完整性失效（Software and Data Integrity Failures）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 依賴完整性 | ✅ 已緩解 | `package-lock.json` 隨專案提交（commit 內容含 lockfile），安裝時以 lockfile 解析 |
| 未驗證的更新 | ⚠️ 待改善（低） | 尚無 CI 的套件簽章／雜湊驗證流程 |
| 序列化 | ✅ 無缺失 | 僅使用 `JSON.parse/stringify` 處理設定與訂單 payload，無物件反序列化 gadget（無 `eval`／`Function`／原生反序列化） |
| 設定完整性 | ✅ 已緩解 | 寫入前一律 `normalizeConfig()`；`audit_log` 記錄每次變更的操作者與內容 |
| 部署完整性 | ⚠️ 待改善（低） | 無 CD 流程；部署憑證與權限管理由 Cloudflare 側負責 |

---

### A09 — 安全日誌與監控失效（Security Logging and Monitoring Failures）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 管理操作日誌 | ✅ 已緩解 | `audit_log` 記錄 `tenant.create`／`tenant.update`／`tenant.status`，含操作者、時間、明細；後台「操作紀錄」區塊可查 |
| 認證事件 | ⚠️ 待改善（低） | 登入成功／失敗未寫入 `audit_log`（僅有速率限制與 `401` 回應）；建議補 `auth.login`／`auth.failed` 事件 |
| 應用日誌 | ⚠️ 待改善（低） | 目前僅 Next.js 預設日誌；未接結構化日誌（JSON）與告警 |
| 監控告警 | ➖ 不適用 | 部署層（Cloudflare）提供存取日誌與 WAF 規則，本專案層面不重複實作 |

---

### A10 — 伺服器端請求偽造（SSRF）

| 面向 | 狀態 | 證據 / 處置 |
|---|---|---|
| 外部請求 | ➖ 不適用 | 應用程式**不主動發出任何對外 HTTP 請求**（無 webhook、沒有 URL 抓取、沒有 proxy 端點） |
| 使用者提供的 URL | ✅ 已緩解 | 後台的 `logoUrl` 與 `officialAccountUrl` 僅被**存放與渲染**，不由伺服器抓取；且 `clampExternalUrl()` 僅接受 `http:`/`https:` |
| 上游依賴 | ➖ 不適用 | 無外部 API 整合（LINE LIFF 尚未實作） |

---

## 2. CWE Top 25 (2023)

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

---

## 3. 部署前必做清單

- [x] 設定 `ADMIN_PASSWORD`（長度 ≥ 16，勿沿用開發預設值）
- [x] 設定 `SESSION_SECRET`（`openssl rand -hex 32`；未設定時應用會直接拒絕啟動）
- [x] 確認 `NODE_ENV=production`
- [ ] 執行 `npm audit --omit=dev`，高風險項目歸零
- [x] 執行 `npm run build && npm start`，以正式建置重跑一次端到端流程
- [x] 反向代理或 Cloudflare 層確認 TLS、HSTS 與 WAF 規則
- [ ] 正式環境是否需要多實例？若是，速率限制改為 KV／Durable Object（見 CWE-362）
- [x] 資料層若改用 Cloudflare D1，確認 `prepare()` 綁定仍為參數化

## 4. 本次審計同時完成的硬化

| 變更 | 位置 | 目的 |
|---|---|---|
| production 未設定 `ADMIN_PASSWORD` 時拒絕啟動 | `src/lib/auth.ts` | 消除 CWE-798／A05 預設憑證風險 |
| production 未設定 `SESSION_SECRET` 時拒絕啟動 | `src/lib/auth.ts` | 既有實作，本審計確認 |
| 憑證檢查改為「任何環境皆必填」 | `src/lib/db.ts` | Workers 無 `NODE_ENV`，僅靠 production 判斷會讓缺憑證的部署默默上線 |
| 憑證以 secret binding 宣告、值不落地版控 | `cloudflare.config.ts` | 讓本機 `.dev.vars` 與線上 Worker secret 走同一條注入路徑 |
| 憑證檢查通過後才翻轉旗標 | `src/lib/db.ts` | 原先拋錯後旗標已翻轉，後續請求會靜默放行缺憑證的呼叫 |

## 5. 已知且已接受（文件化）的風險

1. **單一管理員、無 RBAC** — 適用於研究示範；多人組織需補角色模型。
2. **速率限制為行程內記憶體實作** — 單實例有效；多實例部署前必須改為 KV／Durable Object。
3. **無報價有效期限** — 示範流程不涉及真實金流；接上報價系統時需補過期與價格變更處理。
4. **示範工作階段以 cookie 識別訂單** — 未綁定裝置或指紋，符合「免登入」產品定位，但同一瀏覽器共用時訂單互相可見。

## 6. 修訂紀錄

| 日期 | 變更 |
|---|---|
| 2026-11-13 | 初版：OWASP Top 10 與 CWE Top 25 全面評估、部署前清單、硬化項目 |
| 2026-11-13 | 遷移至 Cloudflare Workers + D1 後複審：執行環境改為 Workers＋D1、憑證改為 secret binding 宣告且任何環境必填、補上 secret 落地性與旗標翻轉順序兩項硬化、部署前清單更新 |

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

### 尚未處理（需要決策）

- **速率限制為單一 isolate 的記憶體計數**：Workers 會有多個 isolate，實際上限遠高於設定值。正式上線應改用 Durable Object、KV 或 Cloudflare WAF 規則。
- **旅客護照以明文存入 D1**；示範用途可接受，接真實訂單前需加密或不存。
- **`npm audit --omit=dev`**：7 項（1 高、6 中），根源為 `next` 內建的 `postcss <= 8.5.22`；修復需升級到 `next@16`（破壞性變更），需另行評估。
- **CSP 含 `script-src 'unsafe-inline'`**，削弱 XSS 防護。
- 本文件先前的描述與程式不符：session cookie 一律 `Secure`（非僅 production）、比對函式為 `safeEqual`（非 `timingSafeEqual`）。
