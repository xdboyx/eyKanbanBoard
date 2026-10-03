import type { Theme } from '../types/theme'
import { MoonIcon, SunIcon } from './icons'

/** 深色／一般模式切換按鈕：圖示表示按下後會切換成的模式 */
export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const label = theme === 'dark' ? '切換為一般模式' : '切換為深色模式'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onToggle}
      className="focus-ring state-layer box-border inline-flex size-11 cursor-pointer items-center justify-center border border-text bg-transparent p-0 text-text"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
