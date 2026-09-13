/**
 * 本地 mock 数据与服务层：唯一数据入口。Promise + 模拟延迟 + 可触发失败（lib.mockRequest）。
 */
import { mockRequest, nextId } from "../lib";

export type Severity = "sev1" | "sev2" | "sev3" | "sev4";
export type IncidentStatus = "triage" | "processing" | "waiting" | "resolved" | "archived";
export type Health = "healthy" | "degraded" | "down" | "disabled";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  timezone: string;
  defaultStatus: IncidentStatus;
}
export interface Team {
  id: string;
  name: string;
  workspaceId: string;
  serviceIds: string[];
  memberIds: string[];
}
export interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
  teamId: string | null;
  status: "active" | "paused";
}
export interface Service {
  id: string;
  key: string;
  name: string;
  description: string;
  teamId: string;
  ownerId: string;
  env: "prod" | "staging" | "dev";
  health: Health;
  repoUrl: string;
  docUrl: string;
  dependsOn: string[];
  recentIncidents: number;
  lastChangeAt: string;
  updatedAt: string;
  checks: { at: string; ok: boolean; latencyMs: number }[];
}
export interface ChangeRecord {
  id: string;
  title: string;
  serviceId: string;
  status: "done" | "failed" | "in-progress";
  at: string;
}
export interface Incident {
  id: string;
  key: string;
  title: string;
  status: IncidentStatus;
  severity: Severity;
  serviceId: string;
  assigneeId: string | null;
  teamId: string;
  creatorId: string;
  tags: string[];
  changeIds: string[];
  startedAt: string;
  resolvedAt: string | null;
  updatedAt: string;
  impact: string;
  timeline: TimelineEntry[];
}
export interface TimelineEntry {
  id: string;
  kind: "status" | "comment" | "field" | "attachment";
  authorId: string;
  at: string;
  text: string;
  from?: string;
  to?: string;
}
export interface InboxItem {
  id: string;
  kind: "alert" | "assignment" | "confirm";
  severity: Severity | "none";
  source: string;
  title: string;
  assigneeId: string;
  createdAt: string;
  status: "unread" | "read" | "done";
  incidentId?: string;
}
export interface Shift {
  id: string;
  teamId: string;
  memberId: string;
  start: string;
  end: string;
  handoffId: string | null;
  note: string;
}
export interface NotificationRule {
  id: string;
  name: string;
  trigger: string;
  severities: Severity[];
  channel: "email" | "webhook" | "sms";
  targetId: string;
  muted: boolean;
  enabled: boolean;
}
export interface Integration {
  id: string;
  name: string;
  type: "webhook";
  url: string;
  enabled: boolean;
}

const now = new Date("2026-09-13T10:00:00+08:00").getTime();
const daysAgo = (n: number, h = 9) => new Date(now - n * 86400000 + h * 3600000).toISOString();

export const workspaces: Workspace[] = [
  { id: "ws-ops", name: "平台运维中心", slug: "ops", description: "核心平台交付与运维", timezone: "Asia/Shanghai", defaultStatus: "triage" },
  { id: "ws-edge", name: "边缘业务组", slug: "edge", description: "边缘节点与接入服务", timezone: "Asia/Shanghai", defaultStatus: "triage" },
];

export const teams: Team[] = [
  { id: "team-sre", name: "SRE 组", workspaceId: "ws-ops", serviceIds: ["svc-gateway", "svc-api", "svc-db"], memberIds: ["m-1", "m-2", "m-3"] },
  { id: "team-delivery", name: "交付组", workspaceId: "ws-ops", serviceIds: ["svc-cd", "svc-runner"], memberIds: ["m-4", "m-1"] },
  { id: "team-edge", name: "边缘接入组", workspaceId: "ws-edge", serviceIds: ["svc-edge", "svc-dns"], memberIds: ["m-5", "m-6"] },
  { id: "team-data", name: "数据组", workspaceId: "ws-edge", serviceIds: ["svc-queue"], memberIds: ["m-7"] },
];

