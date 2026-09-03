// Deterministic mock seed used by every page. The fixtures are intentionally
// heterogeneous (multiple severities, statuses, time ranges) so list / kanban /
// analytics surfaces can demonstrate filtering, sorting and empty states.

import type {
  Change, DeliveryMetric, Incident, 
  InboxItem, Integration, Member, NotificationRule, OncallShift, Service,
  Team, Workspace,
} from '../types'

export const now = new Date('2026-09-03T10:32:00+08:00')
const minutes = (n: number) => new Date(now.getTime() - n * 60_000).toISOString()
const hours = (n: number) => new Date(now.getTime() - n * 3_600_000).toISOString()
const days = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString()
const daysAhead = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString()

export const workspaces: Workspace[] = [
  { id: 'ws-acme', name: 'Acme 核心业务', slug: 'acme', timezone: 'Asia/Shanghai', defaultStatus: 'triggered', memberCount: 42 },
  { id: 'ws-platform', name: '平台基础设施', slug: 'platform', timezone: 'Asia/Shanghai', defaultStatus: 'acknowledged', memberCount: 18 },
]

export const teams: Team[] = [
  { id: 'team-payments', name: '支付与对账', description: '负责订单、支付与对账链路', memberIds: ['m-001', 'm-002', 'm-003'], active: true },
  { id: 'team-platform', name: '基础设施', description: 'Kubernetes / 网络 / 中间件', memberIds: ['m-004', 'm-005'], active: true },
  { id: 'team-growth', name: '增长与营销', description: '增长活动与触达', memberIds: ['m-006', 'm-007'], active: true },
  { id: 'team-data', name: '数据平台', description: '离线 / 实时数仓', memberIds: ['m-008'], active: false },
]

export const members: Member[] = [
  { id: 'm-001', name: '林雨桐', email: 'yutong.lin@acme.dev', role: 'owner', teamIds: ['team-payments'], active: true, initials: 'LY', color: 'oklch(0.65 0.16 255)' },
  { id: 'm-002', name: '陈墨白', email: 'mobai.chen@acme.dev', role: 'admin', teamIds: ['team-payments'], active: true, initials: 'CM', color: 'oklch(0.65 0.15 145)' },
  { id: 'm-003', name: '苏知意', email: 'zhiyi.su@acme.dev', role: 'responder', teamIds: ['team-payments'], active: true, initials: 'SZ', color: 'oklch(0.70 0.16 85)' },
  { id: 'm-004', name: '赵南舟', email: 'nanzhou.zhao@acme.dev', role: 'admin', teamIds: ['team-platform'], active: true, initials: 'ZN', color: 'oklch(0.62 0.18 320)' },
  { id: 'm-005', name: 'Avi Patel', email: 'avi.patel@acme.dev', role: 'responder', teamIds: ['team-platform'], active: true, initials: 'AP', color: 'oklch(0.65 0.16 30)' },
  { id: 'm-006', name: '王听澜', email: 'tinglan.wang@acme.dev', role: 'responder', teamIds: ['team-growth'], active: true, initials: 'WT', color: 'oklch(0.65 0.16 200)' },
  { id: 'm-007', name: 'Sara K.', email: 'sara.k@acme.dev', role: 'viewer', teamIds: ['team-growth'], active: true, initials: 'SK', color: 'oklch(0.65 0.16 290)' },
  { id: 'm-008', name: '刘星野', email: 'xingye.liu@acme.dev', role: 'responder', teamIds: ['team-data'], active: false, initials: 'LX', color: 'oklch(0.65 0.16 50)' },
]

export const services: Service[] = [
  { id: 'svc-checkout', name: 'checkout-api', description: '订单与结算核心 API', tier: 'tier-1', ownerTeamId: 'team-payments', health: 'partial_outage', openIncidents: 3, mttrMinutes: 42, tags: ['payments', 'critical-path'] },
  { id: 'svc-ledger', name: 'ledger-writer', description: '账本写入服务', tier: 'tier-1', ownerTeamId: 'team-payments', health: 'degraded', openIncidents: 1, mttrMinutes: 38, tags: ['payments', 'event-sourcing'] },
  { id: 'svc-notify', name: 'notify-center', description: '通知中心（短信/邮件/推送）', tier: 'tier-2', ownerTeamId: 'team-growth', health: 'healthy', openIncidents: 0, mttrMinutes: 21, tags: ['comms'] },
  { id: 'svc-gateway', name: 'edge-gateway', description: '边缘网关 / 鉴权', tier: 'tier-1', ownerTeamId: 'team-platform', health: 'healthy', openIncidents: 0, mttrMinutes: 16, tags: ['infra'] },
  { id: 'svc-search', name: 'search-indexer', description: '商品 / 订单索引', tier: 'tier-2', ownerTeamId: 'team-platform', health: 'degraded', openIncidents: 1, mttrMinutes: 56, tags: ['search'] },
  { id: 'svc-billing', name: 'billing-job', description: '账单结算离线任务', tier: 'tier-3', ownerTeamId: 'team-payments', health: 'healthy', openIncidents: 0, mttrMinutes: 65, tags: ['batch'] },
  { id: 'svc-fe-web', name: 'web-portal', description: '商家门户前端', tier: 'tier-2', ownerTeamId: 'team-growth', health: 'healthy', openIncidents: 0, mttrMinutes: 28, tags: ['frontend'] },
]

