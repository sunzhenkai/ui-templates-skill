// 业务实体类型定义

export type Severity = "critical" | "high" | "medium" | "low"
export type IncidentStatus = "open" | "acknowledged" | "investigating" | "resolved" | "closed"
export type InboxType = "alert" | "incident" | "task" | "approval"
export type InboxStatus = "pending" | "handled" | "dismissed"
export type ServiceStatus = "healthy" | "degraded" | "down" | "maintenance"
export type MemberRole = "owner" | "admin" | "engineer" | "viewer"
export type ChangeType = "feature" | "fix" | "config" | "hotfix"
export type ShiftStatus = "scheduled" | "active" | "completed" | "missed"
export type ViewMode = "list" | "board" | "table"

export interface Workspace {
  id: string
  name: string
  slug: string
  description: string
  timezone: string
  defaultIncidentStatus: IncidentStatus
  ownerId: string
}

export interface Team {
  id: string
  workspaceId: string
  name: string
  color: string
  memberIds: string[]
  serviceIds: string[]
  active: boolean
}

export interface Member {
  id: string
  workspaceId: string
  name: string
  email: string
  avatar?: string
  role: MemberRole
  teamIds: string[]
  active: boolean
}

export interface Service {
  id: string
  workspaceId: string
  name: string
  description: string
  status: ServiceStatus
  teamIds: string[]
  incidentCount: number
  slo?: number
  ownerIds: string[]
}

export interface Incident {
  id: string
  workspaceId: string
  number: string
  title: string
  description: string
  severity: Severity
  status: IncidentStatus
  serviceIds: string[]
  ownerId?: string
  participantIds: string[]
  createdAt: string
  updatedAt: string
  startedAt: string
  tags: string[]
  changeIds: string[]
  comments: Comment[]
  pinned: boolean
}

export interface Comment {
  id: string
  incidentId: string
  authorId: string
  content: string
  createdAt: string
}

export interface ChangeRecord {
  id: string
  workspaceId: string
  title: string
  type: ChangeType
  serviceIds: string[]
  authorId: string
  deployedAt: string
  status: "success" | "failure" | "rolling"
}

export interface InboxItem {
  id: string
  workspaceId: string
  type: InboxType
  title: string
  severity: Severity
  source: string
  ownerId?: string
  status: InboxStatus
  createdAt: string
  incidentId?: string
  read: boolean
}

export interface OnCallShift {
  id: string
  workspaceId: string
  memberId: string
  startAt: string
  endAt: string
  status: ShiftStatus
  note?: string
}

export interface NotificationRule {
  id: string
  workspaceId: string
  name: string
  event: string
  severity: Severity[]
  recipients: string[]
  channels: ("email" | "sms" | "slack" | "webhook")[]
  muteMinutes: number
  active: boolean
}

export interface Integration {
  id: string
  workspaceId: string
  name: string
  type: "webhook" | "slack" | "pagerduty" | "datadog"
  url?: string
  active: boolean
  lastTested?: "success" | "failure"
}

export type ToastType = "info" | "success" | "error"

export interface Toast {
  id: string
  title: string
  description?: string
  type: ToastType
  action?: { label: string; onClick: () => void }
}

export interface RouteState {
  page: string
  id?: string
  tab?: string
  view?: ViewMode
  q?: string
}
