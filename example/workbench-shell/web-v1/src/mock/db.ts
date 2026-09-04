import type {
  Attachment,
  ChangeRecord,
  HealthCheck,
  InboxItem,
  Incident,
  IncidentStatus,
  Integration,
  Member,
  NotificationRule,
  OncallShift,
  Service,
  Team,
  TimelineEvent,
  Workspace,
} from "@/types/domain"

const NOW = new Date("2026-09-04T12:00:00.000Z")

function iso(offsetHours: number) {
  return new Date(NOW.getTime() + offsetHours * 3600_000).toISOString()
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export const CURRENT_USER_ID = "mem-lin"

const workspaces: Workspace[] = [
  {
    id: "ws-alpha",
    name: "交付平台组",
    description: "平台交付与线上事件协作",
    timezone: "Asia/Shanghai",
    defaultIncidentStatus: "pending-confirm",
  },
  {
    id: "ws-beta",
    name: "边缘服务组",
    description: "边缘节点与网关运维",
    timezone: "UTC",
    defaultIncidentStatus: "in-progress",
  },
]

const members: Member[] = [
  { id: "mem-lin", workspaceId: "ws-alpha", name: "林晓", email: "lin.xiao@example.test", role: "owner", teamIds: ["team-plat", "team-sre"], status: "active", timezone: "Asia/Shanghai" },
  { id: "mem-chen", workspaceId: "ws-alpha", name: "陈可", email: "chen.ke@example.test", role: "admin", teamIds: ["team-sre"], status: "active", timezone: "Asia/Shanghai" },
  { id: "mem-zhao", workspaceId: "ws-alpha", name: "赵衡", email: "zhao.heng@example.test", role: "member", teamIds: ["team-app"], status: "active", timezone: "Asia/Shanghai" },
  { id: "mem-wu", workspaceId: "ws-alpha", name: "吴岚", email: "wu.lan@example.test", role: "member", teamIds: ["team-app"], status: "paused", timezone: "Asia/Shanghai" },
  { id: "mem-sun", workspaceId: "ws-beta", name: "孙牧", email: "sun.mu@example.test", role: "owner", teamIds: ["team-edge"], status: "active", timezone: "UTC" },
  { id: "mem-zhou", workspaceId: "ws-beta", name: "周宁", email: "zhou.ning@example.test", role: "admin", teamIds: ["team-edge"], status: "active", timezone: "UTC" },
  { id: "mem-gao", workspaceId: "ws-beta", name: "高琪", email: "gao.qi@example.test", role: "member", teamIds: ["team-net"], status: "active", timezone: "UTC" },
  { id: "mem-he", workspaceId: "ws-beta", name: "何洲", email: "he.zhou@example.test", role: "viewer", teamIds: ["team-net"], status: "active", timezone: "UTC" },
]

const teams: Team[] = [
  { id: "team-plat", workspaceId: "ws-alpha", name: "平台组", description: "控制面与工作台", memberIds: ["mem-lin"], serviceIds: ["svc-gateway", "svc-auth"], status: "active" },
  { id: "team-sre", workspaceId: "ws-alpha", name: "SRE", description: "值班与可靠性", memberIds: ["mem-lin", "mem-chen"], serviceIds: ["svc-metrics"], status: "active" },
  { id: "team-app", workspaceId: "ws-alpha", name: "应用组", description: "业务交付", memberIds: ["mem-zhao", "mem-wu"], serviceIds: ["svc-checkout"], status: "active" },
  { id: "team-edge", workspaceId: "ws-beta", name: "边缘组", description: "边缘节点", memberIds: ["mem-sun", "mem-zhou"], serviceIds: ["svc-edge"], status: "active" },
  { id: "team-net", workspaceId: "ws-beta", name: "网络组", description: "流量调度", memberIds: ["mem-gao", "mem-he"], serviceIds: ["svc-cdn"], status: "active" },
]

const services: Service[] = [
  { id: "svc-gateway", workspaceId: "ws-alpha", name: "API Gateway", slug: "api-gateway", description: "南北向流量入口", teamId: "team-plat", ownerId: "mem-lin", environment: "prod", health: "degraded", repoUrl: "https://example.test/repo/gateway", docsUrl: "https://example.test/docs/gateway", dependsOn: ["svc-auth"], alertRules: "5xx > 2%", status: "active", recentIncidentCount: 4, lastChangeAt: iso(-8), updatedAt: iso(-1) },
  { id: "svc-auth", workspaceId: "ws-alpha", name: "Auth", slug: "auth", description: "身份与会话", teamId: "team-plat", ownerId: "mem-chen", environment: "prod", health: "healthy", repoUrl: "https://example.test/repo/auth", docsUrl: "https://example.test/docs/auth", dependsOn: [], alertRules: "login fail > 10/min", status: "active", recentIncidentCount: 1, lastChangeAt: iso(-20), updatedAt: iso(-6) },
  { id: "svc-metrics", workspaceId: "ws-alpha", name: "Metrics", slug: "metrics", description: "指标采集", teamId: "team-sre", ownerId: "mem-chen", environment: "prod", health: "healthy", repoUrl: "https://example.test/repo/metrics", docsUrl: "https://example.test/docs/metrics", dependsOn: ["svc-gateway"], alertRules: "scrape lag > 2m", status: "active", recentIncidentCount: 2, lastChangeAt: iso(-30), updatedAt: iso(-12) },
  { id: "svc-checkout", workspaceId: "ws-alpha", name: "Checkout", slug: "checkout", description: "结账流水", teamId: "team-app", ownerId: "mem-zhao", environment: "staging", health: "outage", repoUrl: "https://example.test/repo/checkout", docsUrl: "https://example.test/docs/checkout", dependsOn: ["svc-gateway", "svc-auth"], alertRules: "payment timeout", status: "active", recentIncidentCount: 6, lastChangeAt: iso(-2), updatedAt: iso(-0.5) },
  { id: "svc-notify", workspaceId: "ws-alpha", name: "Notify", slug: "notify", description: "通知投递", teamId: "team-app", ownerId: "mem-wu", environment: "dev", health: "unknown", repoUrl: "https://example.test/repo/notify", docsUrl: "https://example.test/docs/notify", dependsOn: [], alertRules: "queue depth", status: "disabled", recentIncidentCount: 0, lastChangeAt: iso(-80), updatedAt: iso(-40) },
  { id: "svc-edge", workspaceId: "ws-beta", name: "Edge Node", slug: "edge-node", description: "边缘计算节点", teamId: "team-edge", ownerId: "mem-sun", environment: "prod", health: "healthy", repoUrl: "https://example.test/repo/edge", docsUrl: "https://example.test/docs/edge", dependsOn: ["svc-cdn"], alertRules: "node down", status: "active", recentIncidentCount: 3, lastChangeAt: iso(-5), updatedAt: iso(-3) },
  { id: "svc-cdn", workspaceId: "ws-beta", name: "CDN", slug: "cdn", description: "内容分发", teamId: "team-net", ownerId: "mem-gao", environment: "prod", health: "degraded", repoUrl: "https://example.test/repo/cdn", docsUrl: "https://example.test/docs/cdn", dependsOn: [], alertRules: "cache miss", status: "active", recentIncidentCount: 2, lastChangeAt: iso(-14), updatedAt: iso(-4) },
  { id: "svc-dns", workspaceId: "ws-beta", name: "DNS", slug: "dns", description: "解析服务", teamId: "team-net", ownerId: "mem-he", environment: "staging", health: "healthy", repoUrl: "https://example.test/repo/dns", docsUrl: "https://example.test/docs/dns", dependsOn: [], alertRules: "nxdomain spike", status: "active", recentIncidentCount: 1, lastChangeAt: iso(-18), updatedAt: iso(-9) },
]

const changes: ChangeRecord[] = [
  { id: "chg-1", workspaceId: "ws-alpha", title: "滚动发布 gateway 1.18", serviceId: "svc-gateway", authorId: "mem-lin", failed: false, createdAt: iso(-7) },
  { id: "chg-2", workspaceId: "ws-alpha", title: "Checkout 超时参数调整", serviceId: "svc-checkout", authorId: "mem-zhao", failed: true, createdAt: iso(-3) },
  { id: "chg-3", workspaceId: "ws-alpha", title: "Auth JWKS 轮换", serviceId: "svc-auth", authorId: "mem-chen", failed: false, createdAt: iso(-22) },
  { id: "chg-4", workspaceId: "ws-beta", title: "CDN PoP 扩容", serviceId: "svc-cdn", authorId: "mem-gao", failed: true, createdAt: iso(-11) },
  { id: "chg-5", workspaceId: "ws-beta", title: "Edge 内核升级", serviceId: "svc-edge", authorId: "mem-sun", failed: false, createdAt: iso(-4) },
]

const statuses: IncidentStatus[] = ["pending-confirm", "in-progress", "waiting-external", "resolved", "archived"]
const incidents: Incident[] = []
let incidentSeq = 1040

function addIncident(partial: Omit<Incident, "id" | "number" | "commentCount" | "updatedAt"> & { updatedAt?: string; commentCount?: number }) {
  incidentSeq += 1
  const item: Incident = {
    id: `inc-${incidentSeq}`,
    number: `INC-${incidentSeq}`,
    commentCount: partial.commentCount ?? 0,
    updatedAt: partial.updatedAt ?? partial.startedAt,
    ...partial,
  }
  incidents.push(item)
  return item
}

addIncident({ workspaceId: "ws-alpha", title: "网关 5xx 升高", description: "入口集群错误率超过 4%。", status: "in-progress", severity: "critical", serviceIds: ["svc-gateway"], ownerId: "mem-lin", creatorId: "mem-chen", teamIds: ["team-plat", "team-sre"], tags: ["latency", "prod"], changeIds: ["chg-1"], startedAt: iso(-6), resolvedAt: null, pinned: true, commentCount: 3 })
addIncident({ workspaceId: "ws-alpha", title: "结账超时", description: "支付回调延迟。", status: "pending-confirm", severity: "high", serviceIds: ["svc-checkout"], ownerId: "mem-zhao", creatorId: "mem-zhao", teamIds: ["team-app"], tags: ["checkout"], changeIds: ["chg-2"], startedAt: iso(-2), resolvedAt: null, pinned: true })
addIncident({ workspaceId: "ws-alpha", title: "登录失败突增", description: "验证码服务抖动。", status: "waiting-external", severity: "medium", serviceIds: ["svc-auth"], ownerId: "mem-chen", creatorId: "mem-lin", teamIds: ["team-plat"], tags: ["auth"], changeIds: ["chg-3"], startedAt: iso(-10), resolvedAt: null, pinned: false, commentCount: 1 })
addIncident({ workspaceId: "ws-alpha", title: "指标缺口", description: "部分 scrape 失败。", status: "resolved", severity: "low", serviceIds: ["svc-metrics"], ownerId: "mem-chen", creatorId: "mem-lin", teamIds: ["team-sre"], tags: ["metrics"], changeIds: [], startedAt: iso(-28), resolvedAt: iso(-20), pinned: false })
addIncident({ workspaceId: "ws-alpha", title: "通知积压", description: "历史积压已归档。", status: "archived", severity: "low", serviceIds: ["svc-notify"], ownerId: "mem-wu", creatorId: "mem-wu", teamIds: ["team-app"], tags: ["notify"], changeIds: [], startedAt: iso(-90), resolvedAt: iso(-70), pinned: false })

for (let i = 0; i < 22; i += 1) {
  const status = statuses[i % statuses.length]
  addIncident({
    workspaceId: i % 3 === 0 ? "ws-beta" : "ws-alpha",
    title: `模拟事件 ${i + 1}`,
    description: `自动生成的运维事件 ${i + 1}`,
    status,
    severity: (["critical", "high", "medium", "low"] as const)[i % 4],
    serviceIds: i % 3 === 0 ? ["svc-edge"] : i % 2 === 0 ? ["svc-gateway"] : ["svc-checkout"],
    ownerId: i % 3 === 0 ? "mem-sun" : i % 2 === 0 ? "mem-lin" : "mem-zhao",
    creatorId: "mem-chen",
    teamIds: i % 3 === 0 ? ["team-edge"] : ["team-sre"],
    tags: i % 2 === 0 ? ["auto"] : ["nightly"],
    changeIds: [],
    startedAt: iso(-i * 3 - 1),
    resolvedAt: status === "resolved" || status === "archived" ? iso(-i * 3) : null,
    pinned: false,
    commentCount: i % 5,
  })
}

const timeline: TimelineEvent[] = [
  { id: "tl-1", incidentId: "inc-1041", kind: "status", actorId: "mem-chen", body: "创建事件并待确认", createdAt: iso(-6), mentionIds: [], deleted: false, edited: false },
  { id: "tl-2", incidentId: "inc-1041", kind: "status", actorId: "mem-lin", body: "开始处理", createdAt: iso(-5.5), mentionIds: [], deleted: false, edited: false },
  { id: "tl-3", incidentId: "inc-1041", kind: "comment", actorId: "mem-lin", body: "网关副本 3 出现连接重置，@陈可 请看上游。", createdAt: iso(-5), mentionIds: ["mem-chen"], deleted: false, edited: false },
  { id: "tl-4", incidentId: "inc-1041", kind: "comment", actorId: "mem-chen", body: "已回滚部分流量。", createdAt: iso(-4), mentionIds: [], deleted: false, edited: false },
  { id: "tl-5", incidentId: "inc-1042", kind: "status", actorId: "mem-zhao", body: "创建事件", createdAt: iso(-2), mentionIds: [], deleted: false, edited: false },
]

const attachments: Attachment[] = [
  { id: "att-1", incidentId: "inc-1041", name: "gateway-error.png", size: 182_000, status: "uploaded", createdAt: iso(-5) },
]

const inbox: InboxItem[] = []
let inboxSeq = 200
function addInbox(item: Omit<InboxItem, "id" | "number">) {
  inboxSeq += 1
  inbox.push({ id: `ib-${inboxSeq}`, number: `IB-${inboxSeq}`, ...item })
}

addInbox({ workspaceId: "ws-alpha", title: "网关错误率告警", type: "alert", severity: "critical", source: "prometheus", ownerId: "mem-lin", createdAt: iso(-1), status: "open", incidentId: "inc-1041" })
addInbox({ workspaceId: "ws-alpha", title: "分派给你：结账超时", type: "assigned", severity: "high", source: "incident", ownerId: "mem-lin", createdAt: iso(-1.5), status: "open", incidentId: "inc-1042" })
addInbox({ workspaceId: "ws-alpha", title: "请确认登录失败事件", type: "confirmation", severity: "medium", source: "pager", ownerId: "mem-lin", createdAt: iso(-3), status: "open", incidentId: "inc-1043" })

for (let i = 0; i < 30; i += 1) {
  addInbox({
    workspaceId: i % 4 === 0 ? "ws-beta" : "ws-alpha",
    title: `告警事项 ${i + 1}`,
    type: (["alert", "assigned", "confirmation"] as const)[i % 3],
    severity: (["critical", "high", "medium", "low"] as const)[i % 4],
    source: i % 2 === 0 ? "prometheus" : "uptime",
    ownerId: i % 4 === 0 ? "mem-sun" : i % 2 === 0 ? "mem-lin" : "mem-zhao",
    createdAt: iso(-i - 1),
    status: i % 7 === 0 ? "closed" : i % 5 === 0 ? "read" : "open",
    incidentId: i % 6 === 0 ? "inc-1041" : null,
  })
}

const shifts: OncallShift[] = [
  { id: "sh-1", workspaceId: "ws-alpha", teamId: "team-sre", memberId: "mem-lin", startAt: iso(-12), endAt: iso(12), handoffToId: "mem-chen", note: "白班" },
  { id: "sh-2", workspaceId: "ws-alpha", teamId: "team-sre", memberId: "mem-chen", startAt: iso(12), endAt: iso(36), handoffToId: "mem-lin", note: "夜班" },
  { id: "sh-3", workspaceId: "ws-alpha", teamId: "team-app", memberId: "mem-zhao", startAt: iso(-24), endAt: iso(0), handoffToId: "mem-wu", note: "应用值班" },
  { id: "sh-4", workspaceId: "ws-beta", teamId: "team-edge", memberId: "mem-sun", startAt: iso(-6), endAt: iso(18), handoffToId: "mem-zhou", note: "边缘主值班" },
]

const notificationRules: NotificationRule[] = [
  { id: "nr-1", workspaceId: "ws-alpha", name: "P1 立即通知", trigger: "incident.created", severity: "critical", target: "team-sre", channel: "in-app", quietHours: "00:00-07:00", enabled: true },
  { id: "nr-2", workspaceId: "ws-alpha", name: "结账失败邮件", trigger: "incident.updated", severity: "high", target: "mem-zhao", channel: "email", quietHours: "", enabled: true },
]

const integrations: Integration[] = [
  { id: "int-1", workspaceId: "ws-alpha", name: "状态页 Webhook", kind: "webhook", url: "https://hooks.example.test/status", enabled: true },
  { id: "int-2", workspaceId: "ws-beta", name: "值班机器人", kind: "webhook", url: "https://hooks.example.test/oncall", enabled: false },
]

const healthChecks: HealthCheck[] = [
  { id: "hc-1", serviceId: "svc-gateway", name: "HTTP /ready", status: "fail", checkedAt: iso(-0.2), detail: "upstream timeout" },
  { id: "hc-2", serviceId: "svc-auth", name: "HTTP /health", status: "pass", checkedAt: iso(-0.1), detail: "ok" },
  { id: "hc-3", serviceId: "svc-checkout", name: "payment ping", status: "fail", checkedAt: iso(-0.3), detail: "no response" },
]

export const db = {
  workspaces,
  members,
  teams,
  services,
  changes,
  incidents,
  timeline,
  attachments,
  inbox,
  shifts,
  notificationRules,
  integrations,
  healthChecks,
  nextIncident: () => {
    incidentSeq += 1
    return { id: `inc-${incidentSeq}`, number: `INC-${incidentSeq}` }
  },
  nextInbox: () => {
    inboxSeq += 1
    return { id: `ib-${inboxSeq}`, number: `IB-${inboxSeq}` }
  },
  snapshot() {
    return clone({
      workspaces,
      members,
      teams,
      services,
      changes,
      incidents,
      timeline,
      attachments,
      inbox,
      shifts,
      notificationRules,
      integrations,
      healthChecks,
    })
  },
}