export const members: Member[] = [
  { id: "m-1", name: "陈曦", email: "chenxi@example.com", role: "admin", teamId: "team-sre", status: "active" },
  { id: "m-2", name: "李慕白", email: "limubai@example.com", role: "member", teamId: "team-sre", status: "active" },
  { id: "m-3", name: "王一舟", email: "wangyizhou@example.com", role: "member", teamId: "team-sre", status: "active" },
  { id: "m-4", name: "赵岚", email: "zhaolan@example.com", role: "member", teamId: "team-delivery", status: "active" },
  { id: "m-5", name: "周野", email: "zhouye@example.com", role: "admin", teamId: "team-edge", status: "active" },
  { id: "m-6", name: "林晚", email: "linwan@example.com", role: "member", teamId: "team-edge", status: "paused" },
  { id: "m-7", name: "何青", email: "heqing@example.com", role: "member", teamId: "team-data", status: "active" },
];

export const changes: ChangeRecord[] = [
  { id: "chg-201", title: "网关灰度发布 v42", serviceId: "svc-gateway", status: "done", at: daysAgo(2) },
  { id: "chg-202", title: "API 限流策略调整", serviceId: "svc-api", status: "failed", at: daysAgo(4) },
  { id: "chg-203", title: "数据库主从切换演练", serviceId: "svc-db", status: "done", at: daysAgo(6) },
  { id: "chg-204", title: "CD 流水线升级", serviceId: "svc-cd", status: "in-progress", at: daysAgo(1) },
  { id: "chg-205", title: "边缘节点扩容", serviceId: "svc-edge", status: "done", at: daysAgo(3) },
  { id: "chg-206", title: "DNS 解析切换", serviceId: "svc-dns", status: "failed", at: daysAgo(8) },
];

function svc(
  id: string, key: string, name: string, teamId: string, ownerId: string, env: Service["env"],
  health: Health, dependsOn: string[], recentIncidents: number, lastChangeDays: number,
  description: string, checksOk = true,
): Service {
  return {
    id, key, name, description, teamId, ownerId, env, health,
    repoUrl: `https://git.example.com/ops/${key}`,
    docUrl: `https://docs.example.com/${key}`,
    dependsOn, recentIncidents, lastChangeAt: daysAgo(lastChangeDays),
    updatedAt: daysAgo(Math.min(lastChangeDays, 1)),
    checks: Array.from({ length: 6 }, (_, i) => ({ at: daysAgo(i, 8 + i), ok: checksOk || i % 3 !== 0, latencyMs: 40 + i * 17 })),
  };
}

export const services: Service[] = [
  svc("svc-gateway", "api-gateway", "接入网关", "team-sre", "m-1", "prod", "healthy", ["svc-api"], 2, 2, "南北向流量入口", true),
  svc("svc-api", "core-api", "核心 API", "team-sre", "m-2", "prod", "degraded", ["svc-db"], 3, 4, "业务主接口服务", false),
  svc("svc-db", "main-db", "主数据库", "team-sre", "m-3", "prod", "healthy", [], 1, 6, "PostgreSQL 主集群"),
  svc("svc-cd", "delivery-cd", "持续交付", "team-delivery", "m-4", "prod", "healthy", ["svc-runner"], 1, 1, "发布流水线"),
  svc("svc-runner", "build-runner", "构建执行器", "team-delivery", "m-4", "staging", "healthy", [], 0, 5, "CI 构建节点"),
  svc("svc-edge", "edge-proxy", "边缘代理", "team-edge", "m-5", "prod", "down", ["svc-dns"], 4, 3, "边缘节点接入", false),
  svc("svc-dns", "edge-dns", "边缘 DNS", "team-edge", "m-6", "prod", "healthy", [], 1, 8, "权威解析"),
  svc("svc-queue", "data-queue", "数据队列", "team-data", "m-7", "dev", "disabled", [], 0, 12, "Kafka 集群（已停用）"),
];

