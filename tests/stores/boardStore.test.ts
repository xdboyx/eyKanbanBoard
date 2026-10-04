import { describe, expect, it, vi } from 'vitest'
import { BoardConflictError, UnauthorizedError, type BoardRepository } from '../../src/services/boardRepository'
import { createTask, type Board, type TaskDraft } from '../../src/types/board'
import { createBoardStore, type BoardStoreOptions } from '../../src/stores/boardStore'
import { toBoardView } from '../../src/utils/boardView'

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

/**
 * 記憶體中的看板 repository，與 Worker 一樣檢查版本號：相符時保存並遞增版本號，不符時拋出 BoardConflictError。
 * saves 是每次保存成功時收到的看板；failNext 讓下一次儲存拋出指定的錯誤；updateByOthers 模擬其他人寫入
 */
function inMemoryRepository(initial: Board) {
  let stored = structuredClone(initial)
  const saves: Board[] = []
  const failures: Error[] = []
  const repository: BoardRepository = {
    load: async () => structuredClone(stored),
    save: async (board) => {
      const failure = failures.shift()
      if (failure) throw failure
      if (board.version !== stored.version) throw new BoardConflictError(structuredClone(stored))
      saves.push(structuredClone(board))
      stored = { ...structuredClone(board), version: board.version + 1 }
      return structuredClone(stored)
    },
  }
  return {
    repository,
    saves,
    failNext: (error: Error) => failures.push(error),
    updateByOthers: (change: Partial<Board>) => {
      stored = { ...stored, ...change, version: stored.version + 1 }
      return structuredClone(stored)
    },
  }
}

