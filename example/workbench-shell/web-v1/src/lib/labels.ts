import type { HealthState, IncidentStatus, InboxType, Severity } from "@/types/domain"

export const severityLabel: Record<Severity, string> = {
  critical: "紧急",
  high: "高",
  medium: "中",
  low: "低",
}

export const statusLabel: Record<IncidentStatus, string> = {
  "pending-confirm": "待确认",
  "in-progress": "处理中",
  "waiting-external": "等待外部",
  resolved: "已解决",
  archived: "已归档",
}

export const inboxTypeLabel: Record<InboxType, string> = {
  alert: "告警",
  assigned: "分派",
  confirmation: "待确认",
}

export const healthLabel: Record<HealthState, string> = {
  healthy: "健康",
  degraded: "降级",
  outage: "故障",
  unknown: "未知",
}

export const allowedTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  "pending-confirm": ["in-progress", "archived"],
  "in-progress": ["waiting-external", "resolved"],
  "waiting-external": ["in-progress", "resolved"],
  resolved: ["in-progress", "archived"],
  archived: ["in-progress"],
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
