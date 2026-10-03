import { describe, expect, it, vi } from 'vitest'
import type { BoardRepository } from '../../src/services/boardRepository'
import { createTask, type Board } from '../../src/types/board'
import { createBoardStore } from '../../src/stores/boardStore'

const saved: Board = {
  title: '測試看板',
  subtitle: '測試單位',
  updatedAt: '2026-10-04T08:00:00.000Z',
  version: 1,
  tasks: {
    a: createTask('a', { title: '任務 a' }),
    b: createTask('b', { title: '任務 b' }),
    c: createTask('c', { title: '任務 c' }),
    d: createTask('d', { title: '任務 d', completedDate: '2026-09-30' }),
  },
  order: { todo: ['a'], doing: ['b'], review: ['c'], done: ['d'] },
}

// UTC 中午，讓 UTC-11～UTC+11 的本地日期都是 2026-10-05
const NOW = new Date('2026-10-05T12:00:00.000Z')

function inMemoryRepository(initial: Board) {
  const saves: Board[] = []
  const repository: BoardRepository = {
    load: async () => structuredClone(initial),
    save: async (board) => {
      saves.push(structuredClone(board))
    },
  }
  return { repository, saves }
}

async function loadedStore(repository: BoardRepository) {
  const store = createBoardStore(repository, { now: () => NOW })
  await store.getState().load()
  return store
}

describe('看板 store', () => {
  it('載入前沒有看板，載入後是 repository 保存的看板', async () => {
    const store = createBoardStore(inMemoryRepository(saved).repository)
    expect(store.getState().board).toBeNull()

    await store.getState().load()

    expect(store.getState().board).toEqual(saved)
  })

  describe('用左右按鈕移動任務', () => {
    it('移到下一個狀態的最下面', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().moveTask('a', 'next')

      expect(store.getState().board!.order).toEqual({ todo: [], doing: ['b', 'a'], review: ['c'], done: ['d'] })
    })

    it('移到上一個狀態的最下面', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().moveTask('c', 'prev')

      expect(store.getState().board!.order).toEqual({ todo: ['a'], doing: ['b', 'c'], review: [], done: ['d'] })
    })

    it('在第一個狀態往前、在最後一個狀態往後都不會移動，也不會儲存', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().moveTask('a', 'prev')
      store.getState().moveTask('d', 'next')
      await store.getState().waitForSaves()

      expect(store.getState().board).toEqual(saved)
      expect(saves).toEqual([])
    })

    it('移入「已完成」時記錄完成日為今天', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().moveTask('c', 'next')

      expect(store.getState().board!.tasks.c!.completedDate).toBe('2026-10-05')
    })

    it('從「已完成」移出時清除完成日', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().moveTask('d', 'prev')

      expect(store.getState().board!.tasks.d!.completedDate).toBeNull()
    })

    it('記錄最後更新時間', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().moveTask('a', 'next')

      expect(store.getState().board!.updatedAt).toBe(NOW.toISOString())
    })

    it('先更新畫面，再在背景儲存整個看板', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().moveTask('a', 'next')
      expect(store.getState().board!.order.doing).toEqual(['b', 'a'])

      await store.getState().waitForSaves()
      expect(saves).toEqual([store.getState().board])
    })

    it('連續操作時依序儲存，前一次儲存完成後才開始下一次', async () => {
      const started: Board[] = []
      const finishers: (() => void)[] = []
      const repository: BoardRepository = {
        load: async () => structuredClone(saved),
        save: (board) =>
          new Promise((resolve) => {
            started.push(structuredClone(board))
            finishers.push(resolve)
          }),
      }
      const store = await loadedStore(repository)

      store.getState().moveTask('a', 'next')
      store.getState().moveTask('a', 'next')
      await Promise.resolve()
      expect(started).toHaveLength(1)
      expect(started[0]!.order.doing).toEqual(['b', 'a'])

      finishers[0]!()
      await waitUntil(() => started.length === 2)
      expect(started[1]!.order.review).toEqual(['c', 'a'])

      finishers[1]!()
      await store.getState().waitForSaves()
      expect(started).toHaveLength(2)
    })

    it('某次儲存失敗時記錄錯誤，之後的儲存仍會執行', async () => {
      const logError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const saves: Board[] = []
      let fail = true
      const repository: BoardRepository = {
        load: async () => structuredClone(saved),
        save: async (board) => {
          if (fail) {
            fail = false
            throw new Error('儲存失敗')
          }
          saves.push(structuredClone(board))
        },
      }
      const store = await loadedStore(repository)

      store.getState().moveTask('a', 'next')
      store.getState().moveTask('a', 'next')
      await store.getState().waitForSaves()

      expect(saves).toEqual([store.getState().board])
      expect(logError).toHaveBeenCalledOnce()
      logError.mockRestore()
    })
  })
})

async function waitUntil(condition: () => boolean) {
  for (let i = 0; i < 10 && !condition(); i++) await Promise.resolve()
  expect(condition()).toBe(true)
}
