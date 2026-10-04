import { env as testEnv } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker, { type Env } from '../../worker/index'

declare global {
  namespace Cloudflare {
    /** wrangler.jsonc 的綁定；測試中的 KV 是模擬的 */
    interface Env {
      BOARD_KV: KVNamespace
    }
  }
}

const env: Env = {
  APP_USERNAME: 'admin',
  APP_PASSWORD: 'secret',
  SESSION_SECRET: 'session-secret',
  BOARD_KV: testEnv.BOARD_KV,
}

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

// 模擬的 KV 在同一個測試檔的測試之間共用，每個測試從空的 KV 開始
beforeEach(async () => {
  const { keys } = await env.BOARD_KV.list()
  await Promise.all(keys.map(({ name }) => env.BOARD_KV.delete(name)))
})

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

    expect((await login('', '', { BOARD_KV: env.BOARD_KV })).status).toBe(500)
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

/** 前端送出的看板：version 是它讀到的版本號 */
function boardInput(version: number) {
  return {
    title: '測試看板',
    subtitle: '測試單位',
    updatedAt: '2026-10-04T08:00:00.000Z',
    version,
    tasks: {
      a: task('a', { title: '任務 a', priority: 'high', dueDate: '2026-10-12' }),
      b: task('b', { title: '任務 b', completedDate: '2026-10-01' }),
    },
    order: { todo: ['a'], doing: [], review: [], done: ['b'] },
  }
}

function task(id: string, fields: Record<string, unknown> = {}) {
  return { id, title: '', summary: '', priority: 'none', tag: '', owner: '', dueDate: null, completedDate: null, ...fields }
}

function getBoard(cookie?: string) {
  return call('GET', '/api/board', { cookie })
}

function putBoard(body: unknown, cookie?: string) {
  return call('PUT', '/api/board', { body, cookie })
}

describe('GET /api/board', () => {
  it('KV 還沒有資料時回傳空看板：標題「未命名看板」、版本 0', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-04T09:00:00Z'))

    const response = await getBoard(await loginCookie())

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({
      title: '未命名看板',
      subtitle: '',
      updatedAt: '2026-10-04T09:00:00.000Z',
      version: 0,
      tasks: {},
      order: { todo: [], doing: [], review: [], done: [] },
    })
  })

  it('回傳最後一次寫入的看板', async () => {
    const cookie = await loginCookie()
    const saved = await (await putBoard(boardInput(0), cookie)).json()

    const response = await getBoard(cookie)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(saved)
  })

  it('未登入時回 401', async () => {
    expect((await getBoard()).status).toBe(401)
    expect((await getBoard('session=garbage')).status).toBe(401)
  })
})

