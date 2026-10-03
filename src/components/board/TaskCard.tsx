import type { TaskView } from '../../types/board'
import { monthDay } from '../../utils/date'

export function TaskCard({ task }: { task: TaskView }) {
  const { done } = task
  const date = done
    ? task.completedDate && `${monthDay(task.completedDate)} 完成`
    : task.dueDate && monthDay(task.dueDate)

  return (
    <article
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
      <ul className="meta-list text-caption text-muted">
        {date && <li>{date}</li>}
        {task.owner && <li>{task.owner}</li>}
      </ul>
    </article>
  )
}
