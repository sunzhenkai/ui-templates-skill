export type Severity = "sev1" | "sev2" | "sev3" | "sev4";
export type IncidentStatus =
  | "triggered"
  | "acknowledged"
  | "investigating"
  | "mitigated"
  | "resolved"
  | "cancelled";
export type ServiceHealth = "healthy" | "degraded" | "down";
export type Column = "triggered" | "acknowledged" | "investigating" | "mitigated" | "resolved";
export type InboxKind = "alert" | "assignment" | "confirmation";
export type InboxStatus = "open" | "done";

export interface Member {
  id: string;
  name: string;
  team: string;
  role: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
}

export interface Service {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  owner: string;
  team: string;
  env: "production" | "staging";
  health: ServiceHealth;
  uptime30d: number;
  openIncidents: number;
  description: string;
}

export interface Change {
  id: string;
  title: string;
  service: string;
  author: string;
  state: "pending" | "in-progress" | "done" | "failed";
  createdAt: string;
}

export interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "failed";
}

export interface Incident {
  id: string;
  number: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  service: string;
  assignee: string | null;
  teams: string[];
  createdAt: string;
  updatedAt: string;
  description: string;
  tags: string[];
  relatedChange: string | null;
  comments: Comment[];
  pinned: boolean;
  attachments: Attachment[];
}

export interface InboxItem {
  id: string;
  kind: InboxKind;
  title: string;
  detail: string;
  incident: string | null;
  severity: Severity | null;
  source: string;
  assignee: string;
  createdAt: string;
  status: InboxStatus;
}

export interface Shift {
  id: string;
  team: string;
  member: string;
  date: string; // yyyy-MM-dd
  slot: "day" | "night";
}

export interface TrendPoint {
  label: string;
  created: number;
  resolved: number;
}

export interface Distribution {
  name: string;
  value: number;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}