export const changes: Change[] = [
  { id: 'chg-1001', title: 'checkout-api v3.12.0 灰度上线', serviceId: 'svc-checkout', kind: 'deploy', status: 'in_progress', authorId: 'm-002', scheduledAt: hours(1) },
  { id: 'chg-1002', title: 'edge-gateway 调高限流阈值', serviceId: 'svc-gateway', kind: 'config', status: 'succeeded', authorId: 'm-004', scheduledAt: hours(6), completedAt: hours(5) },
  { id: 'chg-1003', title: 'ledger-writer 索引重建', serviceId: 'svc-ledger', kind: 'deploy', status: 'failed', authorId: 'm-002', scheduledAt: hours(12), completedAt: hours(11) },
  { id: 'chg-1004', title: 'search-indexer 回滚 v2.4.0', serviceId: 'svc-search', kind: 'rollback', status: 'planned', authorId: 'm-004', scheduledAt: daysAhead(1) },
  { id: 'chg-1005', title: 'web-portal 全量发布', serviceId: 'svc-fe-web', kind: 'deploy', status: 'succeeded', authorId: 'm-006', scheduledAt: days(1), completedAt: days(1) },
  { id: 'chg-1006', title: '支付开关降级', serviceId: 'svc-checkout', kind: 'feature-flag', status: 'succeeded', authorId: 'm-001', scheduledAt: hours(3), completedAt: hours(2) },
]

