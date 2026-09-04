export const SEVERITIES = ["critical", "high", "medium", "low"] as const
export type Severity = (typeof SEVERITIES)[number]

export const INCIDENT_STATUSES = [
  "pending-confirm",
  "in-progress",
  "waiting-external",
  "resolved",
  "archived",
] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const INBOX_TYPES = ["alert", "assigned", "confirmation"] as const
export type InboxType = (typeof INBOX_TYPES)[number]

export const INBOX_STATUSES = ["open", "read", "closed"] as const
export type InboxStatus = (typeof INBOX_STATUSES)[number]

export const HEALTH_STATES = ["healthy", "degraded", "outage", "unknown"] as const
export type HealthState = (typeof HEALTH_STATES)[number]

export const ENVIRONMENTS = ["prod", "staging", "dev"] as const
export type Environment = (typeof ENVIRONMENTS)[number]

export const MEMBER_ROLES = ["owner", "admin", "member", "viewer"] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export const SETTINGS_TABS = [
  "general",
  "members",
  "teams",
  "notifications",
  "integrations",
  "preferences",
] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]

export const CALENDAR_VIEWS = ["month", "week", "day"] as const
export type CalendarView = (typeof CALENDAR_VIEWS)[number]

export const ANALYTICS_RANGES = ["7d", "30d", "quarter", "custom"] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

export type Workspace = {
  id: string
  name: string
  description: string
  timezone: string
  defaultIncidentStatus: IncidentStatus
}

export type Member = {
  id: string
  workspaceId: string
  name: string
  email: string
  role: MemberRole
  teamIds: string[]
  status: "active" | "paused"
  timezone: string
}

export type Team = {
  id: string
  workspaceId: string
  name: string
  description: string
  memberIds: string[]
  serviceIds: string[]
  status: "active" | "disabled"
}

export type Service = {
  id: string
  workspaceId: string
  name: string
  slug: string
  description: string
  teamId: string
  ownerId: string
  environment: Environment
  health: HealthState
  repoUrl: string
  docsUrl: string
  dependsOn: string[]
  alertRules: string
  status: "active" | "disabled"
  recentIncidentCount: number
  lastChangeAt: string
  updatedAt: string
}

export type ChangeRecord = {
  id: string
  workspaceId: string
  title: string
  serviceId: string
  authorId: string
  failed: boolean
  createdAt: string
}

export type Incident = {
  id: string
  number: string
  workspaceId: string
  title: string
  description: string
  status: IncidentStatus
  severity: Severity
  serviceIds: string[]
  ownerId: string
  creatorId: string
  teamIds: string[]
  tags: string[]
  changeIds: string[]
  startedAt: string
  resolvedAt: string | null
  updatedAt: string
  commentCount: number
  pinned: boolean
}

export type TimelineEvent = {
  id: string
  incidentId: string
  kind: "status" | "owner" | "field" | "comment" | "tag" | "change" | "attachment"
  actorId: string
  body: string
  createdAt: string
  mentionIds: string[]
  deleted: boolean
  edited: boolean
}

export type Attachment = {
  id: string
  incidentId: string
  name: string
  size: number
  status: "uploaded" | "failed"
  createdAt: string
}

export type InboxItem = {
  id: string
  workspaceId: string
  number: string
  title: string
  type: InboxType
  severity: Severity
  source: string
  ownerId: string
  createdAt: string
  status: InboxStatus
  incidentId: string | null
}

export type OncallShift = {
  id: string
  workspaceId: string
  teamId: string
  memberId: string
  startAt: string
  endAt: string
  handoffToId: string | null
  note: string
}

export type NotificationRule = {
  id: string
  workspaceId: string
  name: string
  trigger: string
  severity: Severity | "any"
  target: string
  channel: "email" | "webhook" | "in-app"
  quietHours: string
  enabled: boolean
}

export type Integration = {
  id: string
  workspaceId: string
  name: string
  kind: "webhook"
  url: string
  enabled: boolean
}

export type HealthCheck = {
  id: string
  serviceId: string
  name: string
  status: "pass" | "fail"
  checkedAt: string
  detail: string
}
