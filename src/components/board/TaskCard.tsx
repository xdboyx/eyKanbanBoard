import { STATUS_NAMES, type MoveDirection, type Status, type TaskView } from '../../types/board'
import { monthDay } from '../../utils/date'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'

export function TaskCard({ task, onMove }: { task: TaskView; onMove: (direction: MoveDirection) => void }) {
  const { done } = task
  const date = done
    ? task.completedDate && `${monthDay(task.completedDate)} 完成`
    : task.dueDate && monthDay(task.dueDate)

  return (
    <article
      data-task-id={task.id}
      className={[
        'flex flex-col gap-3',
        done ? 'border border-rule bg-transparent' : 'bg-card',
        task.featured ? 'border-t-4 border-t-accent-yellow px-4 pt-6 pb-4' : 'p-4',
      ].join(' ')}
    >
      {task.tag && !done && (
        <div>
          {/* 深色時是 chip；一般模式在設計稿中只是一行粗體小字 */}
          <span className="inline-flex items-center rounded-sm border border-gray-600 px-[9px] py-[3px] text-small text-white light:border-0 light:p-0 light:text-text">
            {task.tag}
          </span>
        </div>
      )}
      {task.featured ? (
        <>
          <h3 className="m-0 text-card-title text-feature">{task.title}</h3>
          {task.summary && <p className="m-0 text-body">{task.summary}</p>}
        </>
      ) : (
        <h3 className={`m-0 text-body ${done ? 'text-muted' : 'text-text light:text-lead'}`}>{task.title}</h3>
      )}
      <div className="flex items-center justify-between gap-3">
        <ul className="meta-list text-caption text-muted">
          {date && <li>{date}</li>}
          {task.owner && <li>{task.owner}</li>}
        </ul>
        <div className="flex flex-none gap-1">
          <MoveButton direction="prev" target={task.prevStatus} onMove={onMove} />
          <MoveButton direction="next" target={task.nextStatus} onMove={onMove} />
        </div>
      </div>
    </article>
  )
}

/** 移到前一個或後一個狀態；沒有可移動的狀態時停用 */
function MoveButton({
  direction,
  target,
  onMove,
}: {
  direction: MoveDirection
  target: Status | null
  onMove: (direction: MoveDirection) => void
}) {
  const action = direction === 'prev' ? '移到上一個狀態' : '移到下一個狀態'
  const label = target ? `${action}：${STATUS_NAMES[target]}` : action
  return (
    <button
      type="button"
      data-move={direction}
      aria-label={label}
      title={label}
      disabled={!target}
      onClick={() => onMove(direction)}
      className="focus-ring box-border inline-flex size-8 cursor-pointer items-center justify-center border border-rule bg-transparent p-0 text-text hover:border-text disabled:cursor-default disabled:opacity-30 disabled:hover:border-rule"
    >
      {direction === 'prev' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  )
}
