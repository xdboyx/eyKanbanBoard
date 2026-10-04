import { useNavigate } from '@tanstack/react-router'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import type { AuthStore } from '../../stores/authStore'
import { loginRedirectTarget } from '../../utils/redirect'

const inputClassName =
  'focus-ring box-border h-11 w-full border border-gray-600 bg-transparent px-3 text-body text-text hover:border-text aria-invalid:border-text light:border-gray-300 light:hover:border-text light:aria-invalid:border-text'

/**
 * 登入頁：頁面底色上放一塊表單區，深色模式是 ink.800 底配 ink.900 表單區，跟著主題偏好換色。
 * 登入成功後回到 redirect 指定的站內網址，沒有或不合法時回到看板。
 */
export function LoginPage({ authStore, redirect }: { authStore: AuthStore; redirect: string | undefined }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // invalid：帳密錯誤；unavailable：驗證服務出錯或連不上
  const [error, setError] = useState<'invalid' | 'unavailable' | null>(null)
  const [pending, setPending] = useState(false)
  const id = useId()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    try {
      if (await authStore.getState().login(username, password)) {
        await navigate({ href: loginRedirectTarget(redirect), replace: true })
      } else {
        setError('invalid')
      }
    } catch {
      setError('unavailable')
    } finally {
      setPending(false)
    }
  }

  const errorProps = {
    'aria-invalid': error === 'invalid',
    'aria-describedby': error ? `${id}-error` : undefined,
  }

  return (
    <main className="flex grow items-center justify-center px-6 py-10 max-sm:px-4">
      <div className="box-border w-[440px] max-w-full bg-band p-10 text-text max-sm:px-6">
        <p className="m-0 font-sans text-wordmark">eyKanbanBoard</p>
        <h1 className="mt-8 mb-0 text-display">登入</h1>
        <form noValidate onSubmit={submit} className="mt-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-username`} className="text-label">
              帳號
            </label>
            <input
              id={`${id}-username`}
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              {...errorProps}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-password`} className="text-label">
              密碼
            </label>
            <input
              id={`${id}-password`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              {...errorProps}
              className={inputClassName}
            />
          </div>
          {error && (
            <p id={`${id}-error`} role="alert" className="m-0 text-small">
              {error === 'invalid' ? '帳號或密碼錯誤' : '目前無法登入，請稍後再試'}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={pending} className="w-full">
            登入
          </Button>
        </form>
      </div>
    </main>
  )
}
