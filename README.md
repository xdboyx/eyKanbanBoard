# eyKanbanBoard

一個需要登入才能使用的網頁看板，讓團隊共用同一份任務清單，並依狀態（待辦、進行中、審核中、已完成）追蹤進度。

- 前端：React + TanStack Router + zustand + Tailwind CSS，以 Vite 建置
- 後端：Cloudflare Worker 提供 `/api/*`（登入與看板讀寫），看板存在 Cloudflare KV
- 部署：GitHub repo 連到 Cloudflare Workers Builds，push 到 `main` 自動部署

領域名詞見 [CONTEXT.md](CONTEXT.md)，設計決策見 [docs/adr/](docs/adr/)，`src/` 的資料夾規則見 [.claude/rules/frontend-structure.md](.claude/rules/frontend-structure.md)。

## 本地開發

### 安裝

需要 Node.js 22.12 以上（版本寫在 `.nvmrc`）。

```bash
nvm use
npm install
```

### 兩種執行方式

| 指令 | 網址 | 登入帳密 | 看板存在 | 適合 |
| --- | --- | --- | --- | --- |
| `npm run dev` | http://localhost:5173 | `.env.local` | 瀏覽器 localStorage | 改畫面，存檔即時更新 |
| `npm run dev:worker` | http://localhost:8787 | `.dev.vars` | wrangler 模擬的本地 KV（`.wrangler/state/`） | 在本地跑一遍正式環境的流程 |

`npm run dev` 只跑 Vite，不需要 Worker；登入是只在瀏覽器比對的模擬，正式建置不會包含這段程式（[ADR-0001](docs/adr/0001-dual-storage-localstorage-dev-kv-prod.md)）。`npm run dev:worker` 先建置前端，再用 wrangler 在本地啟動 Worker，前端改用 `/api/*` 登入與讀寫看板，跟正式環境相同；改了程式碼要重新執行一次。

### 本地環境檔

兩個檔案都不進版控，從範例複製後填入自己的值：

```bash
cp .env.local.example .env.local
```

```bash
cp .dev.vars.example .dev.vars
```

- `.env.local`：`npm run dev` 的登入帳密（`VITE_APP_USERNAME`、`VITE_APP_PASSWORD`）。改完要重新啟動 `npm run dev`。
- `.dev.vars`：`npm run dev:worker` 的 `APP_USERNAME`、`APP_PASSWORD`、`SESSION_SECRET`。正式環境不讀這個檔案，改在 Cloudflare 後台設定（見下方「設定帳密與 session 金鑰」）。

### 重設範例資料

- `npm run dev`：第一次開啟時看板是範例資料。要回到範例資料，在瀏覽器的 console 執行：

  ```js
  eykanban.resetSampleData()
  ```

- `npm run dev:worker`：本地 KV 一開始是空看板。要清空，停止 wrangler 後刪除 `.wrangler/state/` 再重新啟動。

### 測試與型別檢查

```bash
npm test
```

```bash
npm run typecheck
```

`npm test` 會跑三組測試：

| 組別 | 位置 | 驗證什麼 |
| --- | --- | --- |
| `app` | `tests/stores/`、`tests/utils/`、`tests/services/` | 看板的指令與儲存行為、畫面資料的計算、前端的資料存取 |
| `worker` | `tests/worker/index.test.ts` | 在 Workers runtime 中驗證 `/api/*` 的請求與回應 |
| `routing` | `tests/worker/routing.test.ts` | 以 `wrangler.jsonc` 在本地啟動 Worker，驗證 `/api/*` 交給 Worker、其他路徑回傳前端頁面 |

## 部署到 Cloudflare

正式環境是一個 Cloudflare Worker：`/api/*` 由 `worker/index.ts` 處理，其他路徑回傳 `dist/` 的前端檔案，找不到的路徑（例如直接開啟 `/tasks/abc`、`/login`）回傳 `index.html`，由前端路由接手。這些設定都在 [wrangler.jsonc](wrangler.jsonc)。

第一次部署依序做下面三步；之後只要 push 到 `main` 就會自動部署。

### 1. 連接 GitHub，自動部署

1. 登入 Cloudflare 後台，進入「Workers 和 Pages」，建立應用程式，選擇匯入 Git 存放庫。
2. 授權 Cloudflare 讀取 GitHub，選擇這個 repo。
3. 設定建置：

   | 欄位 | 值 |
   | --- | --- |
   | 專案（Worker）名稱 | `eykanbanboard`，必須與 `wrangler.jsonc` 的 `name` 相同，否則部署會失敗 |
   | 生產分支 | `main` |
   | 建置命令 | `npm run build` |
   | 部署命令 | `npx wrangler deploy` |
   | 非生產分支部署命令 | `npx wrangler preview` |