describe('PUT /api/board', () => {
  it('版本相符時寫入，版本 +1、更新最後更新時間，並回傳新文件', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-05T03:00:00Z'))
    const cookie = await loginCookie()

    const response = await putBoard(boardInput(0), cookie)

    expect(response.status).toBe(200)
    const saved = await response.json()
    expect(saved).toEqual({ ...boardInput(0), version: 1, updatedAt: '2026-10-05T03:00:00.000Z' })
    expect(await (await getBoard(cookie)).json()).toEqual(saved)
  })

  it('以新的版本號可以繼續寫入', async () => {
    const cookie = await loginCookie()
    await putBoard(boardInput(0), cookie)

    const response = await putBoard({ ...boardInput(1), title: '第二次' }, cookie)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ title: '第二次', version: 2 })
  })

  it('版本不符時回 409 並附上目前的看板，不寫入', async () => {
    const cookie = await loginCookie()
    const current = await (await putBoard(boardInput(0), cookie)).json()

    for (const version of [0, 2]) {
      const response = await putBoard({ ...boardInput(version), title: '過期的修改' }, cookie)
      expect(response.status).toBe(409)
      expect(await response.json()).toEqual(current)
    }
    expect(await (await getBoard(cookie)).json()).toEqual(current)
  })

  it('KV 還沒有資料時，版本不是 0 回 409 並附上空看板', async () => {
    const response = await putBoard(boardInput(3), await loginCookie())

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ title: '未命名看板', version: 0 })
  })

  it('只保存已知的欄位', async () => {
    const cookie = await loginCookie()
    const input = boardInput(0)

    const response = await putBoard(
      { ...input, extra: 'x', tasks: { ...input.tasks, a: { ...input.tasks.a, extra: 'y' } } },
      cookie,
    )

    const saved = await response.json<Record<string, unknown>>()
    expect(saved).not.toHaveProperty('extra')
    expect((saved.tasks as Record<string, unknown>).a).not.toHaveProperty('extra')
  })

  it('文字欄位剛好在上限時可以寫入，中文字與 emoji 都算一個字', async () => {
    const input = boardInput(0)
    const response = await putBoard(
      {
        ...input,
        title: '看'.repeat(100),
        subtitle: '😀'.repeat(100),
        tasks: {
          ...input.tasks,
          a: task('a', { title: '字'.repeat(100), summary: 'a'.repeat(500), tag: '標'.repeat(20), owner: '人'.repeat(20) }),
        },
      },
      await loginCookie(),
    )

    expect(response.status).toBe(200)
  })

  it.each<[string, (input: ReturnType<typeof boardInput>) => unknown]>([
    ['body 不是看板', () => 'board'],
    ['缺少標題', ({ title: _, ...rest }) => rest],
    ['標題空白', (input) => ({ ...input, title: '   ' })],
    ['標題超過 100 字', (input) => ({ ...input, title: '看'.repeat(101) })],
    ['副標超過 100 字', (input) => ({ ...input, subtitle: '看'.repeat(101) })],
    ['版本號不是非負整數', (input) => ({ ...input, version: -1 })],
    ['版本號是字串', (input) => ({ ...input, version: '0' })],
    ['任務標題空白', (input) => ({ ...input, tasks: { ...input.tasks, a: task('a') } })],
    ['任務標題超過 100 字', (input) => withTask(input, { title: '字'.repeat(101) })],
    ['摘要超過 500 字', (input) => withTask(input, { summary: 'a'.repeat(501) })],
    ['標籤超過 20 字', (input) => withTask(input, { tag: '標'.repeat(21) })],
    ['負責人超過 20 字', (input) => withTask(input, { owner: '人'.repeat(21) })],
    ['優先級不在四級之內', (input) => withTask(input, { priority: 'urgent' })],
    ['到期日格式不對', (input) => withTask(input, { dueDate: '2026/10/12' })],
    ['到期日不存在', (input) => withTask(input, { dueDate: '2026-02-30' })],
    ['完成日不是日期', (input) => withTask(input, { completedDate: 20261001 })],
    ['任務 id 與鍵不同', (input) => withTask(input, { id: 'z' })],
    ['缺少某個狀態的順序', (input) => ({ ...input, order: { todo: ['a'], doing: [], review: [] } })],
    ['順序中有不存在的任務', (input) => ({ ...input, order: { ...input.order, doing: ['x'] } })],
    ['任務出現在兩個狀態', (input) => ({ ...input, order: { ...input.order, doing: ['a'] } })],
    ['任務在同一個狀態出現兩次', (input) => ({ ...input, order: { ...input.order, todo: ['a', 'a'] } })],
    ['任務不在任何狀態', (input) => ({ ...input, order: { ...input.order, done: [] } })],
  ])('%s時回 400，不寫入', async (_, change) => {
    const cookie = await loginCookie()

    const response = await putBoard(change(boardInput(0)), cookie)

    expect(response.status).toBe(400)
    expect(await (await getBoard(cookie)).json()).toMatchObject({ version: 0 })
  })

  it('body 不是 JSON 時回 400', async () => {
    const response = await worker.fetch(
      new Request('https://board.example/api/board', {
        method: 'PUT',
        headers: { Cookie: await loginCookie() },
        body: '{not json',
      }),
      env,
    )

    expect(response.status).toBe(400)
  })

  it('任務超過 1000 個時回 400', async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => `t${i}`)
    const input = {
      ...boardInput(0),
      tasks: Object.fromEntries(ids.map((id) => [id, task(id, { title: id })])),
      order: { todo: ids, doing: [], review: [], done: [] },
    }

    expect((await putBoard(input, await loginCookie())).status).toBe(400)
  })

  it('未登入時回 401，不寫入', async () => {
    const response = await putBoard(boardInput(0))

    expect(response.status).toBe(401)
    expect(await (await getBoard(await loginCookie())).json()).toMatchObject({ version: 0 })
  })
})

function withTask(input: ReturnType<typeof boardInput>, fields: Record<string, unknown>) {
  return { ...input, tasks: { ...input.tasks, a: { ...input.tasks.a, ...fields } } }
}

describe('其他請求', () => {
  it('方法不對時回 405', async () => {
    expect((await call('GET', '/api/login')).status).toBe(405)
    expect((await call('GET', '/api/logout')).status).toBe(405)
    expect((await call('POST', '/api/session')).status).toBe(405)
    expect((await call('POST', '/api/board')).status).toBe(405)
    expect((await call('DELETE', '/api/board')).status).toBe(405)
  })

  it('不存在的 API 回 404', async () => {
    expect((await call('GET', '/api/unknown')).status).toBe(404)
  })
})
