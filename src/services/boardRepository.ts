import type { Board } from '../types/board'

/** 看板資料存取介面：本地開發用 localStorage，正式環境用 Worker API（ADR-0001）。 */
export interface BoardRepository {
  load(): Promise<Board>
  /**
   * 整個看板一起寫入（ADR-0003），board.version 是它讀到的版本號；回傳實際保存的看板（含新的版本號）。
   * 版本號與目前資料不符時拋出 BoardConflictError，未登入或 session 失效時拋出 UnauthorizedError
   */
  save(board: Board): Promise<Board>
}

/** 儲存時版本號與目前資料不符：其他人已經更新了看板。current 是目前保存的看板 */
export class BoardConflictError extends Error {
  readonly current: Board

  constructor(current: Board) {
    super('看板已被其他人更新')
    this.name = 'BoardConflictError'
    this.current = current
  }
}

/** 未登入或 session 已失效，需要重新登入 */
export class UnauthorizedError extends Error {
  constructor() {
    super('未登入或 session 已失效')
    this.name = 'UnauthorizedError'
  }
}
