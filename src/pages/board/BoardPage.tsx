import { Link } from '@tanstack/react-router'
import { flushSync } from 'react-dom'
import { buttonClassName } from '../../components/Button'
import { StatusColumn } from '../../components/board/StatusColumn'
import { AddIcon } from '../../components/icons'
import { InlineTextEdit } from '../../components/InlineTextEdit'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useBoardView } from '../../hooks/useBoardView'
import { useTaskDrag } from '../../hooks/useTaskDrag'
import { useTheme } from '../../hooks/useTheme'
import type { BoardStore } from '../../stores/boardStore'
import type { ThemeStore } from '../../stores/themeStore'
import { BOARD_TEXT_LIMITS, type MoveDirection } from '../../types/board'
import { localDate } from '../../utils/date'

/** 看板頁；query 是網址上的搜尋文字，只列出符合的任務 */
export function BoardPage({ store, themeStore, query }: { store: BoardStore; themeStore: ThemeStore; query: string }) {
  const view = useBoardView(store, query)
  const { theme, toggle } = useTheme(themeStore)
  const drag = useTaskDrag(view?.statuses ?? [], (taskId, { status, beforeId }) =>
    store.getState().moveTaskTo(taskId, status, beforeId),
  )
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
        <div className="flex max-w-full flex-col gap-2">
          <h1 className="m-0 text-display">
            <InlineTextEdit
              value={view.title}
              label="看板標題"
              maxLength={BOARD_TEXT_LIMITS.title}
              onSave={(title) => store.getState().setTitle(title)}
            />
          </h1>
          <ul className="meta-list text-body-loose text-muted">
            <li>{localDate(view.updatedAt)} 更新</li>
            <li>{view.totalTasks} 項任務</li>
            <li>
              <InlineTextEdit
                value={view.subtitle}
                label="看板副標"
                placeholder="新增副標"
                maxLength={BOARD_TEXT_LIMITS.subtitle}
                onSave={(subtitle) => store.getState().setSubtitle(subtitle)}
              />
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ThemeToggle theme={theme} onToggle={toggle} />
          <Link to="/tasks/new" className={buttonClassName('primary')}>
            <AddIcon />
            新增任務
          </Link>
        </div>
      </section>
      <div className="grow overflow-x-auto px-17 pt-8 pb-10 max-md:px-6">
        <div className="grid min-w-[1184px] grid-cols-[repeat(4,minmax(280px,1fr))] items-stretch gap-4">
          {view.statuses.map((status) => (
            <StatusColumn
              key={status.status}
              status={status}
              searching={view.searching}
              drag={drag}
              onMoveTask={moveTask}
            />
          ))}
        </div>
      </div>
    </>
  )
}
