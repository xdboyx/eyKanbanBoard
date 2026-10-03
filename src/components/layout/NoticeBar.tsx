import { useEffect } from 'react'
import { CloseIcon } from '../icons'

const AUTO_DISMISS_MS = 6000

/** 頁首下方的提示列：黃底配 ink.800 文字，幾秒後自動消失，也可以手動關閉 */
export function NoticeBar({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div role="status" className="sticky top-[75px] z-10">
      {message && (
        <div className="flex items-center justify-between gap-4 border-b border-ink-800 bg-accent-yellow px-17 py-2 text-ink-800 max-md:px-6">
          <p className="m-0 text-label">{message}</p>
          <button
            type="button"
            aria-label="關閉提示"
            title="關閉提示"
            onClick={onDismiss}
            className="focus-ring state-layer box-border inline-flex size-9 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-ink-800"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  )
}
