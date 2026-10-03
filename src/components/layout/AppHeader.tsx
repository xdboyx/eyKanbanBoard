import { Link } from '@tanstack/react-router'
import { SearchIcon } from '../icons'

/** 設計系統的全域頁首（ps-header）。時程、報表、成員不在第一版範圍，因此不顯示主選單。 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 box-border flex h-[75px] items-center gap-10 bg-ink-800 px-17 text-white">
      <Link to="/" className="focus-ring font-sans text-wordmark no-underline">
        eyKanbanBoard
      </Link>
      <div className="ml-auto flex items-center gap-6">
        <button
          type="button"
          className="focus-ring state-layer inline-flex cursor-pointer items-center gap-2 rounded-sm border border-ink-800 bg-white px-4 py-[9px] text-small text-ink-800"
        >
          <SearchIcon />
          搜尋任務
        </button>
      </div>
    </header>
  )
}
