# 前端資料夾規則

`src/` 依「職責」分資料夾，而不是依功能分。新增檔案前先用下表決定位置；放不進任何一格時，先討論，不要自己開新的頂層資料夾。決策背景見 ADR-0005。

## 資料夾

| 資料夾 | 放什麼 | 不放什麼 |
| --- | --- | --- |
| `components/` | 共用的畫面元件（`.tsx`）。相關的元件放在同一個子資料夾，例如 `components/board/`、`components/layout/`；不屬於任何群組的通用元件直接放在 `components/` 底下 | 讀寫 store 以外的資料存取、純計算邏輯 |
| `hooks/` | 共用的元件邏輯，以 `use` 開頭的自訂 hook，例如訂閱 store 並組出畫面資料 | 不需要 React 的純函式（放 `utils/`） |
| `utils/` | 共用的計算、轉換、格式化等純函式，例如日期格式、看板資料 → 畫面資料 | React 元件與 hook、有副作用的程式碼 |
| `styles/` | `theme.css`：Tailwind 的 `@theme` 設計 token 與依主題變化的語意色變數；`index.css`：載入 Tailwind 與 `theme.css`，放 `@custom-variant`、`@utility` 與 base 樣式 | 元件本身（元件的樣式直接寫 Tailwind class）；`theme.css` 不放變數以外的樣式 |
| `stores/` | zustand store。需要跨頁面（全域）或跨多個元件（某個區塊）共用的狀態都放這裡 | 只有單一元件用到的狀態（用 `useState`） |
| `pages/` | 每條路由對應的頁面元件，依網址第一段分資料夾：`/` → `pages/board/`、`/tasks/*` → `pages/tasks/`、`/login` → `pages/login/` | 路由定義本身（集中在 `src/router.tsx`，見 ADR-0004）、可在別頁重用的元件（放 `components/`） |
| `types/` | 跨資料夾共用的領域型別與常數，例如 `Task`、`Status`、`BoardView` | 只有單一檔案用到的型別（跟著那個檔案放） |
| `services/` | 資料存取與驗證：`BoardRepository`、`AuthService` 介面、localStorage 與本地模擬登入的實作、之後的 Worker API 呼叫、本地範例資料 | 畫面狀態（放 `stores/`） |

`src/` 根目錄只放進入點 `main.tsx` 與路由定義 `router.tsx`。測試不放在 `src/`，見下方「命名」。

Worker 不是前端，不放在 `src/`：程式碼在專案根目錄的 `worker/`，入口是 `worker/index.ts`，不 import `src/` 的任何檔案。它的測試放在 `tests/worker/`，以 `@cloudflare/vitest-pool-workers` 在 Workers runtime 中執行（設定在 `vitest.worker.config.ts`），驗證 API 的請求與回應。例外是 `tests/worker/routing.test.ts`：它驗證請求進到 Worker 之前的分流（`/api/*` 交給 Worker、其他路徑回傳前端頁面），vitest-pool-workers 測不到這段，所以改在 Node 中以 wrangler 依 `wrangler.jsonc` 啟動本地 Worker（設定在 `vite.config.ts` 的 `routing` project），靜態檔案用 `tests/worker/fixtures/frontend/`。

## 資料夾層級

每個資料夾底下最多再兩層子資料夾，再深就不好找：

```
src/components/board/TaskCard.tsx              ✅ 一層
src/components/board/task-card/TaskCard.tsx    ✅ 兩層（上限）
src/components/board/task-card/parts/Tag.tsx   ❌ 三層
```

需要第三層時，代表這一群該拆成兩個並列的子資料夾。

## 依賴方向

只往右依賴，不往左：

```
pages → components / hooks → stores → services → types
                 ↘ utils ↙
```

- `components/` 透過 props 或 `hooks/` 取得資料，不直接呼叫 `services/`。
- `utils/` 與 `types/` 不 import React，也不 import `stores/`、`services/`。
- `stores/` 透過注入的 repository 讀寫資料（ADR-0001），不直接碰 `localStorage` 或 `fetch`。

