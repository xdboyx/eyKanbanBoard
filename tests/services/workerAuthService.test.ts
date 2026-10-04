import { describe, expect, it } from 'vitest'
import { createWorkerAuthService } from '../../src/services/workerAuthService'

/** 依序回傳指定狀態碼的假 fetch，並記錄收到的請求 */
function fakeFetch(...statuses: number[]) {
  const requests: { url: string; init: RequestInit | undefined }[] = []
  const fetchApi: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init })
    return new Response(null, { status: statuses.shift() ?? 500 })
  }
  return { fetchApi, requests }
}

describe('驗證服務（Worker）', () => {
  it('/api/session 回 204 是已登入、401 是未登入', async () => {
    const { fetchApi, requests } = fakeFetch(204, 401)
    const service = createWorkerAuthService(fetchApi)

    await expect(service.checkSession()).resolves.toBe(true)
    await expect(service.checkSession()).resolves.toBe(false)
    expect(requests.map((request) => request.url)).toEqual(['/api/session', '/api/session'])
  })

  it('以 JSON 送出帳密登入，204 是成功、401 是帳密錯誤', async () => {
    const { fetchApi, requests } = fakeFetch(204, 401)
    const service = createWorkerAuthService(fetchApi)

    await expect(service.login('admin', 'secret')).resolves.toBe(true)
    await expect(service.login('admin', 'wrong')).resolves.toBe(false)
    expect(requests[0]).toEqual({
      url: '/api/login',
      init: expect.objectContaining({ method: 'POST', body: JSON.stringify({ username: 'admin', password: 'secret' }) }),
    })
  })

  it('伺服器出錯時拋出錯誤，不當成帳密錯誤或未登入', async () => {
    const service = createWorkerAuthService(fakeFetch(500, 500, 500).fetchApi)

    await expect(service.login('admin', 'secret')).rejects.toThrow()
    await expect(service.checkSession()).rejects.toThrow()
    await expect(service.logout()).rejects.toThrow()
  })

  it('登出呼叫 /api/logout', async () => {
    const { fetchApi, requests } = fakeFetch(204)

    await createWorkerAuthService(fetchApi).logout()
    expect(requests).toEqual([{ url: '/api/logout', init: { method: 'POST' } }])
  })
})
