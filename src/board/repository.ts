import type { Board } from './types'

/** 看板資料存取介面：本地開發用 localStorage，正式環境用 Worker API（ADR-0001）。 */
export interface BoardRepository {
  load(): Promise<Board>
}
