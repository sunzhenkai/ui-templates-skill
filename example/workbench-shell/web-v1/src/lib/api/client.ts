import { z } from "zod"
import { db, CURRENT_USER_ID } from "@/mock/db"
import { usePrefsStore } from "@/stores/prefs-store"
import type {
  CalendarView,
  InboxItem,
  Incident,
  IncidentStatus,
  Integration,
  Member,
  NotificationRule,
  OncallShift,
  Service,
  SettingsTab,
  Team,
  TimelineEvent,
} from "@/types/domain"

export class ApiError extends Error {
  retryable = true
  constructor(message = "模拟请求失败") {
    super(message)
    this.name = "ApiError"
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldFail(hint?: string) {
  const prefs = usePrefsStore.getState()
  if (prefs.forceFail) return true
  if (hint?.includes("__FAIL__")) return true
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search)
    if (params.get("mockFail") === "1") return true
  }
  return false
}

async function run<T>(fn: () => T, hint?: string): Promise<T> {
  const ms = usePrefsStore.getState().delayMs
  await delay(ms)
  if (shouldFail(hint)) throw new ApiError()
  return structuredClone(fn())
}

function nowIso() {
  return new Date().toISOString()
}

function inWorkspace<T extends { workspaceId: string }>(items: T[], workspaceId: string) {
  return items.filter((item) => item.workspaceId === workspaceId)
}

export async function listWorkspaces() {
  return run(() => db.workspaces)
}

export async function getWorkspace(id: string) {
  return run(() => {
    const item = db.workspaces.find((row) => row.id === id)
    if (!item) throw new ApiError("工作区不存在")
    return item
  })
}

export async function updateWorkspace(id: string, patch: Partial<{ name: string; description: string; timezone: string; defaultIncidentStatus: IncidentStatus }>) {
  return run(() => {
    const item = db.workspaces.find((row) => row.id === id)
    if (!item) throw new ApiError("工作区不存在")
    Object.assign(item, patch)
    return item
  })
}

export async function listMembers(workspaceId: string) {
  return run(() => inWorkspace(db.members, workspaceId))
}

export async function listTeams(workspaceId: string) {
  return run(() => inWorkspace(db.teams, workspaceId))
}

export async function listServices(workspaceId: string) {
  return run(() => inWorkspace(db.services, workspaceId))
}

export async function getService(id: string) {
  return run(() => {
    const item = db.services.find((row) => row.id === id)
    if (!item) return null
    return item
  })
}

export const serviceFormSchema = z.object({
  name: z.string().min(1, "名称必填"),
  slug: z.string().min(1, "标识必填").regex(/^[a-z0-9-]+$/, "标识只能包含小写字母、数字和连字符"),
  description: z.string(),
  teamId: z.string().min(1),
  ownerId: z.string().min(1),
  environment: z.enum(["prod", "staging", "dev"]),
  repoUrl: z.string(),
  docsUrl: z.string(),
  dependsOn: z.array(z.string()),
  alertRules: z.string(),
})

export async function upsertService(workspaceId: string, input: z.infer<typeof serviceFormSchema> & { id?: string }) {
  return run(() => {
    const duplicate = db.services.find((row) => row.workspaceId === workspaceId && row.slug === input.slug && row.id !== input.id)
    if (duplicate) throw new ApiError("服务标识必须唯一")
    if (input.id) {
      const item = db.services.find((row) => row.id === input.id)
      if (!item) throw new ApiError("服务不存在")
      Object.assign(item, input, { updatedAt: nowIso() })
      return item
    }
    const item: Service = {
      id: `svc-${crypto.randomUUID().slice(0, 8)}`,
      workspaceId,
      health: "unknown",
      status: "active",
      recentIncidentCount: 0,
      lastChangeAt: nowIso(),
      updatedAt: nowIso(),
      ...input,
    }
    db.services.push(item)
    return item
  }, input.slug)
}

export async function setServiceStatus(id: string, status: Service["status"]) {
  return run(() => {
    const item = db.services.find((row) => row.id === id)
    if (!item) throw new ApiError("服务不存在")
    item.status = status
    item.updatedAt = nowIso()
    return item
  })
}

