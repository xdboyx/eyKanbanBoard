import { describe, expect, it } from 'vitest'
import { createTask, type Board, type Task } from '../../src/types/board'
import { toBoardView } from '../../src/utils/boardView'

function task(id: string, fields: Partial<Omit<Task, 'id'>> = {}): Task {
  return createTask(id, { title: `任務 ${id}`, ...fields })
}

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
    )

    expect(view.statuses.flatMap((s) => s.tasks).map((t) => [t.id, t.prevStatus, t.nextStatus])).toEqual([
      ['a', null, 'doing'],
      ['b', 'todo', 'review'],
      ['c', 'doing', 'done'],
      ['d', 'review', null],
    ])
  })
})
