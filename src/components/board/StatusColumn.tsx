import type { StatusView } from '../../types/board'
import { TaskCard } from './TaskCard'

export function StatusColumn({ status }: { status: StatusView }) {
  return (
    <section aria-label={status.name} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline gap-3 border-b border-rule pb-3">
        <span className="text-display">{String(status.count).padStart(2, '0')}</span>
        <h2 className="m-0 text-label">{status.name}</h2>
      </div>
      <div className="flex min-h-60 grow flex-col gap-3">
        {status.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {status.count === 0 && (
          <p className="m-0 border border-dashed border-rule px-4 py-6 text-center text-caption text-muted">
            將任務拖曳到這裡
          </p>
        )}
      </div>
    </section>
  )
}