export async function listChanges(workspaceId: string) {
  return run(() => inWorkspace(db.changes, workspaceId))
}

export async function listIncidents(workspaceId: string) {
  return run(() => inWorkspace(db.incidents, workspaceId))
}

export async function getIncident(id: string) {
  return run(() => db.incidents.find((row) => row.id === id) ?? null)
}

export const incidentFormSchema = z.object({
  title: z.string().min(1, "标题必填"),
  serviceIds: z.array(z.string()).min(1, "影响服务必填"),
  severity: z.enum(["critical", "high", "medium", "low"]),
  status: z.enum(["pending-confirm", "in-progress", "waiting-external", "resolved", "archived"]),
  ownerId: z.string().min(1, "负责人必填"),
  teamIds: z.array(z.string()),
  startedAt: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  changeIds: z.array(z.string()),
})

export async function createIncident(workspaceId: string, input: z.infer<typeof incidentFormSchema>) {
  return run(() => {
    const disabled = input.serviceIds.some((id) => db.services.find((svc) => svc.id === id)?.status === "disabled")
    if (disabled) throw new ApiError("已停用服务不能创建新的关联事件")
    const ids = db.nextIncident()
    const item: Incident = {
      ...ids,
      workspaceId,
      creatorId: CURRENT_USER_ID,
      commentCount: 0,
      pinned: false,
      resolvedAt: input.status === "resolved" || input.status === "archived" ? nowIso() : null,
      updatedAt: nowIso(),
      ...input,
    }
    db.incidents.unshift(item)
    db.timeline.push({
      id: `tl-${crypto.randomUUID().slice(0, 8)}`,
      incidentId: item.id,
      kind: "status",
      actorId: CURRENT_USER_ID,
      body: `创建事件，状态为 ${item.status}`,
      createdAt: nowIso(),
      mentionIds: [],
      deleted: false,
      edited: false,
    })
    const inboxIds = db.nextInbox()
    db.inbox.unshift({
      id: inboxIds.id,
      number: inboxIds.number,
      workspaceId,
      title: `新事件：${item.title}`,
      type: "alert",
      severity: item.severity,
      source: "create",
      ownerId: item.ownerId,
      createdAt: nowIso(),
      status: "open",
      incidentId: item.id,
    })
    for (const serviceId of item.serviceIds) {
      const service = db.services.find((row) => row.id === serviceId)
      if (service) service.recentIncidentCount += 1
    }
    return item
  }, input.title)
}

export async function updateIncident(id: string, patch: Partial<Incident>, actorId = CURRENT_USER_ID) {
  return run(() => {
    const item = db.incidents.find((row) => row.id === id)
    if (!item) throw new ApiError("事件不存在")
    const before = { ...item }
    Object.assign(item, patch, { updatedAt: nowIso() })
    if (patch.status && patch.status !== before.status) {
      item.resolvedAt = patch.status === "resolved" || patch.status === "archived" ? nowIso() : item.resolvedAt
      db.timeline.push({
        id: `tl-${crypto.randomUUID().slice(0, 8)}`,
        incidentId: id,
        kind: "status",
        actorId,
        body: `状态从 ${before.status} 变为 ${patch.status}`,
        createdAt: nowIso(),
        mentionIds: [],
        deleted: false,
        edited: false,
      })
    }
    if (patch.ownerId && patch.ownerId !== before.ownerId) {
      db.timeline.push({
        id: `tl-${crypto.randomUUID().slice(0, 8)}`,
        incidentId: id,
        kind: "owner",
        actorId,
        body: `负责人变更为 ${patch.ownerId}`,
        createdAt: nowIso(),
        mentionIds: [],
        deleted: false,
        edited: false,
      })
    }
    return item
  })
}

export async function deleteIncidents(ids: string[]) {
  return run(() => {
    for (const id of ids) {
      const index = db.incidents.findIndex((row) => row.id === id)
      if (index >= 0) db.incidents.splice(index, 1)
    }
    return ids
  })
}

export async function listTimeline(incidentId: string) {
  return run(() => db.timeline.filter((row) => row.incidentId === incidentId && !row.deleted))
}

