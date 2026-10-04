/** 用來解析站內路徑的假網域，只用來判斷解析後是否還在同一個站 */
const BASE = 'http://site.invalid'

/**
 * 登入後要導回的網址。只接受站內路徑（以 / 開頭、解析後仍在本站）；
 * 外部網址、//evil.example、/\evil.example、javascript: 等一律忽略，改回看板。
 * 導回登入頁本身也改回看板，避免登入後又回到登入頁。
 */
export function loginRedirectTarget(redirect: unknown): string {
  if (typeof redirect !== 'string' || !redirect.startsWith('/')) return '/'
  let url: URL
  try {
    url = new URL(redirect, BASE)
  } catch {
    return '/'
  }
  if (url.origin !== BASE || /^\/login\/?$/.test(url.pathname)) return '/'
  return `${url.pathname}${url.search}${url.hash}`
}
