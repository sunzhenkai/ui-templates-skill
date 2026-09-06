import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return formatDateTime(iso);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const severityLabel: Record<string, string> = {
  sev1: "SEV-1",
  sev2: "SEV-2",
  sev3: "SEV-3",
  sev4: "SEV-4",
};

export const incidentStatusLabel: Record<string, string> = {
  triggered: "已触发",
  acknowledged: "已确认",
  investigating: "处理中",
  mitigated: "已缓解",
  resolved: "已解决",
  cancelled: "已取消",
};

export const healthLabel: Record<string, string> = {
  healthy: "健康",
  degraded: "降级",
  down: "故障",
};
