import { loadBoard, parseBoard, saveBoard } from './board'
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
  /** 存放看板的 KV namespace，綁定設定在 wrangler.jsonc（ADR-0003） */
  BOARD_KV: KVNamespace
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
      case '/api/board':
        if (request.method !== 'GET' && request.method !== 'PUT') return methodNotAllowed('GET, PUT')
        if (!(await authorized(request, env))) return new Response(null, { status: 401 })
        return request.method === 'GET' ? getBoard(env) : putBoard(request, env)
      default:
        return new Response('Not Found', { status: 404 })
    }
  },
} satisfies ExportedHandler<Env>

async function login(request: Request, env: Env): Promise<Response> {
  const settings = authSettings(env)
  // 未設定時一律無法登入，不會因為兩邊都是空字串而通過
  if (!settings) {
    console.error('APP_USERNAME、APP_PASSWORD 或 SESSION_SECRET 未設定，無法登入')
    return new Response('Server Misconfigured', { status: 500 })
  }

  const input = await readCredentials(request)
  if (!input) return new Response('Bad Request', { status: 400 })

  if (!(await credentialsMatch(input, settings))) {
    await new Promise((resolve) => setTimeout(resolve, LOGIN_FAILURE_DELAY_MS))
    return new Response(null, { status: 401 })
  }
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': await createSessionCookie(sessionKey(settings), Date.now()) },
  })
}

function logout(): Response {
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearSessionCookie() } })
}

async function session(request: Request, env: Env): Promise<Response> {
  return new Response(null, { status: (await authorized(request, env)) ? 204 : 401 })
}

/** 看板文件；KV 還沒有資料時是空看板 */
async function getBoard(env: Env): Promise<Response> {
  return boardResponse(await loadBoard(env.BOARD_KV, new Date()))
}

/**
 * 寫入整個看板。body 的 version 是前端讀到的版本號：與目前資料相符時寫入版本 +1、
 * 更新最後更新時間並回傳新文件；不符時回 409 並附上目前文件，讓前端改用最新資料（ADR-0003）
 */
async function putBoard(request: Request, env: Env): Promise<Response> {
  const input = parseBoard(await request.json().catch(() => null))
  if (!input) return new Response('Bad Request', { status: 400 })

  const now = new Date()
  const current = await loadBoard(env.BOARD_KV, now)
  if (input.version !== current.version) return boardResponse(current, 409)

  const next = { ...input, version: current.version + 1, updatedAt: now.toISOString() }
  await saveBoard(env.BOARD_KV, next)
  return boardResponse(next)
}

/** 看板內容隨時會被其他人更新，不讓瀏覽器快取 */
function boardResponse(board: unknown, status = 200): Response {
  return Response.json(board, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** request 帶有有效的 session cookie；後台未設定帳密或簽章金鑰時一律視為未登入 */
async function authorized(request: Request, env: Env): Promise<boolean> {
  const settings = authSettings(env)
  return !!settings && (await hasValidSession(request, sessionKey(settings), Date.now()))
}

interface AuthSettings {
  username: string
  password: string
  sessionSecret: string
}

/** 後台的帳密與簽章金鑰；任一個未設定時回傳 null */
function authSettings(env: Env): AuthSettings | null {
  const { APP_USERNAME, APP_PASSWORD, SESSION_SECRET } = env
  if (!APP_USERNAME || !APP_PASSWORD || !SESSION_SECRET) return null
  return { username: APP_USERNAME, password: APP_PASSWORD, sessionSecret: SESSION_SECRET }
}

/**
 * session cookie 的簽章金鑰，除了 SESSION_SECRET 也包含帳號與密碼：
 * 更換其中任何一個，既有的 session 都會失效（ADR-0002）。帳密只用來計算簽章，不會出現在 cookie 中
 */
function sessionKey({ username, password, sessionSecret }: AuthSettings): string {
  return [sessionSecret, username, password].join('\0')
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
