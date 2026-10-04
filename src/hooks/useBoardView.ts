import { useMemo } from 'react'
import { useStore } from 'zustand'
import type { BoardStore } from '../stores/boardStore'
import type { BoardView } from '../types/board'
import { toBoardView } from '../utils/boardView'
import { localDate } from '../utils/date'

/** 訂閱看板 store，回傳畫面用的看板；尚未載入時為 null */
export function useBoardView(store: BoardStore): BoardView | null {
  const board = useStore(store, (state) => state.board)
  // 每次渲染重新取今天的本地日期，跨過午夜後的下一次渲染會依新的日期判斷逾期
  const today = localDate(new Date().toISOString())
  return useMemo(() => (board ? toBoardView(board, today) : null), [board, today])
}
