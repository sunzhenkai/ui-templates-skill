import type {
  ChangeRecord,
  Comment,
  Incident,
  InboxItem,
  Integration,
  Member,
  NotificationRule,
  OnCallShift,
  Service,
  Team,
  Workspace,
} from "@/types"

const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 60 * 60 * 1000).toISOString()
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

export const workspaces: Workspace[] = [
  {
    id: "ws-1",
    name: "Apollo 生产运维",
    slug: "apollo-prod",
    description: "核心生产环境运维工作区",
    timezone: "Asia/Shanghai",
    defaultIncidentStatus: "open",
    ownerId: "m-1",
  },
  {
    id: "ws-2",
    name: "Hermes 交付团队",
    slug: "hermes-delivery",
    description: "交付与发布管理工作区",
    timezone: "UTC",
    defaultIncidentStatus: "open",
    ownerId: "m-1",
  },
]

export const teams: Team[] = [
  { id: "t-1", workspaceId: "ws-1", name: "SRE", color: "#ef4444", memberIds: ["m-1", "m-2", "m-3"], serviceIds: ["s-1", "s-2", "s-3"], active: true },
  { id: "t-2", workspaceId: "ws-1", name: "平台开发", color: "#3b82f6", memberIds: ["m-4", "m-5"], serviceIds: ["s-3", "s-4"], active: true },
  { id: "t-3", workspaceId: "ws-1", name: "数据工程", color: "#22c55e", memberIds: ["m-6"], serviceIds: ["s-5"], active: true },
  { id: "t-4", workspaceId: "ws-2", name: "发布工程", color: "#f59e0b", memberIds: ["m-1", "m-4"], serviceIds: ["s-6"], active: true },
]

export const members: Member[] = [
  { id: "m-1", workspaceId: "ws-1", name: "林一", email: "lin1@example.com", role: "owner", teamIds: ["t-1", "t-4"], active: true },
  { id: "m-2", workspaceId: "ws-1", name: "陈二", email: "chen2@example.com", role: "admin", teamIds: ["t-1"], active: true },
  { id: "m-3", workspaceId: "ws-1", name: "张三", email: "zhang3@example.com", role: "engineer", teamIds: ["t-1"], active: true },
  { id: "m-4", workspaceId: "ws-1", name: "李四", email: "li4@example.com", role: "engineer", teamIds: ["t-2", "t-4"], active: true },
  { id: "m-5", workspaceId: "ws-1", name: "王五", email: "wang5@example.com", role: "engineer", teamIds: ["t-2"], active: false },
  { id: "m-6", workspaceId: "ws-1", name: "赵六", email: "zhao6@example.com", role: "viewer", teamIds: ["t-3"], active: true },
  { id: "m-7", workspaceId: "ws-2", name: "孙七", email: "sun7@example.com", role: "admin", teamIds: ["t-4"], active: true },
]

export const services: Service[] = [
  { id: "s-1", workspaceId: "ws-1", name: "api-gateway", description: "统一 API 网关", status: "healthy", teamIds: ["t-1"], incidentCount: 2, slo: 99.99, ownerIds: ["m-1"] },
  { id: "s-2", workspaceId: "ws-1", name: "order-service", description: "订单核心服务", status: "degraded", teamIds: ["t-1"], incidentCount: 5, slo: 99.95, ownerIds: ["m-2"] },
  { id: "s-3", workspaceId: "ws-1", name: "user-service", description: "用户中心服务", status: "healthy", teamIds: ["t-1", "t-2"], incidentCount: 1, slo: 99.9, ownerIds: ["m-3", "m-4"] },
  { id: "s-4", workspaceId: "ws-1", name: "payment-service", description: "支付服务", status: "maintenance", teamIds: ["t-2"], incidentCount: 0, slo: 99.99, ownerIds: ["m-4"] },
  { id: "s-5", workspaceId: "ws-1", name: "data-pipeline", description: "数据管道", status: "healthy", teamIds: ["t-3"], incidentCount: 3, slo: 99.5, ownerIds: ["m-6"] },
  { id: "s-6", workspaceId: "ws-2", name: "deploy-bot", description: "发布机器人", status: "healthy", teamIds: ["t-4"], incidentCount: 0, slo: 99.9, ownerIds: ["m-1"] },
]

