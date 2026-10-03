import { DEFAULT_THEME, type Theme } from '../types/theme'

/** 個人的主題偏好。只存在這台瀏覽器，不存進看板資料。 */
export interface ThemePreference {
  load(): Theme
  save(theme: Theme): void
}

const STORAGE_KEY = 'eykanban.theme'

/**
 * 主題偏好存在 localStorage。無痕模式或封鎖網站資料時，連取得 localStorage 都可能丟出錯誤，
 * 所以以函式延後取得：讀不到就用預設主題，存不進去就只在這次開啟有效。
 */
export function createLocalStorageThemePreference(
  getStorage: () => Storage = () => window.localStorage,
): ThemePreference {
  return {
    load() {
      try {
        const saved = getStorage().getItem(STORAGE_KEY)
        return saved === 'dark' || saved === 'light' ? saved : DEFAULT_THEME
      } catch {
        return DEFAULT_THEME
      }
    },
    save(theme) {
      try {
        getStorage().setItem(STORAGE_KEY, theme)
      } catch {
        // 存不進去時不影響畫面，下次開啟回到預設主題
      }
    },
  }
}
