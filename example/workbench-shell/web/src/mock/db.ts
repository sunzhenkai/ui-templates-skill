import type {
  Change,
  InboxItem,
  Incident,
  Member,
  Service,
  Shift,
  Team,
  Distribution,
  TrendPoint,
  Workspace,
} from "@/types/domain";

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
const day = 24 * 60;

export const workspaces: Workspace[] = [
  { id: "ws-main", name: "Ops Lab", slug: "ops-lab" },
  { id: "ws-edge", name: "Edge Prod", slug: "edge-prod" },
];

export const teams: Team[] = [
  { id: "t-platform", name: "平台组", description: "基础设施与部署平台" },
  { id: "t-app", name: "应用组", description: "业务服务与 API" },
  { id: "t-data", name: "数据组", description: "数据管道与分析" },
];

export const members: Member[] = [
  { id: "m-ada", name: "李安琪", team: "平台组", role: "SRE Lead" },
  { id: "m-bruno", name: "王远程", team: "应用组", role: "后端工程师" },
  { id: "m-chen", name: "陈默", team: "数据组", role: "数据工程师" },
  { id: "m-dana", name: "赵一诺", team: "应用组", role: "值班经理" },
  { id: "m-eli", name: "郑楠", team: "平台组", role: "运维工程师" },
];

export const services: Service[] = [
  { id: "s-gateway", name: "api-gateway", tier: 1, owner: "m-ada", team: "平台组", env: "production", health: "healthy", uptime30d: 99.98, openIncidents: 0, description: "统一 API 网关与限流" },
  { id: "s-auth", name: "auth-service", tier: 1, owner: "m-bruno", team: "应用组", env: "production", health: "degraded", uptime30d: 99.42, openIncidents: 1, description: "认证与会话管理" },
  { id: "s-pay", name: "payment-svc", tier: 1, owner: "m-dana", team: "应用组", env: "production", health: "healthy", uptime30d: 99.95, openIncidents: 0, description: "支付与对账" },
  { id: "s-search", name: "search-svc", tier: 2, owner: "m-chen", team: "数据组", env: "production", health: "healthy", uptime30d: 99.87, openIncidents: 0, description: "全文检索与聚合" },
  { id: "s-etl", name: "etl-worker", tier: 2, owner: "m-chen", team: "数据组", env: "production", health: "down", uptime30d: 97.31, openIncidents: 1, description: "离线数据管道" },
  { id: "s-cdn", name: "cdn-edge", tier: 3, owner: "m-eli", team: "平台组", env: "production", health: "healthy", uptime30d: 99.99, openIncidents: 0, description: "静态资源分发" },
  { id: "s-notify", name: "notify-svc", tier: 3, owner: "m-bruno", team: "应用组", env: "staging", health: "healthy", uptime30d: 99.5, openIncidents: 0, description: "站内信与推送" },
  { id: "s-meta", name: "meta-store", tier: 2, owner: "m-ada", team: "平台组", env: "staging", health: "healthy", uptime30d: 99.9, openIncidents: 0, description: "元数据存储" },
];

export const changes: Change[] = [
  { id: "ch-1042", title: "auth-service 会话过期时间调整", service: "auth-service", author: "m-bruno", state: "in-progress", createdAt: ago(180) },
  { id: "ch-1041", title: "etl-worker 批处理窗口扩容", service: "etl-worker", author: "m-chen", state: "pending", createdAt: ago(95) },
  { id: "ch-1040", title: "api-gateway 限流规则更新", service: "api-gateway", author: "m-ada", state: "done", createdAt: ago(60 * 26) },
  { id: "ch-1039", title: "search-svc 索引重建", service: "search-svc", author: "m-chen", state: "failed", createdAt: ago(60 * 40) },
];

