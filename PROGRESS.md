# 工作進度與待辦事項

> 最後更新：2026-11-13
> 專案：`/home/abc/claude/flydesk`（Flydesk — 多租戶白標訂票 SaaS）
> 狀態：**核心功能完成並實測通過；文件補完與部署尚未進行。**

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
| 資料層（`node:sqlite`，零原生相依） | `src/lib/db.ts` | 完成 |
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

- [ ] **正式建置驗證**：`npm run build` + `npm start`（目前只驗過 dev server）
- [ ] **產生正式憑證**：`ADMIN_PASSWORD`（≥16 字元）與 `SESSION_SECRET`
- [ ] **`npm audit --omit=dev`** 高風險項目歸零（目前安裝時未稽核）
- [ ] **速率限制改為跨實例方案**：目前是記憶體 Map（`src/lib/http.ts`），多實例部署會失效 → 換 KV / Durable Object
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
├── src/lib/db.ts              node:sqlite schema 與連線
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

租戶：`/t/meridian`、`/t/aurora`；後台 `/admin`（預設密碼 `flydesk-admin`）。

## 六、環境變數

| 變數 | 用途 | 預設 |
|---|---|---|
| `ADMIN_PASSWORD` | 後台密碼 | `flydesk-admin`（僅開發；production 必填） |
| `SESSION_SECRET` | session 簽章金鑰 | 開發用 fallback；production 必填 |
| `FLYDESK_DB_PATH` | SQLite 檔案位置 | `./.data/flydesk.db` |
| `DEFAULT_TENANT_SLUG` | 無主機名稱時的預設租戶 | 第一個租戶 |

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
| 網域 | `https://sabre.us.ci` |
| 租戶入口 | `https://sabre.us.ci/t/meridian`、`/t/aurora` |
| 後台 | `https://sabre.us.ci/admin` |
| 架構 | Cloudflare Tunnel（zone `sabre.us.ci`，帳號 sss2020ci297）→ 1kw 主機上的 Next.js production server |
| 應用服務 | user systemd：`flydesk.service`（`/home/abc/.config/systemd/user/flydesk.service`） |
| 隧道服務 | user systemd：`cloudflared-flydesk.service`（設定 `/home/abc/.cloudflared/flydesk.yml`） |
| 憑證 | `/home/abc/.config/flydesk/env`（chmod 600，含 `ADMIN_PASSWORD` / `SESSION_SECRET`） |
| 資料庫 | `/home/abc/claude/flydesk/.data/flydesk.db`（`node:sqlite`，隨機密碼檔 600） |

常用指令：

```bash
systemctl --user status flydesk.service cloudflared-flydesk.service
journalctl --user -u flydesk.service -f
curl -s -o /dev/null -w '%{http_code}\n' https://sabre.us.ci/t/meridian
```

### 已完成的 zone 準備

1. 解除 zone 的暫停（paused）狀態 — 暫停時流量不經 Cloudflare 代理
2. 移除原本的佔位 A 記錄（`192.0.2.1`，註記「Placeholder for Worker route」）
3. 建立隧道 CNAME → `sabre.us.ci` 由 Cloudflare Tunnel 接手

### 待辦（部署相關）

- [ ] **環境變數與憑證輪替**：目前 `ADMIN_PASSWORD` / `SESSION_SECRET` 為自動產生，應納入密碼管理
- [ ] **備份策略**：`flydesk.db` 目前無排程備份（可用 `sqlite3 .backup` + cron）
- [ ] **主機依賴**：站台由 1kw 主機提供，主機離線時網域即不可用；若要全天候邊緣部署，需把資料層遷移至 D1 並改用 Pages/Workers 部署
- [ ] **zone 狀態**：解除暫停後需確認 DNS 代理與 SSL 憑證續期正常
