import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'
import type { AuthService } from './services/authService'
import { createLocalAuthService } from './services/localAuthService'
import { createWorkerAuthService } from './services/workerAuthService'
import { createLocalStorageRepository, resetSampleBoard } from './services/localStorageBoardRepository'
import { createLocalStorageThemePreference } from './services/themePreference'
import { createAuthStore } from './stores/authStore'
import { createBoardStore } from './stores/boardStore'
import { createNoticeStore } from './stores/noticeStore'
import { createThemeStore } from './stores/themeStore'
import type { Theme } from './types/theme'
import './styles/index.css'

const themeStore = createThemeStore(createLocalStorageThemePreference())

// 本地模擬登入只在開發模式使用；正式建置時這個分支連同 .env.local 的帳密一起被移除，改由 Worker 驗證（ADR-0001）
const authService: AuthService = import.meta.env.DEV
  ? createLocalAuthService({
      username: import.meta.env.VITE_APP_USERNAME,
      password: import.meta.env.VITE_APP_PASSWORD,
    })
  : createWorkerAuthService()

const router = createAppRouter({
  authStore: createAuthStore(authService),
  store: createBoardStore(createLocalStorageRepository()),
  themeStore,
  noticeStore: createNoticeStore(),
})

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