async function loadedStore(repository: BoardRepository, options: BoardStoreOptions = {}) {
  const store = createBoardStore(repository, { now: () => NOW, newId: () => 'new', ...options })
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

  describe('修改看板標題與副標', () => {
    it('修改標題與副標，去除前後空白', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().setTitle('  新標題  ')
      store.getState().setSubtitle(' 新單位 ')

      expect(store.getState().board).toMatchObject({ title: '新標題', subtitle: '新單位' })
    })

    it('標題空白時保留原本的標題，也不會儲存', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().setTitle('')
      store.getState().setTitle('   ')
      await store.getState().waitForSaves()

      expect(store.getState().board).toEqual(saved)
      expect(saves).toEqual([])
    })

    it('標題與副標最多 100 字，超過時不修改，也不會儲存', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().setTitle('看'.repeat(101))
      store.getState().setSubtitle('看'.repeat(101))
      await store.getState().waitForSaves()
      expect(store.getState().board).toEqual(saved)
      expect(saves).toEqual([])

      store.getState().setTitle(` ${'看'.repeat(100)} `)
      store.getState().setSubtitle('😀'.repeat(100))
      expect(store.getState().board).toMatchObject({ title: '看'.repeat(100), subtitle: '😀'.repeat(100) })
    })

    it('副標可以清空', async () => {
      const store = await loadedStore(inMemoryRepository(saved).repository)

      store.getState().setSubtitle('  ')

      expect(store.getState().board!.subtitle).toBe('')
    })

    it('沒有改變時不會儲存', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().setTitle(' 測試看板 ')
      store.getState().setSubtitle('測試單位 ')
      await store.getState().waitForSaves()

      expect(store.getState().board).toEqual(saved)
      expect(saves).toEqual([])
    })

    it('記錄最後更新時間並儲存整個看板', async () => {
      const { repository, saves } = inMemoryRepository(saved)
      const store = await loadedStore(repository)

      store.getState().setTitle('新標題')
      await store.getState().waitForSaves()
      expect(store.getState().board!.updatedAt).toBe(NOW.toISOString())
      expect(saves).toEqual([store.getState().board])

      store.getState().setSubtitle('新單位')
      await store.getState().waitForSaves()
      expect(saves).toHaveLength(2)
      expect(saves[1]).toMatchObject({ title: '新標題', subtitle: '新單位', updatedAt: NOW.toISOString() })
    })
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
            finishers.push(() => resolve({ ...board, version: board.version + 1 }))
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

  describe('搜尋中拖放', () => {
    // 搜尋「設計」時，待辦只看得到 s1、s2、s3，h1、h2 被隱藏
    const searched: Board = {
      ...saved,
      tasks: {
        s1: createTask('s1', { title: '首頁設計' }),
        h1: createTask('h1', { title: '撰寫文件' }),
        s2: createTask('s2', { title: '登入頁', tag: '設計' }),
        h2: createTask('h2', { title: '部署' }),
        s3: createTask('s3', { title: '報表', owner: '設計組' }),
        s4: createTask('s4', { title: '圖示設計' }),
        h3: createTask('h3', { title: '測試' }),
      },
      order: { todo: ['s1', 'h1', 's2', 'h2', 's3'], doing: ['h3', 's4'], review: [], done: [] },
    }

    /** 搜尋中畫面上看得到的各狀態任務 id */
    function visible(board: Board, query: string) {
      return Object.fromEntries(toBoardView(board, '2026-10-05', query).statuses.map((s) => [s.status, s.tasks.map((t) => t.id)]))
    }

    it('放在看得到的任務之前，隱藏的任務維持原本的相對順序', async () => {
      const store = await loadedStore(inMemoryRepository(searched).repository)
      expect(visible(searched, '設計').todo).toEqual(['s1', 's2', 's3'])

      store.getState().moveTaskTo('s3', 'todo', 's1')

      const board = store.getState().board!
      expect(visible(board, '設計').todo).toEqual(['s3', 's1', 's2'])
      expect(board.order.todo).toEqual(['s3', 's1', 'h1', 's2', 'h2'])
    })

    it('從其他狀態拖進來時，放在看得到的任務之前，兩邊隱藏的任務順序都不變', async () => {
      const store = await loadedStore(inMemoryRepository(searched).repository)

      store.getState().moveTaskTo('s4', 'todo', 's2')

      const board = store.getState().board!
      expect(visible(board, '設計')).toEqual({ todo: ['s1', 's4', 's2', 's3'], doing: [], review: [], done: [] })
      expect(board.order.todo).toEqual(['s1', 'h1', 's4', 's2', 'h2', 's3'])
      expect(board.order.doing).toEqual(['h3'])
    })

    it('放到最後面時排在所有任務之後，隱藏的任務順序不變', async () => {
      const store = await loadedStore(inMemoryRepository(searched).repository)

      store.getState().moveTaskTo('s1', 'todo', null)

      const board = store.getState().board!
      expect(visible(board, '設計').todo).toEqual(['s2', 's3', 's1'])
      expect(board.order.todo).toEqual(['h1', 's2', 'h2', 's3', 's1'])
    })

    it('用按鈕移動時放在下一個狀態的最下面', async () => {
      const store = await loadedStore(inMemoryRepository(searched).repository)

      store.getState().moveTask('s2', 'next')

      const board = store.getState().board!
      expect(board.order.todo).toEqual(['s1', 'h1', 'h2', 's3'])
      expect(board.order.doing).toEqual(['h3', 's4', 's2'])
    })
  })
})

