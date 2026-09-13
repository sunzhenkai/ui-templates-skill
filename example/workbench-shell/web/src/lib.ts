import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** mock 请求延迟；SLOW_MS=0 时即时返回 */
export const SLOW_MS = 350;

export function delay<T>(value: T, ms = SLOW_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * prompts §五：可触发的模拟失败。
 * URL 带 ?fail=<key> 或 localStorage.workbench_fail_keys 含 key 时请求失败。
 */
export function shouldFail(key: string): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const fail = params.get("fail");
    if (fail && (fail === "*" || fail.split(",").includes(key))) return true;
    const stored = window.localStorage.getItem("workbench_fail_keys") ?? "";
    return stored.split(",").filter(Boolean).includes(key);
  } catch {
    return false;
  }
}

export class MockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockError";
  }
}

export async function mockRequest<T>(key: string, value: () => T, ms = SLOW_MS): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  if (shouldFail(key)) throw new MockError(`模拟失败：${key}（URL ?fail= 或 localStorage.workbench_fail_keys 可触发）`);
  return value();
}

let seq = 1000;
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  return formatDateTime(iso).slice(0, 10);
}

/** 名字 → 稳定头像色（neutral 底 + 语义文字色由组件处理） */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
