// Mock API layer. Uses local Promise + simulated latency + opt-in failure.
// Designed so it is interchangeable with a real fetch-based client: every
// method is async, returns the same shape, and may throw.

import {
  changes, deliveryMetrics, inboxItems, integrations, members, notificationRules,
  seedIncidents, services, shifts, teams, workspaces,
} from '../mock/seed'
import type {
  Change, DeliveryMetric, Incident, InboxItem, Integration, Member,
  NotificationRule, OncallShift, Service, Team, Workspace, IncidentActivity,
  IncidentComment, AppPreference,
} from '../types'

interface MutableState {
  incidents: Incident[]
  inbox: InboxItem[]
  shifts: OncallShift[]
  notificationRules: NotificationRule[]
  integrations: Integration[]
  preferences: Record<string, AppPreference>
}

const state: MutableState = {
  incidents: structuredClone(seedIncidents),
  inbox: structuredClone(inboxItems),
  shifts: structuredClone(shifts),
  notificationRules: structuredClone(notificationRules),
  integrations: structuredClone(integrations),
  preferences: {
    'ws-acme': { defaultHome: '/inbox', timezone: 'Asia/Shanghai', notifications: true, shortcuts: true },
    'ws-platform': { defaultHome: '/events', timezone: 'Asia/Shanghai', notifications: true, shortcuts: true },
  },
}

// ----- Configuration knobs -----
let baseDelayMs = 280
export function setBaseDelay(ms: number) { baseDelayMs = Math.max(0, ms) }

// Failure key: any query whose args contain "force-fail" or matching id will throw.
function shouldFail(args: unknown): boolean {
  if (!args) return false
  const text = JSON.stringify(args).toLowerCase()
  if (text.includes('force-fail')) return true
  if (text.includes('"forceFail":true')) return true
  return false
}

function delay<T>(value: T, ms = baseDelayMs): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail(value)) reject(new Error('模拟请求失败（force-fail）'))
      else resolve(value)
    }, ms)
  })
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

