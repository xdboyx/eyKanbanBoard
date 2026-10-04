import { BoardConflictError, UnauthorizedError, type BoardRepository } from './boardRepository'
import type { Board } from '../types/board'

/**
 * 正式環境的看板資料存取：呼叫 Worker 的 GET／PUT /api/board，看板存在 KV（ADR-0001、ADR-0003）。
 * 登入的 session 在 cookie 中，同網址的 fetch 會自動帶上。
 */
export function createWorkerBoardRepository(fetchApi: typeof fetch = (input, init) => fetch(input, init)): BoardRepository {
  return {
    async load() {
      const response = await fetchApi('/api/board')
      if (response.status === 200) return (await response.json()) as Board
      throw responseError(response)
    },
    async save(board) {
      const response = await fetchApi('/api/board', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(board),
      })
      if (response.status === 200) return (await response.json()) as Board
      // 409 附上目前保存的看板
      if (response.status === 409) throw new BoardConflictError((await response.json()) as Board)
      throw responseError(response)
    },
  }
}

function responseError(response: Response): Error {
  if (response.status === 401) return new UnauthorizedError()
  return new Error(`看板服務回應異常（HTTP ${response.status}）`)
}
