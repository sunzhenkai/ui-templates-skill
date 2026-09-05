import type { InboxItem, Incident, Shift, TrendPoint, Distribution } from "@/types/domain";
import * as db from "./db";

/**
 * 本地 mock API：可控延迟 + 可触发失败。
 * 失败触发方式（开发模式）：localStorage.setItem("mock-fail", "1") 后
 * 任意写操作（mutating）会失败一次并自动清除标记，用于验证错误态与重试。
 */
const LATENCY = Number(localStorage.getItem("mock-latency") ?? 350);

function failOnce(): boolean {
  if (localStorage.getItem("mock-fail") === "1") {
    localStorage.removeItem("mock-fail");
    return true;
  }
  return false;
}

export class MockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockError";
  }
}

function delay<T>(value: T, mutating = false): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mutating && failOnce()) {
        reject(new MockError("模拟请求失败（mock-fail）"));
      } else {
        resolve(structuredClone(value));
      }
    }, LATENCY + Math.random() * 150);
  });
}

let seq = 1100;
function nextNumber(): string {
  seq += 1;
  return `INC-${seq}`;
}

/* ── workspaces / members / teams ─────────────────────────────────────────── */
export const getWorkspaces = () => delay(db.workspaces);
export const getMembers = () => delay(db.members);
export const getTeams = () => delay(db.teams);

/* ── services ─────────────────────────────────────────────────────────────── */
export const getServices = () => delay(db.services);
export const getService = (id: string) => {
  const found = db.services.find((s) => s.id === id);
  return found ? delay(found) : Promise.reject(new MockError("服务不存在"));
};

/* ── changes ──────────────────────────────────────────────────────────────── */
export const getChanges = () => delay(db.changes);

/* ── incidents ────────────────────────────────────────────────────────────── */
export const getIncidents = () => delay(db.incidents);
export const getIncident = (id: string) => {
  const found = db.incidents.find((i) => i.id === id || i.number === id);
  return found ? delay(found) : Promise.reject(new MockError("事件不存在"));
};

export interface CreateIncidentInput {
  title: string;
  service: string;
  severity: Incident["severity"];
  status: Incident["status"];
  assignee: string | null;
  teams: string[];
  occurredAt: string;
  description: string;
  tags: string[];
  relatedChange: string | null;
}

export const createIncident = (input: CreateIncidentInput) => {
  const now = new Date();
  const incident: Incident = {
    id: `in-${now.getTime()}`,
    number: nextNumber(),
    title: input.title,
    severity: input.severity,
    status: input.status,
    service: input.service,
    assignee: input.assignee,
    teams: input.teams,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    description: input.description,
    tags: input.tags,
    relatedChange: input.relatedChange,
    comments: [],
    pinned: false,
    attachments: [],
  };
  db.incidents.unshift(incident);
  syncServiceOpenCount(input.service, 1);
  db.inbox.unshift({
    id: `n-${now.getTime()}`,
    kind: "assignment",
    title: `新事件：${incident.number} ${incident.title}`,
    detail: "事件已创建并进入处理流程。",
    incident: incident.id,
    severity: incident.severity,
    source: "创建",
    assignee: incident.assignee ?? "m-ada",
    createdAt: incident.createdAt,
    status: "open",
  });
  return delay(incident, true);
};

export const updateIncidentStatus = (id: string, status: Incident["status"]) => {
  const found = db.incidents.find((i) => i.id === id);
  if (!found) return Promise.reject(new MockError("事件不存在"));
  found.status = status;
  found.updatedAt = new Date().toISOString();
  return delay(found, true);
};

export const togglePin = (id: string) => {
  const found = db.incidents.find((i) => i.id === id);
  if (!found) return Promise.reject(new MockError("事件不存在"));
  found.pinned = !found.pinned;
  return delay(found, true);
};

export const addComment = (id: string, body: string) => {
  const found = db.incidents.find((i) => i.id === id);
  if (!found) return Promise.reject(new MockError("事件不存在"));
  found.comments.push({
    id: `c-${Date.now()}`,
    author: "m-ada",
    body,
    createdAt: new Date().toISOString(),
  });
  found.updatedAt = new Date().toISOString();
  return delay(found, true);
};

/* ── inbox ────────────────────────────────────────────────────────────────── */
export const getInbox = () => delay(db.inbox);
export const resolveInboxItem = (id: string, status: InboxItem["status"]) => {
  const found = db.inbox.find((n) => n.id === id);
  if (!found) return Promise.reject(new MockError("事项不存在"));
  found.status = status;
  return delay(found, true);
};

/* ── shifts ───────────────────────────────────────────────────────────────── */
export const getShifts = () => delay(db.shifts);

export const upsertShift = (shift: Omit<Shift, "id"> & { id?: string }) => {
  const conflict = db.shifts.find(
    (s) => s.id !== shift.id && s.date === shift.date && s.slot === shift.slot && s.team === shift.team,
  );
  if (conflict) return Promise.reject(new MockError("该时段已有值班成员，存在冲突"));
  if (shift.id) {
    const found = db.shifts.find((s) => s.id === shift.id);
    if (!found) return Promise.reject(new MockError("班次不存在"));
    Object.assign(found, shift);
    return delay(found, true);
  }
  const created: Shift = { ...shift, id: `sh-${Date.now()}` } as Shift;
  db.shifts.push(created);
  return delay(created, true);
};

export const deleteShift = (id: string) => {
  const idx = db.shifts.findIndex((s) => s.id === id);
  if (idx >= 0) db.shifts.splice(idx, 1);
  return delay({ ok: true }, true);
};

/* ── analytics ────────────────────────────────────────────────────────────── */
export interface AnalyticsPayload {
  trend: TrendPoint[];
  severityDist: Distribution[];
  mttr: { name: string; hours: number }[];
  kpis: { created: number; resolved: number; mttrHours: number; availability: number };
}

export const getAnalytics = (): Promise<AnalyticsPayload> =>
  delay({
    trend: db.trend,
    severityDist: db.severityDist,
    mttr: db.mttrRanking,
    kpis: { created: 63, resolved: 55, mttrHours: 3.6, availability: 99.62 },
  });

function syncServiceOpenCount(serviceId: string, delta: number) {
  const svc = db.services.find((s) => s.name === serviceId || s.id === serviceId);
  if (svc) svc.openIncidents = Math.max(0, svc.openIncidents + delta);
}
