import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'
import { createLocalStorageRepository, resetSampleBoard } from './services/localStorageBoardRepository'
import { createLocalStorageThemePreference } from './services/themePreference'
import { createBoardStore } from './stores/boardStore'
import { createThemeStore } from './stores/themeStore'
import type { Theme } from './types/theme'
import './styles/index.css'

const store = createBoardStore(createLocalStorageRepository())
const themeStore = createThemeStore(createLocalStorageThemePreference())
const router = createAppRouter(store, themeStore)

// 主題寫在 <html data-theme> 上，所有頁面（包含登入頁）都依此換色
const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme
}
applyTheme(themeStore.getState().theme)
themeStore.subscribe((state) => applyTheme(state.theme))

if (import.meta.env.DEV) {
  // 在瀏覽器 console 執行 eykanban.resetSampleData() 可重設範例資料
  Object.assign(window, {
    eykanban: {
      resetSampleData() {
        resetSampleBoard()
        window.location.reload()
      },
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
