import { useMemo } from 'react'
import { useStore } from 'zustand'
import type { BoardStore } from '../stores/boardStore'
import type { Status, Task } from '../types/board'
import { statusOf } from '../utils/board'

/** 訂閱看板 store，回傳單一任務與它所在的狀態；看板尚未載入或任務不存在時為 null */
export function useTask(store: BoardStore, taskId: string): { task: Task; status: Status } | null {
  const board = useStore(store, (state) => state.board)
  return useMemo(() => {
    const task = board?.tasks[taskId]
    const status = board && statusOf(board, taskId)
    return task && status ? { task, status } : null
  }, [board, taskId])
}
