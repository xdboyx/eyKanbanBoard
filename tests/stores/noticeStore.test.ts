import { describe, expect, it } from 'vitest'
import { createNoticeStore } from '../../src/stores/noticeStore'

describe('提示訊息 store', () => {
  it('一開始沒有提示，顯示後可以關閉', () => {
    const store = createNoticeStore()
    expect(store.getState().message).toBeNull()

    store.getState().show('找不到這個任務')
    expect(store.getState().message).toBe('找不到這個任務')

    store.getState().dismiss()
    expect(store.getState().message).toBeNull()
  })

  it('新的提示取代舊的', () => {
    const store = createNoticeStore()

    store.getState().show('第一則')
    store.getState().show('第二則')

    expect(store.getState().message).toBe('第二則')
  })
})
