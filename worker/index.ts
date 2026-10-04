import { credentialsMatch } from './credentials'
import { clearSessionCookie, createSessionCookie, hasValidSession } from './session'

/** 在 Cloudflare 後台 Worker 的「設定 → 變數與 Secret」設定（ADR-0002） */
export interface Env {
  /** 一般變數 */
  APP_USERNAME?: string
  /** Secret */
  APP_PASSWORD?: string
  /** Secret：session cookie 的簽章金鑰，更換後所有人都要重新登入 */
  SESSION_SECRET?: string
}

/** 帳密錯誤時延遲回應，拖慢暴力破解 */
const LOGIN_FAILURE_DELAY_MS = 1000

/**
 * Worker 只處理 /api/*；其他路徑由 wrangler 設定的靜態檔案回傳前端頁面。
 * 驗證只在這裡進行，前端的正式建置不含任何帳密比對（ADR-0001）。
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    switch (pathname) {
      case '/api/login':
        return request.method === 'POST' ? login(request, env) : methodNotAllowed('POST')
      case '/api/logout':
        return request.method === 'POST' ? logout() : methodNotAllowed('POST')
      case '/api/session':
        return request.method === 'GET' ? session(request, env) : methodNotAllowed('GET')
      default:
        return new Response('Not Found', { status: 404 })
    }
  },
} satisfies ExportedHandler<Env>

async function login(request: Request, env: Env): Promise<Response> {
  const { APP_USERNAME, APP_PASSWORD, SESSION_SECRET } = env
  // 未設定時一律無法登入，不會因為兩邊都是空字串而通過
  if (!APP_USERNAME || !APP_PASSWORD || !SESSION_SECRET) {
    console.error('APP_USERNAME、APP_PASSWORD 或 SESSION_SECRET 未設定，無法登入')
    return new Response('Server Misconfigured', { status: 500 })
  }

  const input = await readCredentials(request)
  if (!input) return new Response('Bad Request', { status: 400 })

  if (!(await credentialsMatch(input, { username: APP_USERNAME, password: APP_PASSWORD }))) {
    await new Promise((resolve) => setTimeout(resolve, LOGIN_FAILURE_DELAY_MS))
    return new Response(null, { status: 401 })
  }
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': await createSessionCookie(SESSION_SECRET, Date.now()) },
  })
}

function logout(): Response {
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearSessionCookie() } })
}

async function session(request: Request, env: Env): Promise<Response> {
  const valid = !!env.SESSION_SECRET && (await hasValidSession(request, env.SESSION_SECRET, Date.now()))
  return new Response(null, { status: valid ? 204 : 401 })
}

/** body 為 { username, password }，格式不對時回傳 null */
async function readCredentials(request: Request): Promise<{ username: string; password: string } | null> {
  const body: unknown = await request.json().catch(() => null)
  if (typeof body !== 'object' || body === null) return null
  const { username, password } = body as Record<string, unknown>
  if (typeof username !== 'string' || typeof password !== 'string') return null
  return { username, password }
}

function methodNotAllowed(allow: string): Response {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: allow } })
}
