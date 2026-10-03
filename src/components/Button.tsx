import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary'

/**
 * 設計系統的按鈕：直角、16/22/700、高 44px。
 * primary 是黃底配 ink.800 文字與邊框（每個區塊只放一個）；secondary 是透明底配主題文字色的外框。
 * hover 與按壓時疊上文字色的半透明色（state-layer）：黃底變深、透明底變亮或變暗。
 * 也給 <Link> 使用，讓連結看起來像按鈕。
 */
export function buttonClassName(variant: ButtonVariant = 'secondary') {
  return [
    'focus-ring state-layer box-border inline-flex h-11 flex-none cursor-pointer items-center justify-center gap-2 px-6 text-label no-underline disabled:cursor-default disabled:opacity-30',
    variant === 'primary'
      ? 'border border-ink-800 bg-accent-yellow text-ink-800 hover:text-ink-800'
      : 'border border-text bg-transparent text-text hover:text-text',
  ].join(' ')
}

export function Button({
  variant,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={`${buttonClassName(variant)} ${className}`} {...props} />
}
