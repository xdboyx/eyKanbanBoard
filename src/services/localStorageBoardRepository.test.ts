import { describe, expect, it } from 'vitest'
import { createLocalStorageRepository } from './localStorageBoardRepository'
import { createSampleBoard } from './sampleBoard'

function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  }
}

describe('看板 repository（localStorage）', () => {
  it('沒有保存過時載入範例看板', async () => {
    expect(await createLocalStorageRepository(memoryStorage()).load()).toEqual(createSampleBoard())
  })

  it('重新載入時讀回上次儲存的看板', async () => {
    const storage = memoryStorage()
    const board = createSampleBoard()
    board.order = { ...board.order, todo: ['t2', 't3', 't4'], doing: [...board.order.doing, 't1'] }
    await createLocalStorageRepository(storage).save(board)

    expect(await createLocalStorageRepository(storage).load()).toEqual(board)
  })
})
