import { describe, expect, it } from 'vitest'
import { createTask, type Board, type Status, type Task } from '../../src/types/board'
import { matchesSearch, toBoardView } from '../../src/utils/boardView'

function task(id: string, fields: Partial<Omit<Task, 'id'>> = {}): Task {
  return createTask(id, { title: `任務 ${id}`, ...fields })
}

const TODAY = '2026-10-04'

function board(overrides: Partial<Board> = {}): Board {
  return {
    title: '測試看板',
    subtitle: '測試單位',
    updatedAt: '2026-10-04T08:00:00.000Z',
    version: 1,
    tasks: {},
    order: { todo: [], doing: [], review: [], done: [] },
    ...overrides,
  }
}

describe('畫面用的看板', () => {
  it('依固定順序列出四種狀態，每種狀態依保存的順序列出任務與數量', () => {
    const view = toBoardView(
      board({
        tasks: { a: task('a'), b: task('b'), c: task('c') },
        order: { todo: ['b', 'a'], doing: [], review: ['c'], done: [] },
      }),
      TODAY,
    )

    expect(view.statuses.map((s) => [s.status, s.name, s.count])).toEqual([
      ['todo', '待辦', 2],
      ['doing', '進行中', 0],
      ['review', '審核中', 1],
      ['done', '已完成', 0],
    ])
    expect(view.statuses[0]!.tasks.map((t) => t.id)).toEqual(['b', 'a'])
    expect(view.totalTasks).toBe(3)
  })

  it('只有高優先級且不在「已完成」的任務是醒目任務', () => {
    const featured = toBoardView(
      board({
        tasks: {
          high: task('high', { priority: 'high' }),
          medium: task('medium', { priority: 'medium' }),
          highDone: task('highDone', { priority: 'high', completedDate: '2026-10-01' }),
        },
        order: { todo: [], doing: ['high', 'medium'], review: [], done: ['highDone'] },
      }),
      TODAY,
    )
      .statuses.flatMap((s) => s.tasks)
      .filter((t) => t.featured)
      .map((t) => t.id)

    expect(featured).toEqual(['high'])
  })

  it('每個任務帶有前一個與後一個狀態，頭尾為 null', () => {
    const view = toBoardView(
      board({
        tasks: { a: task('a'), b: task('b'), c: task('c'), d: task('d') },
        order: { todo: ['a'], doing: ['b'], review: ['c'], done: ['d'] },
      }),
      TODAY,
    )

    expect(view.statuses.flatMap((s) => s.tasks).map((t) => [t.id, t.prevStatus, t.nextStatus])).toEqual([
      ['a', null, 'doing'],
      ['b', 'todo', 'review'],
      ['c', 'doing', 'done'],
      ['d', 'review', null],
    ])
  })

  describe('搜尋', () => {
    const searchable = board({
      tasks: {
        a: task('a', { title: 'API 規格' }),
        b: task('b', { title: '首頁', tag: 'Design' }),
        c: task('c', { title: '部署', owner: '王小明' }),
        d: task('d', { title: '測試' }),
        e: task('e', { title: '設計審查', completedDate: '2026-10-01' }),
      },
      order: { todo: ['a', 'd'], doing: ['b'], review: ['c'], done: ['e'] },
    })

    function visibleIds(query: string) {
      return toBoardView(searchable, TODAY, query).statuses.flatMap((s) => s.tasks.map((t) => t.id))
    }

    it('比對標題、標籤、負責人的子字串', () => {
      expect(visibleIds('規')).toEqual(['a'])
      expect(visibleIds('sig')).toEqual(['b'])
      expect(visibleIds('小明')).toEqual(['c'])
    })

    it('不分大小寫，忽略前後空白', () => {
      expect(visibleIds('api')).toEqual(['a'])
      expect(visibleIds('DESIGN')).toEqual(['b'])
      expect(visibleIds('  api  ')).toEqual(['a'])
    })

    it('不比對摘要與其他欄位', () => {
      const task = createTask('x', { title: '首頁', summary: '設計稿', priority: 'high', dueDate: '2026-10-10' })
      expect(matchesSearch(task, '設計')).toBe(false)
      expect(matchesSearch(task, 'high')).toBe(false)
      expect(matchesSearch(task, '10-10')).toBe(false)
    })

    it('沒有搜尋文字或只有空白時列出全部任務', () => {
      expect(visibleIds('')).toEqual(['a', 'd', 'b', 'c', 'e'])
      expect(visibleIds('   ')).toEqual(['a', 'd', 'b', 'c', 'e'])
      expect(toBoardView(searchable, TODAY, '   ').searching).toBe(false)
    })

    it('各狀態的數量是符合的數量，任務總數仍是全部的數量', () => {
      const view = toBoardView(searchable, TODAY, '設')
      expect(view.searching).toBe(true)
      expect(view.statuses.map((s) => [s.status, s.count])).toEqual([
        ['todo', 0],
        ['doing', 0],
        ['review', 0],
        ['done', 1],
      ])
      expect(view.totalTasks).toBe(5)
    })

    it('符合的任務維持保存的順序', () => {
      const ordered = board({
        tasks: { a: task('a', { tag: '研究' }), b: task('b'), c: task('c', { tag: '研究' }) },
        order: { todo: ['c', 'b', 'a'], doing: [], review: [], done: [] },
      })
      expect(toBoardView(ordered, TODAY, '研究').statuses[0]!.tasks.map((t) => t.id)).toEqual(['c', 'a'])
    })
  })

  describe('優先級與日期的呈現', () => {
    /** 把單一任務放在指定狀態，回傳它的畫面資料 */
    function view(fields: Partial<Omit<Task, 'id'>>, status: Status = 'todo', today = TODAY) {
      const order = { todo: [], doing: [], review: [], done: [], [status]: ['a'] }
      return toBoardView(board({ tasks: { a: task('a', fields) }, order }), today).statuses.flatMap((s) => s.tasks)[0]!
    }

    it('中、低優先級顯示優先級文字，無與高優先級不顯示', () => {
      expect(view({ priority: 'medium' }).priorityText).toBe('優先：中')
      expect(view({ priority: 'low' }).priorityText).toBe('優先：低')
      expect(view({ priority: 'none' }).priorityText).toBeNull()
      expect(view({ priority: 'high' }).priorityText).toBeNull()
    })

    it('到期日與今天同年只顯示月-日，不同年顯示完整日期，沒有到期日時不顯示', () => {
      expect(view({ dueDate: '2026-12-31' }).dateText).toBe('12-31')
      expect(view({ dueDate: '2027-01-05' }).dateText).toBe('2027-01-05')
      expect(view({ dueDate: null }).dateText).toBeNull()
    })

    it('到期日早於今天且不在「已完成」時逾期，日期後顯示「逾期」', () => {
      const overdue = view({ dueDate: '2026-10-03' }, 'review')
      expect(overdue.overdue).toBe(true)
      expect(overdue.dateText).toBe('10-03 逾期')

      const lastYear = view({ dueDate: '2025-12-20' }, 'doing')
      expect(lastYear.overdue).toBe(true)
      expect(lastYear.dateText).toBe('2025-12-20 逾期')
    })

    it('到期日是今天或之後、或沒有到期日時不逾期', () => {
      expect(view({ dueDate: TODAY }).overdue).toBe(false)
      expect(view({ dueDate: '2026-10-05' }).overdue).toBe(false)
      expect(view({ dueDate: null }).overdue).toBe(false)
    })

    it('以注入的今天判斷逾期與年份', () => {
      const task = view({ dueDate: '2026-10-04' }, 'todo', '2027-01-02')
      expect(task.overdue).toBe(true)
      expect(task.dateText).toBe('2026-10-04 逾期')
    })

    it('已完成的任務不顯示優先級與逾期，日期顯示完成日', () => {
      const done = view({ priority: 'medium', dueDate: '2026-09-01', completedDate: '2026-10-02' }, 'done')
      expect(done.priorityText).toBeNull()
      expect(done.overdue).toBe(false)
      expect(done.dateText).toBe('10-02 完成')
      expect(view({ completedDate: '2025-12-30' }, 'done').dateText).toBe('2025-12-30 完成')
    })
  })
})