function tl(authorId: string, text: string, kind: TimelineEntry["kind"] = "status", from?: string, to?: string, at = daysAgo(0, 8)): TimelineEntry {
  return { id: nextId("tl"), kind, authorId, at, text, from, to };
}

function inc(
  n: number, title: string, status: IncidentStatus, severity: Severity, serviceId: string,
  assigneeId: string | null, teamId: string, startedDays: number, tags: string[], impact: string,
  resolvedDays?: number,
): Incident {
  const key = `ENG-${1200 + n}`;
  const resolvedAt = resolvedDays == null ? null : daysAgo(resolvedDays, 18);
  return {
    id: `inc-${n}`, key, title, status, severity, serviceId, assigneeId, teamId,
    creatorId: "m-1", tags, changeIds: [], startedAt: daysAgo(startedDays), resolvedAt,
    updatedAt: resolvedAt ?? daysAgo(0, 8), impact,
    timeline: [
      tl("m-1", "事件创建", "status", undefined, "triage", daysAgo(startedDays)),
      tl(assigneeId ?? "m-2", "开始处理", "status", "triage", "processing", daysAgo(startedDays, 10)),
    ],
  };
}

export const incidents: Incident[] = [
  inc(1, "网关 5xx 激增", "processing", "sev1", "svc-gateway", "m-1", "team-sre", 0, ["prod", "traffic"], "核心接口大面积失败"),
  inc(2, "API P99 超时", "waiting", "sev2", "svc-api", "m-2", "team-sre", 1, ["performance"], "下游依赖慢查询"),
  inc(3, "边缘节点失联", "triage", "sev1", "svc-edge", "m-5", "team-edge", 0, ["edge", "network"], "三个区域接入不可用"),
  inc(4, "发布流水线卡死", "processing", "sev3", "svc-cd", "m-4", "team-delivery", 2, ["ci"], "构建队列阻塞"),
  inc(5, "数据库慢查询告警", "resolved", "sev3", "svc-db", "m-3", "team-sre", 3, ["database"], "报表查询拖慢主库", 2),
  inc(6, "DNS 解析异常", "resolved", "sev2", "svc-dns", "m-6", "team-edge", 8, ["dns"], "部分域名解析失败", 7),
  inc(7, "队列积压", "triage", "sev3", "svc-queue", "m-7", "team-data", 1, ["queue"], "消费延迟升高"),
  inc(8, "构建节点磁盘告警", "waiting", "sev4", "svc-runner", "m-4", "team-delivery", 4, ["infra"], "磁盘使用率 92%"),
  inc(9, "网关证书到期", "resolved", "sev4", "svc-gateway", "m-1", "team-sre", 9, ["security"], "TLS 证书 7 天后到期", 8),
  inc(10, "API 限流误伤", "archived", "sev3", "svc-api", "m-2", "team-sre", 12, ["config"], "限流阈值配置错误", 11),
  inc(11, "边缘回源超时", "processing", "sev2", "svc-edge", "m-5", "team-edge", 5, ["edge"], "回源链路抖动"),
  inc(12, "主库主从延迟", "waiting", "sev3", "svc-db", "m-3", "team-sre", 2, ["database", "replication"], "复制延迟 40s"),
];

