import { createStore } from 'zustand/vanilla'
import type { BoardRepository } from '../services/boardRepository'
import { STATUSES, type Board, type MoveDirection, type Status } from '../types/board'
import { localDate } from '../utils/date'

export interface BoardState {
  /** 尚未載入時為 null */
  board: Board | null
  load(): Promise<void>
  /** 把任務移到前一個或後一個狀態的最下面；已在第一個或最後一個狀態時不動 */
  moveTask(taskId: string, direction: MoveDirection): void
  /** 把任務放到指定狀態中某個任務之前，beforeId 為 null 時放在最後面；位置沒有改變時不動 */
  moveTaskTo(taskId: string, to: Status, beforeId: string | null): void
  /** 等到目前排隊中的儲存都執行完 */
  waitForSaves(): Promise<void>
}

export interface BoardStoreOptions {
  /** 現在時間，用來記錄最後更新時間與完成日；測試可注入固定時間 */
  now?: () => Date
}

export type BoardStore = ReturnType<typeof createBoardStore>

/**
 * 看板的全域狀態。資料存取透過 repository 注入，測試可換成記憶體實作（ADR-0001）。
 * 每個指令先更新畫面，再把整個看板排進儲存佇列，依序寫入、不並行（ADR-0003）。
 */
export function createBoardStore(repository: BoardRepository, { now = () => new Date() }: BoardStoreOptions = {}) {
  let saving = Promise.resolve()

  return createStore<BoardState>()((set, get) => {
    /** 套用修改並排入儲存 */
    function commit(board: Board) {
      const next = { ...board, updatedAt: now().toISOString() }
      set({ board: next })
      saving = saving
        .then(() => repository.save(next))
        .catch((error: unknown) => console.error('看板儲存失敗', error))
    }

    return {
      board: null,
      async load() {
        set({ board: await repository.load() })
      },
      moveTask(taskId, direction) {
        const board = get().board
        const from = board && statusOf(board, taskId)
        if (!from) return
        const to: Status | undefined = STATUSES[STATUSES.indexOf(from) + (direction === 'next' ? 1 : -1)]
        if (to) get().moveTaskTo(taskId, to, null)
      },
      moveTaskTo(taskId, to, beforeId) {
        const board = get().board
        const task = board?.tasks[taskId]
        const from = board && statusOf(board, taskId)
        if (!board || !task || !from || beforeId === taskId) return

        const target = board.order[to].filter((id) => id !== taskId)
        const index = beforeId === null ? target.length : target.indexOf(beforeId)
        if (index < 0) return
        target.splice(index, 0, taskId)
        if (from === to && target.every((id, i) => id === board.order[to][i])) return

        // 移入「已完成」時記錄完成日（以瀏覽器本地日期為準），在「已完成」內排序時保留，移出時清除
        const completedDate =
          to !== 'done' ? null : from === 'done' ? task.completedDate : localDate(now().toISOString())
        commit({
          ...board,
          tasks: { ...board.tasks, [taskId]: { ...task, completedDate } },
          order: {
            ...board.order,
            [from]: board.order[from].filter((id) => id !== taskId),
            [to]: target,
          },
        })
      },
      waitForSaves() {
        return saving
      },
    }
  })
}

/** 任務目前所在的狀態；找不到時為 undefined */
function statusOf(board: Board, taskId: string): Status | undefined {
  return STATUSES.find((status) => board.order[status].includes(taskId))
}
