import { useNavigate, useSearch } from '@tanstack/react-router'

/** 看板的搜尋文字，存在網址的 ?q=；清空時從網址移除 */
export function useBoardSearch() {
  const query = useSearch({ strict: false, select: (search) => search.q ?? '' })
  const navigate = useNavigate()

  function setQuery(q: string) {
    // 每打一個字就更新，用 replace 不在上一頁的紀錄裡留下每個字
    void navigate({ to: '.', search: (prev) => ({ ...prev, q: q || undefined }), replace: true })
  }

  return { query, setQuery }
}