4. 儲存並部署。完成後 Worker 的網址是 `https://eykanbanboard.<你的子網域>.workers.dev`。

之後每次 push 到 `main`，Workers Builds 會自動建置並部署；建置紀錄可以在 Worker 的後台查看，結果也會以 check 的形式出現在 GitHub 的 commit 與 PR 上。

PR 分支會部署成預覽網址，但預覽不繼承正式環境的變數、Secret 與 KV，所以**預覽網址無法登入**，只能確認建置成功與前端畫面。之後要在預覽使用看板，在 `wrangler.jsonc` 的 `previews` 綁定另一個預覽專用的 KV，不要綁正式的。

### 2. 建立並綁定 KV namespace

看板存在名為 `BOARD_KV` 的 KV namespace（[ADR-0003](docs/adr/0003-single-kv-value-with-version.md)）。`wrangler.jsonc` 刻意不寫 namespace 的 id：

- **不用手動建立**：第一次部署時，如果 Worker 還沒有 `BOARD_KV` 綁定，wrangler 會自動建立一個新的 KV namespace 並綁定。
- **之後的部署**沿用 Worker 已綁定的那一個，資料不會被換掉。

部署後到 Worker 的「綁定」頁籤，確認有一個名稱為 `BOARD_KV` 的 KV namespace。

想自己指定 namespace（例如沿用既有的資料）時，在第一次部署**之前**：

1. 在後台的「儲存和資料庫 → Workers KV」建立一個 namespace，名稱自訂，例如 `eykanbanboard-board`。
2. 到 Worker 的「綁定」頁籤新增綁定，類型選 KV namespace，變數名稱填 `BOARD_KV`，選擇剛建立的 namespace。

KV 裡沒有資料時，登入後看到的是標題為「未命名看板」的空看板，正式環境沒有範例資料。

### 3. 設定帳密與 session 金鑰

整個系統只有一組共用帳密（[ADR-0002](docs/adr/0002-single-shared-credential.md)），在 Worker 的「設定 → 執行時變數與機密」新增，環境選「生產」：

| 名稱 | 類型 | 說明 |
| --- | --- | --- |
| `APP_USERNAME` | 文字（一般變數） | 登入帳號 |
| `APP_PASSWORD` | 機密（Secret） | 登入密碼 |
| `SESSION_SECRET` | 機密（Secret） | session cookie 的簽章金鑰，用一串夠長的亂數 |

`SESSION_SECRET` 可以這樣產生：

```bash
openssl rand -base64 32
```

用「新增變數並部署」儲存，變數才會生效。`wrangler.jsonc` 設定了 `keep_vars`，之後從 GitHub 自動部署時不會清掉這裡的變數。

> **注意：設定的位置要對。** 「設定 → 建置 → 變數和祕密」是**建置時**用的，Worker 執行時讀不到。三個變數放在那裡時，登入會回 500「Server Misconfigured」。要放在「設定 → 執行時變數與機密」。

更換任何一個值後，所有人的 session 都會失效，需要重新登入。

### 確認部署成功

1. 開啟 Worker 的網址，會被導到 `/login`。
2. 用剛設定的帳密登入，看到看板。
3. 新增一個任務，重新整理頁面後任務還在（已存進 KV）。
4. 直接在網址列開啟 `/tasks/<任務 id>`，會顯示該任務，不會 404。

## 疑難排解

| 症狀 | 原因與處理 |
| --- | --- |
| 登入回 500「Server Misconfigured」 | Worker 執行時讀不到 `APP_USERNAME`、`APP_PASSWORD` 或 `SESSION_SECRET`。確認三個都設在「設定 → 執行時變數與機密」的生產環境，不是「設定 → 建置 → 變數和祕密」，且儲存後有重新部署。 |
| 帳密正確仍顯示錯誤 | 帳號與密碼區分大小寫，確認後台的值前後沒有多餘的空白。 |
| Workers Builds 部署失敗，訊息提到 Worker 名稱 | 後台的 Worker 名稱必須是 `eykanbanboard`，與 `wrangler.jsonc` 的 `name` 相同。 |
| 預覽網址無法登入 | 預期行為，預覽沒有正式環境的變數與 KV。 |
| `npm run dev` 登入失敗，console 提示帳密未設定 | 還沒建立 `.env.local`，或改完沒有重新啟動 `npm run dev`。 |
