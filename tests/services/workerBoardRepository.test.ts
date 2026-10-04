import { describe, expect, it } from 'vitest'
import { BoardConflictError, UnauthorizedError } from '../../src/services/boardRepository'
import { createWorkerBoardRepository } from '../../src/services/workerBoardRepository'
import { createTask, type Board } from '../../src/types/board'

const board: Board = {
  title: '測試看板',
  subtitle: '',
  updatedAt: '2026-10-04T08:00:00.000Z',
  version: 3,
  tasks: { a: createTask('a', { title: '任務 a' }) },
  order: { todo: ['a'], doing: [], review: [], done: [] },
}

/** 依序回傳指定回應的假 fetch，並記錄收到的請求 */
function fakeFetch(...responses: { status: number; body?: unknown }[]) {
  const requests: { url: string; init: RequestInit | undefined }[] = []
  const fetchApi: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init })
    const { status, body } = responses.shift() ?? { status: 500 }
    return body === undefined ? new Response(null, { status }) : Response.json(body, { status })
  }
  return { fetchApi, requests }
}

describe('看板 repository（Worker）', () => {
  it('從 /api/board 載入看板', async () => {
    const { fetchApi, requests } = fakeFetch({ status: 200, body: board })

    await expect(createWorkerBoardRepository(fetchApi).load()).resolves.toEqual(board)
    expect(requests.map((request) => request.url)).toEqual(['/api/board'])
  })

  it('以 PUT 送出整個看板，回傳 Worker 保存的看板', async () => {
    const savedBoard = { ...board, version: 4, updatedAt: '2026-10-05T00:00:00.000Z' }
    const { fetchApi, requests } = fakeFetch({ status: 200, body: savedBoard })

    await expect(createWorkerBoardRepository(fetchApi).save(board)).resolves.toEqual(savedBoard)
    expect(requests).toEqual([
      {
        url: '/api/board',
        init: expect.objectContaining({ method: 'PUT', body: JSON.stringify(board) }),
      },
    ])
  })

  it('409 時拋出 BoardConflictError，附上目前保存的看板', async () => {
    const current = { ...board, title: '其他人改的標題', version: 5 }
    const repository = createWorkerBoardRepository(fakeFetch({ status: 409, body: current }).fetchApi)

    const error = await repository.save(board).catch((error: unknown) => error)

    expect(error).toBeInstanceOf(BoardConflictError)
    expect((error as BoardConflictError).current).toEqual(current)
  })

  it('401 時拋出 UnauthorizedError', async () => {
    const repository = createWorkerBoardRepository(fakeFetch({ status: 401 }, { status: 401 }).fetchApi)

    await expect(repository.load()).rejects.toBeInstanceOf(UnauthorizedError)
    await expect(repository.save(board)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('其他狀態是伺服器出錯，拋出一般錯誤', async () => {
    const repository = createWorkerBoardRepository(fakeFetch({ status: 500 }, { status: 400 }).fetchApi)

    const loadError = await repository.load().catch((error: unknown) => error)
    const saveError = await repository.save(board).catch((error: unknown) => error)

    for (const error of [loadError, saveError]) {
      expect(error).toBeInstanceOf(Error)
      expect(error).not.toBeInstanceOf(BoardConflictError)
      expect(error).not.toBeInstanceOf(UnauthorizedError)
    }
  })
})
