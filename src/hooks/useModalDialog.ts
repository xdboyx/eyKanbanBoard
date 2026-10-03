import { useLayoutEffect, useRef, type KeyboardEvent, type SyntheticEvent } from 'react'

/**
 * 用原生 <dialog> 做浮層：掛上時以 showModal() 開啟（背景不可操作、焦點留在浮層內），
 * 卸下時關閉，瀏覽器會把焦點還給開啟前的元素。
 * 開啟後把焦點放在帶有 data-autofocus 的元素上。
 * 按 Esc 不讓瀏覽器直接關閉，交給 onDismiss 決定（例如先詢問是否放棄修改）。
 */
export function useModalDialog(onDismiss: () => void) {
  const ref = useRef<HTMLDialogElement>(null)

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => dialog.close()
  }, [])

  return {
    ref,
    onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
      if (event.key !== 'Escape') return
      // 疊在上面的浮層先處理，不再往下傳給底下的浮層
      event.preventDefault()
      event.stopPropagation()
      onDismiss()
    },
    // 其他關閉要求（例如 Android 的返回鍵）
    onCancel(event: SyntheticEvent<HTMLDialogElement>) {
      event.preventDefault()
      onDismiss()
    },
  }
}
