import type { AuthService } from './authService'

/**
 * 正式環境的驗證：呼叫 Worker 的 /api/login、/api/logout、/api/session，
 * session 存在 Worker 發的 HttpOnly cookie，前端讀不到也不保存（ADR-0001、ADR-0002）。
 */
export function createWorkerAuthService(fetchApi: typeof fetch = (input, init) => fetch(input, init)): AuthService {
  return {
    async checkSession() {
      const response = await fetchApi('/api/session')
      return signedIn(response)
    },
    async login(username, password) {
      const response = await fetchApi('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      return signedIn(response)
    },
    async logout() {
      const response = await fetchApi('/api/logout', { method: 'POST' })
      if (!response.ok) throw new Error(`登出失敗（HTTP ${response.status}）`)
    },
  }
}

/** 204 是已登入、401 是未登入；其他狀態是伺服器出錯，不當成未登入 */
function signedIn(response: Response): boolean {
  if (response.status === 204) return true
  if (response.status === 401) return false
  throw new Error(`驗證服務回應異常（HTTP ${response.status}）`)
}
