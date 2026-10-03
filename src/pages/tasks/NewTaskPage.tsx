import { useNavigate } from '@tanstack/react-router'
import { TaskDrawer } from '../../components/task/TaskDrawer'
import type { BoardStore } from '../../stores/boardStore'
import { emptyTaskDraft } from '../../utils/taskDraft'

/** /tasks/new：疊在看板上的新增任務抽屜，按「儲存」才建立任務 */
export function NewTaskPage({ store }: { store: BoardStore }) {
  const navigate = useNavigate()
  return (
    <TaskDrawer
      title="新增任務"
      initial={emptyTaskDraft()}
      onSave={(draft) => store.getState().createTask(draft)}
      onClose={() => navigate({ to: '/' })}
    />
  )
}
