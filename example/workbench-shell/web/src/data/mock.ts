export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type IncidentStatus = 'open' | 'investigating' | 'mitigated' | 'resolved'
export type ServiceHealth = 'operational' | 'degraded' | 'down'

export interface Workspace { id: string; name: string; slug: string; plan: string }
export interface TeamMember { id: string; name: string; role: string; team: string; email: string; status: 'active' | 'paused' }
export interface Service { id: string; name: string; health: ServiceHealth; owner: string; slo: number; region: string; incidents: number }
export interface Change { id: string; title: string; serviceId: string; status: 'scheduled' | 'deployed' | 'rolled-back'; at: string }
export interface TimelineEntry { id: string; author: string; at: string; text: string; kind: 'comment' | 'state' | 'assignment' }
export interface Incident {
  id: string
  number: string
  title: string
  serviceId: string
  severity: Severity
  status: IncidentStatus
  assigneeId: string | null
  team: string
  createdAt: string
  updatedAt: string
  description: string
  tags: string[]
  changeId?: string
  attachments: string[]
  timeline: TimelineEntry[]
}
export interface InboxItem {
  id: string
  type: 'alert' | 'assignment' | 'confirmation' | 'mention'
  title: string
  source: string
  severity: Severity
  assigneeId: string | null
  createdAt: string
  status: 'unread' | 'read' | 'resolved'
  incidentId?: string
}
export interface Shift { id: string; memberId: string; date: string; start: string; end: string; team: string }
export interface Integration { id: string; name: string; kind: 'webhook' | 'slack' | 'email'; enabled: boolean; target: string }
export interface NotificationRule { id: string; name: string; event: string; severity: Severity; channel: string; quiet: string; enabled: boolean }

export const workspaces: Workspace[] = [
  { id: 'ws-delivery', name: 'Delivery Operations', slug: 'delivery-ops', plan: 'Enterprise' },
  { id: 'ws-platform', name: 'Platform Reliability', slug: 'platform-rel', plan: 'Business' },
]

export const team: TeamMember[] = [
  { id: 'm1', name: '林澈', role: 'Incident Commander', team: 'Core', email: 'lin@example.test', status: 'active' },
  { id: 'm2', name: '周宁', role: 'SRE', team: 'Platform', email: 'zhou@example.test', status: 'active' },
  { id: 'm3', name: '陈望', role: 'Frontend Engineer', team: 'Web', email: 'chen@example.test', status: 'active' },
  { id: 'm4', name: '赵岚', role: 'Data Engineer', team: 'Data', email: 'zhao@example.test', status: 'paused' },
  { id: 'm5', name: '许诺', role: 'Support Lead', team: 'Support', email: 'xu@example.test', status: 'active' },
  { id: 'm6', name: '许嘉', role: 'Release Manager', team: 'Release', email: 'xu.j@example.test', status: 'active' },
]

export const services: Service[] = [
  { id: 'checkout', name: 'Checkout API', health: 'operational', owner: 'Platform', slo: 99.98, region: 'ap-east', incidents: 2 },
  { id: 'payments', name: 'Payments Gateway', health: 'degraded', owner: 'Payments', slo: 99.95, region: 'global', incidents: 4 },
  { id: 'identity', name: 'Identity Service', health: 'operational', owner: 'Core', slo: 99.99, region: 'global', incidents: 1 },
  { id: 'search', name: 'Search Index', health: 'down', owner: 'Data', slo: 99.9, region: 'ap-south', incidents: 5 },
  { id: 'notifications', name: 'Notifications', health: 'operational', owner: 'Support', slo: 99.93, region: 'global', incidents: 0 },
  { id: 'delivery', name: 'Delivery Pipeline', health: 'degraded', owner: 'Release', slo: 99.96, region: 'eu-west', incidents: 3 },
]

