export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (seconds < 60) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`
  return new Date(iso).toLocaleDateString()
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })
}

export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN")
}

export function severityColor(sev: string): string {
  switch (sev) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800"
    case "low":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300"
    case "acknowledged":
      return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300"
    case "investigating":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
    case "resolved":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300"
    case "closed":
      return "bg-muted text-muted-foreground border-border"
    case "healthy":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300"
    case "degraded":
      return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300"
    case "down":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300"
    case "maintenance":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    open: "待处理",
    acknowledged: "已确认",
    investigating: "调查中",
    resolved: "已解决",
    closed: "已关闭",
    healthy: "健康",
    degraded: "降级",
    down: "故障",
    maintenance: "维护中",
    pending: "待处理",
    handled: "已处理",
    dismissed: "已忽略",
  }
  return map[status] ?? status
}

export function severityLabel(sev: string): string {
  const map: Record<string, string> = {
    critical: "P0 严重",
    high: "P1 高",
    medium: "P2 中",
    low: "P3 低",
  }
  return map[sev] ?? sev
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
