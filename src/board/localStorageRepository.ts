import type { BoardRepository } from './repository'
import { createSampleBoard } from './sampleBoard'
import type { Board } from './types'

const STORAGE_KEY = 'eykanban.board'

/** 本地開發用：看板存在瀏覽器 localStorage，第一次載入時放入範例資料（ADR-0001）。 */
export function createLocalStorageRepository(storage: Storage = window.localStorage): BoardRepository {
  return {
    async load() {
      const saved = storage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved) as Board
      return resetSampleBoard(storage)
    },
  }
}

export function resetSampleBoard(storage: Storage = window.localStorage): Board {
  const board = createSampleBoard()
  storage.setItem(STORAGE_KEY, JSON.stringify(board))
  return board
}
