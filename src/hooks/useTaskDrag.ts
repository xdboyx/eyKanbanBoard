import { useState, type HTMLAttributes } from 'react'
import type { Status, StatusView } from '../types/board'

/** 放開位置：某個狀態中某個任務之前；beforeId 為 null 時是該狀態的最後面 */
export interface DropTarget {
  status: Status
  beforeId: string | null
}

type DragHandlers = Pick<HTMLAttributes<HTMLElement>, 'onDragOver' | 'onDragLeave' | 'onDrop'>
type CardDragHandlers = Pick<HTMLAttributes<HTMLElement>, 'draggable' | 'onDragStart' | 'onDragEnd' | 'onDragOver'>

export type TaskDrag = ReturnType<typeof useTaskDrag>

/**
 * 拖放任務：記錄被拖的任務與滑過的放開位置，放開時交給 onDrop。
 * 滑過卡片上半部放在該任務之前、下半部放在下一個任務之前；滑過狀態的空白處維持上一個位置，剛進入時放在最後面。
 */
export function useTaskDrag(statuses: StatusView[], onDrop: (taskId: string, target: DropTarget) => void) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [target, setTarget] = useState<DropTarget | null>(null)

  function hover(next: DropTarget) {
    setTarget((current) =>
      current?.status === next.status && current.beforeId === next.beforeId ? current : next,
    )
  }

  function end() {
    setDraggingId(null)
    setTarget(null)
  }

  /** 放開後任務仍在原位（放在自己或下一個任務之前） */
  function isCurrentPosition({ status, beforeId }: DropTarget) {
    const tasks = statuses.find((s) => s.status === status)?.tasks ?? []
    const index = tasks.findIndex((task) => task.id === draggingId)
    return index >= 0 && (beforeId === draggingId || beforeId === (tasks[index + 1]?.id ?? null))
  }

  const active = draggingId ? target : null

  return {
    draggingId,
    /** 拖曳中滑過的狀態 */
    overStatus: active?.status ?? null,
    /** 要顯示放開位置指示線的地方；放開後位置不變時為 null */
    indicator: active && !isCurrentPosition(active) ? active : null,

    /** 一個狀態的任務清單 */
    listProps(status: Status): DragHandlers {
      return {
        onDragOver(event) {
          if (!draggingId) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          if (target?.status !== status) hover({ status, beforeId: null })
        },
        onDragLeave(event) {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
          setTarget((current) => (current?.status === status ? null : current))
        },
        onDrop(event) {
          event.preventDefault()
          if (draggingId && target) onDrop(draggingId, target)
          end()
        },
      }
    },

    /** 一張任務卡片；nextId 是同一狀態中的下一個任務 */
    cardProps(taskId: string, status: Status, nextId: string | null): CardDragHandlers {
      return {
        draggable: true,
        onDragStart(event) {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', taskId)
          // 等瀏覽器擷取拖曳圖像後再把卡片變淡，拖曳圖像才不會也是淡的
          setTimeout(() => setDraggingId(taskId), 0)
        },
        onDragEnd: end,
        onDragOver(event) {
          if (!draggingId) return
          event.preventDefault()
          event.stopPropagation()
          event.dataTransfer.dropEffect = 'move'
          const rect = event.currentTarget.getBoundingClientRect()
          hover({ status, beforeId: event.clientY < rect.top + rect.height / 2 ? taskId : nextId })
        },
      }
    },
  }
}
