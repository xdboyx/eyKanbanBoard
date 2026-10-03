import { describe, expect, it } from 'vitest'
import { createLocalStorageThemePreference } from './themePreference'

function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  }
}

describe('主題偏好（localStorage）', () => {
  it('沒有保存過時是深色', () => {
    const preference = createLocalStorageThemePreference(() => memoryStorage())
    expect(preference.load()).toBe('dark')
  })

  it('讀回上次保存的主題', () => {
    const storage = memoryStorage()
    createLocalStorageThemePreference(() => storage).save('light')

    expect(createLocalStorageThemePreference(() => storage).load()).toBe('light')
  })

  it('保存的值不是已知主題時是深色', () => {
    const storage = memoryStorage()
    storage.setItem('eykanban.theme', 'sepia')

    expect(createLocalStorageThemePreference(() => storage).load()).toBe('dark')
  })

  it('localStorage 無法使用時讀到深色，保存不會丟出錯誤', () => {
    const preference = createLocalStorageThemePreference(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(preference.load()).toBe('dark')
    expect(() => preference.save('light')).not.toThrow()
  })
})
