import { createStore } from 'zustand/vanilla'
import type { AuthService } from '../services/authService'

export interface AuthState {
  /** 是否已登入；還沒向驗證服務確認過時為 null */
  authenticated: boolean | null
  /** 第一次呼叫時向驗證服務確認，之後沿用結果 */
  check(): Promise<boolean>
  /** 帳密正確時登入並回傳 true，錯誤時回傳 false */
  login(username: string, password: string): Promise<boolean>
  logout(): Promise<void>
  /** 呼叫 API 時發現 session 已失效：標記為未登入，下一次檢查會導向登入頁 */
  expire(): void
}

export type AuthStore = ReturnType<typeof createAuthStore>

/** 登入狀態的全域狀態，供路由守衛、登入頁與頁首的登出使用。驗證透過注入的 service（ADR-0001）。 */
export function createAuthStore(service: AuthService) {
  return createStore<AuthState>()((set, get) => ({
    authenticated: null,
    async check() {
      const known = get().authenticated
      if (known !== null) return known
      const authenticated = await service.checkSession()
      set({ authenticated })
      return authenticated
    },
    async login(username, password) {
      const authenticated = await service.login(username, password)
      set({ authenticated })
      return authenticated
    },
    async logout() {
      await service.logout()
      set({ authenticated: false })
    },
    expire() {
      set({ authenticated: false })
    },
  }))
}
