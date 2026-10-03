import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { AppHeader } from './components/layout/AppHeader'
import { BoardPage } from './pages/board/BoardPage'
import type { BoardStore } from './stores/boardStore'
import type { ThemeStore } from './stores/themeStore'

interface RouterContext {
  store: BoardStore
  themeStore: ThemeStore
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div className="flex min-h-screen flex-col bg-page text-text">
      <AppHeader />
      <Outlet />
    </div>
  ),
})

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // 只在第一次進入時載入；之後畫面以 store 的狀態為準
  loader: async ({ context }) => {
    if (!context.store.getState().board) await context.store.getState().load()
  },
  component: function BoardRoute() {
    const { store, themeStore } = boardRoute.useRouteContext()
    return <BoardPage store={store} themeStore={themeStore} />
  },
})

const routeTree = rootRoute.addChildren([boardRoute])

export function createAppRouter(store: BoardStore, themeStore: ThemeStore) {
  return createRouter({ routeTree, context: { store, themeStore } })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
