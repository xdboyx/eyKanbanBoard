export const STATUSES = ['todo', 'doing', 'review', 'done'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_NAMES: Record<Status, string> = {
  todo: '待辦',
  doing: '進行中',
  review: '審核中',
  done: '已完成',
}

export type Priority = 'none' | 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  summary: string
  priority: Priority
  tag: string
  owner: string
  /** YYYY-MM-DD */
  dueDate: string | null
  /** YYYY-MM-DD，由系統在任務進入「已完成」時記錄 */
  completedDate: string | null
}

/** 建立任務，未指定的欄位使用預設值 */
export function createTask(id: string, fields: Partial<Omit<Task, 'id'>> = {}): Task {
  return {
    id,
    title: '',
    summary: '',
    priority: 'none',
    tag: '',
    owner: '',
    dueDate: null,
    completedDate: null,
    ...fields,
  }
}

export interface Board {
  title: string
  subtitle: string
  /** ISO 8601 */
  updatedAt: string
  version: number
  tasks: Record<string, Task>
  order: Record<Status, string[]>
}

/** 畫面用的任務：在 Task 上加上依狀態與優先級推導出的呈現旗標 */
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
