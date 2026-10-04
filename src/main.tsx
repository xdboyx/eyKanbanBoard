import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'
import type { AuthService } from './services/authService'
import { createLocalAuthService } from './services/localAuthService'
import { createWorkerAuthService } from './services/workerAuthService'
import type { BoardRepository } from './services/boardRepository'
import { createLocalStorageRepository, resetSampleBoard } from './services/localStorageBoardRepository'
import { createWorkerBoardRepository } from './services/workerBoardRepository'
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

// 本地開發的看板存在 localStorage；正式建置改由 Worker 存進 KV（ADR-0001）
const boardRepository: BoardRepository = import.meta.env.DEV
  ? createLocalStorageRepository()
  : createWorkerBoardRepository()

const authStore = createAuthStore(authService)
const noticeStore = createNoticeStore()

const router = createAppRouter({
  authStore,
  store: createBoardStore(boardRepository, {
    onNotice: (message) => noticeStore.getState().show(message),
    // 標記為未登入後重新執行路由守衛，導向登入頁並把目前的網址帶在 redirect
    onUnauthorized: () => {
      authStore.getState().expire()
      void router.invalidate()
    },
  }),
  themeStore,
  noticeStore,
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
