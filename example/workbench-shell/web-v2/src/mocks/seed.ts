import type { ChangeRecord, InboxItem, Incident, Member, Service, Shift, Team, WorkspaceData } from '@/types'

const now = new Date('2026-09-02T10:00:00+08:00')
const day = 24 * 60 * 60 * 1000
const iso = (offsetDays: number, hour = 9, minute = 0) =>
  new Date(now.getTime() + offsetDays * day + (hour - 10) * 3_600_000 + minute * 60_000).toISOString()

function makeWorkspace(id: string, name: string, slug: string, prefix: string, serviceNames: string[]): WorkspaceData {
  const teams: Team[] = [
    { id: `${id}-team-1`, name: '平台稳定性', description: '负责核心平台可用性', status: 'active', serviceIds: [] },
    { id: `${id}-team-2`, name: '交付效能', description: '负责流水线与发布质量', status: 'active', serviceIds: [] },
    { id: `${id}-team-3`, name: '客户响应', description: '处理客户上报与事件跟进', status: 'active', serviceIds: [] }
  ]

  const members: Member[] = [
    { id: `${id}-m1`, name: '林川', email: `lin@example.test`, role: 'owner', teamId: teams[0].id, status: 'active' },
    { id: `${id}-m2`, name: '赵晴', email: `zhao@example.test`, role: 'admin', teamId: teams[1].id, status: 'active' },
    { id: `${id}-m3`, name: 'Kevin', email: `kevin@example.test`, role: 'engineer', teamId: teams[0].id, status: 'active' },
    { id: `${id}-m4`, name: '陈默', email: `chen@example.test`, role: 'engineer', teamId: teams[2].id, status: 'active' },
    { id: `${id}-m5`, name: '周然', email: `zhou@example.test`, role: 'viewer', teamId: teams[1].id, status: 'paused' }
  ]

  const services: Service[] = serviceNames.map((serviceName, index) => ({
    id: `${id}-s-${index + 1}`,
    name: serviceName,
    key: `${prefix}-${serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    description: `${serviceName} 的运行、发布与告警治理。`,
    teamId: teams[index % teams.length].id,
    ownerId: members[index % 4].id,
    environment: index === 0 ? 'production' : index === 1 ? 'staging' : 'development',
    repository: `https://code.example.test/${prefix}/${serviceName.toLowerCase()}`,
    documentation: `https://docs.example.test/${prefix}/${serviceName.toLowerCase()}`,
    health: index === 0 ? 'degraded' : index === 3 ? 'down' : 'healthy',
    dependencyIds: index === 0 ? [`${id}-s-2`, `${id}-s-3`] : [],
    alertRules: index % 2 ? ['错误率 > 2%', 'P99 > 800ms'] : ['可用性 < 99.9%'],
    lastChangeAt: iso(-index - 1, 15),
    status: 'active'
  }))
  teams.forEach(team => {
    team.serviceIds = services.filter(service => service.teamId === team.id).map(service => service.id)
  })

  const changes: ChangeRecord[] = Array.from({ length: 8 }, (_, index) => ({
    id: `${id}-c-${index + 1}`,
    key: `CHG-${1000 + index}`,
    title: index % 3 === 1 ? '发布数据库迁移' : '滚动更新服务版本',
    serviceId: services[index % services.length].id,
    status: index % 5 === 0 ? 'failed' : index % 4 === 0 ? 'running' : 'success',
    authorId: members[index % 4].id,
    at: iso(-index, 11 + (index % 6))
  }))

  const statuses = ['pending', 'processing', 'waiting', 'resolved', 'archived'] as const
  const severities = ['sev1', 'sev2', 'sev3', 'sev4'] as const
  const incidents: Incident[] = Array.from({ length: 22 }, (_, index) => {
    const created = iso(-Math.floor(index * 0.8) - 1, 8 + (index % 8))
    const status = statuses[index % statuses.length]
    const comments = index % 4 === 0 ? [{
      id: `${id}-cm-${index}`,
      authorId: `${id}-m2`,
      authorName: '赵晴',
      at: created,
      text: `已开始定位 ${serviceNameFor(index)} 的延迟抖动，请 @林川 关注容量。`,
      attachments: []
    }] : []
    return {
      id: `${id}-i-${index + 1}`,
      key: `${prefix.toUpperCase()}-${2001 + index}`,
      title: `${serviceNameFor(index)} 出现${['请求延迟', '错误率上升', '容量不足', '连接超时', '任务失败'][index % 5]}`,
      summary: `影响 ${serviceNameFor(index)} 的核心链路，已收到多个区域告警，需要评估用户影响。`,
      status,
      severity: severities[index % severities.length],
      serviceId: services[index % services.length].id,
      assigneeId: members[index % 4].id,
      reporterId: members[(index + 1) % 4].id,
      teamIds: [teams[index % teams.length].id],
      changeIds: index % 3 === 0 ? [changes[index % changes.length].id] : [],
      tagIds: index % 2 === 0 ? ['latency'] : ['capacity'],
      createdAt: created,
      startedAt: created,
      resolvedAt: status === 'resolved' || status === 'archived' ? iso(-Math.floor(index * 0.5), 18) : undefined,
      updatedAt: iso(-index * 0.4, 16),
      responseMinutes: 8 + index * 3,
      restoreMinutes: 40 + index * 11,
      impactedUsers: 120 + index * 430,
      timeline: [
        { id: `${id}-tl-${index}-1`, at: created, actor: '监控系统', kind: 'status', text: '创建事件并进入待确认。' },
        ...(comments.length ? [{ id: `${id}-tl-${index}-2`, at: created, actor: '赵晴', kind: 'comment' as const, text: comments[0].text }] : [])
      ],
      comments,
      attachments: index % 7 === 0 ? [{ id: `${id}-at-${index}`, name: 'latency-dashboard.png', size: '820 KB', progress: 100, status: 'done' }] : [],
      relatedAlertIds: [`${id}-al-${index + 1}`, `${id}-al-${index + 2}`],
      pinned: index === 1
    }
  })

  const inbox: InboxItem[] = incidents.slice(0, 14).map((incident, index) => ({
    id: `${id}-ib-${index + 1}`,
    key: `IB-${301 + index}`,
    title: index % 3 === 0 ? `${incident.key} 需要确认` : `${incident.key} 已分派给你`,
    type: index % 3 === 0 ? 'alert' : index % 3 === 1 ? 'assignment' : 'approval',
    severity: incident.severity,
    source: index % 2 ? 'Cloud Monitor' : 'Delivery Pipeline',
    assigneeId: members[index % 4].id,
    createdAt: iso(-index * 0.3, 10),
    status: index % 4 === 0 ? 'read' : index % 7 === 0 ? 'closed' : 'unread',
    incidentId: incident.id
  }))

  const shifts: Shift[] = [
    { id: `${id}-sh-1`, teamId: teams[0].id, memberId: members[0].id, start: iso(-1, 9), end: iso(0, 9), note: '工作日早班', handoverId: `${id}-m2` },
    { id: `${id}-sh-2`, teamId: teams[0].id, memberId: members[2].id, start: iso(0, 9), end: iso(1, 9), note: '覆盖线上值班' },
    { id: `${id}-sh-3`, teamId: teams[1].id, memberId: members[1].id, start: iso(2, 10), end: iso(3, 10), note: '发布值守' },
    { id: `${id}-sh-4`, teamId: teams[2].id, memberId: members[3].id, start: iso(5, 18), end: iso(6, 9), note: '夜间响应' }
  ]

  return {
    workspace: { id, name, slug, description: `${name} 的软件交付与运维事件协作工作区`, timezone: 'Asia/Shanghai', defaultStatus: 'pending' },
    members, teams, incidents, inbox, services, changes, shifts,
    rules: [
      { id: `${id}-nr-1`, name: 'SEV1 立即升级', trigger: 'incident.created', severities: ['sev1'], audience: `${id}-team-1`, channel: 'sms', quietHours: '关闭', enabled: true },
      { id: `${id}-nr-2`, name: '发布失败通知', trigger: 'change.failed', severities: ['sev2', 'sev3'], audience: `${id}-team-2`, channel: 'webhook', quietHours: '22:00-08:00', enabled: true },
      { id: `${id}-nr-3`, name: '历史告警摘要', trigger: 'incident.resolved', severities: ['sev4'], audience: `${id}-team-3`, channel: 'email', quietHours: '关闭', enabled: false }
    ],
    integrations: [
      { id: `${id}-int-1`, name: 'Ops Webhook', url: 'https://hooks.example.test/ops', enabled: true },
      { id: `${id}-int-2`, name: '发布流水线', url: 'https://pipeline.example.test/hook', enabled: false }
    ],
    preference: { defaultRoute: '/events', timezone: 'Asia/Shanghai', notifications: true, shortcuts: true }
  }
}

function serviceNameFor(index: number) {
  return ['API Gateway', 'Delivery Pipeline', 'Incident Core', 'Metrics Store', 'Web Frontend'][index % 5]
}

export function createSeed(): Record<string, WorkspaceData> {
  const apollo = makeWorkspace('apollo', 'Apollo 生产', 'apollo-prod', 'APL', ['API Gateway', 'Delivery Pipeline', 'Incident Core', 'Metrics Store', 'Web Frontend'])
  const nova = makeWorkspace('nova', 'Nova 研发', 'nova-dev', 'NVA', ['Build Service', 'Artifact Store', 'Deploy Agent', 'Test Grid', 'Developer Portal'])
  return { [apollo.workspace.id]: apollo, [nova.workspace.id]: nova }
}
