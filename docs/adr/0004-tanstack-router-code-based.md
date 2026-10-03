# 使用 TanStack Router（以程式碼定義路由），而非 React Router

最初的需求寫的是 React Router，最後改用 TanStack Router，路由以程式碼定義，不用檔案式路由。這個專案最容易出錯的兩件事，是「搜尋文字跟著網址 `?q=` 走、開關任務抽屜時保留」與「登入守衛導回原網址」。TanStack Router 的 `validateSearch` 讓 search params 有型別與驗證，`beforeLoad` 適合處理登入守衛，路徑與參數在編譯期就會檢查。另外，React Router 最新版（v8）需要 Node 22.22 以上，在目前的 Node 20 環境只能停在 v7；TanStack Router 最新版支援 Node 20.19 以上。

## Considered Options

- **React Router 7（data mode）**：使用者最多、資料最多、學習成本低；但 search params 與路由參數沒有型別，且無法升到 v8，除非先升級 Node。
- **TanStack Router 檔案式路由**：官方推薦的方式，可自動做程式碼分割；但需要 Vite plugin 產生 route tree 檔案。本專案只有四條路由（`/login`、`/`、`/tasks/new`、`/tasks/:id`），以程式碼定義更直接，結構一眼看得完。

## Consequences

- 路由數量明顯增加，或需要依路由做程式碼分割時，可以再評估改用檔案式路由。