const incidents: Incident[] = [
  {
    id: 'inc-001', number: 'INC-2031', title: 'checkout-api 错误率突增',
    description: '近 5 分钟 checkout-api 5xx 错误率由 0.4% 上升至 7.8%，主要来自华东区域。',
    severity: 'SEV1', status: 'investigating', serviceId: 'svc-checkout', assigneeId: 'm-002',
    teamIds: ['team-payments'], createdAt: minutes(34), occurredAt: minutes(36),
    tags: ['error-budget', 'payments', 'region:cn-east'],
    changeIds: ['chg-1001'],
    attachments: [
      { id: 'att-1', name: 'error-rate-screenshot.png', size: 102_400, uploadedAt: minutes(30) },
    ],
    comments: [
      { id: 'c-1', authorId: 'm-002', body: '已确认是 v3.12.0 引入的连接池泄漏，正在回滚。', createdAt: minutes(20) },
      { id: 'c-2', authorId: 'm-001', body: '财务已通知，外部公告在草拟。', createdAt: minutes(15) },
    ],
    activity: [
      { id: 'a-1', kind: 'create', actorId: 'm-001', at: minutes(36), note: '由告警自动创建' },
      { id: 'a-2', kind: 'assign', actorId: 'm-001', at: minutes(34), meta: { assignee: 'm-002' } },
      { id: 'a-3', kind: 'status', actorId: 'm-002', at: minutes(28), meta: { from: 'triggered', to: 'acknowledged' } },
      { id: 'a-4', kind: 'status', actorId: 'm-002', at: minutes(20), meta: { from: 'acknowledged', to: 'investigating' } },
      { id: 'a-5', kind: 'change_link', actorId: 'm-002', at: minutes(18), meta: { changeId: 'chg-1001' } },
    ],
    pinned: true,
  },
  {
    id: 'inc-002', number: 'INC-2032', title: 'ledger-writer 写入延迟升高',
    description: 'ledger-writer P99 写入延迟从 80ms 升至 1.2s，已持续 20 分钟。',
    severity: 'SEV2', status: 'acknowledged', serviceId: 'svc-ledger', assigneeId: 'm-003',
    teamIds: ['team-payments'], createdAt: hours(2), occurredAt: hours(2),
    tags: ['latency'],
    changeIds: ['chg-1003'],
    attachments: [],
    comments: [
      { id: 'c-3', authorId: 'm-003', body: '在排查下游 Kafka 是否出现再平衡。', createdAt: hours(1) },
    ],
    activity: [
      { id: 'a-6', kind: 'create', actorId: 'm-001', at: hours(2), note: '手动创建' },
      { id: 'a-7', kind: 'assign', actorId: 'm-001', at: hours(2), meta: { assignee: 'm-003' } },
    ],
  },
  {
    id: 'inc-003', number: 'INC-2033', title: 'search-indexer 索引失败',
    description: '商品增量索引失败，回滚方案已生成。',
    severity: 'SEV3', status: 'mitigated', serviceId: 'svc-search', assigneeId: 'm-004',
    teamIds: ['team-platform'], createdAt: hours(5), occurredAt: hours(6),
    tags: ['search'],
    changeIds: ['chg-1004'],
    attachments: [],
    comments: [],
    activity: [
      { id: 'a-8', kind: 'create', actorId: 'm-004', at: hours(6) },
      { id: 'a-9', kind: 'status', actorId: 'm-004', at: hours(4), meta: { from: 'investigating', to: 'mitigated' } },
    ],
  },
  {
    id: 'inc-004', number: 'INC-2025', title: 'edge-gateway 鉴权抖动',
    description: '夜间出现 30s 鉴权抖动，已自动恢复。',
    severity: 'SEV3', status: 'resolved', serviceId: 'svc-gateway', assigneeId: 'm-005',
    teamIds: ['team-platform'], createdAt: days(2), occurredAt: days(2),
    tags: ['infra'],
    changeIds: [],
    attachments: [],
    comments: [],
    activity: [
      { id: 'a-10', kind: 'create', actorId: 'm-005', at: days(2) },
      { id: 'a-11', kind: 'status', actorId: 'm-005', at: days(2), meta: { from: 'mitigated', to: 'resolved' } },
    ],
  },
  {
    id: 'inc-005', number: 'INC-2018', title: 'notify-center 模板审核',
    description: '法务需要审核双 11 营销模板。',
    severity: 'SEV4', status: 'triggered', serviceId: 'svc-notify', assigneeId: 'm-006',
    teamIds: ['team-growth'], createdAt: hours(8), occurredAt: hours(8),
    tags: ['comms', 'legal'],
    changeIds: [],
    attachments: [],
    comments: [],
    activity: [
      { id: 'a-12', kind: 'create', actorId: 'm-006', at: hours(8) },
    ],
  },
  {
    id: 'inc-006', number: 'INC-2014', title: 'web-portal 静态资源 404',
    description: '某区域 CDN 节点回源异常，已切流。',
    severity: 'SEV2', status: 'resolved', serviceId: 'svc-fe-web', assigneeId: 'm-006',
    teamIds: ['team-growth'], createdAt: days(5), occurredAt: days(5),
    tags: ['cdn'],
    changeIds: ['chg-1005'],
    attachments: [],
    comments: [],
    activity: [
      { id: 'a-13', kind: 'create', actorId: 'm-006', at: days(5) },
      { id: 'a-14', kind: 'status', actorId: 'm-006', at: days(5), meta: { from: 'mitigated', to: 'resolved' } },
    ],
  },
  {
    id: 'inc-007', number: 'INC-2009', title: 'checkout-api 数据库主从延迟',
    description: '主从延迟升高导致只读流量降级。',
    severity: 'SEV2', status: 'resolved', serviceId: 'svc-checkout', assigneeId: 'm-002',
    teamIds: ['team-payments'], createdAt: days(8), occurredAt: days(8),
    tags: ['database'],
    changeIds: [],
    attachments: [],
    comments: [],
    activity: [],
  },
  {
    id: 'inc-008', number: 'INC-2005', title: 'billing-job 离线任务失败',
    description: '凌晨账单任务因依赖服务抖动而失败。',
    severity: 'SEV3', status: 'resolved', serviceId: 'svc-billing', assigneeId: 'm-002',
    teamIds: ['team-payments'], createdAt: days(12), occurredAt: days(12),
    tags: ['batch'],
    changeIds: [],
    attachments: [],
    comments: [],
    activity: [],
  },
]

export const seedIncidents: Incident[] = incidents

