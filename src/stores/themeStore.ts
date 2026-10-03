import { createStore } from 'zustand/vanilla'
import type { ThemePreference } from '../services/themePreference'
import type { Theme } from '../types/theme'

export interface ThemeState {
  theme: Theme
  /** 在深色與一般模式之間切換，並保存選擇 */
  toggle(): void
}

export type ThemeStore = ReturnType<typeof createThemeStore>

/** 深色／一般模式的全域狀態。偏好的讀寫透過注入的 preference，測試可換成記憶體實作。 */
export function createThemeStore(preference: ThemePreference) {
  return createStore<ThemeState>()((set, get) => ({
    theme: preference.load(),
    toggle() {
      const theme = get().theme === 'dark' ? 'light' : 'dark'
      preference.save(theme)
      set({ theme })
    },
  }))
}
