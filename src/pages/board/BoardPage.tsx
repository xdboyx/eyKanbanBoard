import { flushSync } from 'react-dom'
import { StatusColumn } from '../../components/board/StatusColumn'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useBoardView } from '../../hooks/useBoardView'
import { useTheme } from '../../hooks/useTheme'
import type { BoardStore } from '../../stores/boardStore'
import type { ThemeStore } from '../../stores/themeStore'
import type { MoveDirection } from '../../types/board'
import { localDate } from '../../utils/date'

export function BoardPage({ store, themeStore }: { store: BoardStore; themeStore: ThemeStore }) {
  const view = useBoardView(store)
  const { theme, toggle } = useTheme(themeStore)
  if (!view) return null

  function moveTask(taskId: string, direction: MoveDirection) {
    flushSync(() => store.getState().moveTask(taskId, direction))
    // 任務換到另一個狀態後會重新渲染，把焦點留在同一張任務的按鈕上，方便用鍵盤連續移動
    const card = document.querySelector(`[data-task-id="${CSS.escape(taskId)}"]`)
    const button =
      card?.querySelector<HTMLButtonElement>(`[data-move="${direction}"]:enabled`) ??
      card?.querySelector<HTMLButtonElement>('[data-move]:enabled')
    button?.focus()
  }

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
        <div className="flex flex-wrap items-center gap-4">
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </section>
      <div className="grow overflow-x-auto px-17 pt-8 pb-10 max-md:px-6">
        <div className="grid min-w-[1184px] grid-cols-[repeat(4,minmax(280px,1fr))] items-stretch gap-4">
          {view.statuses.map((status) => (
            <StatusColumn key={status.status} status={status} onMoveTask={moveTask} />
          ))}
        </div>
      </div>
    </>
  )
}
