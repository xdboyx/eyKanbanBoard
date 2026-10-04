import { describe, expect, it } from 'vitest'
import type { AuthService } from '../../src/services/authService'
import { createAuthStore } from '../../src/stores/authStore'

/** 記憶體中的驗證服務：帳密為 admin / secret，記錄確認 session 的次數 */
function inMemoryAuthService(signedIn: boolean) {
  let session = signedIn
  let checks = 0
  const service: AuthService = {
    checkSession: async () => {
      checks += 1
      return session
    },
    login: async (username, password) => {
      session = username === 'admin' && password === 'secret'
      return session
    },
    logout: async () => {
      session = false
    },
  }
  return { service, session: () => session, checks: () => checks }
}

describe('登入 store', () => {
  it('還沒確認前不知道是否登入，確認後是驗證服務的結果', async () => {
    const store = createAuthStore(inMemoryAuthService(true).service)
    expect(store.getState().authenticated).toBeNull()

    await expect(store.getState().check()).resolves.toBe(true)
    expect(store.getState().authenticated).toBe(true)
  })

  it('只向驗證服務確認一次，之後沿用結果', async () => {
    const auth = inMemoryAuthService(false)
    const store = createAuthStore(auth.service)

    await store.getState().check()
    await expect(store.getState().check()).resolves.toBe(false)

    expect(auth.checks()).toBe(1)
  })

  it('帳密正確時登入', async () => {
    const store = createAuthStore(inMemoryAuthService(false).service)

    await expect(store.getState().login('admin', 'secret')).resolves.toBe(true)
    expect(store.getState().authenticated).toBe(true)
    await expect(store.getState().check()).resolves.toBe(true)
  })

  it('帳密錯誤時維持未登入', async () => {
    const store = createAuthStore(inMemoryAuthService(false).service)

    await expect(store.getState().login('admin', 'wrong')).resolves.toBe(false)
    expect(store.getState().authenticated).toBe(false)
  })

  it('session 失效後標記為未登入，之後的檢查不再沿用已登入的結果', async () => {
    const store = createAuthStore(inMemoryAuthService(true).service)
    await store.getState().check()

    store.getState().expire()

    expect(store.getState().authenticated).toBe(false)
    await expect(store.getState().check()).resolves.toBe(false)
  })

  it('登出後回到未登入，驗證服務的 session 也結束', async () => {
    const auth = inMemoryAuthService(true)
    const store = createAuthStore(auth.service)
    await store.getState().check()

    await store.getState().logout()

    expect(store.getState().authenticated).toBe(false)
    expect(auth.session()).toBe(false)
  })
})
