import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CloseIcon, SearchIcon } from '../icons'

/**
 * 頁首的「搜尋任務」。平常是一顆按鈕，按下後展開輸入框，邊打字邊交給 onChange；
 * 有搜尋文字時一直展開，可以按 × 或 Esc 一鍵清除。清空後移開焦點就收回按鈕。
 */
export function TaskSearch({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  // 輸入框的值自己保存：網址的 q 晚一步才更新，直接綁網址會讓游標跳動、打斷中文輸入法選字
  const [value, setValue] = useState(query)
  const [open, setOpen] = useState(query !== '')
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  // 按按鈕展開時把焦點移進輸入框、按 Esc 收回時還給按鈕，方便用鍵盤操作；
  // 從網址帶入搜尋文字而展開、點到別處而收回時不搶焦點
  const refocus = useRef(false)

  // 網址從外部改變（上一頁、開啟帶 ?q= 的連結）時跟著更新；正在輸入時以輸入框為準
  useEffect(() => {
    if (document.activeElement === inputRef.current) return
    setValue(query)
    if (query) setOpen(true)
  }, [query])

  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    if (open) inputRef.current?.focus()
    else buttonRef.current?.focus()
  }, [open])

  function change(next: string) {
    setValue(next)
    onChange(next)
  }

  function clear() {
    change('')
    inputRef.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 中文輸入法選字時的 Esc 是給輸入法的
    if (event.key !== 'Escape' || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (value) {
      change('')
    } else {
      refocus.current = true
      event.currentTarget.blur()
    }
  }

  if (!open) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          refocus.current = true
          setOpen(true)
        }}
        className="focus-ring state-layer inline-flex flex-none cursor-pointer items-center gap-2 rounded-sm border border-ink-800 bg-white px-4 py-[9px] text-small whitespace-nowrap text-ink-800"
      >
        <SearchIcon />
        {/* 手機上頁首放不下，只顯示圖示；文字留給螢幕閱讀器 */}
        <span className="max-sm:sr-only">搜尋任務</span>
      </button>
    )
  }

  return (
    <div
      role="search"
      className="flex w-80 max-w-full min-w-0 items-center gap-2 rounded-sm border border-gray-600 bg-ink-900 pl-3 text-white focus-within:border-white"
    >
      <SearchIcon />
      <input
        ref={inputRef}
        type="search"
        aria-label="搜尋任務"
        placeholder="搜尋標題、標籤、負責人"
        value={value}
        onChange={(event) => change(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (!value) setOpen(false)
        }}
        className="h-10 min-w-0 grow appearance-none border-0 bg-transparent p-0 text-small text-white outline-none placeholder:text-gray-300 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="清除搜尋"
          title="清除搜尋"
          onClick={clear}
          className="focus-ring state-layer inline-flex size-10 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-white"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  )
}
