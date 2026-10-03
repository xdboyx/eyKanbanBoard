import { describe, expect, it } from 'vitest'
import type { ThemePreference } from '../../src/services/themePreference'
import type { Theme } from '../../src/types/theme'
import { createThemeStore } from '../../src/stores/themeStore'

function inMemoryPreference(initial: Theme) {
  let saved = initial
  const preference: ThemePreference = {
    load: () => saved,
    save: (theme) => {
      saved = theme
    },
  }
  return { preference, saved: () => saved }
}

describe('主題 store', () => {
  it('一開始是保存的主題', () => {
    const { preference } = inMemoryPreference('light')
    expect(createThemeStore(preference).getState().theme).toBe('light')
  })

  it('切換時在深色與一般模式之間交替，並保存選擇', () => {
    const memory = inMemoryPreference('dark')
    const store = createThemeStore(memory.preference)

    store.getState().toggle()
    expect(store.getState().theme).toBe('light')
    expect(memory.saved()).toBe('light')

    store.getState().toggle()
    expect(store.getState().theme).toBe('dark')
    expect(memory.saved()).toBe('dark')
  })
})
