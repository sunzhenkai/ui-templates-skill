import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function formatDay(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(value))
}

export function severityTone(severity: string) {
  if (severity === 'critical') return 'danger'
  if (severity === 'high') return 'warning'
  if (severity === 'medium') return 'info'
  return 'neutral'
}

export function statusTone(status: string) {
  if (status === 'resolved' || status === 'operational') return 'success'
  if (status === 'degraded' || status === 'investigating') return 'warning'
  if (status === 'down' || status === 'open') return 'danger'
  return 'neutral'
}
