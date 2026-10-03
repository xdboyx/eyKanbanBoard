import { useSyncExternalStore } from 'react'
import type { BoardStore } from '../boardStore'
import { StatusColumn } from './StatusColumn'

/** ISO 8601 → YYYY-MM-DD（使用者本地日期） */
function localDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function BoardPage({ store }: { store: BoardStore }) {
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot)
  if (!view) return null

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-6 bg-band px-17 pt-10 pb-8 text-text max-md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-display">{view.title}</h1>
          <ul className="meta-list text-body-loose text-muted">
            <li>{localDate(view.updatedAt)} 更新</li>
            <li>{view.totalTasks} 項任務</li>
            {view.subtitle && <li>{view.subtitle}</li>}
          </ul>
        </div>
      </section>
      <div className="grow overflow-x-auto px-17 pt-8 pb-10 max-md:px-6">
        <div className="grid min-w-[1184px] grid-cols-[repeat(4,minmax(280px,1fr))] items-stretch gap-4">
          {view.statuses.map((status) => (
            <StatusColumn key={status.status} status={status} />
          ))}
        </div>
      </div>
    </>
  )
}
