import { STATUSES, type Board, type Status } from '../types/board'

/** 任務目前所在的狀態；找不到時為 undefined */
export function statusOf(board: Board, taskId: string): Status | undefined {
  return STATUSES.find((status) => board.order[status].includes(taskId))
}
