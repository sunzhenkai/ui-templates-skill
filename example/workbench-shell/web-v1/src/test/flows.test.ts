import { describe, expect, it } from 'vitest'
import { getHealth } from '@/lib/api/health'
import { createIncident, listIncidents, listInbox, upsertShift } from '@/lib/api/client'
import { usePrefsStore } from '@/stores/prefs-store'

describe('health contract', () => {
  it('returns ok', async () => {
    await expect(getHealth()).resolves.toEqual({ status: 'ok', service: 'workbench-shell' })
  })
})

describe('incident lifecycle', () => {
  it('creates an incident and updates inbox', async () => {
    usePrefsStore.setState({ delayMs: 0, forceFail: false })
    const beforeInbox = await listInbox('ws-alpha')
    const created = await createIncident('ws-alpha', {
      title: '测试创建事件',
      serviceIds: ['svc-gateway'],
      severity: 'high',
      status: 'pending-confirm',
      ownerId: 'mem-lin',
      teamIds: ['team-sre'],
      startedAt: new Date().toISOString(),
      description: 'vitest',
      tags: ['test'],
      changeIds: [],
    })
    expect(created.number).toMatch(/^INC-/)
    const incidents = await listIncidents('ws-alpha')
    expect(incidents.some((item) => item.id === created.id)).toBe(true)
    const inbox = await listInbox('ws-alpha')
    expect(inbox.length).toBeGreaterThan(beforeInbox.length)
  })

  it('rejects overlapping oncall shifts unless forced', async () => {
    usePrefsStore.setState({ delayMs: 0, forceFail: false })
    await expect(upsertShift('ws-alpha', {
      teamId: 'team-sre',
      memberId: 'mem-chen',
      startAt: '2026-09-04T00:00:00.000Z',
      endAt: '2026-09-04T20:00:00.000Z',
      handoffToId: null,
      note: 'conflict',
    })).rejects.toThrow(/重叠/)
  })
})
