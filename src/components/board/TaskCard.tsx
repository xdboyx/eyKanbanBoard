import { Link } from '@tanstack/react-router'
import type { HTMLAttributes } from 'react'
import { STATUS_NAMES, type MoveDirection, type Status, type TaskView } from '../../types/board'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'

export function TaskCard({
  task,
  dragging,
  dragProps,
  onMove,
}: {
  task: TaskView
  /** 正在被拖曳，卡片變淡 */
  dragging: boolean
  /** 拖放用的事件處理，見 useTaskDrag */
  dragProps: HTMLAttributes<HTMLElement>
  onMove: (direction: MoveDirection) => void
}) {
  const { done } = task

  return (
    <article
      {...dragProps}
      data-task-id={task.id}
      className={[
        'card-state-layer relative flex cursor-grab flex-col gap-3 active:cursor-grabbing',
        dragging && 'opacity-40',
        done ? 'border border-rule bg-transparent' : 'bg-card',
        task.featured ? 'border-t-4 border-t-accent-yellow px-4 pt-6 pb-4' : 'p-4',
      ]
        .filter(Boolean)
        .join(' ')}
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
          <h3 className="m-0 text-card-title text-feature">
            <TaskLink task={task} />
          </h3>
          {task.summary && <p className="m-0 text-body">{task.summary}</p>}
        </>
      ) : (
        <h3 className={`m-0 text-body ${done ? 'text-muted' : 'text-text light:text-lead'}`}>
          <TaskLink task={task} />
        </h3>
      )}
      <div className="flex items-center justify-between gap-3">
        <ul className="meta-list text-caption text-muted">
          {task.dateText && <li>{task.dateText}</li>}
          {task.priorityText && <li>{task.priorityText}</li>}
          {task.owner && <li>{task.owner}</li>}
        </ul>
        <div className="relative z-1 flex flex-none gap-1">
          <MoveButton direction="prev" target={task.prevStatus} onMove={onMove} />
          <MoveButton direction="next" target={task.nextStatus} onMove={onMove} />
        </div>
      </div>
    </article>
  )
}

/**
 * 任務標題，點擊開啟編輯抽屜。連結的 ::after 蓋滿整張卡片，點卡片任何地方都會開啟；
 * 連結本身不可拖曳，拖曳時拖的是整張卡片。
 */
function TaskLink({ task }: { task: TaskView }) {
  return (
    <Link
      to="/tasks/$taskId"
      params={{ taskId: task.id }}
      draggable={false}
      className="focus-ring text-inherit no-underline after:absolute after:inset-0 hover:text-inherit hover:underline"
    >
      {task.title}
    </Link>
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
      className="focus-ring state-layer box-border inline-flex size-8 cursor-pointer items-center justify-center border border-rule bg-transparent p-0 text-text enabled:hover:border-text disabled:cursor-default disabled:opacity-30"
    >
      {direction === 'prev' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  )
}
