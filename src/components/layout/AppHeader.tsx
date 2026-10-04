import { Link } from '@tanstack/react-router'
import { useBoardSearch } from '../../hooks/useBoardSearch'
import { TaskSearch } from './TaskSearch'

/** 設計系統的全域頁首（ps-header）。時程、報表、成員不在第一版範圍，因此不顯示主選單。 */
export function AppHeader() {
  const { query, setQuery } = useBoardSearch()
  return (
    <header className="sticky top-0 z-10 box-border flex h-[75px] items-center gap-10 bg-ink-800 px-17 text-white max-md:gap-6 max-md:px-6">
      <Link to="/" className="focus-ring font-sans text-wordmark no-underline">
        eyKanbanBoard
      </Link>
      <div className="ml-auto flex min-w-0 items-center gap-6">
        <TaskSearch query={query} onChange={setQuery} />
      </div>
    </header>
  )
}
