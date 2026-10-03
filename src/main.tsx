import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'
import { createLocalStorageRepository, resetSampleBoard } from './services/localStorageBoardRepository'
import { createBoardStore } from './stores/boardStore'
import './styles/index.css'

const store = createBoardStore(createLocalStorageRepository())
const router = createAppRouter(store)

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