export const inboxItems: InboxItem[] = [
  { id: 'inb-1', type: 'alert', title: 'checkout-api 错误率突增（7.8%）', source: 'Prometheus', severity: 'SEV1', status: 'unread', assigneeId: 'm-002', refId: 'inc-001', createdAt: minutes(34) },
  { id: 'inb-2', type: 'assignment', title: 'INC-2033 已分派给你', source: 'Pager', severity: 'SEV3', status: 'unread', assigneeId: 'm-004', refId: 'inc-003', createdAt: hours(5) },
  { id: 'inb-3', type: 'mention', title: '@你 INC-2031 评论里需要确认', source: 'INC-2031', severity: 'SEV1', status: 'unread', assigneeId: 'm-001', refId: 'inc-001', createdAt: minutes(15) },
  { id: 'inb-4', type: 'approval', title: '支付开关降级需要你的审批', source: '变更管理', status: 'unread', assigneeId: 'm-001', refId: 'chg-1006', createdAt: hours(3) },
  { id: 'inb-5', type: 'note', title: '夜班交接：当前在岗 王听澜', source: '值班', status: 'read', assigneeId: 'm-006', createdAt: hours(8) },
  { id: 'inb-6', type: 'alert', title: 'search-indexer 重建进度 60%', source: 'Indexing', severity: 'SEV4', status: 'read', assigneeId: 'm-004', refId: 'inc-003', createdAt: hours(4) },
  { id: 'inb-7', type: 'assignment', title: 'INC-2025 已自动恢复', source: 'Pager', severity: 'SEV3', status: 'archived', assigneeId: 'm-005', refId: 'inc-004', createdAt: days(2) },
]

export const shifts: OncallShift[] = (() => {
  const list: OncallShift[] = []
  for (let day = -2; day <= 7; day++) {
    const primary = members[(day + 2) % 5]
    const secondary = members[(day + 5) % 5]
    list.push({
      id: `shift-${day}-p`,
      memberId: primary.id,
      start: new Date(now.getTime() + day * 86_400_000).toISOString().slice(0, 10) + 'T09:00:00+08:00',
      end: new Date(now.getTime() + day * 86_400_000).toISOString().slice(0, 10) + 'T21:00:00+08:00',
      level: 'primary',
    })
    list.push({
      id: `shift-${day}-s`,
      memberId: secondary.id,
      start: new Date(now.getTime() + day * 86_400_000).toISOString().slice(0, 10) + 'T21:00:00+08:00',
      end: new Date(now.getTime() + (day + 1) * 86_400_000).toISOString().slice(0, 10) + 'T09:00:00+08:00',
      level: 'secondary',
    })
  }
  return list
})()

export const deliveryMetrics: DeliveryMetric[] = Array.from({ length: 14 }).map((_, i) => {
  const day = 13 - i
  const base = 12 + Math.round(Math.sin(i / 2) * 4 + i / 4)
  return {
    date: days(day).slice(0, 10),
    deploys: base + (i % 3 === 0 ? 4 : 0),
    failedDeploys: Math.max(0, Math.round(base / 9) + (i % 5 === 0 ? 1 : 0)),
    leadTimeHours: 6 + Math.round(Math.cos(i / 3) * 2 + i / 6),
    mttrMinutes: 28 + Math.round(Math.sin(i / 4) * 12),
    changeFailureRate: 0.04 + (i % 7 === 0 ? 0.06 : 0),
  }
})

export const notificationRules: NotificationRule[] = [
  { id: 'rule-1', name: '支付 SEV1 全员电话', trigger: 'triggered', severity: ['SEV1'], channels: ['sms', 'push'], recipients: ['m-001', 'm-002'], enabled: true },
  { id: 'rule-2', name: '平台值班升级', trigger: 'acknowledged', severity: ['SEV1', 'SEV2'], channels: ['push'], recipients: ['m-004'], enabled: true, quietHours: { start: '23:00', end: '08:00' } },
  { id: 'rule-3', name: '增长群邮件', trigger: 'resolved', severity: ['SEV3', 'SEV4'], channels: ['email'], recipients: ['m-006', 'm-007'], enabled: false },
]

export const integrations: Integration[] = [
  { id: 'int-1', name: 'Slack #incidents', kind: 'slack', status: 'connected', lastTestAt: hours(2), lastTestResult: 'success' },
  { id: 'int-2', name: 'PagerDuty', kind: 'pagerduty', status: 'connected', lastTestAt: days(1), lastTestResult: 'success' },
  { id: 'int-3', name: 'GitHub Actions', kind: 'github', status: 'connected', lastTestAt: hours(12), lastTestResult: 'success' },
  { id: 'int-4', name: 'Jira', kind: 'jira', status: 'error', lastTestAt: hours(6), lastTestResult: 'failure' },
  { id: 'int-5', name: 'Webhook (内网告警)', kind: 'webhook', status: 'disabled', url: 'https://hooks.example.internal/incidents' },
]