export const comments: Comment[] = [
  { id: "c-1", incidentId: "i-1", authorId: "m-2", content: "已确认告警，正在定位根因。", createdAt: hoursAgo(2) },
  { id: "c-2", incidentId: "i-1", authorId: "m-3", content: "看起来是数据库连接池耗尽。", createdAt: hoursAgo(1) },
  { id: "c-3", incidentId: "i-2", authorId: "m-4", content: "等待监控恢复。", createdAt: hoursAgo(5) },
]

export const incidents: Incident[] = [
  {
    id: "i-1",
    workspaceId: "ws-1",
    number: "INC-2024-001",
    title: "订单服务响应时间飙升",
    description: "P99 延迟从 120ms 上升至 2s，影响下单链路。",
    severity: "critical",
    status: "investigating",
    serviceIds: ["s-2"],
    ownerId: "m-2",
    participantIds: ["m-2", "m-3"],
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(1),
    startedAt: hoursAgo(3),
    tags: ["latency", "database"],
    changeIds: ["ch-1"],
    comments: [comments[0], comments[1]],
    pinned: true,
  },
  {
    id: "i-2",
    workspaceId: "ws-1",
    number: "INC-2024-002",
    title: "用户服务偶发 500",
    description: "登录接口间歇性返回 500，错误率约 3%。",
    severity: "high",
    status: "acknowledged",
    serviceIds: ["s-3"],
    ownerId: "m-3",
    participantIds: ["m-3", "m-4"],
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(5),
    startedAt: hoursAgo(8),
    tags: ["auth", "error-rate"],
    changeIds: ["ch-2"],
    comments: [comments[2]],
    pinned: false,
  },
  {
    id: "i-3",
    workspaceId: "ws-1",
    number: "INC-2024-003",
    title: "数据管道延迟",
    description: "实时报表延迟 15 分钟。",
    severity: "medium",
    status: "open",
    serviceIds: ["s-5"],
    ownerId: "m-6",
    participantIds: ["m-6"],
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(12),
    startedAt: daysAgo(1),
    tags: ["pipeline", "reporting"],
    changeIds: [],
    comments: [],
    pinned: false,
  },
  {
    id: "i-4",
    workspaceId: "ws-1",
    number: "INC-2024-004",
    title: "API 网关证书即将过期",
    description: "TLS 证书 7 天后过期，需要轮换。",
    severity: "low",
    status: "resolved",
    serviceIds: ["s-1"],
    ownerId: "m-1",
    participantIds: ["m-1"],
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(6),
    startedAt: daysAgo(2),
    tags: ["certificate", "security"],
    changeIds: ["ch-3"],
    comments: [],
    pinned: false,
  },
  {
    id: "i-5",
    workspaceId: "ws-2",
    number: "INC-2024-005",
    title: "发布流水线阻塞",
    description: "集成测试环境无法部署。",
    severity: "high",
    status: "investigating",
    serviceIds: ["s-6"],
    ownerId: "m-7",
    participantIds: ["m-7", "m-1"],
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(2),
    startedAt: hoursAgo(6),
    tags: ["deploy", "ci"],
    changeIds: [],
    comments: [],
    pinned: true,
  },
]

