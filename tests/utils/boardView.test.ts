import { describe, expect, it } from 'vitest'
import { createTask, type Board, type Status, type Task } from '../../src/types/board'
import { toBoardView } from '../../src/utils/boardView'

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
