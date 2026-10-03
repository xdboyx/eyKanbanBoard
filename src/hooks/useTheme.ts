import { useStore } from 'zustand'
import type { ThemeStore } from '../stores/themeStore'

/** 訂閱主題 store，回傳目前的主題與切換函式 */
export function useTheme(store: ThemeStore) {
  const theme = useStore(store, (state) => state.theme)
  const toggle = useStore(store, (state) => state.toggle)
  return { theme, toggle }
}