export async function addComment(incidentId: string, body: string, mentionIds: string[]) {
  return run(() => {
    const event: TimelineEvent = {
      id: `tl-${crypto.randomUUID().slice(0, 8)}`,
      incidentId,
      kind: "comment",
      actorId: CURRENT_USER_ID,
      body,
      createdAt: nowIso(),
      mentionIds,
      deleted: false,
      edited: false,
    }
    db.timeline.push(event)
    const incident = db.incidents.find((row) => row.id === incidentId)
    if (incident) {
      incident.commentCount += 1
      incident.updatedAt = nowIso()
    }
    return event
  }, body)
}

export async function editComment(id: string, body: string) {
  return run(() => {
    const event = db.timeline.find((row) => row.id === id)
    if (!event || event.actorId !== CURRENT_USER_ID) throw new ApiError("只能编辑自己的评论")
    event.body = body
    event.edited = true
    return event
  })
}

export async function deleteComment(id: string) {
  return run(() => {
    const event = db.timeline.find((row) => row.id === id)
    if (!event || event.actorId !== CURRENT_USER_ID) throw new ApiError("只能删除自己的评论")
    event.deleted = true
    return event
  })
}

export async function addAttachment(incidentId: string, name: string, fail = false) {
  return run(() => {
    if (fail || name.includes("fail")) throw new ApiError("附件上传失败")
    const item = {
      id: `att-${crypto.randomUUID().slice(0, 8)}`,
      incidentId,
      name,
      size: 12_000,
      status: "uploaded" as const,
      createdAt: nowIso(),
    }
    db.attachments.push(item)
    db.timeline.push({
      id: `tl-${crypto.randomUUID().slice(0, 8)}`,
      incidentId,
      kind: "attachment",
      actorId: CURRENT_USER_ID,
      body: `上传附件 ${name}`,
      createdAt: nowIso(),
      mentionIds: [],
      deleted: false,
      edited: false,
    })
    return item
  }, name)
}

export async function listInbox(workspaceId: string) {
  return run(() => inWorkspace(db.inbox, workspaceId))
}

export async function updateInbox(ids: string[], patch: Partial<InboxItem>) {
  return run(() => {
    for (const id of ids) {
      const item = db.inbox.find((row) => row.id === id)
      if (item) Object.assign(item, patch)
    }
    return ids
  })
}

export async function listShifts(workspaceId: string) {
  return run(() => inWorkspace(db.shifts, workspaceId))
}

export const shiftFormSchema = z.object({
  teamId: z.string().min(1),
  memberId: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  handoffToId: z.string().nullable(),
  note: z.string(),
  force: z.boolean().optional(),
})

export async function upsertShift(workspaceId: string, input: z.infer<typeof shiftFormSchema> & { id?: string }) {
  return run(() => {
    if (new Date(input.endAt) <= new Date(input.startAt)) throw new ApiError("结束时间不得早于开始时间")
    const overlapping = db.shifts.find((row) => {
      if (row.workspaceId !== workspaceId || row.teamId !== input.teamId || row.id === input.id) return false
      return new Date(row.startAt) < new Date(input.endAt) && new Date(row.endAt) > new Date(input.startAt)
    })
    if (overlapping && !input.force) throw new ApiError("同一团队班次重叠，勾选强制保存后可覆盖")
    if (input.id) {
      const item = db.shifts.find((row) => row.id === input.id)
      if (!item) throw new ApiError("班次不存在")
      Object.assign(item, input)
      return item
    }
    const item: OncallShift = {
      id: `sh-${crypto.randomUUID().slice(0, 8)}`,
      workspaceId,
      teamId: input.teamId,
      memberId: input.memberId,
      startAt: input.startAt,
      endAt: input.endAt,
      handoffToId: input.handoffToId,
      note: input.note,
    }
    db.shifts.push(item)
    return item
  })
}

export async function deleteShift(id: string) {
  return run(() => {
    const index = db.shifts.findIndex((row) => row.id === id)
    if (index >= 0) db.shifts.splice(index, 1)
    return id
  })
}

