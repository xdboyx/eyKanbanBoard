import { describe, expect, it } from 'vitest'
import { loginRedirectTarget } from '../../src/utils/redirect'

describe('登入後導回的網址', () => {
  it('站內路徑保留路徑、查詢參數與 hash', () => {
    expect(loginRedirectTarget('/tasks/abc')).toBe('/tasks/abc')
    expect(loginRedirectTarget('/?q=%E7%A0%94%E7%A9%B6')).toBe('/?q=%E7%A0%94%E7%A9%B6')
    expect(loginRedirectTarget('/tasks/abc?q=a#top')).toBe('/tasks/abc?q=a#top')
  })

  it('沒有導回網址時回到看板', () => {
    expect(loginRedirectTarget(undefined)).toBe('/')
    expect(loginRedirectTarget('')).toBe('/')
  })

  it.each([
    'https://evil.example/',
    '//evil.example/tasks',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    'tasks/abc',
  ])('外部或不是以 / 開頭的網址 %j 被忽略，回到看板', (redirect) => {
    expect(loginRedirectTarget(redirect)).toBe('/')
  })

  it('導回登入頁本身時回到看板', () => {
    expect(loginRedirectTarget('/login')).toBe('/')
    expect(loginRedirectTarget('/login/?redirect=/login')).toBe('/')
  })
})
