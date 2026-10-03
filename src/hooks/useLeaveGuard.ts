import { useBlocker } from '@tanstack/react-router'
import { useCallback, useEffect, useRef } from 'react'

/**
 * 有未儲存的修改時，攔下離開目前網址的導覽（包含上一頁），交給畫面詢問是否放棄；
 * 重新整理或關閉分頁時改由瀏覽器詢問。
 * 儲存或刪除後要離開時，先呼叫 release() 讓這次離開不被攔下。
 */
export function useLeaveGuard(dirty: boolean) {
  const guarding = useRef(dirty)
  useEffect(() => {
    guarding.current = dirty
  }, [dirty])

  const shouldBlockFn = useCallback(() => guarding.current, [])
  const enableBeforeUnload = useCallback(() => guarding.current, [])
  const blocker = useBlocker({ shouldBlockFn, enableBeforeUnload, withResolver: true })

  return {
    /** 導覽被攔下，等待使用者決定 */
    blocked: blocker.status === 'blocked',
    /** 放棄修改，繼續剛才被攔下的導覽 */
    leave: () => blocker.proceed?.(),
    /** 留在原處繼續編輯 */
    stay: () => blocker.reset?.(),
    release: () => {
      guarding.current = false
    },
  }
}
