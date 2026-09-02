import { createSeed } from './seed'
import type { ApiResult, WorkspaceData, WorkspaceId } from '@/types'

const databases = createSeed()
const failureKey = 'demo-fail'

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }

function shouldFail(key: string) {
  try { return (localStorage.getItem(failureKey) ?? '').split(',').filter(Boolean).includes(key) }
  catch { return false }
}

export function setDemoFailure(key: string, enabled = true) {
  try {
    const values = new Set((localStorage.getItem(failureKey) ?? '').split(',').filter(Boolean))
    if (enabled) values.add(key); else values.delete(key)
    localStorage.setItem(failureKey, [...values].join(','))
  } catch { /* 本地存储不可用时忽略 */ }
}

async function respond<T>(key: string, make: () => T, delay = 320): Promise<ApiResult<T>> {
  await sleep(delay)
  if (shouldFail(key)) throw new Error(`Network unavailable: ${key}`)
  return { data: make(), total: Array.isArray(make()) ? (make() as unknown[]).length : undefined }
}

export function listWorkspaces() {
  return respond('workspaces', () => Object.values(databases).map(item => item.workspace), 120)
}

export function fetchWorkspace(id: WorkspaceId) {
  return respond(`workspace:${id}`, () => databases[id] ?? databases.apollo, 380)
}

export function getWorkspace(id: WorkspaceId): WorkspaceData {
  return databases[id] ?? databases.apollo
}

export function saveWorkspace(id: WorkspaceId, next: WorkspaceData) {
  databases[id] = next
}

export function createExport(rows: Record<string, unknown>[], filename: string) {
  const csv = [Object.keys(rows[0] ?? {}), ...rows.map(Object.values)].map(row => row.map(String).map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
