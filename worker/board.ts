/**
 * 看板文件與它的檢查。整個看板存成 BOARD_KV 中的單一筆 JSON，附帶遞增的版本號（ADR-0003）。
 * Worker 不 import 前端的程式碼，形狀與長度上限要與 src/types/board.ts 保持一致。
 */

const STATUSES = ['todo', 'doing', 'review', 'done'] as const
type Status = (typeof STATUSES)[number]

const PRIORITIES = ['none', 'low', 'medium', 'high'] as const
type Priority = (typeof PRIORITIES)[number]

export interface Task {
  id: string
  title: string
  summary: string
  priority: Priority
  tag: string
  owner: string
  dueDate: string | null
  completedDate: string | null
}

export interface Board {
  title: string
  subtitle: string
  updatedAt: string
  version: number
  tasks: Record<string, Task>
  order: Record<Status, string[]>
}

/** 前端送來要寫入的看板；最後更新時間由 Worker 在寫入時決定 */
export type BoardInput = Omit<Board, 'updatedAt'>

/** 看板存在 KV 中的鍵 */
const BOARD_KEY = 'board'

/** 文字欄位的上限字數，與前端的 BOARD_TEXT_LIMITS、TASK_TEXT_LIMITS 相同 */
const BOARD_TEXT_LIMITS = { title: 100, subtitle: 100 } as const
const TASK_TEXT_LIMITS = { title: 100, summary: 500, tag: 20, owner: 20 } as const

/** 任務數與任務 id 的上限，避免寫入過大的資料 */
const MAX_TASKS = 1000
const MAX_TASK_ID_LENGTH = 64

/** KV 還沒有資料時（第一次開啟）的看板 */
export function emptyBoard(now: Date): Board {
  return {
    title: '未命名看板',
    subtitle: '',
    updatedAt: now.toISOString(),
    version: 0,
    tasks: {},
    order: { todo: [], doing: [], review: [], done: [] },
  }
}

export async function loadBoard(kv: KVNamespace, now: Date): Promise<Board> {
  return (await kv.get<Board>(BOARD_KEY, 'json')) ?? emptyBoard(now)
}

export async function saveBoard(kv: KVNamespace, board: Board): Promise<void> {
  await kv.put(BOARD_KEY, JSON.stringify(board))
}

/**
 * 檢查前端送來的看板：結構、長度上限，以及每個任務剛好出現在一個狀態中一次。
 * 合法時回傳只含已知欄位的看板（version 是前端讀到的版本號），不合法時回傳 null。
 */
export function parseBoard(input: unknown): BoardInput | null {
  if (!isRecord(input)) return null
  const { title, subtitle, version, tasks, order } = input
  if (!isText(title, BOARD_TEXT_LIMITS.title) || !title.trim()) return null
  if (!isText(subtitle, BOARD_TEXT_LIMITS.subtitle)) return null
  if (!Number.isSafeInteger(version) || (version as number) < 0) return null
  if (!isRecord(tasks) || !isRecord(order)) return null

  const taskEntries = Object.entries(tasks)
  if (taskEntries.length > MAX_TASKS) return null
  const parsedTasks: Record<string, Task> = {}
  for (const [id, value] of taskEntries) {
    const task = parseTask(value)
    if (!task || task.id !== id) return null
    parsedTasks[id] = task
  }

  const parsedOrder = {} as Record<Status, string[]>
  const placed = new Set<string>()
  for (const status of STATUSES) {
    const ids = order[status]
    if (!Array.isArray(ids)) return null
    for (const id of ids) {
      if (typeof id !== 'string' || !Object.hasOwn(parsedTasks, id) || placed.has(id)) return null
      placed.add(id)
    }
    parsedOrder[status] = ids as string[]
  }
  if (placed.size !== taskEntries.length) return null

  return { title, subtitle, version: version as number, tasks: parsedTasks, order: parsedOrder }
}

function parseTask(input: unknown): Task | null {
  if (!isRecord(input)) return null
  const { id, title, summary, priority, tag, owner, dueDate, completedDate } = input
  if (typeof id !== 'string' || !id || id.length > MAX_TASK_ID_LENGTH) return null
  if (!isText(title, TASK_TEXT_LIMITS.title) || !title.trim()) return null
  if (!isText(summary, TASK_TEXT_LIMITS.summary)) return null
  if (!isText(tag, TASK_TEXT_LIMITS.tag) || !isText(owner, TASK_TEXT_LIMITS.owner)) return null
  if (!PRIORITIES.includes(priority as Priority)) return null
  if (!isOptionalDate(dueDate) || !isOptionalDate(completedDate)) return null
  return { id, title, summary, priority: priority as Priority, tag, owner, dueDate, completedDate }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 字數以字元計算，中文字與 emoji 都算一個字，與前端的計算方式相同 */
function isText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && [...value].length <= limit
}

/** null 或實際存在的 YYYY-MM-DD 日期 */
function isOptionalDate(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}