describe('儲存失敗、版本衝突與未授權', () => {
  it('連續儲存時，每次送出前一次儲存後的版本號', async () => {
    const { repository, saves } = inMemoryRepository(saved)
    const store = await loadedStore(repository)

    store.getState().moveTask('a', 'next')
    store.getState().moveTask('a', 'next')
    store.getState().setTitle('新標題')
    await store.getState().waitForSaves()

    expect(saves.map((board) => board.version)).toEqual([1, 2, 3])
    expect(saves[2]).toMatchObject({ title: '新標題', order: { review: ['c', 'a'] } })
  })

  it('儲存失敗時畫面還原到操作前，並顯示「儲存失敗，已還原」', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onNotice = vi.fn()
    const { repository, saves, failNext } = inMemoryRepository(saved)
    const store = await loadedStore(repository, { onNotice })
    failNext(new Error('網路錯誤'))

    store.getState().moveTask('a', 'next')
    expect(store.getState().board!.order.doing).toEqual(['b', 'a'])
    await store.getState().waitForSaves()

    expect(store.getState().board).toEqual(saved)
    expect(saves).toEqual([])
    expect(onNotice).toHaveBeenCalledExactlyOnceWith('儲存失敗，已還原')
    expect(logError).toHaveBeenCalledOnce()
    logError.mockRestore()
  })

  it('儲存失敗時，排隊中的儲存一併放棄，畫面回到最後一次保存的看板', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onNotice = vi.fn()
    const { repository, saves, failNext } = inMemoryRepository(saved)
    const store = await loadedStore(repository, { onNotice })

    store.getState().setTitle('已保存的標題')
    await store.getState().waitForSaves()
    failNext(new Error('網路錯誤'))
    store.getState().moveTask('a', 'next')
    store.getState().moveTask('b', 'next')
    store.getState().setSubtitle('排隊中的副標')
    await store.getState().waitForSaves()

    expect(saves).toHaveLength(1)
    expect(store.getState().board).toEqual({ ...saves[0], version: 2 })
    expect(store.getState().board!.title).toBe('已保存的標題')
    expect(store.getState().board!.order).toEqual(saved.order)
    expect(onNotice).toHaveBeenCalledOnce()
    vi.mocked(console.error).mockRestore()
  })

  it('還原後的新操作會以最後保存的版本號儲存', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { repository, saves, failNext } = inMemoryRepository(saved)
    const store = await loadedStore(repository)
    failNext(new Error('網路錯誤'))

    store.getState().moveTask('a', 'next')
    await store.getState().waitForSaves()
    store.getState().moveTask('c', 'next')
    await store.getState().waitForSaves()

    expect(saves).toHaveLength(1)
    expect(saves[0]).toMatchObject({ version: 1, order: { todo: ['a'], review: [], done: ['d', 'c'] } })
    vi.mocked(console.error).mockRestore()
  })

  it('版本衝突時顯示「看板已被其他人更新」，放棄本地的修改並改用最新的看板', async () => {
    const onNotice = vi.fn()
    const { repository, saves, updateByOthers } = inMemoryRepository(saved)
    const store = await loadedStore(repository, { onNotice })
    const latest = updateByOthers({ title: '其他人改的標題' })

    store.getState().moveTask('a', 'next')
    store.getState().setSubtitle('排隊中的副標')
    await store.getState().waitForSaves()

    expect(store.getState().board).toEqual(latest)
    expect(saves).toEqual([])
    expect(onNotice).toHaveBeenCalledExactlyOnceWith('看板已被其他人更新')
  })

  it('版本衝突後的新操作建立在最新的看板上，可以正常儲存', async () => {
    const { repository, saves, updateByOthers } = inMemoryRepository(saved)
    const store = await loadedStore(repository)
    updateByOthers({ title: '其他人改的標題' })

    store.getState().moveTask('a', 'next')
    await store.getState().waitForSaves()
    store.getState().setSubtitle('我的副標')
    await store.getState().waitForSaves()

    expect(saves).toEqual([
      expect.objectContaining({ title: '其他人改的標題', subtitle: '我的副標', version: 2, order: saved.order }),
    ])
  })

  it('儲存時未授權：通知外層導向登入頁，畫面還原，不顯示儲存失敗', async () => {
    const onNotice = vi.fn()
    const onUnauthorized = vi.fn()
    const { repository, saves, failNext } = inMemoryRepository(saved)
    const store = await loadedStore(repository, { onNotice, onUnauthorized })
    failNext(new UnauthorizedError())

    store.getState().moveTask('a', 'next')
    store.getState().setTitle('排隊中的標題')
    await store.getState().waitForSaves()

    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(onNotice).not.toHaveBeenCalled()
    expect(store.getState().board).toEqual(saved)
    expect(saves).toEqual([])
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
