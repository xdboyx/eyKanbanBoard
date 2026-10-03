import {
  TASK_TEXT_LIMITS,
  type Status,
  type Task,
  type TaskDraft,
  type TaskDraftErrors,
  type TaskTextField,
} from '../types/board'

const FIELD_NAMES: Record<TaskTextField, string> = {
  title: '標題',
  summary: '摘要',
  tag: '標籤',
  owner: '負責人',
}

/** 新增任務時表單的初始值：放在「待辦」，其餘欄位留空、優先級為「無」 */
export function emptyTaskDraft(): TaskDraft {
  return { title: '', summary: '', priority: 'none', tag: '', owner: '', dueDate: null, status: 'todo' }
}

/** 已存在的任務 → 編輯表單的初始值 */
export function toTaskDraft(task: Task, status: Status): TaskDraft {
  const { title, summary, priority, tag, owner, dueDate } = task
  return { title, summary, priority, tag, owner, dueDate, status }
}

/** 字數：以字元計算，中文字與 emoji 都算一個字 */
export function textLength(text: string) {
  return [...text].length
}

/** 去除文字欄位的前後空白，到期日空字串視為未填 */
export function normalizeTaskDraft(draft: TaskDraft): TaskDraft {
  return {
    ...draft,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    tag: draft.tag.trim(),
    owner: draft.owner.trim(),
    dueDate: draft.dueDate || null,
  }
}

/** 欄位檢查（以去除前後空白後的值）：標題必填，各文字欄位不超過上限字數 */
export function validateTaskDraft(draft: TaskDraft): TaskDraftErrors {
  const normalized = normalizeTaskDraft(draft)
  const errors: TaskDraftErrors = {}
  for (const field of Object.keys(TASK_TEXT_LIMITS) as TaskTextField[]) {
    const limit = TASK_TEXT_LIMITS[field]
    if (textLength(normalized[field]) > limit) errors[field] = `${FIELD_NAMES[field]}最多 ${limit} 字`
  }
  if (!normalized.title) errors.title = '請輸入標題'
  return errors
}
