import { createStore } from 'zustand/vanilla'

export interface NoticeState {
  /** 目前顯示在頁首下方的提示；沒有時為 null */
  message: string | null
  show(message: string): void
  dismiss(): void
}

export type NoticeStore = ReturnType<typeof createNoticeStore>

/** 頁首下方的提示訊息，例如開啟不存在的任務時。一次只顯示一則，新的取代舊的。 */
export function createNoticeStore() {
  return createStore<NoticeState>()((set) => ({
    message: null,
    show(message) {
      set({ message })
    },
    dismiss() {
      set({ message: null })
    },
  }))
}
