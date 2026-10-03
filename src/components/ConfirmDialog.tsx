import { useId } from 'react'
import { useModalDialog } from '../hooks/useModalDialog'
import { Button } from './Button'

/**
 * 自製確認框，取代瀏覽器的 confirm()。掛上時開啟，焦點預設在取消按鈕上，避免誤按；按 Esc 等同取消。
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialog = useModalDialog(onCancel)
  const id = useId()

  return (
    <dialog
      {...dialog}
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      className="fixed inset-0 m-auto box-border h-fit w-[440px] max-w-[calc(100%-32px)] border border-rule bg-band p-8 text-text shadow-elevation-1 backdrop:bg-ink-900/50 max-sm:p-6"
    >
      <h2 id={`${id}-title`} className="m-0 text-h3">
        {title}
      </h2>
      <p id={`${id}-message`} className="mt-2 mb-0 text-body">
        {message}
      </p>
      <div className="mt-8 flex flex-wrap justify-end gap-4">
        <Button data-autofocus onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
