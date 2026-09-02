export type Theme = 'light' | 'dark'
export type WorkspaceId = string

export type Workspace = {
  id: WorkspaceId
  name: string
  slug: string
  description: string
  timezone: string
  defaultStatus: IncidentStatus
}

export type Member = {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'engineer' | 'viewer'
  teamId: string
  status: 'active' | 'paused'
}

export type Team = {
  id: string
  name: string
  description: string
  status: 'active' | 'disabled'
  serviceIds: string[]
}

export type IncidentStatus = 'pending' | 'processing' | 'waiting' | 'resolved' | 'archived'
export type Severity = 'sev1' | 'sev2' | 'sev3' | 'sev4'
export type Health = 'healthy' | 'degraded' | 'down' | 'disabled'

export type TimelineEntry = {
  id: string
  at: string
  actor: string
  kind: 'status' | 'assignee' | 'field' | 'comment'
  text: string
}

export type Comment = {
  id: string
  authorId: string
  authorName: string
  at: string
  text: string
  attachments: Attachment[]
  own?: boolean
}

export type Attachment = {
  id: string
  name: string
  size: string
  progress: number
  status: 'uploading' | 'done' | 'error'
}

export type Incident = {
  id: string
  key: string
  title: string
  summary: string
  status: IncidentStatus
  severity: Severity
  serviceId: string
  assigneeId: string
  reporterId: string
  teamIds: string[]
  changeIds: string[]
  tagIds: string[]
  createdAt: string
  startedAt: string
  resolvedAt?: string
  updatedAt: string
  responseMinutes: number
  restoreMinutes: number
  impactedUsers: number
  timeline: TimelineEntry[]
  comments: Comment[]
  attachments: Attachment[]
  relatedAlertIds: string[]
  pinned: boolean
}

export type InboxItem = {
  id: string
  key: string
  title: string
  type: 'alert' | 'assignment' | 'approval'
  severity: Severity
  source: string
  assigneeId: string
  createdAt: string
  status: 'unread' | 'read' | 'closed'
  incidentId?: string
}

export type Service = {
  id: string
  name: string
  key: string
  description: string
  teamId: string
  ownerId: string
  environment: 'production' | 'staging' | 'development'
  repository: string
  documentation: string
  health: Health
  dependencyIds: string[]
  alertRules: string[]
  lastChangeAt: string
  status: 'active' | 'disabled'
}

export type ChangeRecord = {
  id: string
  key: string
  title: string
  serviceId: string
  status: 'success' | 'failed' | 'running'
  authorId: string
  at: string
}

export type Shift = {
  id: string
  teamId: string
  memberId: string
  start: string
  end: string
  handoverId?: string
  note: string
}

export type NotificationRule = {
  id: string
  name: string
  trigger: string
  severities: Severity[]
  audience: string
  channel: 'email' | 'webhook' | 'sms'
  quietHours: string
  enabled: boolean
}

export type Integration = {
  id: string
  name: string
  url: string
  enabled: boolean
  lastTest?: { status: 'success' | 'failed'; at: string; message: string }
}

export type Preference = {
  defaultRoute: string
  timezone: string
  notifications: boolean
  shortcuts: boolean
}

export type WorkspaceData = {
  workspace: Workspace
  members: Member[]
  teams: Team[]
  incidents: Incident[]
  inbox: InboxItem[]
  services: Service[]
  changes: ChangeRecord[]
  shifts: Shift[]
  rules: NotificationRule[]
  integrations: Integration[]
  preference: Preference
}

export type ApiResult<T> = { data: T; total?: number }