export const incidents: Incident[] = [
  {
    id: "in-1001", number: "INC-1001", title: "etl-worker 队列积压导致报表延迟", severity: "sev2", status: "investigating",
    service: "etl-worker", assignee: "m-chen", teams: ["数据组"], createdAt: ago(42), updatedAt: ago(6),
    description: "上游批量任务重试风暴，队列积压 120k+，T+1 报表产出延迟约 90 分钟。",
    tags: ["数据", "容量"], relatedChange: "ch-1041", pinned: true, attachments: [], comments: [
      { id: "c-1", author: "m-chen", body: "已定位到消费者重试逻辑，准备扩容到 12 副本。", createdAt: ago(30) },
      { id: "c-2", author: "m-ada", body: "报表延迟会同步给业务方，先保住核心管道。", createdAt: ago(12) },
    ],
  },
  {
    id: "in-1002", number: "INC-1002", title: "auth-service 登录成功率下降至 92%", severity: "sev1", status: "acknowledged",
    service: "auth-service", assignee: "m-bruno", teams: ["应用组"], createdAt: ago(25), updatedAt: ago(10),
    description: "会话存储连接池耗尽，登录与 token 刷新失败率升高，与 ch-1042 变更时间吻合。",
    tags: ["认证", "容量"], relatedChange: "ch-1042", pinned: true, attachments: [], comments: [
      { id: "c-3", author: "m-dana", body: "已确认，回滚窗口待定。", createdAt: ago(9) },
    ],
  },
  {
    id: "in-1003", number: "INC-1003", title: "api-gateway 少量 504（边缘节点）", severity: "sev3", status: "triggered",
    service: "api-gateway", assignee: null, teams: ["平台组"], createdAt: ago(8), updatedAt: ago(8),
    description: "华北边缘节点上游超时，占比 0.4%，持续观察。",
    tags: ["网络"], relatedChange: null, pinned: false, attachments: [], comments: [],
  },
  {
    id: "in-1004", number: "INC-1004", title: "search-svc 查询 P99 升高", severity: "sev3", status: "mitigated",
    service: "search-svc", assignee: "m-chen", teams: ["数据组"], createdAt: ago(60 * 20), updatedAt: ago(60 * 4),
    description: "索引膨胀导致长尾查询变慢，已切换查询路由。",
    tags: ["性能"], relatedChange: "ch-1039", pinned: false, attachments: [], comments: [],
  },
  {
    id: "in-1005", number: "INC-1005", title: "notify-svc 推送重复", severity: "sev4", status: "resolved",
    service: "notify-svc", assignee: "m-bruno", teams: ["应用组"], createdAt: ago(60 * 50), updatedAt: ago(60 * 30),
    description: "客户端重试幂等键缺失导致重复推送，已修复并验证。",
    tags: ["客户端"], relatedChange: null, pinned: false, attachments: [], comments: [],
  },
  {
    id: "in-1006", number: "INC-1006", title: "cdn-edge 缓存命中率下降", severity: "sev4", status: "resolved",
    service: "cdn-edge", assignee: "m-eli", teams: ["平台组"], createdAt: ago(60 * 72), updatedAt: ago(60 * 66),
    description: "缓存键规则变更引发命中率下降 3%，已回滚配置。",
    tags: ["网络", "配置"], relatedChange: null, pinned: false, attachments: [], comments: [],
  },
];

export const inbox: InboxItem[] = [
  { id: "n-1", kind: "alert", title: "SEV-1 告警：auth-service 登录成功率下降", detail: "连续 5 分钟成功率 < 95%，请立即确认。", incident: "in-1002", severity: "sev1", source: "监控", assignee: "m-bruno", createdAt: ago(24), status: "open" },
  { id: "n-2", kind: "assignment", title: "事件分派：INC-1001 etl-worker 队列积压", detail: "值班经理将事件分派给你。", incident: "in-1001", severity: "sev2", source: "值班", assignee: "m-chen", createdAt: ago(40), status: "open" },
  { id: "n-3", kind: "confirmation", title: "变更确认：etl-worker 批处理窗口扩容", detail: "ch-1041 待你确认执行窗口。", incident: null, severity: null, source: "变更", assignee: "m-dana", createdAt: ago(90), status: "open" },
  { id: "n-4", kind: "alert", title: "SEV-3 告警：api-gateway 边缘 504", detail: "华北边缘节点上游超时。", incident: "in-1003", severity: "sev3", source: "监控", assignee: "m-eli", createdAt: ago(7), status: "open" },
  { id: "n-5", kind: "assignment", title: "事件分派：INC-1004 search-svc 查询 P99", detail: "事件已缓解，请做复盘确认。", incident: "in-1004", severity: "sev3", source: "值班", assignee: "m-chen", createdAt: ago(60 * 5), status: "done" },
];

export const shifts: Shift[] = [
  { id: "sh-1", team: "平台组", member: "m-ada", date: isoDate(0), slot: "day" },
  { id: "sh-2", team: "平台组", member: "m-eli", date: isoDate(0), slot: "night" },
  { id: "sh-3", team: "应用组", member: "m-bruno", date: isoDate(1), slot: "day" },
  { id: "sh-4", team: "应用组", member: "m-dana", date: isoDate(2), slot: "night" },
  { id: "sh-5", team: "数据组", member: "m-chen", date: isoDate(-1), slot: "day" },
];

function isoDate(offsetDays: number): string {
  const d = new Date(now + offsetDays * day * 60_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const trend: TrendPoint[] = Array.from({ length: 14 }, (_, i) => ({
  label: `${i + 1}`,
  created: 3 + ((i * 7) % 9),
  resolved: 2 + ((i * 5) % 8),
}));

export const severityDist: Distribution[] = [
  { name: "SEV-1", value: 2 },
  { name: "SEV-2", value: 5 },
  { name: "SEV-3", value: 12 },
  { name: "SEV-4", value: 9 },
];

export const mttrRanking: { name: string; hours: number }[] = [
  { name: "etl-worker", hours: 6.2 },
  { name: "auth-service", hours: 4.8 },
  { name: "search-svc", hours: 3.5 },
  { name: "api-gateway", hours: 2.1 },
  { name: "notify-svc", hours: 1.4 },
];
