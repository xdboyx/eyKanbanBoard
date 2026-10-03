/** ISO 8601 → YYYY-MM-DD（使用者本地日期） */
export function localDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** YYYY-MM-DD → MM-DD */
export function monthDay(date: string) {
  return date.slice(5)
}
