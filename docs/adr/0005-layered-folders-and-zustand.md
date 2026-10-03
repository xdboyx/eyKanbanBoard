# 前端依職責分資料夾，共用狀態使用 zustand

`src/` 改成依職責分資料夾（`components/`、`hooks/`、`utils/`、`styles/`、`stores/`、`pages/`、`types/`、`services/`），每個資料夾底下最多兩層子資料夾；需要跨元件共用的狀態一律用 zustand store。詳細規則在 `.claude/rules/frontend-structure.md`。

第一版骨架原本把看板相關的型別、store、資料存取與畫面都放在 `src/board/` 底下，store 是自己用 `useSyncExternalStore` 寫的。改成依職責分，是為了讓「某種東西該放哪」只有一個答案，不必每次判斷它屬於哪個功能；zustand 取代自製 store，之後加入拖放、編輯、搜尋等狀態時不用再自己處理訂閱與選取。

store 以 `zustand/vanilla` 的 `createStore` 建立，repository 從外部注入並經由路由 context 傳給頁面，維持 ADR-0001 的雙儲存設計，測試也能換成記憶體實作。

## Considered Options

- **維持依功能分資料夾（`src/board/`、`src/auth/`…）**：同一個功能的檔案集中，但本專案只有一個看板，功能邊界不明顯，反而每次都要判斷檔案屬於哪個功能。
- **zustand 的 `create()` 匯出全域單例 hook**：用法最簡單，但 repository 無法在建立時注入，測試與本地／正式兩種儲存的切換會變麻煩。

## Consequences

- 同一個功能的程式碼分散在多個資料夾，改一個功能可能要動好幾個資料夾。
- 資料夾變深時相對路徑的 import 會變長；若明顯影響可讀性，再加入路徑別名（例如 `@/`）。
