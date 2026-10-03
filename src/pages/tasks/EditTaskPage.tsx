import { useNavigate } from '@tanstack/react-router'
import { TaskDrawer } from '../../components/task/TaskDrawer'
import { useTask } from '../../hooks/useTask'
import type { BoardStore } from '../../stores/boardStore'
import { toTaskDraft } from '../../utils/taskDraft'

/** /tasks/:id：疊在看板上的編輯任務抽屜。任務不存在時路由已導回看板，見 router.tsx */
export function EditTaskPage({ store, taskId }: { store: BoardStore; taskId: string }) {
  const navigate = useNavigate()
  const found = useTask(store, taskId)
  // 刪除後到導回看板之間任務已不存在
  if (!found) return null

  return (
    <TaskDrawer
      title="編輯任務"
      initial={toTaskDraft(found.task, found.status)}
      completedDate={found.task.completedDate}
      onSave={(draft) => store.getState().updateTask(taskId, draft)}
      onDelete={() => store.getState().deleteTask(taskId)}
      onClose={() => navigate({ to: '/' })}
    />
  )
}
