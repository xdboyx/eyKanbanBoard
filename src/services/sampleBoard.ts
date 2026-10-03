import { createTask, type Board, type Task } from '../types/board'

function tasksById(tasks: Record<string, Partial<Omit<Task, 'id'>>>): Record<string, Task> {
  return Object.fromEntries(Object.entries(tasks).map(([id, fields]) => [id, createTask(id, fields)]))
}

/** 本地開發用的範例看板，內容來自設計稿 */
export function createSampleBoard(): Board {
  return {
    title: '2026 Q4 數位轉型專案',
    subtitle: '專案管理辦公室',
    // UTC 中午，讓 UTC-11～UTC+11 的本地日期都是 2026-10-04
    updatedAt: '2026-10-04T12:00:00.000Z',
    version: 1,
    tasks: tasksById({
      t1: { title: '彙整客戶訪談紀錄，整理成需求清單', tag: '研究', owner: '林怡君', dueDate: '2026-10-12' },
      t2: { title: '定義看板卡片的欄位與權限規則', tag: '規劃', owner: '陳建宏', dueDate: '2026-10-14' },
      t3: { title: '盤點現有報表來源與更新頻率', tag: '資料', owner: '張雅婷', dueDate: '2026-10-17' },
      t4: { title: '草擬第一版使用者流程圖', tag: '設計', owner: '黃志明', dueDate: '2026-10-20' },
      t5: {
        title: '導入新流程遇到瓶頸？先從財務團隊的月結作業切入',
        summary: '訪談三位財務主管，找出最耗時的兩個步驟。',
        priority: 'high',
        owner: '林怡君',
        dueDate: '2026-10-09',
      },
      t6: { title: '建立任務篩選與搜尋功能', tag: '開發', owner: '陳建宏', dueDate: '2026-10-15' },
      t7: { title: '設定每週進度報告的自動寄送', tag: '自動化', owner: '張雅婷', dueDate: '2026-10-18' },
      t8: { title: '看板拖放互動的可用性測試', tag: '測試', owner: '黃志明', dueDate: '2026-10-08' },
      t9: { title: '資料權限與稽核紀錄規格', tag: '規格', owner: '陳建宏', dueDate: '2026-10-10' },
      t10: { title: '確認專案範疇與時程', owner: '林怡君', completedDate: '2026-09-26' },
      t11: { title: '完成利害關係人訪談', owner: '陳建宏', completedDate: '2026-09-30' },
      t12: { title: '建立設計系統色彩與字級', owner: '黃志明', completedDate: '2026-10-02' },
    }),
    order: {
      todo: ['t1', 't2', 't3', 't4'],
      doing: ['t5', 't6', 't7'],
      review: ['t8', 't9'],
      done: ['t10', 't11', 't12'],
    },
  }
}
