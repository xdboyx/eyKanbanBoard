/** session 的有效期間：7 天 */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

const COOKIE_NAME = 'session'
const COOKIE_ATTRIBUTES = 'Path=/; HttpOnly; Secure; SameSite=Lax'

const encoder = new TextEncoder()

function hmacKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null
  try {
    const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'))
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

/**
 * 登入成功時發的 cookie：內容是到期時間（Unix 秒）與以 key 計算的 HMAC 簽章。
 * session 不存在伺服器，所以更換 key 會讓所有既有 cookie 失效（ADR-0002）。
 */
export async function createSessionCookie(key: string, now: number): Promise<string> {
  const expiresAt = String(Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS)
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(key), encoder.encode(expiresAt))
  return `${COOKIE_NAME}=${expiresAt}.${toBase64Url(signature)}; Max-Age=${SESSION_MAX_AGE_SECONDS}; ${COOKIE_ATTRIBUTES}`
}

/** 登出時讓瀏覽器刪除 cookie */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Max-Age=0; ${COOKIE_ATTRIBUTES}`
}

/** request 帶有未過期、且簽章正確的 session cookie 時回傳 true */
export async function hasValidSession(request: Request, key: string, now: number): Promise<boolean> {
  const value = readCookie(request.headers.get('Cookie'), COOKIE_NAME)
  const [expiresAt, signature, ...rest] = value?.split('.') ?? []
  if (!expiresAt || !signature || rest.length > 0 || !/^\d+$/.test(expiresAt)) return false
  if (Number(expiresAt) * 1000 <= now) return false

  const signatureBytes = fromBase64Url(signature)
  if (!signatureBytes) return false
  // verify 以常數時間比對簽章
  return crypto.subtle.verify('HMAC', await hmacKey(key), signatureBytes, encoder.encode(expiresAt))
}

function readCookie(header: string | null, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return undefined
}
