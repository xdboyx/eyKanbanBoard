import type { BoardRepository } from './repository'
import { STATUSES, STATUS_NAMES, type Board, type Status, type Task } from './types'

export interface TaskView extends Task {
  /** 狀態為「已完成」 */
  done: boolean
  /** 高優先級且不在「已完成」：以醒目樣式呈現並顯示摘要 */
  featured: boolean
}

export interface StatusView {
  status: Status
  name: string
  count: number
  tasks: TaskView[]
}

export interface BoardView {
  title: string
  subtitle: string
  updatedAt: string
  totalTasks: number
  statuses: StatusView[]
}

export interface BoardStore {
  load(): Promise<void>
  /** 回傳穩定的參考，可直接給 useSyncExternalStore 使用 */
  getSnapshot(): BoardView | null
  subscribe(listener: () => void): () => void
}

export function createBoardStore(repository: BoardRepository): BoardStore {
  let view: BoardView | null = null
  const listeners = new Set<() => void>()

  function setBoard(board: Board) {
    view = toView(board)
    listeners.forEach((listener) => listener())
  }

  return {
    async load() {
      setBoard(await repository.load())
    },
    getSnapshot: () => view,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function toView(board: Board): BoardView {
  const statuses = STATUSES.map((status) => {
    const tasks = board.order[status].flatMap((id) => {
      const task = board.tasks[id]
      if (!task) return []
      const done = status === 'done'
      return { ...task, done, featured: task.priority === 'high' && !done }
    })
    return { status, name: STATUS_NAMES[status], count: tasks.length, tasks }
  })
  return {
    title: board.title,
    subtitle: board.subtitle,
    updatedAt: board.updatedAt,
    totalTasks: statuses.reduce((sum, s) => sum + s.count, 0),
    statuses,
  }
}
