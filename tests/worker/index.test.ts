import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { type Env } from '../../worker/index'

const env: Env = { APP_USERNAME: 'admin', APP_PASSWORD: 'secret', SESSION_SECRET: 'session-secret' }

function call(method: string, path: string, init: { body?: unknown; cookie?: string } = {}, workerEnv = env) {
  const headers = new Headers()
  if (init.cookie) headers.set('Cookie', init.cookie)
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')
  const body = init.body === undefined ? undefined : JSON.stringify(init.body)
  return worker.fetch(new Request(`https://board.example${path}`, { method, headers, body }), workerEnv)
}

function login(username: string, password: string, workerEnv = env) {
  return call('POST', '/api/login', { body: { username, password } }, workerEnv)
}

/** 登入成功並回傳之後要帶在 Cookie 標頭的值 */
async function loginCookie(workerEnv = env): Promise<string> {
  const response = await login('admin', 'secret', workerEnv)
  expect(response.status).toBe(204)
  return cookieValue(response)
}

function cookieValue(response: Response): string {
  return response.headers.get('Set-Cookie')!.split(';')[0]!
}

function cookieAttributes(response: Response): string[] {
  return response.headers.get('Set-Cookie')!.split(';').slice(1).map((part) => part.trim())
}

function session(cookie?: string, workerEnv = env) {
  return call('GET', '/api/session', { cookie }, workerEnv)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/login', () => {
  it('帳密正確時回 204，發 HttpOnly、Secure、SameSite=Lax、7 天的 cookie', async () => {
    const response = await login('admin', 'secret')

    expect(response.status).toBe(204)
    expect(cookieValue(response)).toMatch(/^session=.+/)
    expect(cookieAttributes(response)).toEqual(
      expect.arrayContaining(['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', `Max-Age=${7 * 24 * 60 * 60}`]),
    )
  })

  it('帳密錯誤時延遲約 1 秒後回 401，不發 cookie', async () => {
    const startedAt = performance.now()
    const response = await login('admin', 'wrong')

    expect(response.status).toBe(401)
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(900)
    expect(response.headers.get('Set-Cookie')).toBeNull()
  })

  it.each([
    ['帳號錯誤', 'someone', 'secret'],
    ['帳號是正確帳號的前綴', 'adm', 'secret'],
    ['密碼多了字', 'admin', 'secret!'],
    ['帳號與密碼對調', 'secret', 'admin'],
    ['空白帳密', '', ''],
  ])('%s時回 401', async (_, username, password) => {
    expect((await login(username, password)).status).toBe(401)
  })

  it('body 不是帳號與密碼時回 400', async () => {
    expect((await call('POST', '/api/login', { body: { username: 'admin' } })).status).toBe(400)
    expect((await call('POST', '/api/login')).status).toBe(400)
  })

  it('後台未設定帳密或簽章金鑰時一律無法登入', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect((await login('', '', {})).status).toBe(500)
    expect((await login('admin', 'secret', { ...env, SESSION_SECRET: '' })).status).toBe(500)
  })
})

describe('GET /api/session', () => {
  it('帶有效的 cookie 時回 204', async () => {
    expect((await session(await loginCookie())).status).toBe(204)
  })

  it('沒有 cookie 時回 401', async () => {
    expect((await session()).status).toBe(401)
    expect((await session('other=1')).status).toBe(401)
  })

  it('簽章或到期時間被竄改時回 401', async () => {
    const cookie = await loginCookie()
    const [expiresAt, signature] = cookie.slice('session='.length).split('.') as [string, string]
    const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1)

    expect((await session(`session=${expiresAt}.${flipped}`)).status).toBe(401)
    expect((await session(`session=${Number(expiresAt) + 60}.${signature}`)).status).toBe(401)
    expect((await session(`session=${expiresAt}`)).status).toBe(401)
    expect((await session('session=garbage')).status).toBe(401)
  })

  it('7 天內有效，超過後回 401', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-01T09:00:00Z'))
    const cookie = await loginCookie()

    vi.setSystemTime(new Date('2026-10-08T08:59:59Z'))
    expect((await session(cookie)).status).toBe(204)

    vi.setSystemTime(new Date('2026-10-08T09:00:00Z'))
    expect((await session(cookie)).status).toBe(401)
  })

  it('更換 SESSION_SECRET 後舊 cookie 失效', async () => {
    const cookie = await loginCookie()
    const rotated = { ...env, SESSION_SECRET: 'new-session-secret' }

    expect((await session(cookie, rotated)).status).toBe(401)
    expect((await session(await loginCookie(rotated), rotated)).status).toBe(204)
  })

  it('更換密碼後舊 cookie 失效', async () => {
    const cookie = await loginCookie()
    const changed = { ...env, APP_PASSWORD: 'new-secret' }

    expect((await session(cookie, changed)).status).toBe(401)
  })

  it('更換帳號後舊 cookie 失效', async () => {
    const cookie = await loginCookie()

    expect((await session(cookie, { ...env, APP_USERNAME: 'owner' })).status).toBe(401)
  })

  it('後台的帳密被移除時，既有 cookie 失效', async () => {
    const cookie = await loginCookie()

    expect((await session(cookie, { ...env, APP_PASSWORD: '' })).status).toBe(401)
  })
})

describe('POST /api/logout', () => {
  it('回 204 並讓瀏覽器刪除 cookie', async () => {
    const response = await call('POST', '/api/logout', { cookie: await loginCookie() })

    expect(response.status).toBe(204)
    expect(cookieValue(response)).toBe('session=')
    expect(cookieAttributes(response)).toEqual(expect.arrayContaining(['Max-Age=0', 'Path=/']))
  })
})

describe('其他請求', () => {
  it('方法不對時回 405', async () => {
    expect((await call('GET', '/api/login')).status).toBe(405)
    expect((await call('GET', '/api/logout')).status).toBe(405)
    expect((await call('POST', '/api/session')).status).toBe(405)
  })

  it('不存在的 API 回 404', async () => {
    expect((await call('GET', '/api/unknown')).status).toBe(404)
  })
})
