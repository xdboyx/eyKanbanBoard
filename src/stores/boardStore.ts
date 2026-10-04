import { createStore } from 'zustand/vanilla'
import { BoardConflictError, UnauthorizedError, type BoardRepository } from '../services/boardRepository'
import {
  BOARD_TEXT_LIMITS,
  STATUSES,
  type Board,
  type MoveDirection,
  type Status,
  type Task,
  type TaskDraft,
  type TaskDraftErrors,
} from '../types/board'
import { statusOf } from '../utils/board'
import { localDate } from '../utils/date'
import { emptyTaskDraft, normalizeTaskDraft, textLength, toTaskDraft, validateTaskDraft } from '../utils/taskDraft'

export interface BoardState {
  /** 尚未載入時為 null */
  board: Board | null
  load(): Promise<void>
  /** 修改看板標題，去除前後空白；空白、超過上限字數或沒有改變時不動 */
  setTitle(title: string): void
  /** 修改看板副標，去除前後空白，可以留空；超過上限字數或沒有改變時不動 */
  setSubtitle(subtitle: string): void
  /**
   * 建立任務，放在所選狀態的最上面；未填的欄位使用預設值（狀態為「待辦」）。
   * 欄位不合法時不建立，回傳各欄位的錯誤；建立成功時回傳 null。
   */
  createTask(draft: Partial<TaskDraft>): TaskDraftErrors | null
  /**
   * 更新任務的欄位與狀態。狀態改變時放在新狀態的最下面。
   * 欄位不合法時不更新，回傳各欄位的錯誤；更新成功、沒有修改或任務不存在時回傳 null。
   */
  updateTask(taskId: string, draft: TaskDraft): TaskDraftErrors | null
  deleteTask(taskId: string): void
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
  /** 產生新任務的 id；測試可注入固定的 id */
  newId?: () => string
  /** 顯示頁首下方的提示，例如儲存失敗、版本衝突 */
  onNotice?: (message: string) => void
  /** 儲存時發現未登入或 session 已失效；由呼叫端導向登入頁 */
  onUnauthorized?: () => void
}

export type BoardStore = ReturnType<typeof createBoardStore>

/**
 * 看板的全域狀態。資料存取透過 repository 注入，測試可換成記憶體實作（ADR-0001）。
 * 每個指令先更新畫面，再把整個看板排進儲存佇列，依序寫入、不並行（ADR-0003）。
 * 儲存沒有成功時，畫面回到最後一次確認已保存的看板，排隊中的儲存也一併放棄，
 * 因為它們都建立在沒有保存成功的修改之上。
 */
export function createBoardStore(
  repository: BoardRepository,
  {
    now = () => new Date(),
    newId = () => crypto.randomUUID(),
    onNotice = () => {},
    onUnauthorized = () => {},
  }: BoardStoreOptions = {},
) {
  let saving = Promise.resolve()
  /** 最後一次確認已保存的看板：載入的結果，或最後一次儲存成功時 repository 回傳的看板 */
  let saved: Board | null = null
  /** 放棄排隊中的儲存時遞增；排隊時記下的值與目前不同，就不再送出 */
  let generation = 0

  /** 移入「已完成」時記錄完成日（以瀏覽器本地日期為準），在「已完成」內保留，移出時清除 */
  function completedDateAfterMove(task: Pick<Task, 'completedDate'>, from: Status | null, to: Status) {
    if (to !== 'done') return null
    return from === 'done' ? task.completedDate : localDate(now().toISOString())
  }

  return createStore<BoardState>()((set, get) => {
    /** 套用修改並排入儲存 */
    function commit(board: Board) {
      const next = { ...board, updatedAt: now().toISOString() }
      set({ board: next })
      const queuedIn = generation
      saving = saving.then(async () => {
        const lastSaved = saved
        if (queuedIn !== generation || !lastSaved) return
        try {
          // 排隊時的看板帶著當時的版本號，前面的儲存成功後版本號已經遞增，改送最後保存的版本號
          saved = await repository.save({ ...next, version: lastSaved.version })
        } catch (error) {
          generation += 1
          handleSaveError(error, lastSaved)
        }
      })
    }

    function handleSaveError(error: unknown, lastSaved: Board) {
      if (error instanceof BoardConflictError) {
        // 其他人已經更新了看板：放棄本地還沒保存的修改，改用目前保存的看板
        saved = error.current
        set({ board: error.current })
        onNotice('看板已被其他人更新')
      } else if (error instanceof UnauthorizedError) {
        set({ board: lastSaved })
        onUnauthorized()
      } else {
        console.error('看板儲存失敗', error)
        set({ board: lastSaved })
        onNotice('儲存失敗，已還原')
      }
    }

    return {
      board: null,
      async load() {
        const board = await repository.load()
        saved = board
        set({ board })
      },
      setTitle(input) {
        const board = get().board
        const title = input.trim()
        if (!board || !title || textLength(title) > BOARD_TEXT_LIMITS.title || title === board.title) return
        commit({ ...board, title })
      },
      setSubtitle(input) {
        const board = get().board
        const subtitle = input.trim()
        if (!board || textLength(subtitle) > BOARD_TEXT_LIMITS.subtitle || subtitle === board.subtitle) return
        commit({ ...board, subtitle })
      },
      createTask(input) {
        const board = get().board
        const draft = normalizeTaskDraft({ ...emptyTaskDraft(), ...input })
        const errors = validateTaskDraft(draft)
        if (hasErrors(errors)) return errors
        if (!board) return null

        const { status, ...fields } = draft
        const id = newId()
        const completedDate = completedDateAfterMove({ completedDate: null }, null, status)
        commit({
          ...board,
          tasks: { ...board.tasks, [id]: { id, ...fields, completedDate } },
          order: { ...board.order, [status]: [id, ...board.order[status]] },
        })
        return null
      },
      updateTask(taskId, input) {
        const board = get().board
        const task = board?.tasks[taskId]
        const from = board && statusOf(board, taskId)
        const draft = normalizeTaskDraft(input)
        const errors = validateTaskDraft(draft)
        if (hasErrors(errors)) return errors
        if (!board || !task || !from) return null

        const { status: to, ...fields } = draft
        const unchanged = JSON.stringify(toTaskDraft(task, from)) === JSON.stringify(draft)
        if (unchanged) return null

        const completedDate = completedDateAfterMove(task, from, to)
        commit({
          ...board,
          tasks: { ...board.tasks, [taskId]: { ...task, ...fields, completedDate } },
          order:
            from === to
              ? board.order
              : {
                  ...board.order,
                  [from]: board.order[from].filter((id) => id !== taskId),
                  [to]: [...board.order[to], taskId],
                },
        })
        return null
      },
      deleteTask(taskId) {
        const board = get().board
        const from = board && statusOf(board, taskId)
        if (!board || !from) return
        const { [taskId]: _deleted, ...tasks } = board.tasks
        commit({ ...board, tasks, order: { ...board.order, [from]: board.order[from].filter((id) => id !== taskId) } })
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

        commit({
          ...board,
          tasks: { ...board.tasks, [taskId]: { ...task, completedDate: completedDateAfterMove(task, from, to) } },
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

function hasErrors(errors: TaskDraftErrors) {
  return Object.keys(errors).length > 0
}
