# 本地開發用 localStorage，正式環境用 Worker + Cloudflare KV

前端只依賴一個看板資料存取介面，底下有兩種實作：本地開發只跑 `vite dev`、資料存在瀏覽器 localStorage；正式環境由 Cloudflare Worker 提供 `/api/*`，資料存在 KV。這樣本地開發不需要 Worker 或 wrangler，前端改動能最快看到結果，而正式環境仍有可共用、可持久的儲存。

本地模式的登入是刻意不安全的模擬：帳密從 `.env.local` 讀取、只在前端比對，目的只是讓本地也走一遍登入畫面與路由守衛。這套比對邏輯不得出現在正式環境的程式碼中；正式環境的驗證一律由 Worker 處理。

## Considered Options

- **本地也跑 `wrangler dev` 搭配模擬 KV**：本地與正式環境行為更一致，但不符合「本地用瀏覽器儲存」的需求，且開發流程多一層。
- **React Router v7 框架模式（SSR，loader/action 直接讀寫 KV）**：與 KV 結合緊密，但難以替換成純前端的 localStorage 實作；需要登入的看板也不需要 SSR。

## Consequences

- 兩種實作的行為可能不一致（例如 KV 的最終一致性、版本衝突，在 localStorage 模式下不會發生）。版本衝突的處理流程需要額外在正式環境或以測試替身驗證。
