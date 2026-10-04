import { PRIORITY_NAMES, STATUSES, STATUS_NAMES, type Board, type BoardView, type Task, type TaskView } from '../types/board'
import { shortDate } from './date'

/**
 * 看板資料 → 畫面用的看板：依固定順序列出四種狀態，每種狀態依保存的順序列出任務。
 * today 是使用者本地的今天（YYYY-MM-DD），用來判斷逾期與日期要不要顯示年份。
 */
export function toBoardView(board: Board, today: string): BoardView {
  const statuses = STATUSES.map((status, index) => {
    const prevStatus = STATUSES[index - 1] ?? null
    const nextStatus = STATUSES[index + 1] ?? null
    const tasks = board.order[status].flatMap((id) => {
      const task = board.tasks[id]
      if (!task) return []
      return { ...task, prevStatus, nextStatus, ...presentation(task, status === 'done', today) }
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

/** 依狀態、優先級與今天推導出的呈現方式；已完成的任務不顯示優先級與逾期 */
function presentation(
  task: Task,
  done: boolean,
  today: string,
): Pick<TaskView, 'done' | 'featured' | 'overdue' | 'dateText' | 'priorityText'> {
  if (done) {
    return {
      done,
      featured: false,
      overdue: false,
      dateText: task.completedDate && `${shortDate(task.completedDate, today)} 完成`,
      priorityText: null,
    }
  }
  const overdue = task.dueDate !== null && task.dueDate < today
  const dueText = task.dueDate && shortDate(task.dueDate, today)
  return {
    done,
    featured: task.priority === 'high',
    overdue,
    dateText: dueText && (overdue ? `${dueText} 逾期` : dueText),
    priorityText: task.priority === 'medium' || task.priority === 'low' ? `優先：${PRIORITY_NAMES[task.priority]}` : null,
  }
}
