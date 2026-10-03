import type { Board } from '../types/board'

/** 看板資料存取介面：本地開發用 localStorage，正式環境用 Worker API（ADR-0001）。 */
export interface BoardRepository {
  load(): Promise<Board>
  /** 整個看板一起寫入（ADR-0003） */
  save(board: Board): Promise<void>
}