export async function inviteMember(workspaceId: string, email: string, role: Member["role"], teamIds: string[]) {
  return run(() => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("邮箱格式错误")
    const item: Member = {
      id: `mem-${crypto.randomUUID().slice(0, 8)}`,
      workspaceId,
      name: email.split("@")[0] ?? email,
      email,
      role,
      teamIds,
      status: "active",
      timezone: "Asia/Shanghai",
    }
    db.members.push(item)
    return item
  }, email)
}

export async function updateMember(id: string, patch: Partial<Member>) {
  return run(() => {
    const item = db.members.find((row) => row.id === id)
    if (!item) throw new ApiError("成员不存在")
    Object.assign(item, patch)
    return item
  })
}

export async function upsertTeam(workspaceId: string, input: { id?: string; name: string; description: string; memberIds: string[]; serviceIds: string[] }) {
  return run(() => {
    if (input.id) {
      const item = db.teams.find((row) => row.id === input.id)
      if (!item) throw new ApiError("团队不存在")
      Object.assign(item, input)
      return item
    }
    const item: Team = {
      id: `team-${crypto.randomUUID().slice(0, 8)}`,
      workspaceId,
      status: "active",
      ...input,
    }
    db.teams.push(item)
    return item
  })
}

export async function setTeamStatus(id: string, status: Team["status"]) {
  return run(() => {
    const item = db.teams.find((row) => row.id === id)
    if (!item) throw new ApiError("团队不存在")
    item.status = status
    return item
  })
}

export async function listNotificationRules(workspaceId: string) {
  return run(() => inWorkspace(db.notificationRules, workspaceId))
}

export async function upsertNotificationRule(workspaceId: string, input: Omit<NotificationRule, "id" | "workspaceId"> & { id?: string }) {
  return run(() => {
    if (input.id) {
      const item = db.notificationRules.find((row) => row.id === input.id)
      if (!item) throw new ApiError("规则不存在")
      Object.assign(item, input)
      return item
    }
    const item: NotificationRule = {
      id: `nr-${crypto.randomUUID().slice(0, 8)}`,
      workspaceId,
      ...input,
    }
    db.notificationRules.push(item)
    return item
  })
}

export async function deleteNotificationRule(id: string) {
  return run(() => {
    const index = db.notificationRules.findIndex((row) => row.id === id)
    if (index >= 0) db.notificationRules.splice(index, 1)
    return id
  })
}

export async function listIntegrations(workspaceId: string) {
  return run(() => inWorkspace(db.integrations, workspaceId))
}

export async function upsertIntegration(workspaceId: string, input: Omit<Integration, "id" | "workspaceId"> & { id?: string }) {
  return run(() => {
    if (input.id) {
      const item = db.integrations.find((row) => row.id === input.id)
      if (!item) throw new ApiError("集成不存在")
      Object.assign(item, input)
      return item
    }
    const item: Integration = {
      id: `int-${crypto.randomUUID().slice(0, 8)}`,
      workspaceId,
      ...input,
    }
    db.integrations.push(item)
    return item
  })
}

export async function testIntegration(_id: string) {
  return run(() => ({ ok: !shouldFail(), testedAt: nowIso() }))
}

export async function deleteIntegration(id: string) {
  return run(() => {
    const index = db.integrations.findIndex((row) => row.id === id)
    if (index >= 0) db.integrations.splice(index, 1)
    return id
  })
}

export async function searchAll(workspaceId: string, query: string) {
  return run(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { incidents: [], services: [], members: [], changes: [] }
    return {
      incidents: inWorkspace(db.incidents, workspaceId).filter((row) => `${row.number} ${row.title}`.toLowerCase().includes(q)),
      services: inWorkspace(db.services, workspaceId).filter((row) => `${row.name} ${row.slug}`.toLowerCase().includes(q)),
      members: inWorkspace(db.members, workspaceId).filter((row) => `${row.name} ${row.email}`.toLowerCase().includes(q)),
      changes: inWorkspace(db.changes, workspaceId).filter((row) => row.title.toLowerCase().includes(q)),
    }
  }, query)
}

export async function listHealthChecks(serviceId: string) {
  return run(() => db.healthChecks.filter((row) => row.serviceId === serviceId))
}

export type QueryBundle = {
  workspaceId: string
  view?: CalendarView
  tab?: SettingsTab
}

export { CURRENT_USER_ID }
