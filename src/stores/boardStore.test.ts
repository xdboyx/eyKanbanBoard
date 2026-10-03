import { describe, expect, it } from 'vitest'
import type { BoardRepository } from '../services/boardRepository'
import { createTask, type Board } from '../types/board'
import { createBoardStore } from './boardStore'

const saved: Board = {
  title: '測試看板',
  subtitle: '測試單位',
  updatedAt: '2026-10-04T08:00:00.000Z',
  version: 1,
  tasks: { a: createTask('a', { title: '任務 a' }) },
  order: { todo: ['a'], doing: [], review: [], done: [] },
}

function inMemoryRepository(initial: Board): BoardRepository {
  return {
    load: async () => structuredClone(initial),
  }
}

describe('看板 store', () => {
  it('載入前沒有看板，載入後是 repository 保存的看板', async () => {
    const store = createBoardStore(inMemoryRepository(saved))
    expect(store.getState().board).toBeNull()

    await store.getState().load()

    expect(store.getState().board).toEqual(saved)
  })
})
