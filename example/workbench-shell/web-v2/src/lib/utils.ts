export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function relativeTime(value: string | Date) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)
  if (Math.abs(minutes) < 60) return minutes >= 0 ? `${minutes} 分钟前` : `${-minutes} 分钟后`
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return hours >= 0 ? `${hours} 小时前` : `${-hours} 小时后`
  return `${Math.round(hours / 24)} 天前`
}

export function isChecked<T extends string>(value: string | null, allowed: readonly T[]): value is T {
  return !!value && (allowed as readonly string[]).includes(value)
}

export function uniqueId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}
