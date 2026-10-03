import { Fragment } from 'react'
import type { TaskDrag } from '../../hooks/useTaskDrag'
import type { MoveDirection, StatusView } from '../../types/board'
import { TaskCard } from './TaskCard'

export function StatusColumn({
  status,
  drag,
  onMoveTask,
}: {
  status: StatusView
  drag: TaskDrag
  onMoveTask: (taskId: string, direction: MoveDirection) => void
}) {
  const over = drag.overStatus === status.status
  // 指示線畫在這個任務之前；null 時畫在最後面，undefined 時不畫
  const markerBefore = drag.indicator?.status === status.status ? drag.indicator.beforeId : undefined

  return (
    <section aria-label={status.name} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline gap-3 border-b border-rule pb-3">
        <span className="text-display">{String(status.count).padStart(2, '0')}</span>
        <h2 className="m-0 text-label">{status.name}</h2>
      </div>
      <div
        {...drag.listProps(status.status)}
        className={[
          'flex min-h-60 grow flex-col gap-3',
          over && 'bg-drop outline-1 outline-offset-4 outline-muted outline-dashed',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {status.tasks.map((task, index) => (
          <Fragment key={task.id}>
            {markerBefore === task.id && <DropMarker />}
            <TaskCard
              task={task}
              dragging={drag.draggingId === task.id}
              dragProps={drag.cardProps(task.id, status.status, status.tasks[index + 1]?.id ?? null)}
              onMove={(direction) => onMoveTask(task.id, direction)}
            />
          </Fragment>
        ))}
        {markerBefore === null && <DropMarker />}
        {status.count === 0 && (
          <p className="m-0 border border-dashed border-rule px-4 py-6 text-center text-caption text-muted">
            將任務拖曳到這裡
          </p>
        )}
      </div>
    </section>
  )
}

/** 放開位置的指示線 */
function DropMarker() {
  return <div aria-hidden="true" className="h-0.5 flex-none bg-marker" />
}
