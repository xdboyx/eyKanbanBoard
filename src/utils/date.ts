/** ISO 8601 → YYYY-MM-DD（使用者本地日期） */
export function localDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** YYYY-MM-DD → 與今天同一年時顯示 MM-DD，不同年時顯示完整的 YYYY-MM-DD */
export function shortDate(date: string, today: string) {
  return date.slice(0, 4) === today.slice(0, 4) ? date.slice(5) : date
}
