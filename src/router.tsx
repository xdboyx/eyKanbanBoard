import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { AppHeader } from './components/layout/AppHeader'
import { NoticeBar } from './components/layout/NoticeBar'
import { useNotice } from './hooks/useNotice'
import { BoardPage } from './pages/board/BoardPage'
import { EditTaskPage } from './pages/tasks/EditTaskPage'
import { NewTaskPage } from './pages/tasks/NewTaskPage'
import type { BoardStore } from './stores/boardStore'
import type { NoticeStore } from './stores/noticeStore'
import type { ThemeStore } from './stores/themeStore'

interface RouterContext {
  store: BoardStore
  themeStore: ThemeStore
  noticeStore: NoticeStore
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: function Root() {
    const { noticeStore } = rootRoute.useRouteContext()
    const { message, dismiss } = useNotice(noticeStore)
    return (
      <div className="flex min-h-screen flex-col bg-page text-text">
        <AppHeader />
        <NoticeBar message={message} onDismiss={dismiss} />
        <Outlet />
      </div>
    )
  },
})

/** 看板，以及以抽屜疊在看板上的任務子路由 */
const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'board',
  // 只在第一次進入時載入；之後畫面以 store 的狀態為準。
  // 放在 beforeLoad 而非 loader，子路由的 beforeLoad 檢查任務時看板一定已載入
  beforeLoad: async ({ context }) => {
    if (!context.store.getState().board) await context.store.getState().load()
  },
  component: function BoardRoute() {
    const { store, themeStore } = boardRoute.useRouteContext()
    return (
      <>
        <BoardPage store={store} themeStore={themeStore} />
        <Outlet />
      </>
    )
  },
})

const boardIndexRoute = createRoute({
  getParentRoute: () => boardRoute,
  path: '/',
})

const newTaskRoute = createRoute({
  getParentRoute: () => boardRoute,
  path: 'tasks/new',
  component: function NewTaskRoute() {
    const { store } = newTaskRoute.useRouteContext()
    return <NewTaskPage store={store} />
  },
})

const taskRoute = createRoute({
  getParentRoute: () => boardRoute,
  path: 'tasks/$taskId',
  // 不存在（或已被刪除）的任務導回看板並提示
  beforeLoad: ({ context, params }) => {
    if (context.store.getState().board?.tasks[params.taskId]) return
    context.noticeStore.getState().show('找不到這個任務，可能已被刪除')
    throw redirect({ to: '/', replace: true })
  },
  component: function TaskRoute() {
    const { store } = taskRoute.useRouteContext()
    const { taskId } = taskRoute.useParams()
    return <EditTaskPage key={taskId} store={store} taskId={taskId} />
  },
})

const routeTree = rootRoute.addChildren([boardRoute.addChildren([boardIndexRoute, newTaskRoute, taskRoute])])

export function createAppRouter(store: BoardStore, themeStore: ThemeStore, noticeStore: NoticeStore) {
  return createRouter({ routeTree, context: { store, themeStore, noticeStore } })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
