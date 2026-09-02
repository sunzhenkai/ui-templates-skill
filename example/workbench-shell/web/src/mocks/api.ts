import type {
  ChangeRecord,
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
import * as data from "./data"

// 模拟延迟和失败开关
const SIMULATE_DELAY = 300
const FAIL_KEYWORDS: string[] = []
let failureEnabled = false

export function setFailureEnabled(v: boolean) {
  failureEnabled = v
}

export function addFailureKeyword(kw: string) {
  if (!FAIL_KEYWORDS.includes(kw)) FAIL_KEYWORDS.push(kw)
}

function delay(ms = SIMULATE_DELAY) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function maybeFail<T>(result: T, keywordHint?: string): Promise<T> {
  if (failureEnabled || (keywordHint && FAIL_KEYWORDS.some((k) => keywordHint.toLowerCase().includes(k)))) {
    return Promise.reject(new Error("模拟请求失败，请重试。"))
  }
  return Promise.resolve(result)
}

// 可变数据副本
let mutableWorkspaces = [...data.workspaces]
let mutableTeams = [...data.teams]
let mutableMembers = [...data.members]
let mutableServices = [...data.services]
let mutableIncidents = [...data.incidents]
let mutableInbox = [...data.inboxItems]
let mutableChanges = [...data.changeRecords]
let mutableShifts = [...data.onCallShifts]
let mutableRules = [...data.notificationRules]
let mutableIntegrations = [...data.integrations]

function nextIncNumber() {
  const year = new Date().getFullYear()
  const count = mutableIncidents.filter((i) => i.number.startsWith(`INC-${year}`)).length + 1
  return `INC-${year}-${String(count).padStart(3, "0")}`
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  await delay(180)
  return maybeFail([...mutableWorkspaces])
}

export async function fetchWorkspace(id: string): Promise<Workspace | undefined> {
  await delay(120)
  return maybeFail(mutableWorkspaces.find((w) => w.id === id))
}

export async function updateWorkspace(id: string, patch: Partial<Workspace>): Promise<Workspace> {
  await delay(300)
  const idx = mutableWorkspaces.findIndex((w) => w.id === id)
  if (idx === -1) throw new Error("工作区不存在")
  mutableWorkspaces[idx] = { ...mutableWorkspaces[idx], ...patch }
  return maybeFail({ ...mutableWorkspaces[idx] })
}

export async function fetchTeams(workspaceId: string): Promise<Team[]> {
  await delay(200)
  return maybeFail(mutableTeams.filter((t) => t.workspaceId === workspaceId))
}

export async function fetchMembers(workspaceId: string): Promise<Member[]> {
  await delay(220)
  return maybeFail(mutableMembers.filter((m) => m.workspaceId === workspaceId))
}

export async function fetchServices(workspaceId: string): Promise<Service[]> {
  await delay(240)
  return maybeFail(mutableServices.filter((s) => s.workspaceId === workspaceId))
}

export async function fetchIncidents(workspaceId: string): Promise<Incident[]> {
  await delay(280)
  return maybeFail(mutableIncidents.filter((i) => i.workspaceId === workspaceId))
}

export async function fetchIncident(id: string): Promise<Incident | undefined> {
  await delay(200)
  return maybeFail(mutableIncidents.find((i) => i.id === id))
}

export async function createIncident(
  payload: Omit<Incident, "id" | "number" | "createdAt" | "updatedAt" | "comments" | "pinned"> & { id?: string }
): Promise<Incident> {
  await delay(400)
  const incident: Incident = {
    ...payload,
    id: payload.id ?? `i-${Date.now()}`,
    number: nextIncNumber(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [],
    pinned: false,
  }
  mutableIncidents.unshift(incident)
  // 同步创建收件箱项
  mutableInbox.unshift({
    id: `n-${Date.now()}`,
    workspaceId: incident.workspaceId,
    type: "incident",
    title: `新事件 ${incident.title}`,
    severity: incident.severity,
    source: "手动创建",
    ownerId: incident.ownerId,
    status: "pending",
    createdAt: incident.createdAt,
    incidentId: incident.id,
    read: false,
  })
  return maybeFail(incident)
}

export async function updateIncident(id: string, patch: Partial<Incident>): Promise<Incident> {
  await delay(300)
  const idx = mutableIncidents.findIndex((i) => i.id === id)
  if (idx === -1) throw new Error("事件不存在")
  mutableIncidents[idx] = { ...mutableIncidents[idx], ...patch, updatedAt: new Date().toISOString() }
  return maybeFail({ ...mutableIncidents[idx] })
}

export async function addComment(incidentId: string, authorId: string, content: string) {
  await delay(250)
  const idx = mutableIncidents.findIndex((i) => i.id === incidentId)
  if (idx === -1) throw new Error("事件不存在")
  const comment = { id: `c-${Date.now()}`, incidentId, authorId, content, createdAt: new Date().toISOString() }
  mutableIncidents[idx].comments.push(comment)
  return maybeFail(comment)
}

export async function fetchInbox(workspaceId: string): Promise<InboxItem[]> {
  await delay(260)
  return maybeFail(mutableInbox.filter((n) => n.workspaceId === workspaceId))
}

export async function markInboxRead(ids: string[]) {
  await delay(200)
  mutableInbox = mutableInbox.map((n) => (ids.includes(n.id) ? { ...n, read: true, status: "handled" } : n))
  return maybeFail(undefined)
}

export async function dismissInbox(ids: string[]) {
  await delay(200)
  mutableInbox = mutableInbox.map((n) => (ids.includes(n.id) ? { ...n, status: "dismissed" } : n))
  return maybeFail(undefined)
}

export async function assignInboxOwner(ids: string[], ownerId: string) {
  await delay(220)
  mutableInbox = mutableInbox.map((n) => (ids.includes(n.id) ? { ...n, ownerId } : n))
  return maybeFail(undefined)
}

export async function fetchChanges(workspaceId: string): Promise<ChangeRecord[]> {
  await delay(230)
  return maybeFail(mutableChanges.filter((c) => c.workspaceId === workspaceId))
}

export async function fetchOnCallShifts(workspaceId: string): Promise<OnCallShift[]> {
  await delay(210)
  return maybeFail(mutableShifts.filter((s) => s.workspaceId === workspaceId))
}

export async function createShift(payload: Omit<OnCallShift, "id">): Promise<OnCallShift> {
  await delay(300)
  const shift: OnCallShift = { ...payload, id: `shift-${Date.now()}` }
  mutableShifts.push(shift)
  return maybeFail(shift)
}

export async function fetchNotificationRules(workspaceId: string): Promise<NotificationRule[]> {
  await delay(190)
  return maybeFail(mutableRules.filter((r) => r.workspaceId === workspaceId))
}

export async function updateRule(id: string, patch: Partial<NotificationRule>): Promise<NotificationRule> {
  await delay(250)
  const idx = mutableRules.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error("规则不存在")
  mutableRules[idx] = { ...mutableRules[idx], ...patch }
  return maybeFail({ ...mutableRules[idx] })
}

export async function createRule(payload: Omit<NotificationRule, "id">): Promise<NotificationRule> {
  await delay(300)
  const rule: NotificationRule = { ...payload, id: `nr-${Date.now()}` }
  mutableRules.push(rule)
  return maybeFail(rule)
}

export async function deleteRule(id: string) {
  await delay(220)
  mutableRules = mutableRules.filter((r) => r.id !== id)
  return maybeFail(undefined)
}

export async function fetchIntegrations(workspaceId: string): Promise<Integration[]> {
  await delay(180)
  return maybeFail(mutableIntegrations.filter((i) => i.workspaceId === workspaceId))
}

export async function testIntegration(id: string): Promise<Integration> {
  await delay(800)
  const idx = mutableIntegrations.findIndex((i) => i.id === id)
  if (idx === -1) throw new Error("集成不存在")
  const success = Math.random() > 0.3
  mutableIntegrations[idx] = { ...mutableIntegrations[idx], lastTested: success ? "success" : "failure" }
  return maybeFail(mutableIntegrations[idx])
}

export async function createIntegration(payload: Omit<Integration, "id">): Promise<Integration> {
  await delay(300)
  const integration: Integration = { ...payload, id: `int-${Date.now()}` }
  mutableIntegrations.push(integration)
  return maybeFail(integration)
}

export async function deleteIntegration(id: string) {
  await delay(200)
  mutableIntegrations = mutableIntegrations.filter((i) => i.id !== id)
  return maybeFail(undefined)
}

export async function updateMember(id: string, patch: Partial<Member>): Promise<Member> {
  await delay(280)
  const idx = mutableMembers.findIndex((m) => m.id === id)
  if (idx === -1) throw new Error("成员不存在")
  mutableMembers[idx] = { ...mutableMembers[idx], ...patch }
  return maybeFail({ ...mutableMembers[idx] })
}

export async function updateService(id: string, patch: Partial<Service>): Promise<Service> {
  await delay(260)
  const idx = mutableServices.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error("服务不存在")
  mutableServices[idx] = { ...mutableServices[idx], ...patch }
  return maybeFail({ ...mutableServices[idx] })
}

export async function updateTeam(id: string, patch: Partial<Team>): Promise<Team> {
  await delay(240)
  const idx = mutableTeams.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error("团队不存在")
  mutableTeams[idx] = { ...mutableTeams[idx], ...patch }
  return maybeFail({ ...mutableTeams[idx] })
}

export async function createTeam(payload: Omit<Team, "id">): Promise<Team> {
  await delay(300)
  const team: Team = { ...payload, id: `t-${Date.now()}` }
  mutableTeams.push(team)
  return maybeFail(team)
}

// 通用搜索
export async function search(query: string, workspaceId: string) {
  await delay(300)
  const q = query.toLowerCase()
  return maybeFail({
    incidents: mutableIncidents.filter((i) => i.workspaceId === workspaceId && (i.title.toLowerCase().includes(q) || i.number.toLowerCase().includes(q))),
    services: mutableServices.filter((s) => s.workspaceId === workspaceId && s.name.toLowerCase().includes(q)),
    members: mutableMembers.filter((m) => m.workspaceId === workspaceId && (m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))),
    changes: mutableChanges.filter((c) => c.workspaceId === workspaceId && c.title.toLowerCase().includes(q)),
  })
}

// 聚合统计
export async function fetchAnalytics(workspaceId: string) {
  await delay(350)
  const incs = mutableIncidents.filter((i) => i.workspaceId === workspaceId)
  const resolved = incs.filter((i) => i.status === "resolved" || i.status === "closed")
  return maybeFail({
    total: incs.length,
    open: incs.filter((i) => i.status === "open").length,
    resolved: resolved.length,
    mttrMinutes: resolved.length ? Math.round((resolved.reduce((acc, i) => acc + new Date(i.updatedAt).getTime() - new Date(i.startedAt).getTime(), 0) / resolved.length) / 60000) : 0,
  bySeverity: incs.reduce((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1
      return acc
    }, { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>),
    byStatus: incs.reduce((acc, i) => {
      acc[i.status] = acc[i.status] || []
      acc[i.status].push(i)
      return acc
    }, {} as Record<string, Incident[]>),
    weeklyTrend: Array.from({ length: 7 }).map((_, i) => ({ day: i, count: Math.floor(Math.random() * 8) + (i > 4 ? 2 : 0) })),
  })
}