export const changes: Change[] = [
  { id: 'chg-1042', title: 'Roll out checkout retry policy', serviceId: 'checkout', status: 'deployed', at: '2026-09-15T07:00:00Z' },
  { id: 'chg-1039', title: 'Payments gateway database migration', serviceId: 'payments', status: 'rolled-back', at: '2026-09-14T18:20:00Z' },
  { id: 'chg-1035', title: 'Search index shard rebalance', serviceId: 'search', status: 'scheduled', at: '2026-09-16T02:00:00Z' },
]

const now = '2026-09-15T08:00:00Z'

export const incidents: Incident[] = [
  {
    id: 'inc-1042', number: 'OPS-1042', title: 'Checkout latency p95 above error budget', serviceId: 'checkout', severity: 'high', status: 'investigating', assigneeId: 'm2', team: 'Platform', createdAt: '2026-09-15T07:48:00Z', updatedAt: now,
    description: 'Elevated checkout latency after the retry policy rollout. Impact is limited to the ap-east region.', tags: ['latency', 'checkout'], changeId: 'chg-1042', attachments: ['latency-trace.txt'],
    timeline: [
      { id: 't1', author: '林澈', at: '2026-09-15T07:50:00Z', text: 'Declared incident and paged the on-call SRE.', kind: 'state' },
      { id: 't2', author: '周宁', at: '2026-09-15T07:56:00Z', text: 'Retry queue is saturated. Reducing rollout to 25%.', kind: 'comment' },
    ],
  },
  {
    id: 'inc-1041', number: 'OPS-1041', title: 'Search index updates delayed', serviceId: 'search', severity: 'critical', status: 'open', assigneeId: 'm4', team: 'Data', createdAt: '2026-09-15T06:12:00Z', updatedAt: '2026-09-15T07:20:00Z',
    description: 'Shard rebalance is blocked by a slow storage node in ap-south.', tags: ['search', 'storage'], attachments: [],
    timeline: [{ id: 't3', author: '赵岚', at: '2026-09-15T06:20:00Z', text: 'Pausing non-essential index writes.', kind: 'comment' }],
  },
  {
    id: 'inc-1040', number: 'OPS-1040', title: 'Identity token refresh errors for a subset of clients', serviceId: 'identity', severity: 'medium', status: 'mitigated', assigneeId: 'm1', team: 'Core', createdAt: '2026-09-14T22:40:00Z', updatedAt: '2026-09-15T05:10:00Z',
    description: 'A clock-skew bug caused refresh tokens to expire early for clients in two regions.', tags: ['auth'], attachments: ['token-sample.json'],
    timeline: [{ id: 't4', author: '林澈', at: '2026-09-14T23:01:00Z', text: 'Mitigation deployed; monitoring error rate.', kind: 'state' }],
  },
  {
    id: 'inc-1039', number: 'OPS-1039', title: 'Payments webhook backlog after rollback', serviceId: 'payments', severity: 'high', status: 'resolved', assigneeId: 'm6', team: 'Payments', createdAt: '2026-09-14T18:18:00Z', updatedAt: '2026-09-14T21:00:00Z',
    description: 'Webhook backlog drained successfully after reverting the migration.', tags: ['payments', 'webhook'], changeId: 'chg-1039', attachments: [],
    timeline: [{ id: 't5', author: '许嘉', at: '2026-09-14T20:40:00Z', text: 'Backlog is below threshold; closing the incident.', kind: 'state' }],
  },
  {
    id: 'inc-1038', number: 'OPS-1038', title: 'Delivery pipeline queue starvation', serviceId: 'delivery', severity: 'medium', status: 'investigating', assigneeId: 'm3', team: 'Release', createdAt: '2026-09-14T12:00:00Z', updatedAt: '2026-09-15T04:30:00Z',
    description: 'A long-running frontend build blocked the shared runner pool.', tags: ['ci', 'runner'], attachments: [],
    timeline: [{ id: 't6', author: '陈望', at: '2026-09-14T12:24:00Z', text: 'Moved the build to a dedicated runner.', kind: 'comment' }],
  },
  {
    id: 'inc-1037', number: 'OPS-1037', title: 'Notification digest duplication', serviceId: 'notifications', severity: 'low', status: 'open', assigneeId: null, team: 'Support', createdAt: '2026-09-13T15:00:00Z', updatedAt: '2026-09-14T09:00:00Z',
    description: 'Some customers received duplicate weekly digests after a retry.', tags: ['email'], attachments: [],
    timeline: [],
  },
]

