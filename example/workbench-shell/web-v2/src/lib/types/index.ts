// Domain types for the Software Delivery & Ops Incident Collaboration Center.
// All fields are kept simple to keep mock data editable; Zod schemas validate
// shapes at API boundary.

export type Severity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4'
export type IncidentStatus = 'triggered' | 'acknowledged' | 'investigating' | 'mitigated' | 'resolved'
export type Priority = 'P0' | 'P1' | 'P2' | 'P3'
export type InboxItemType = 'alert' | 'assignment' | 'mention' | 'approval' | 'note'
export type InboxItemStatus = 'unread' | 'read' | 'archived' | 'resolved'
export type ChangeKind = 'deploy' | 'config' | 'rollback' | 'feature-flag'
export type ChangeStatus = 'planned' | 'in_progress' | 'succeeded' | 'failed' | 'rolled_back'
export type ServiceHealth = 'healthy' | 'degraded' | 'partial_outage' | 'major_outage'
export type ServiceTier = 'tier-1' | 'tier-2' | 'tier-3'

export interface Workspace {
  id: string
  name: string
  slug: string
  timezone: string
  defaultStatus: IncidentStatus
  memberCount: number
}

export interface Team {
  id: string
  name: string
  description: string
  memberIds: string[]
  active: boolean
}

export interface Member {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'responder' | 'viewer'
  teamIds: string[]
  active: boolean
  initials: string
  color: string
}

export interface Service {
  id: string
  name: string
  description: string
  tier: ServiceTier
  ownerTeamId: string
  health: ServiceHealth
  openIncidents: number
  mttrMinutes: number
  tags: string[]
}

export interface Change {
  id: string
  title: string
  serviceId: string
  kind: ChangeKind
  status: ChangeStatus
  authorId: string
  scheduledAt: string
  completedAt?: string
}

export interface IncidentComment {
  id: string
  authorId: string
  body: string
  createdAt: string
}

export interface IncidentActivity {
  id: string
  kind: 'status' | 'assign' | 'severity' | 'comment' | 'tag' | 'create' | 'change_link'
  actorId: string
  at: string
  meta?: Record<string, string>
  note?: string
}

export interface Incident {
  id: string
  number: string
  title: string
  description: string
  severity: Severity
  status: IncidentStatus
  serviceId: string
  assigneeId: string | null
  teamIds: string[]
  createdAt: string
  occurredAt: string
  tags: string[]
  changeIds: string[]
  attachments: { id: string; name: string; size: number; uploadedAt: string }[]
  comments: IncidentComment[]
  activity: IncidentActivity[]
  pinned?: boolean
}

export interface InboxItem {
  id: string
  type: InboxItemType
  title: string
  source: string
  severity?: Severity
  status: InboxItemStatus
  assigneeId: string | null
  refId?: string
  createdAt: string
}

export interface OncallShift {
  id: string
  memberId: string
  start: string
  end: string
  level: 'primary' | 'secondary'
}

export interface DeliveryMetric {
  date: string
  deploys: number
  failedDeploys: number
  leadTimeHours: number
  mttrMinutes: number
  changeFailureRate: number
}

export interface NotificationRule {
  id: string
  name: string
  trigger: IncidentStatus
  severity: Severity[]
  channels: ('email' | 'sms' | 'push')[]
  recipients: string[]
  enabled: boolean
  quietHours?: { start: string; end: string }
}

export interface Integration {
  id: string
  name: string
  kind: 'webhook' | 'slack' | 'pagerduty' | 'github' | 'jira'
  status: 'connected' | 'error' | 'disabled'
  url?: string
  lastTestAt?: string
  lastTestResult?: 'success' | 'failure'
}

export interface AppPreference {
  defaultHome: string
  timezone: string
  notifications: boolean
  shortcuts: boolean
}
