import { Link } from '@tanstack/react-router'
import { useBoardSearch } from '../../hooks/useBoardSearch'
import { TaskSearch } from './TaskSearch'

/** 設計系統的全域頁首（ps-header）。時程、報表、成員不在第一版範圍，因此不顯示主選單。 */
export function AppHeader({ onLogout }: { onLogout: () => void }) {
  const { query, setQuery } = useBoardSearch()
  return (
    <header className="group sticky top-0 z-10 box-border flex h-[75px] items-center gap-10 bg-ink-800 px-17 text-white max-md:gap-6 max-md:px-6">
      {/* 手機上展開搜尋時放不下字標，先隱藏，讓出空間給輸入框 */}
      <Link
        to="/"
        className="focus-ring font-sans text-wordmark no-underline max-sm:group-has-[[role=search]]:hidden"
      >
        eyKanbanBoard
      </Link>
      <div className="ml-auto flex min-w-0 items-center gap-6 max-md:gap-4 max-sm:gap-3">
        <TaskSearch query={query} onChange={setQuery} />
        {/* 設計系統的深底緊湊按鈕：透明底、白字、gray.600 外框；高度與「搜尋任務」一致 */}
        <button
          type="button"
          onClick={onLogout}
          className="focus-ring state-layer inline-flex flex-none cursor-pointer items-center border border-gray-600 bg-transparent px-4 py-[9px] text-small whitespace-nowrap text-white hover:border-white"
        >
          登出
        </button>
      </div>
    </header>
  )
}