// ----- Reference data (read-only) -----
export const api = {
  workspaces: () => delay(structuredClone(workspaces)),
  teams: () => delay(structuredClone(teams)),
  members: () => delay(structuredClone(members)),
  services: () => delay(structuredClone(services)),
  changes: () => delay(structuredClone(changes)),
  inbox: () => delay(structuredClone(state.inbox)),
  shifts: () => delay(structuredClone(state.shifts)),
  deliveryMetrics: () => delay(structuredClone(deliveryMetrics)),
  notificationRules: () => delay(structuredClone(state.notificationRules)),
  integrations: () => delay(structuredClone(state.integrations)),
  preferences: (workspaceId: string) =>
    delay(structuredClone(state.preferences[workspaceId] ?? {
      defaultHome: '/inbox', timezone: 'Asia/Shanghai', notifications: true, shortcuts: true,
    })),

  // ----- Incidents: list / detail / mutations -----
  listIncidents: (filter?: { q?: string; status?: string; severity?: string; serviceId?: string; forceFail?: boolean }): Promise<Incident[]> => {
    let list: Incident[] = structuredClone(state.incidents)
    if (filter?.q) {
      const q = filter.q.toLowerCase()
      list = list.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.number.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (filter?.status) list = list.filter((i) => i.status === filter.status)
    if (filter?.severity) list = list.filter((i) => i.severity === filter.severity)
    if (filter?.serviceId) list = list.filter((i) => i.serviceId === filter.serviceId)
    return new Promise<Incident[]>((resolve, reject) => {
      setTimeout(() => {
        if (filter?.forceFail) reject(new Error('模拟请求失败（force-fail）'))
        else resolve(list)
      }, baseDelayMs)
    })
  },

  getIncident: (id: string) => {
    const found = state.incidents.find((i) => i.id === id)
    if (!found) return delay(null as Incident | null, baseDelayMs).then(() => null)
    return delay(structuredClone(found))
  },

  createIncident: (input: {
    title: string
    severity: Incident['severity']
    status: Incident['status']
    serviceId: string
    assigneeId: string | null
    teamIds: string[]
    description: string
    tags: string[]
    changeIds: string[]
  }) => {
    const id = uid('inc')
    const number = `INC-${2040 + state.incidents.length}`
    const created: Incident = {
      id, number,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: input.status,
      serviceId: input.serviceId,
      assigneeId: input.assigneeId,
      teamIds: input.teamIds,
      createdAt: new Date().toISOString(),
      occurredAt: new Date().toISOString(),
      tags: input.tags,
      changeIds: input.changeIds,
      attachments: [],
      comments: [],
      activity: [
        { id: uid('act'), kind: 'create', actorId: 'm-001', at: new Date().toISOString(), note: '由创建弹窗提交' },
      ],
    }
    state.incidents = [created, ...state.incidents]
    return delay(structuredClone(created), baseDelayMs + 120)
  },

  updateIncidentStatus: (id: string, status: Incident['status'], actorId = 'm-001') => {
    const target = state.incidents.find((i) => i.id === id)
    if (!target) return Promise.reject(new Error('事件不存在'))
    const from = target.status
    target.status = status
    target.activity = [
      ...target.activity,
      { id: uid('act'), kind: 'status', actorId, at: new Date().toISOString(), meta: { from, to: status } },
    ]
    return delay(structuredClone(target), 200)
  },

  assignIncident: (id: string, assigneeId: string | null, actorId = 'm-001') => {
    const target = state.incidents.find((i) => i.id === id)
    if (!target) return Promise.reject(new Error('事件不存在'))
    target.assigneeId = assigneeId
    target.activity = [
      ...target.activity,
      { id: uid('act'), kind: 'assign', actorId, at: new Date().toISOString(), meta: { assignee: assigneeId ?? '' } },
    ]
    return delay(structuredClone(target), 200)
  },

  addComment: (id: string, body: string, authorId = 'm-001') => {
    const target = state.incidents.find((i) => i.id === id)
    if (!target) return Promise.reject(new Error('事件不存在'))
    const comment: IncidentComment = { id: uid('cmt'), authorId, body, createdAt: new Date().toISOString() }
    target.comments = [...target.comments, comment]
    return delay(structuredClone(comment), 180)
  },

  pinIncident: (id: string, pinned: boolean, actorId = 'm-001') => {
    const target = state.incidents.find((i) => i.id === id)
    if (!target) return Promise.reject(new Error('事件不存在'))
    target.pinned = pinned
    target.activity = [
      ...target.activity,
      { id: uid('act'), kind: 'tag', actorId, at: new Date().toISOString(), meta: { pinned: String(pinned) } },
    ]
    return delay(structuredClone(target), 160)
  },

  // ----- Inbox -----
  markInbox: (ids: string[], status: InboxItem['status']) => {
    state.inbox = state.inbox.map((it) => (ids.includes(it.id) ? { ...it, status } : it))
    return delay({ updated: ids.length }, 160)
  },

  // ----- Settings -----
  savePreferences: (workspaceId: string, prefs: AppPreference) => {
    state.preferences[workspaceId] = prefs
    return delay(structuredClone(prefs), 200)
  },

  upsertNotificationRule: (rule: NotificationRule) => {
    const exists = state.notificationRules.some((r) => r.id === rule.id)
    state.notificationRules = exists
      ? state.notificationRules.map((r) => (r.id === rule.id ? rule : r))
      : [...state.notificationRules, rule]
    return delay(structuredClone(rule), 200)
  },

  deleteNotificationRule: (id: string) => {
    state.notificationRules = state.notificationRules.filter((r) => r.id !== id)
    return delay({ ok: true }, 160)
  },

  upsertIntegration: (integration: Integration) => {
    const exists = state.integrations.some((i) => i.id === integration.id)
    state.integrations = exists
      ? state.integrations.map((i) => (i.id === integration.id ? integration : i))
      : [...state.integrations, integration]
    return delay(structuredClone(integration), 200)
  },

  deleteIntegration: (id: string) => {
    state.integrations = state.integrations.filter((i) => i.id !== id)
    return delay({ ok: true }, 160)
  },

  testIntegration: (id: string) => {
    const target = state.integrations.find((i) => i.id === id)
    if (!target) return Promise.reject(new Error('集成不存在'))
    target.lastTestAt = new Date().toISOString()
    target.lastTestResult = 'success'
    return delay(structuredClone(target), 400)
  },

  // ----- On-call shift editing (creates conflicts when overlap) -----
  upsertShift: (shift: OncallShift) => {
    const conflict = state.shifts.find((s) =>
      s.id !== shift.id && s.memberId === shift.memberId &&
      new Date(s.start) < new Date(shift.end) && new Date(s.end) > new Date(shift.start),
    )
    if (conflict) return Promise.reject(new Error('与该成员现有班次冲突'))
    const exists = state.shifts.some((s) => s.id === shift.id)
    state.shifts = exists
      ? state.shifts.map((s) => (s.id === shift.id ? shift : s))
      : [...state.shifts, shift]
    return delay(structuredClone(shift), 200)
  },

  // ----- Reset helpers (used by E2E / dev tools) -----
  __resetForTests: () => {
    state.incidents = structuredClone(seedIncidents)
    state.inbox = structuredClone(inboxItems)
    state.shifts = structuredClone(shifts)
    state.notificationRules = structuredClone(notificationRules)
    state.integrations = structuredClone(integrations)
  },
}

export type Api = typeof api
export type {
  Change, DeliveryMetric, Incident, InboxItem, Integration, Member,
  NotificationRule, OncallShift, Service, Team, Workspace, IncidentActivity,
  IncidentComment, AppPreference,
}
