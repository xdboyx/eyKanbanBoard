import { useMemo } from 'react'
import { useStore } from 'zustand'
import type { BoardStore } from '../stores/boardStore'
import type { BoardView } from '../types/board'
import { toBoardView } from '../utils/boardView'

/** 訂閱看板 store，回傳畫面用的看板；尚未載入時為 null */
export function useBoardView(store: BoardStore): BoardView | null {
  const board = useStore(store, (state) => state.board)
  return useMemo(() => (board ? toBoardView(board) : null), [board])
}