export const inboxItems: InboxItem[] = [
  { id: "ib-1", kind: "alert", severity: "sev1", source: "告警平台", title: "边缘节点区域失联（ap-2）", assigneeId: "m-5", createdAt: daysAgo(0, 7), status: "unread", incidentId: "inc-3" },
  { id: "ib-2", kind: "assignment", severity: "sev2", source: "分派", title: "API P99 超时已分派给你", assigneeId: "m-2", createdAt: daysAgo(0, 6), status: "unread", incidentId: "inc-2" },
  { id: "ib-3", kind: "alert", severity: "sev3", source: "告警平台", title: "队列消费延迟 > 60s", assigneeId: "m-7", createdAt: daysAgo(1, 5), status: "unread", incidentId: "inc-7" },
  { id: "ib-4", kind: "confirm", severity: "none", source: "审批", title: "网关 v42 灰度扩量确认", assigneeId: "m-1", createdAt: daysAgo(1, 3), status: "read" },
  { id: "ib-5", kind: "assignment", severity: "sev3", source: "分派", title: "数据库慢查询跟进", assigneeId: "m-3", createdAt: daysAgo(2), status: "read", incidentId: "inc-5" },
  { id: "ib-6", kind: "alert", severity: "sev4", source: "告警平台", title: "构建节点磁盘 92%", assigneeId: "m-4", createdAt: daysAgo(3), status: "done", incidentId: "inc-8" },
  { id: "ib-7", kind: "confirm", severity: "none", source: "审批", title: "DNS 切换回滚确认", assigneeId: "m-6", createdAt: daysAgo(7), status: "done" },
];

export const shifts: Shift[] = [
  { id: "sh-1", teamId: "team-sre", memberId: "m-1", start: daysAgo(0, 0), end: daysAgo(0, 12), handoffId: "m-2", note: "白班" },
  { id: "sh-2", teamId: "team-sre", memberId: "m-2", start: daysAgo(0, 12), end: daysAgo(0, 24), handoffId: "m-1", note: "夜班" },
  { id: "sh-3", teamId: "team-edge", memberId: "m-5", start: daysAgo(1, 0), end: daysAgo(1, 24), handoffId: "m-6", note: "全天" },
  { id: "sh-4", teamId: "team-delivery", memberId: "m-4", start: daysAgo(2, 0), end: daysAgo(2, 12), handoffId: null, note: "发布窗口" },
  { id: "sh-5", teamId: "team-sre", memberId: "m-3", start: daysAgo(-1, 9), end: daysAgo(-1, 21), handoffId: "m-1", note: "明日白班" },
];

export const notificationRules: NotificationRule[] = [
  { id: "nr-1", name: "Sev1 即时升级", trigger: "incident.created", severities: ["sev1"], channel: "email", targetId: "m-1", muted: false, enabled: true },
  { id: "nr-2", name: "边缘告警到值班", trigger: "alert.fired", severities: ["sev1", "sev2"], channel: "webhook", targetId: "team-edge", muted: false, enabled: true },
  { id: "nr-3", name: "日报汇总", trigger: "daily.digest", severities: ["sev3", "sev4"], channel: "email", targetId: "m-1", muted: true, enabled: false },
];

export const integrations: Integration[] = [
  { id: "int-1", name: "值班 Webhook", type: "webhook", url: "https://hook.example.com/oncall", enabled: true },
  { id: "int-2", name: "发布通知", type: "webhook", url: "https://hook.example.com/deploy", enabled: false },
];

// ---------- 可变状态（会话内一致） ----------
const db = { workspaces, teams, members, services, incidents, inboxItems, shifts, changes, notificationRules, integrations };
export type Db = typeof db;

