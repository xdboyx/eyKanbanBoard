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
        const task = board?.tasks[taskId]
        if (!board || !task) return
        const from = STATUSES.find((status) => board.order[status].includes(taskId))
        if (!from) return
        const to: Status | undefined = STATUSES[STATUSES.indexOf(from) + (direction === 'next' ? 1 : -1)]
        if (!to) return

        // 完成日以瀏覽器本地日期為準
        const completedDate = to === 'done' ? localDate(now().toISOString()) : null
        commit({
          ...board,
          tasks: { ...board.tasks, [taskId]: { ...task, completedDate } },
          order: {
            ...board.order,
            [from]: board.order[from].filter((id) => id !== taskId),
            [to]: [...board.order[to], taskId],
          },
        })
      },
      waitForSaves() {
        return saving
      },
    }
  })
}
