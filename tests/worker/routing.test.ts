import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { unstable_startWorker } from 'wrangler'

/**
 * 以 wrangler.jsonc 在本地啟動 Worker，驗證請求在進到 Worker 之前怎麼分流：
 * /api/* 交給 Worker，其他路徑回傳靜態檔案，找不到時回傳前端頁面（SPA fallback）。
 * vitest-pool-workers 的測試直接呼叫 Worker，不經過這段分流，所以這個測試在 Node 中執行。
 * 靜態檔案改用 fixtures/frontend，不依賴前端是否建置過。
 */
let worker: Awaited<ReturnType<typeof unstable_startWorker>>

beforeAll(async () => {
  worker = await unstable_startWorker({
    config: 'wrangler.jsonc',
    assets: 'tests/worker/fixtures/frontend',
    dev: { server: { port: 0 }, inspector: false, logLevel: 'none' },
  })
  await worker.ready
}, 30_000)

afterAll(async () => {
  await worker?.dispose()
})

function get(path: string) {
  return worker.fetch(`http://localhost${path}`)
}

describe('非 API 路徑', () => {
  it.each(['/', '/login', '/tasks/new', '/tasks/abc', '/no/such/page'])('直接開啟 %s 時回傳前端頁面', async (path) => {
    const response = await get(path)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/html')
    expect(await response.text()).toContain('eyKanbanBoard 測試用前端頁面')
  })

  it('存在的靜態檔案照原樣回傳', async () => {
    const response = await get('/assets/app.js')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('javascript')
  })
})

describe('/api/*', () => {
  it('交給 Worker 處理，不回傳前端頁面', async () => {
    expect((await get('/api/session')).status).toBe(401)

    const unknown = await get('/api/unknown')
    expect(unknown.status).toBe(404)
    expect(await unknown.text()).not.toContain('eyKanbanBoard 測試用前端頁面')
  })
})