## 測試 seam

前端有兩個測試 seam，依「要驗證的是什麼」決定測試放哪裡：

| seam | 驗證什麼 | 測試放在 |
| --- | --- | --- |
| `stores/` | 指令改變了什麼狀態，以及儲存行為：移動與排序、新增、編輯、刪除、完成日、欄位檢查、依序儲存、失敗還原、版本衝突、未授權 | `tests/stores/`，以記憶體中的假 repository 取代真實儲存 |
| `utils/` | 從看板資料算出的畫面資料：搜尋篩選與符合數量、逾期、日期與優先級的呈現 | `tests/utils/`，直接呼叫純函式，「今天」、搜尋文字等以參數傳入 |

- store 只保存狀態、提供指令，不提供衍生查詢；畫面需要的衍生資料寫成 `utils/` 的純函式，由 `hooks/`（例如 `useBoardView`）把 store 的狀態與純函式接起來。
- 不在 store 裡的輸入不要為了測試搬進 store，例如搜尋文字在網址 `?q=`（ADR-0004）。
- 同時牽涉兩邊的行為（例如搜尋中拖放時隱藏任務的順序）放在 store 測試，用 `utils/` 的函式算出畫面上看得到的任務來下指令與驗證。
- 不測試 React 元件與 hook；hook 保持薄，邏輯放進可測試的 store 或純函式。
- 這取代 #1 規格中「store 是前端唯一的測試 seam」的說法；issue 寫「store 測試涵蓋…」時，依上表放到對應的 seam。

## 命名

- 元件：`PascalCase.tsx`，一個檔案一個主要元件，檔名與元件同名。
- hook：`useXxx.ts`。
- store：`xxxStore.ts`，匯出 `createXxxStore`。
- 測試：放在專案根目錄的 `tests/`，依受測檔案在 `src/` 底下的路徑鏡像擺放，命名為 `xxx.test.ts`，例如 `src/stores/boardStore.ts` 的測試是 `tests/stores/boardStore.test.ts`。

## 範例：目前的看板

```
src/
├── main.tsx
├── router.tsx
├── components/
│   ├── Button.tsx、ConfirmDialog.tsx、Drawer.tsx、icons.tsx、InlineTextEdit.tsx、ThemeToggle.tsx
│   ├── board/        StatusColumn.tsx、TaskCard.tsx
│   ├── layout/       AppHeader.tsx、NoticeBar.tsx、TaskSearch.tsx
│   └── task/         TaskDrawer.tsx
├── hooks/            useBoardSearch.ts、useBoardView.ts、useLeaveGuard.ts、useModalDialog.ts、useNotice.ts、useTask.ts、useTaskDrag.ts、useTheme.ts
├── pages/
│   ├── board/        BoardPage.tsx
│   ├── login/        LoginPage.tsx
│   └── tasks/        EditTaskPage.tsx、NewTaskPage.tsx
├── services/         authService.ts、boardRepository.ts、localAuthService.ts、localStorageBoardRepository.ts、sampleBoard.ts、themePreference.ts、workerAuthService.ts、workerBoardRepository.ts
├── stores/           authStore.ts、boardStore.ts、noticeStore.ts、themeStore.ts
├── styles/           index.css、theme.css
├── types/            board.ts、theme.ts
└── utils/            board.ts、boardView.ts、date.ts、redirect.ts、taskDraft.ts

worker/               Cloudflare Worker（/api/*）：index.ts、board.ts、credentials.ts、session.ts

tests/                鏡像 src/ 與 worker/ 的路徑
├── services/         localStorageBoardRepository.test.ts、themePreference.test.ts、workerAuthService.test.ts、workerBoardRepository.test.ts
├── stores/           authStore.test.ts、boardStore.test.ts、noticeStore.test.ts、themeStore.test.ts
├── utils/            boardView.test.ts、redirect.test.ts
└── worker/           index.test.ts、routing.test.ts、fixtures/frontend/（routing 測試用的前端檔案）
```
