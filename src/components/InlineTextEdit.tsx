import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

/**
 * 點一下就能直接修改的文字。平常是一個看起來像文字的按鈕，按下後換成輸入框：
 * Enter 或移開焦點時交給 onSave，Esc 放棄修改。是否接受新的值由 onSave 決定，
 * 例如空白的標題不接受時，畫面會回到原本的值。
 * 字型與顏色沿用外層元素，放在標題或 meta 列裡都與周圍的文字一致。
 */
export function InlineTextEdit({
  value,
  label,
  placeholder,
  onSave,
}: {
  value: string
  /** 輸入框的名稱，也用在按鈕的提示「修改…」 */
  label: string
  /** value 是空字串時按鈕顯示的文字 */
  placeholder?: string
  onSave: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  // 按 Esc 時先標記再移開焦點，blur 時就不儲存
  const cancelled = useRef(false)
  // 用 Enter 或 Esc 結束時把焦點還給按鈕，方便繼續用鍵盤操作；點到別處結束時不搶焦點
  const refocus = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (editing || !refocus.current) return
    refocus.current = false
    buttonRef.current?.focus()
  }, [editing])

  function start() {
    cancelled.current = false
    setDraft(value)
    setEditing(true)
  }

  function finish() {
    if (!cancelled.current) onSave(draft)
    setEditing(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 中文輸入法選字時的 Enter 與 Esc 是給輸入法的
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') {
      event.preventDefault()
      refocus.current = true
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelled.current = true
      refocus.current = true
      event.currentTarget.blur()
    }
  }

  // 按鈕與輸入框都有 1px 邊框，切換時文字不會跳動；輸入框的邊框用文字色，編輯中在兩種主題都清楚
  const shared = 'box-border -mx-1 border px-1 text-inherit [font:inherit] [letter-spacing:inherit]'

  if (editing) {
    return (
      <input
        type="text"
        aria-label={label}
        value={draft}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={finish}
        className={`${shared} focus-ring max-w-full min-w-[6em] border-text bg-transparent [field-sizing:content]`}
      />
    )
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      title={`修改${label}`}
      onClick={start}
      className={`${shared} focus-ring state-layer cursor-text border-transparent bg-transparent text-left`}
    >
      {value || placeholder}
    </button>
  )
}
