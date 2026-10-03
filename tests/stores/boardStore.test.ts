import { describe, expect, it, vi } from 'vitest'
import type { BoardRepository } from '../../src/services/boardRepository'
import { createTask, type Board, type TaskDraft } from '../../src/types/board'
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
  const store = createBoardStore(repository, { now: () => NOW, newId: () => 'new' })
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

  describe('拖放到指定位置', () => {
    const crowded: Board = {
      ...saved,
      tasks: {
        a: createTask('a', { title: '任務 a' }),
        b: createTask('b', { title: '任務 b' }),
        c: createTask('c', { title: '任務 c' }),
        d: createTask('d', { title: '任務 d' }),
        e: createTask('e', { title: '任務 e', completedDate: '2026-09-28' }),
        f: createTask('f', { title: '任務 f', completedDate: '2026-09-30' }),
      },
      order: { todo: ['a', 'b', 'c'], doing: ['d'], review: [], done: ['e', 'f'] },
    }

    it('放到其他狀態的指定任務之前', async () => {
      const store = await loadedStore(inMemoryRepository(crowded).repository)

      store.getState().moveTaskTo('b', 'doing', 'd')

      expect(store.getState().board!.order).toEqual({ todo: ['a', 'c'], doing: ['b', 'd'], review: [], done: ['e', 'f'] })
    })

    it('放到其他狀態的最後面', async () => {
      const store = await loadedStore(inMemoryRepository(crowded).repository)

      store.getState().moveTaskTo('a', 'doing', null)

      expect(store.getState().board!.order).toEqual({ todo: ['b', 'c'], doing: ['d', 'a'], review: [], done: ['e', 'f'] })
    })

    it('放到沒有任務的狀態', async () => {
      const store = await loadedStore(inMemoryRepository(crowded).repository)

      store.getState().moveTaskTo('d', 'review', null)

      expect(store.getState().board!.order).toEqual({ todo: ['a', 'b', 'c'], doing: [], review: ['d'], done: ['e', 'f'] })
    })

    it('在同一狀態內往前與往後調整順序', async () => {
      const store = await loadedStore(inMemoryRepository(crowded).repository)

      store.getState().moveTaskTo('c', 'todo', 'a')
      expect(store.getState().board!.order.todo).toEqual(['c', 'a', 'b'])

      store.getState().moveTaskTo('c', 'todo', null)
      expect(store.getState().board!.order.todo).toEqual(['a', 'b', 'c'])

      store.getState().moveTaskTo('a', 'todo', 'c')
      expect(store.getState().board!.order.todo).toEqual(['b', 'a', 'c'])
    })

    it('放回原位時不產生變化，也不會儲存', async () => {
      const { repository, saves } = inMemoryRepository(crowded)
      const store = await loadedStore(repository)

      store.getState().moveTaskTo('b', 'todo', 'b')
      store.getState().moveTaskTo('b', 'todo', 'c')
      store.getState().moveTaskTo('c', 'todo', null)
      await store.getState().waitForSaves()

      expect(store.getState().board).toEqual(crowded)
      expect(saves).toEqual([])
    })

    it('指定的任務不在目標狀態時不移動', async () => {
      const store = await loadedStore(inMemoryRepository(crowded).repository)

      store.getState().moveTaskTo('a', 'doing', 'b')
      store.getState().moveTaskTo('missing', 'doing', null)

      expect(store.getState().board).toEqual(crowded)
    })

    it('在「已完成」內調整順序不改變完成日', async () => {
      const store = await loadedStore(inMemoryRepository(crowded).repository)

      store.getState().moveTaskTo('f', 'done', 'e')

      const board = store.getState().board!
      expect(board.order.done).toEqual(['f', 'e'])
      expect(board.tasks.e!.completedDate).toBe('2026-09-28')
      expect(board.tasks.f!.completedDate).toBe('2026-09-30')
    })

    it('拖入「已完成」時記錄完成日為今天，拖出時清除', async () => {
      const store = await loadedStore(inMemoryRepository(crowded).repository)

      store.getState().moveTaskTo('a', 'done', 'e')
      store.getState().moveTaskTo('f', 'todo', null)

      const board = store.getState().board!
      expect(board.tasks.a!.completedDate).toBe('2026-10-05')
      expect(board.tasks.f!.completedDate).toBeNull()
    })

    it('記錄最後更新時間並儲存整個看板', async () => {
      const { repository, saves } = inMemoryRepository(crowded)
      const store = await loadedStore(repository)

      store.getState().moveTaskTo('a', 'review', null)
      await store.getState().waitForSaves()

      expect(store.getState().board!.updatedAt).toBe(NOW.toISOString())
      expect(saves).toEqual([store.getState().board])
    })
  })
})

