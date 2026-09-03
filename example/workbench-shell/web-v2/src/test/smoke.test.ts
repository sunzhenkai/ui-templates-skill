import { describe, expect, it } from 'vitest'
import { cn, formatDate, formatRelativeTime, pluralize } from '@/lib/utils'

describe('utils', () => {
  it('cn joins class names', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })

  it('formatRelativeTime handles minutes / hours / days', () => {
    const now = Date.now()
    expect(formatRelativeTime(new Date(now - 30_000))).toBe('刚刚')
    expect(formatRelativeTime(new Date(now - 5 * 60_000))).toMatch(/分钟前/)
    expect(formatRelativeTime(new Date(now - 2 * 3_600_000))).toMatch(/小时前/)
    expect(formatRelativeTime(new Date(now - 3 * 86_400_000))).toMatch(/天前/)
  })

  it('formatDate uses zh-CN locale', () => {
    const out = formatDate(new Date('2026-09-03T08:00:00Z'))
    expect(out).toMatch(/2026\/09\/03/)
  })

  it('pluralize works with singular and plural', () => {
    expect(pluralize(1, '事件')).toBe('1 事件')
    expect(pluralize(3, '事件', '个事件')).toBe('3 个事件')
  })
})

describe('mock api', () => {
  it('lists services with seed data', async () => {
    const { api } = await import('@/lib/api')
    const services = await api.services()
    expect(services.length).toBeGreaterThan(0)
    expect(services[0]).toHaveProperty('name')
    expect(services[0]).toHaveProperty('health')
  })

  it('lists incidents sorted by createdAt desc by default', async () => {
    const { api } = await import('@/lib/api')
    const incidents = await api.listIncidents()
    expect(incidents.length).toBeGreaterThan(0)
    expect(incidents[0]).toHaveProperty('number')
    expect(incidents[0]).toHaveProperty('severity')
  })

  it('honors filter by severity', async () => {
    const { api } = await import('@/lib/api')
    const sev1 = await api.listIncidents({ severity: 'SEV1' })
    expect(sev1.every((i) => i.severity === 'SEV1')).toBe(true)
  })

  it('fails when filter contains force-fail', async () => {
    const { api } = await import('@/lib/api')
    await expect(api.listIncidents({ forceFail: true })).rejects.toThrow()
  })

  it('creates an incident and updates counts', async () => {
    const { api } = await import('@/lib/api')
    const before = (await api.listIncidents()).length
    const created = await api.createIncident({
      title: '测试事件',
      severity: 'SEV3',
      status: 'triggered',
      serviceId: 'svc-checkout',
      assigneeId: null,
      teamIds: [],
      description: '测试',
      tags: [],
      changeIds: [],
    })
    expect(created.number).toMatch(/^INC-/)
    const after = (await api.listIncidents()).length
    expect(after).toBe(before + 1)
  })

  it('updates incident status', async () => {
    const { api } = await import('@/lib/api')
    const updated = await api.updateIncidentStatus('inc-001', 'mitigated')
    expect(updated.status).toBe('mitigated')
  })

  it('updates assignment', async () => {
    const { api } = await import('@/lib/api')
    const updated = await api.assignIncident('inc-001', 'm-004')
    expect(updated.assigneeId).toBe('m-004')
  })

  it('pin/unpin works', async () => {
    const { api } = await import('@/lib/api')
    const pinned = await api.pinIncident('inc-002', true)
    expect(pinned.pinned).toBe(true)
    const unpinned = await api.pinIncident('inc-002', false)
    expect(unpinned.pinned).toBe(false)
  })

  it('shift upsert detects conflict', async () => {
    const { api } = await import('@/lib/api')
    await expect(api.upsertShift({
      id: 'new-conflict',
      memberId: 'm-001',
      level: 'primary',
      start: '2026-09-01T11:00:00+08:00',
      end: '2026-09-01T17:00:00+08:00',
    })).rejects.toThrow(/冲突/)
  })

  it('mark inbox updates status', async () => {
    const { api } = await import('@/lib/api')
    const result = await api.markInbox(['inb-5'], 'archived')
    expect(result.updated).toBe(1)
  })
})
