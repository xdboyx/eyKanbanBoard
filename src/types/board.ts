export const STATUSES = ['todo', 'doing', 'review', 'done'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_NAMES: Record<Status, string> = {
  todo: '待辦',
  doing: '進行中',
  review: '審核中',
  done: '已完成',
}

/** 用左右按鈕移動任務的方向：前一個或後一個狀態 */
export type MoveDirection = 'prev' | 'next'

export const PRIORITIES = ['none', 'low', 'medium', 'high'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_NAMES: Record<Priority, string> = {
  none: '無',
  low: '低',
  medium: '中',
  high: '高',
}

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

/** 新增或編輯任務時可以填寫的欄位，以及任務要放在哪個狀態 */
export interface TaskDraft extends Pick<Task, 'title' | 'summary' | 'priority' | 'tag' | 'owner' | 'dueDate'> {
  status: Status
}

/** 有長度限制的文字欄位與上限字數 */
export const TASK_TEXT_LIMITS = {
  title: 100,
  summary: 500,
  tag: 20,
  owner: 20,
} as const

export type TaskTextField = keyof typeof TASK_TEXT_LIMITS

/** 欄位檢查的結果：不合法的欄位對應到提示文字，全部合法時是空物件 */
export type TaskDraftErrors = Partial<Record<TaskTextField, string>>

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
  /** 前一個狀態；在第一個狀態（待辦）時為 null */
  prevStatus: Status | null
  /** 後一個狀態；在最後一個狀態（已完成）時為 null */
  nextStatus: Status | null
  /** 狀態為「已完成」 */
  done: boolean
  /** 高優先級且不在「已完成」：以醒目樣式呈現並顯示摘要 */
  featured: boolean
  /** 有到期日、到期日早於今天，且不在「已完成」 */
  overdue: boolean
  /** 資訊列的日期：已完成顯示完成日，其他顯示到期日，逾期時在後面加「逾期」；沒有日期時為 null */
  dateText: string | null
  /** 資訊列的優先級：中、低優先級且不在「已完成」時顯示，例如「優先：中」；其他為 null */
  priorityText: string | null
}

export interface StatusView {
  status: Status
  name: string
  /** 列出的任務數；搜尋中是符合的數量 */
  count: number
  tasks: TaskView[]
}

export interface BoardView {
  title: string
  subtitle: string
  updatedAt: string
  /** 全部任務的數量，不受搜尋影響 */
  totalTasks: number
  /** 有搜尋文字，各狀態只列出符合的任務 */
  searching: boolean
  statuses: StatusView[]
}
