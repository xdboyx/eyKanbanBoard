import { createStore } from 'zustand/vanilla'
import type { BoardRepository } from '../services/boardRepository'
import type { Board } from '../types/board'

export interface BoardState {
  /** 尚未載入時為 null */
  board: Board | null
  load(): Promise<void>
}

export type BoardStore = ReturnType<typeof createBoardStore>

/** 看板的全域狀態。資料存取透過 repository 注入，測試可換成記憶體實作（ADR-0001）。 */
export function createBoardStore(repository: BoardRepository) {
  return createStore<BoardState>()((set) => ({
    board: null,
    async load() {
      set({ board: await repository.load() })
    },
  }))
}