export const inboxItems: InboxItem[] = [
  { id: "n-1", workspaceId: "ws-1", type: "alert", title: "订单服务 P99 延迟 > 2s", severity: "critical", source: "Datadog", ownerId: "m-2", status: "pending", createdAt: hoursAgo(3), incidentId: "i-1", read: false },
  { id: "n-2", workspaceId: "ws-1", type: "incident", title: "你被指派处理 INC-2024-002", severity: "high", source: "系统", ownerId: "m-3", status: "pending", createdAt: hoursAgo(8), incidentId: "i-2", read: false },
  { id: "n-3", workspaceId: "ws-1", type: "task", title: "确认 TLS 证书轮换计划", severity: "low", source: "Jira", ownerId: "m-1", status: "pending", createdAt: daysAgo(2), incidentId: "i-4", read: false },
  { id: "n-4", workspaceId: "ws-1", type: "approval", title: "批准支付服务维护窗口", severity: "medium", source: "Calendar", ownerId: "m-4", status: "pending", createdAt: hoursAgo(12), read: false },
  { id: "n-5", workspaceId: "ws-2", type: "incident", title: "发布流水线阻塞", severity: "high", source: "GitLab CI", ownerId: "m-7", status: "pending", createdAt: hoursAgo(6), incidentId: "i-5", read: false },
]

export const changeRecords: ChangeRecord[] = [
  { id: "ch-1", workspaceId: "ws-1", title: "v2.3.1 订单服务优化", type: "fix", serviceIds: ["s-2"], authorId: "m-4", deployedAt: daysAgo(1), status: "success" },
  { id: "ch-2", workspaceId: "ws-1", title: "用户服务鉴权重构", type: "feature", serviceIds: ["s-3"], authorId: "m-5", deployedAt: daysAgo(2), status: "success" },
  { id: "ch-3", workspaceId: "ws-1", title: "网关证书自动轮换", type: "config", serviceIds: ["s-1"], authorId: "m-1", deployedAt: daysAgo(3), status: "success" },
  { id: "ch-4", workspaceId: "ws-2", title: "deploy-bot 配置更新", type: "hotfix", serviceIds: ["s-6"], authorId: "m-7", deployedAt: hoursAgo(4), status: "failure" },
]

export const onCallShifts: OnCallShift[] = [
  { id: "shift-1", workspaceId: "ws-1", memberId: "m-1", startAt: daysAgo(1), endAt: hoursAgo(4), status: "completed", note: "平稳" },
  { id: "shift-2", workspaceId: "ws-1", memberId: "m-2", startAt: hoursAgo(4), endAt: hoursAgo(28), status: "active", note: "当前值班主责" },
  { id: "shift-3", workspaceId: "ws-1", memberId: "m-3", startAt: hoursAgo(28), endAt: hoursAgo(52), status: "scheduled", note: "" },
  { id: "shift-4", workspaceId: "ws-1", memberId: "m-4", startAt: hoursAgo(52), endAt: hoursAgo(76), status: "scheduled", note: "" },
  { id: "shift-5", workspaceId: "ws-2", memberId: "m-7", startAt: hoursAgo(2), endAt: hoursAgo(26), status: "active", note: "" },
]

export const notificationRules: NotificationRule[] = [
  { id: "nr-1", workspaceId: "ws-1", name: "严重事件通知", event: "incident.created", severity: ["critical", "high"], recipients: ["t-1"], channels: ["email", "slack"], muteMinutes: 5, active: true },
  { id: "nr-2", workspaceId: "ws-1", name: "低优先级静默", event: "incident.created", severity: ["low"], recipients: ["m-1"], channels: ["email"], muteMinutes: 60, active: false },
]

export const integrations: Integration[] = [
  { id: "int-1", workspaceId: "ws-1", name: "生产告警 Webhook", type: "webhook", url: "https://hooks.example.com/prod", active: true, lastTested: "success" },
  { id: "int-2", workspaceId: "ws-1", name: "SRE Slack", type: "slack", active: true, lastTested: "success" },
  { id: "int-3", workspaceId: "ws-1", name: "PagerDuty", type: "pagerduty", active: false, lastTested: "failure" },
  { id: "int-4", workspaceId: "ws-2", name: "GitLab CI", type: "webhook", active: true },
]

export const initialData = {
  workspaces,
  teams,
  members,
  services,
  incidents,
  inboxItems,
  changeRecords,
  onCallShifts,
  notificationRules,
  integrations,
}
