import type { BoardRepository } from './boardRepository'
import { createSampleBoard } from './sampleBoard'
import type { Board } from '../types/board'

const STORAGE_KEY = 'eykanban.board'

/**
 * 本地開發用：看板存在瀏覽器 localStorage，第一次載入時放入範例資料（ADR-0001）。
 * 只有這個瀏覽器在寫入，不會發生版本衝突，所以不檢查也不遞增版本號。
 */
export function createLocalStorageRepository(storage: Storage = window.localStorage): BoardRepository {
  return {
    async load() {
      const saved = storage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved) as Board
      return resetSampleBoard(storage)
    },
    async save(board) {
      storage.setItem(STORAGE_KEY, JSON.stringify(board))
      return board
    },
  }
}

export function resetSampleBoard(storage: Storage = window.localStorage): Board {
  const board = createSampleBoard()
  storage.setItem(STORAGE_KEY, JSON.stringify(board))
  return board
}
