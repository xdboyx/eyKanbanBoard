import type { AuthService } from './authService'

const STORAGE_KEY = 'eykanban.session'

export interface LocalCredentials {
  username: string | undefined
  password: string | undefined
}

/**
 * 本地開發用的模擬登入：帳密來自 .env.local，只在前端比對，登入狀態存在 localStorage。
 * 刻意不安全，只為了讓本地也走一遍登入畫面與路由守衛，不得用在正式建置（ADR-0001）。
 */
export function createLocalAuthService(
  credentials: LocalCredentials,
  storage: Storage = window.localStorage,
): AuthService {
  const { username, password } = credentials
  if (!username || !password) {
    console.warn('本地登入的帳密未設定：複製 .env.local.example 為 .env.local，填入 VITE_APP_USERNAME 與 VITE_APP_PASSWORD 後重新啟動開發伺服器')
  }
  return {
    async checkSession() {
      return storage.getItem(STORAGE_KEY) === 'signed-in'
    },
    async login(inputUsername, inputPassword) {
      // 未設定帳密時一律登入失敗，不會因為兩邊都是空字串而通過
      if (!username || !password || inputUsername !== username || inputPassword !== password) return false
      storage.setItem(STORAGE_KEY, 'signed-in')
      return true
    },
    async logout() {
      storage.removeItem(STORAGE_KEY)
    },
  }
}