export const api = {
  listWorkspaces: () => mockRequest("workspaces", () => [...db.workspaces]),
  listMembers: () => mockRequest("members", () => [...db.members]),
  listTeams: () => mockRequest("teams", () => [...db.teams]),
  listServices: () => mockRequest("services", () => [...db.services]),
  listIncidents: () => mockRequest("incidents", () => db.incidents.map((i) => ({ ...i, timeline: [...i.timeline], tags: [...i.tags], changeIds: [...i.changeIds] }))),
  listInbox: () => mockRequest("inbox", () => db.inboxItems.map((i) => ({ ...i }))),
  listShifts: () => mockRequest("shifts", () => db.shifts.map((s) => ({ ...s }))),
  listChanges: () => mockRequest("changes", () => db.changes.map((c) => ({ ...c }))),
  listRules: () => mockRequest("rules", () => db.notificationRules.map((r) => ({ ...r, severities: [...r.severities] }))),
  listIntegrations: () => mockRequest("integrations", () => db.integrations.map((i) => ({ ...i }))),
  getIncident: (id: string) =>
    mockRequest("incident-detail", () => {
      const found = db.incidents.find((i) => i.id === id || i.key === id) ?? null;
      return found ? { ...found, timeline: [...found.timeline], tags: [...found.tags], changeIds: [...found.changeIds] } : null;
    }),
  getService: (id: string) =>
    mockRequest("service-detail", () => {
      const found = db.services.find((s) => s.id === id || s.key === id) ?? null;
      return found ? { ...found, dependsOn: [...found.dependsOn], checks: [...found.checks] } : null;
    }),
  searchAll: (q: string) =>
    mockRequest("search", () => {
      const needle = q.trim().toLowerCase();
      if (!needle) return { incidents: [], services: [], members: [], changes: [] };
      const hit = (t: string) => t.toLowerCase().includes(needle);
      return {
        incidents: db.incidents.filter((i) => hit(i.title) || hit(i.key)).slice(0, 5),
        services: db.services.filter((s) => hit(s.name) || hit(s.key)).slice(0, 5),
        members: db.members.filter((m) => hit(m.name) || hit(m.email)).slice(0, 5),
        changes: db.changes.filter((c) => hit(c.title) || hit(c.id)).slice(0, 5),
      };
    }),
  createIncident: (input: {
    title: string; serviceId: string; severity: Severity; assigneeId: string | null;
    tags: string[]; description: string; status?: IncidentStatus;
  }) =>
    mockRequest("create-incident", () => {
      const n = db.incidents.length + 1;
      const incident = inc(
        n, input.title, input.status ?? "triage", input.severity, input.serviceId,
        input.assigneeId, db.services.find((s) => s.id === input.serviceId)?.teamId ?? "team-sre",
        0, input.tags, input.description || "（新建事件）",
      );
      db.incidents.unshift(incident);
      db.inboxItems.unshift({
        id: nextId("ib"), kind: "assignment", severity: input.severity, source: "创建事件",
        title: `新事件 ${incident.key}：${incident.title}`, assigneeId: input.assigneeId ?? "m-1",
        createdAt: new Date().toISOString(), status: "unread", incidentId: incident.id,
      });
      return incident;
    }),
  updateIncident: (id: string, patch: Partial<Incident>) =>
    mockRequest("update-incident", () => {
      const i = db.incidents.find((x) => x.id === id);
      if (!i) throw new Error("incident not found");
      Object.assign(i, patch, { updatedAt: new Date().toISOString() });
      return i;
    }),
  addComment: (id: string, authorId: string, text: string) =>
    mockRequest("add-comment", () => {
      const i = db.incidents.find((x) => x.id === id);
      if (!i) throw new Error("incident not found");
      i.timeline.push(tl(authorId, text, "comment"));
      i.updatedAt = new Date().toISOString();
      return i;
    }),
  markInbox: (ids: string[], status: InboxItem["status"]) =>
    mockRequest("mark-inbox", () => {
      for (const item of db.inboxItems) if (ids.includes(item.id)) item.status = status;
      return db.inboxItems;
    }),
  upsertService: (input: Partial<Service> & { key: string; name: string }) =>
    mockRequest("upsert-service", () => {
      const dup = db.services.find((s) => s.key === input.key && s.id !== input.id);
      if (dup) throw new Error(`服务标识 ${input.key} 已存在`);
      if (input.id) {
        const s = db.services.find((x) => x.id === input.id);
        if (!s) throw new Error("service not found");
        Object.assign(s, input, { updatedAt: new Date().toISOString() });
        return s;
      }
      const created = svc(
        nextId("svc"), input.key, input.name, input.teamId ?? "team-sre", input.ownerId ?? "m-1",
        input.env ?? "prod", input.health ?? "healthy", input.dependsOn ?? [], 0, 0, input.description ?? "",
      );
      db.services.unshift(created);
      return created;
    }),
  setServiceHealth: (id: string, health: Health) =>
    mockRequest("service-health", () => {
      const s = db.services.find((x) => x.id === id);
      if (!s) throw new Error("service not found");
      s.health = health;
      return s;
    }),
  upsertShift: (input: Partial<Shift> & { teamId: string; memberId: string; start: string; end: string }) =>
    mockRequest("upsert-shift", () => {
      if (new Date(input.end) < new Date(input.start)) throw new Error("结束时间不得早于开始时间");
      const overlap = db.shifts.find(
        (s) => s.teamId === input.teamId && s.id !== input.id &&
          new Date(s.start) < new Date(input.end) && new Date(input.start) < new Date(s.end),
      );
      if (overlap && !input.note?.includes("强制保存")) throw new Error(`与班次 ${overlap.id} 时间重叠（同团队）`);
      if (input.id) {
        const s = db.shifts.find((x) => x.id === input.id);
        if (!s) throw new Error("shift not found");
        Object.assign(s, input);
        return s;
      }
      const created: Shift = { id: nextId("sh"), handoffId: input.handoffId ?? null, note: input.note ?? "", ...input } as Shift;
      db.shifts.push(created);
      return created;
    }),
  deleteShift: (id: string) =>
    mockRequest("delete-shift", () => {
      const idx = db.shifts.findIndex((s) => s.id === id);
      if (idx >= 0) db.shifts.splice(idx, 1);
      return true;
    }),
  upsertRule: (rule: NotificationRule) =>
    mockRequest("upsert-rule", () => {
      const idx = db.notificationRules.findIndex((r) => r.id === rule.id);
      if (idx >= 0) db.notificationRules[idx] = rule;
      else db.notificationRules.push({ ...rule, id: nextId("nr") });
      return db.notificationRules;
    }),
  deleteRule: (id: string) =>
    mockRequest("delete-rule", () => {
      const idx = db.notificationRules.findIndex((r) => r.id === id);
      if (idx >= 0) db.notificationRules.splice(idx, 1);
      return true;
    }),
  upsertIntegration: (item: Integration) =>
    mockRequest("upsert-integration", () => {
      const idx = db.integrations.findIndex((i) => i.id === item.id);
      if (idx >= 0) db.integrations[idx] = item;
      else db.integrations.push({ ...item, id: nextId("int") });
      return db.integrations;
    }),
  deleteIntegration: (id: string) =>
    mockRequest("delete-integration", () => {
      const idx = db.integrations.findIndex((i) => i.id === id);
      if (idx >= 0) db.integrations.splice(idx, 1);
      return true;
    }),
  testIntegration: () =>
    mockRequest("test-connection", () => ({ ok: true, latencyMs: 42 }), 600),
  inviteMember: (email: string, role: Member["role"], teamId: string | null) =>
    mockRequest("invite-member", () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("邮箱格式不正确");
      const created: Member = { id: nextId("m"), name: email.split("@")[0], email, role, teamId, status: "active" };
      db.members.push(created);
      return created;
    }),
  removeMember: (id: string) =>
    mockRequest("remove-member", () => {
      const idx = db.members.findIndex((m) => m.id === id);
      if (idx >= 0) db.members.splice(idx, 1);
      return true;
    }),
  setMemberStatus: (id: string, status: Member["status"]) =>
    mockRequest("member-status", () => {
      const m = db.members.find((x) => x.id === id);
      if (m) m.status = status;
      return m;
    }),
  exportAnalytics: () =>
    mockRequest("export", () => {
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
      return URL.createObjectURL(blob);
    }),
};