describe('新增、編輯、刪除任務', () => {
  /** 任務 a 目前的表單值，再套上要修改的欄位 */
  function draftOfA(fields: Partial<TaskDraft> = {}): TaskDraft {
    return { title: '任務 a', summary: '', priority: 'none', tag: '', owner: '', dueDate: null, status: 'todo', ...fields }
  }

  describe('建立任務', () => {
    it('未填的欄位使用預設值，放在「待辦」的最上面', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      expect(store.getState().createTask({ title: '新任務' })).toBeNull()

      const board = store.getState().board!
      expect(board.tasks.new).toEqual(createTask('new', { title: '新任務' }))
      expect(board.order.todo).toEqual(['new', 'a'])
    })

    it('放在所選狀態的最上面，並保存所有欄位', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)
      const draft: TaskDraft = {
        title: '新任務',
        summary: '補充說明',
        priority: 'high',
        tag: '研究',
        owner: '王小明',
        dueDate: '2026-10-31',
        status: 'review',
      }

      store.getState().createTask(draft)

      const board = store.getState().board!
      expect(board.order.review).toEqual(['new', 'c'])
      const { status: _status, ...fields } = draft
      expect(board.tasks.new).toEqual(createTask('new', fields))
    })

    it('建立在「已完成」時記錄完成日為今天', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().createTask({ title: '新任務', status: 'done' })

      expect(store.getState().board!.order.done).toEqual(['new', 'd'])
      expect(store.getState().board!.tasks.new!.completedDate).toBe('2026-10-05')
    })

    it('去除文字欄位的前後空白', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().createTask({ title: '  新任務  ', summary: ' 說明 ', tag: ' 研究 ', owner: ' 王小明 ' })

      expect(store.getState().board!.tasks.new).toMatchObject({
        title: '新任務',
        summary: '說明',
        tag: '研究',
        owner: '王小明',
      })
    })

    it('記錄最後更新時間並儲存整個看板', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().createTask({ title: '新任務' })
      await store.getState().waitForSaves()

      expect(store.getState().board!.updatedAt).toBe(NOW.toISOString())
      expect(saves).toEqual([store.getState().board])
    })
  })

  describe('欄位檢查', () => {
    it('標題空白時不建立任務，也不會儲存', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      expect(store.getState().createTask({ title: '' })).toEqual({ title: '請輸入標題' })
      expect(store.getState().createTask({ title: '   ' })).toEqual({ title: '請輸入標題' })
      await store.getState().waitForSaves()

      expect(store.getState().board).toEqual(saved)
      expect(saves).toEqual([])
    })

    it('各文字欄位超過上限字數時回傳所有錯誤', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      const errors = store.getState().createTask({
        title: '字'.repeat(101),
        summary: '字'.repeat(501),
        tag: '字'.repeat(21),
        owner: '字'.repeat(21),
      })

      expect(errors).toEqual({
        title: '標題最多 100 字',
        summary: '摘要最多 500 字',
        tag: '標籤最多 20 字',
        owner: '負責人最多 20 字',
      })
      expect(store.getState().board).toEqual(saved)
    })

    it('剛好等於上限字數時可以儲存；字數以字元計算，前後空白不算', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      const errors = store.getState().createTask({
        title: ` ${'😀'.repeat(100)} `,
        summary: '字'.repeat(500),
        tag: '字'.repeat(20),
        owner: '字'.repeat(20),
      })

      expect(errors).toBeNull()
      expect(store.getState().board!.tasks.new!.title).toBe('😀'.repeat(100))
    })

    it('更新時欄位不合法則不修改任務', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      expect(store.getState().updateTask('a', draftOfA({ title: ' ', status: 'doing' }))).toEqual({ title: '請輸入標題' })

      expect(store.getState().board).toEqual(saved)
    })
  })

  describe('更新任務', () => {
    it('更新欄位，狀態不變時保持原本的位置', async () => {
      const crowded: Board = {
        ...saved,
        tasks: { ...saved.tasks, e: createTask('e', { title: '任務 e' }) },
        order: { ...saved.order, todo: ['a', 'e'] },
      }
      const store = await loadedStore(inMemoryRepository(crowded).repository)

      const fields = { summary: '說明', priority: 'medium', tag: '開發', owner: '王小明', dueDate: '2026-11-01' } as const

      expect(store.getState().updateTask('a', draftOfA({ title: ' 新標題 ', ...fields }))).toBeNull()

      const board = store.getState().board!
      expect(board.tasks.a).toEqual(createTask('a', { title: '新標題', ...fields }))
      expect(board.order.todo).toEqual(['a', 'e'])
    })

    it('清除到期日', async () => {
      const withDue: Board = {
        ...saved,
        tasks: { ...saved.tasks, a: createTask('a', { title: '任務 a', dueDate: '2026-10-10' }) },
      }
      const store = await loadedStore(inMemoryRepository(withDue).repository)

      store.getState().updateTask('a', draftOfA({ dueDate: null }))

      expect(store.getState().board!.tasks.a!.dueDate).toBeNull()
    })

    it('狀態改變時放在新狀態的最下面', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().updateTask('a', draftOfA({ status: 'doing' }))

      expect(store.getState().board!.order).toEqual({ todo: [], doing: ['b', 'a'], review: ['c'], done: ['d'] })
    })

    it('狀態改為「已完成」時記錄完成日為今天', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().updateTask('a', draftOfA({ status: 'done' }))

      expect(store.getState().board!.order.done).toEqual(['d', 'a'])
      expect(store.getState().board!.tasks.a!.completedDate).toBe('2026-10-05')
    })

    it('狀態改離「已完成」時清除完成日', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().updateTask('d', { ...draftOfA({ title: '任務 d' }), status: 'review' })

      expect(store.getState().board!.order.review).toEqual(['c', 'd'])
      expect(store.getState().board!.tasks.d!.completedDate).toBeNull()
    })

    it('留在「已完成」時保留完成日', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().updateTask('d', { ...draftOfA({ title: '任務 d 改名' }), status: 'done' })

      expect(store.getState().board!.tasks.d).toMatchObject({ title: '任務 d 改名', completedDate: '2026-09-30' })
    })

    it('沒有任何修改時不會儲存', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      expect(store.getState().updateTask('a', draftOfA({ title: ' 任務 a ' }))).toBeNull()
      await store.getState().waitForSaves()

      expect(store.getState().board).toEqual(saved)
      expect(saves).toEqual([])
    })

    it('記錄最後更新時間並儲存整個看板', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().updateTask('a', draftOfA({ title: '新標題' }))
      await store.getState().waitForSaves()

      expect(store.getState().board!.updatedAt).toBe(NOW.toISOString())
      expect(saves).toEqual([store.getState().board])
    })
  })

  describe('刪除任務', () => {
    it('從看板與所在狀態中移除，並儲存整個看板', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().deleteTask('b')
      await store.getState().waitForSaves()

      const board = store.getState().board!
      expect(board.tasks.b).toBeUndefined()
      expect(Object.keys(board.tasks)).toEqual(['a', 'c', 'd'])
      expect(board.order).toEqual({ todo: ['a'], doing: [], review: ['c'], done: ['d'] })
      expect(saves).toEqual([board])
    })

    it('任務不存在時不動，也不會儲存', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().deleteTask('missing')
      await store.getState().waitForSaves()

      expect(store.getState().board).toEqual(saved)
      expect(saves).toEqual([])
    })
  })
})

async function waitUntil(condition: () => boolean) {
  for (let i = 0; i < 10 && !condition(); i++) await Promise.resolve()
  expect(condition()).toBe(true)
}