export const inbox: InboxItem[] = [
  { id: 'i1', type: 'alert', title: 'Checkout p95 crossed the alert threshold', source: 'Prometheus', severity: 'high', assigneeId: 'm2', createdAt: '2026-09-15T07:47:00Z', status: 'unread', incidentId: 'inc-1042' },
  { id: 'i2', type: 'assignment', title: 'Search index updates delayed', source: 'Incident router', severity: 'critical', assigneeId: 'm4', createdAt: '2026-09-15T06:12:00Z', status: 'unread', incidentId: 'inc-1041' },
  { id: 'i3', type: 'confirmation', title: 'Confirm rollback for payments migration', source: 'Release bot', severity: 'high', assigneeId: 'm6', createdAt: '2026-09-15T05:48:00Z', status: 'read', incidentId: 'inc-1039' },
  { id: 'i4', type: 'mention', title: '陈望 mentioned you in OPS-1038', source: 'Comments', severity: 'medium', assigneeId: 'm1', createdAt: '2026-09-14T12:25:00Z', status: 'read', incidentId: 'inc-1038' },
  { id: 'i5', type: 'alert', title: 'Identity refresh errors crossed the warning threshold', source: 'Sentry', severity: 'medium', assigneeId: 'm1', createdAt: '2026-09-14T22:41:00Z', status: 'resolved', incidentId: 'inc-1040' },
]

export const shifts: Shift[] = [
  { id: 's1', memberId: 'm2', date: '2026-09-15', start: '08:00', end: '16:00', team: 'Platform' },
  { id: 's2', memberId: 'm1', date: '2026-09-15', start: '16:00', end: '00:00', team: 'Core' },
  { id: 's3', memberId: 'm4', date: '2026-09-16', start: '00:00', end: '08:00', team: 'Data' },
  { id: 's4', memberId: 'm5', date: '2026-09-16', start: '08:00', end: '16:00', team: 'Support' },
  { id: 's5', memberId: 'm3', date: '2026-09-17', start: '08:00', end: '16:00', team: 'Web' },
  { id: 's6', memberId: 'm6', date: '2026-09-18', start: '16:00', end: '00:00', team: 'Release' },
]

export const integrations: Integration[] = [
  { id: 'int-webhook', name: 'Status page webhook', kind: 'webhook', enabled: true, target: 'https://status.example.test/hooks/ops' },
  { id: 'int-slack', name: 'Incident room', kind: 'slack', enabled: true, target: '#delivery-incidents' },
  { id: 'int-email', name: 'Executive digest', kind: 'email', enabled: false, target: 'ops-leads@example.test' },
]

export const notificationRules: NotificationRule[] = [
  { id: 'rule-critical', name: 'Critical incidents', event: 'incident.created', severity: 'critical', channel: 'Slack + page', quiet: 'never', enabled: true },
  { id: 'rule-changes', name: 'Change failures', event: 'change.failed', severity: 'high', channel: 'Webhook', quiet: '22:00–07:00', enabled: true },
  { id: 'rule-digest', name: 'Daily digest', event: 'digest.daily', severity: 'low', channel: 'Email', quiet: 'never', enabled: false },
]

export const initialSettings = {
  defaultHome: '/incidents',
  timezone: 'Asia/Shanghai',
  notifications: true,
  shortcuts: true,
  workspaceName: 'Delivery Operations',
  description: 'Reliability and release operations for customer-facing services.',
  defaultIncidentStatus: 'open' as IncidentStatus,
}
