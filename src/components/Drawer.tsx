import { useEffect, useRef, type ReactNode } from 'react'
import { useModalDialog } from '../hooks/useModalDialog'
import { CloseIcon } from './icons'

/** 滑出動畫是 200ms（見 index.css 的 drawer-motion），多留一點餘裕 */
const CLOSE_TIMEOUT_MS = 300

/**
 * 從右側滑出、疊在頁面上的抽屜：寬 480px，小螢幕時全螢幕，使用唯一的浮層陰影 elevation-1。
 * 按 Esc、關閉按鈕或點抽屜外的區域都交給 onClose。
 * closing 為 true 時播放滑出動畫，期間不能操作，結束後呼叫 onClosed，由外層卸下抽屜。
 */
export function Drawer({
  title,
  closing = false,
  onClose,
  onClosed,
  children,
}: {
  title: string
  closing?: boolean
  onClose: () => void
  onClosed?: () => void
  children: ReactNode
}) {
  const requestClose = () => {
    if (!closing) onClose()
  }
  const dialog = useModalDialog(requestClose)
  const onClosedRef = useRef(onClosed)
  useEffect(() => {
    onClosedRef.current = onClosed
  })

  useEffect(() => {
    const element = dialog.ref.current
    if (!closing || !element) return
    // 先讀一次樣式讓滑出的 transition 開始，再等它結束；使用者設定減少動態時沒有 transition，立即結束。
    // 分頁在背景時動畫不會前進，最多等 CLOSE_TIMEOUT_MS 就當作結束，不讓抽屜卡住
    getComputedStyle(element).translate
    let done = false
    const finish = () => {
      if (done) return
      done = true
      onClosedRef.current?.()
    }
    const timer = setTimeout(finish, CLOSE_TIMEOUT_MS)
    Promise.allSettled(element.getAnimations().map((animation) => animation.finished)).then(finish)
    return () => {
      done = true
      clearTimeout(timer)
    }
  }, [closing, dialog.ref])

  return (
    <dialog
      {...dialog}
      aria-label={title}
      data-closing={closing || undefined}
      onClick={(event) => {
        // 點在抽屜外（::backdrop）時，事件的 target 是 dialog 本身
        if (event.target === event.currentTarget) requestClose()
      }}
      className="drawer-motion fixed inset-y-0 right-0 left-auto m-0 box-border h-dvh max-h-none w-[480px] max-w-full border-0 bg-band p-0 text-text shadow-elevation-1 backdrop:bg-ink-900/50 max-sm:w-full"
    >
      <div inert={closing} className="flex h-full flex-col">
        <div className="flex flex-none items-center justify-between gap-4 border-b border-rule px-8 py-5 max-sm:px-4">
          <h2 className="m-0 text-card-title">{title}</h2>
          <button
            type="button"
            aria-label="關閉"
            title="關閉"
            onClick={requestClose}
            className="focus-ring state-layer box-border inline-flex size-11 flex-none cursor-pointer items-center justify-center border border-rule bg-transparent p-0 text-text hover:border-text"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
