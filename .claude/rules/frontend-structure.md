# 前端資料夾規則

`src/` 依「職責」分資料夾，而不是依功能分。新增檔案前先用下表決定位置；放不進任何一格時，先討論，不要自己開新的頂層資料夾。決策背景見 ADR-0005。

## 資料夾

| 資料夾 | 放什麼 | 不放什麼 |
| --- | --- | --- |
| `components/` | 共用的畫面元件（`.tsx`）。相關的元件放在同一個子資料夾，例如 `components/board/`、`components/layout/`；不屬於任何群組的通用元件直接放在 `components/` 底下 | 讀寫 store 以外的資料存取、純計算邏輯 |
| `hooks/` | 共用的元件邏輯，以 `use` 開頭的自訂 hook，例如訂閱 store 並組出畫面資料 | 不需要 React 的純函式（放 `utils/`） |
| `utils/` | 共用的計算、轉換、格式化等純函式，例如日期格式、看板資料 → 畫面資料 | React 元件與 hook、有副作用的程式碼 |
| `styles/` | CSS、Tailwind 的 `@theme` 設計 token、主題色、`@utility` | 元件本身（元件的樣式直接寫 Tailwind class） |
| `stores/` | zustand store。需要跨頁面（全域）或跨多個元件（某個區塊）共用的狀態都放這裡 | 只有單一元件用到的狀態（用 `useState`） |
| `pages/` | 每條路由對應的頁面元件，依網址第一段分資料夾：`/` → `pages/board/`、`/tasks/*` → `pages/tasks/`、`/login` → `pages/login/` | 路由定義本身（集中在 `src/router.tsx`，見 ADR-0004）、可在別頁重用的元件（放 `components/`） |
| `types/` | 跨資料夾共用的領域型別與常數，例如 `Task`、`Status`、`BoardView` | 只有單一檔案用到的型別（跟著那個檔案放） |
| `services/` | 資料存取：`BoardRepository` 介面、localStorage 實作、之後的 Worker API 呼叫、本地範例資料 | 畫面狀態（放 `stores/`） |

`src/` 根目錄只放進入點 `main.tsx` 與路由定義 `router.tsx`。

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

## 命名

- 元件：`PascalCase.tsx`，一個檔案一個主要元件，檔名與元件同名。
- hook：`useXxx.ts`。
- store：`xxxStore.ts`，匯出 `createXxxStore`。
- 測試：與受測檔案放在同一個資料夾，命名為 `xxx.test.ts`。

## 範例：目前的看板

```
src/
├── main.tsx
├── router.tsx
├── components/
│   ├── icons.tsx
│   ├── board/        StatusColumn.tsx、TaskCard.tsx
│   └── layout/       AppHeader.tsx
├── hooks/            useBoardView.ts
├── pages/
│   └── board/        BoardPage.tsx
├── services/         boardRepository.ts、localStorageBoardRepository.ts、sampleBoard.ts
├── stores/           boardStore.ts
├── styles/           index.css
├── types/            board.ts
└── utils/            boardView.ts、date.ts
```
