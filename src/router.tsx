import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  retainSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { AppHeader } from './components/layout/AppHeader'
import { NoticeBar } from './components/layout/NoticeBar'
import { useNotice } from './hooks/useNotice'
import { BoardPage } from './pages/board/BoardPage'
import { LoginPage } from './pages/login/LoginPage'
import { EditTaskPage } from './pages/tasks/EditTaskPage'
import { NewTaskPage } from './pages/tasks/NewTaskPage'
import type { AuthStore } from './stores/authStore'
import type { BoardStore } from './stores/boardStore'
import type { NoticeStore } from './stores/noticeStore'
import type { ThemeStore } from './stores/themeStore'
import { loginRedirectTarget } from './utils/redirect'

interface RouterContext {
  authStore: AuthStore
  store: BoardStore
  themeStore: ThemeStore
  noticeStore: NoticeStore
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: function Root() {
    return (
      <div className="flex min-h-screen flex-col bg-page text-text">
        <Outlet />
      </div>
    )
  },
})

/** 登入頁的查詢參數：redirect 是登入後要回到的網址 */
interface LoginSearch {
  redirect?: string
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'login',
  validateSearch: (search: Record<string, unknown>): LoginSearch =>
    typeof search.redirect === 'string' && search.redirect ? { redirect: search.redirect } : {},
  // 已登入時不顯示登入頁，直接前往要去的網址
  beforeLoad: async ({ context, search }) => {
    if (await context.authStore.getState().check()) {
      throw redirect({ href: loginRedirectTarget(search.redirect), replace: true })
    }
  },
  component: function LoginRoute() {
    const { authStore } = loginRoute.useRouteContext()
    const { redirect } = loginRoute.useSearch()
    return <LoginPage authStore={authStore} redirect={redirect} />
  },
})

/** 需要登入的頁面：未登入時導向登入頁，並把原本的網址帶在 redirect，登入後回到這裡 */
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: async ({ context, location }) => {
    if (await context.authStore.getState().check()) return
    throw redirect({
      to: '/login',
      search: location.href === '/' ? {} : { redirect: location.href },
      replace: true,
    })
  },
  component: function Authenticated() {
    const { authStore, noticeStore } = authenticatedRoute.useRouteContext()
    const { message, dismiss } = useNotice(noticeStore)
    const navigate = useNavigate()

    async function logout() {
      await authStore.getState().logout()
      await navigate({ to: '/login' })
    }

    return (
      <>
        <AppHeader onLogout={logout} />
        <NoticeBar message={message} onDismiss={dismiss} />
        <Outlet />
      </>
    )
  },
})

/** 看板的查詢參數：q 是搜尋文字 */
interface BoardSearch {
  q?: string
}

/** 看板，以及以抽屜疊在看板上的任務子路由 */
const boardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  id: 'board',
  validateSearch: (search: Record<string, unknown>): BoardSearch =>
    typeof search.q === 'string' && search.q ? { q: search.q } : {},
  // 開關任務抽屜等看板內的導覽都保留搜尋文字；要清除時明確傳 q: undefined
  search: { middlewares: [retainSearchParams(['q'])] },
  // 只在第一次進入時載入；之後畫面以 store 的狀態為準。
  // 放在 beforeLoad 而非 loader，子路由的 beforeLoad 檢查任務時看板一定已載入
  beforeLoad: async ({ context }) => {
    if (!context.store.getState().board) await context.store.getState().load()
  },
  component: function BoardRoute() {
    const { store, themeStore } = boardRoute.useRouteContext()
    const { q = '' } = boardRoute.useSearch()
    return (
      <>
        <BoardPage store={store} themeStore={themeStore} query={q} />
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

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([boardRoute.addChildren([boardIndexRoute, newTaskRoute, taskRoute])]),
])

/**
 * 查詢參數一律當成純文字。預設會把值當 JSON 解析，搜尋「123」「true」「null」會被轉型，
 * 網址也會變成 ?q=%22123%22
 */
function parseSearch(searchStr: string): Record<string, unknown> {
  return Object.fromEntries(new URLSearchParams(searchStr))
}

function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const searchStr = params.toString()
  return searchStr ? `?${searchStr}` : ''
}

export function createAppRouter(context: RouterContext) {
  return createRouter({ routeTree, context, parseSearch, stringifySearch })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
