import { useStore } from 'zustand'
import type { NoticeStore } from '../stores/noticeStore'

/** 訂閱提示訊息 store，回傳目前的提示與關閉函式 */
export function useNotice(store: NoticeStore) {
  const message = useStore(store, (state) => state.message)
  const dismiss = useStore(store, (state) => state.dismiss)
  return { message, dismiss }
}
