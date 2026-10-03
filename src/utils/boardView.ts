import { STATUSES, STATUS_NAMES, type Board, type BoardView } from '../types/board'

/** 看板資料 → 畫面用的看板：依固定順序列出四種狀態，每種狀態依保存的順序列出任務 */
export function toBoardView(board: Board): BoardView {
  const statuses = STATUSES.map((status, index) => {
    const prevStatus = STATUSES[index - 1] ?? null
    const nextStatus = STATUSES[index + 1] ?? null
    const tasks = board.order[status].flatMap((id) => {
      const task = board.tasks[id]
      if (!task) return []
      const done = status === 'done'
      return { ...task, prevStatus, nextStatus, done, featured: task.priority === 'high' && !done }
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
