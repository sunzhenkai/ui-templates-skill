import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { NavigationTrigger } from '@/components/layout/app-shell'
import { PageHeader, Toolbar } from '@/components/layout/page-header'
import { Badge, Button, SegmentedControl, Select, Skeleton, StateView } from '@/components/ui/primitives'
import { DropdownMenu, MenuItem } from '@/components/ui/overlay'
import { CreateIncidentDialog } from '@/components/global/create-incident-dialog'
import { useSimulatedLoad } from '@/lib/page-load'
import { relativeTime, uniqueId } from '@/lib/utils'
import type { IncidentStatus } from '@/types'

const columns: { status: IncidentStatus; label: string; icon: string }[] = [
  { status: 'pending', label: '待确认', icon: '○' },
  { status: 'processing', label: '处理中', icon: '◐' },
  { status: 'waiting', label: '等待外部', icon: '◇' },
  { status: 'resolved', label: '已解决', icon: '✓' },
  { status: 'archived', label: '已归档', icon: '▣' },
]

export function BoardPage() {
  const { data, updateData, showToast } = useApp()
  const [params, setParams] = useSearchParams()
  const load = useSimulatedLoad('board')
  const [dragId, setDragId] = useState<string>()
  const [createStatus, setCreateStatus] = useState<IncidentStatus>()
  const [mobileColumn, setMobileColumn] = useState<IncidentStatus>('pending')
  const get = (key: string) => params.get(key) ?? ''
  const patch = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => { if (!value) next.delete(key); else next.set(key, value) })
    setParams(next)
  }
  const scope = (params.get('scope') ?? 'all') as 'mine' | 'team' | 'all'
  const rows = data?.incidents ?? []
  const filtered = rows.filter(item => {
    if (scope === 'mine' && item.assigneeId !== data?.members[0]?.id) return false
    if (scope === 'team' && !item.teamIds.includes(data?.teams[0]?.id ?? '')) return false
    if (get('severity') && item.severity !== get('severity')) return false
    if (get('serviceId') && item.serviceId !== get('serviceId')) return false
    if (get('assigneeId') && item.assigneeId !== get('assigneeId')) return false
    return true
  })

  const move = async (id: string, status: IncidentStatus) => {
    const before = rows.find(item => item.id === id)
    if (!before || before.status === status) return
    const now = new Date().toISOString()
    updateData(current => ({ ...current, incidents: current.incidents.map(item => item.id === id ? { ...item, status, updatedAt: now, timeline: [...item.timeline, { id: uniqueId('tl'), at: now, actor: '当前用户', kind: 'status', text: `状态从 ${item.status} 变更为 ${status}。` }] } : item) }))
    await new Promise(resolve => setTimeout(resolve, 550))
    const fail = before.key.includes('APL-2002')
    if (fail) {
      updateData(current => ({ ...current, incidents: current.incidents.map(item => item.id === id ? { ...item, status: before.status } : item) }))
      showToast({ tone: 'error', title: '状态变更失败', description: `${before.key} 已恢复原列。`, action: { label: '重试', onClick: () => void move(id, status) } })
      return
    }
    showToast({ tone: 'success', title: '状态已更新', description: `${before.key} → ${status}` })
  }

  if (load.loading) return <div className="min-h-0 flex-1 p-4"><Skeleton className="h-12" /><div className="mt-3 grid gap-3 sm:grid-cols-5">{[0,1,2,3,4].map(index => <Skeleton key={index} className="h-72" />)}</div></div>
  if (load.error) return <StateView tone="danger" className="flex-1" icon="!" title="看板加载失败" description={load.error.message} action={<Button variant="primary" onClick={load.reload}>重试</Button>} />
  if (!data) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader icon="▣" title="事件看板" description="拖动卡片流转状态" left={<NavigationTrigger />} actions={<Button size="sm" variant="primary" onClick={() => setCreateStatus('pending')}>新建</Button>} />
      <Toolbar>
        <SegmentedControl label="看板范围" value={scope} onChange={value => patch({ scope: value })} options={[{ value: 'mine', label: '我的事件' }, { value: 'team', label: '我的团队' }, { value: 'all', label: '全部事件' }]} />
        <Select className="w-auto" aria-label="严重等级" value={get('severity')} onChange={event => patch({ severity: event.target.value })}>
          <option value="">全部等级</option>{['sev1','sev2','sev3','sev4'].map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}
        </Select>
        <Select className="w-auto" aria-label="服务筛选" value={get('serviceId')} onChange={event => patch({ serviceId: event.target.value })}>
          <option value="">全部服务</option>{data.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
        </Select>
        <Select className="w-auto" aria-label="负责人筛选" value={get('assigneeId')} onChange={event => patch({ assigneeId: event.target.value })}>
          <option value="">全部负责人</option>{data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
        </Select>
      </Toolbar>
      <div className="border-b border-border px-4 py-2 lg:hidden">
        <SegmentedControl label="移动端看板列" value={mobileColumn} onChange={setMobileColumn} options={columns.map(column => ({ value: column.status, label: column.label }))} />
      </div>
      <div className="scroll-stable flex min-h-0 flex-1 gap-3 overflow-x-auto bg-muted p-3">
        {columns.map(column => {
          const items = filtered.filter(item => item.status === column.status)
          const hiddenMobile = mobileColumn !== column.status
          return (
            <section
              key={column.status}
              aria-label={`${column.label}列，${items.length}项`}
              onDragOver={event => event.preventDefault()}
              onDrop={() => { if (dragId) void move(dragId, column.status); setDragId(undefined) }}
              className={`flex min-h-0 w-72 shrink-0 flex-col rounded-card border border-border ${hiddenMobile ? 'hidden lg:flex' : 'flex'}`}
              style={{ background: column.status === 'resolved' ? 'var(--success-tint)' : column.status === 'waiting' ? 'var(--warning-tint)' : column.status === 'archived' ? 'var(--muted)' : column.status === 'processing' ? 'rgb(37 99 235 / .06)' : 'var(--surface)' }}
            >
              <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
                <span aria-hidden>{column.icon}</span><h2 className="font-label">{column.label}</h2>
                <span className="numeric font-caption text-muted-foreground">{items.length}</span>
                <div className="ml-auto flex items-center">
                  <DropdownMenu trigger={({ toggle }) => <Button variant="ghost" size="sm" aria-label={`${column.label}列操作`} onClick={toggle}>…</Button>}>
                    <MenuItem onSelect={() => showToast({ tone: 'info', title: '列已折叠' })}>折叠列</MenuItem>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm" aria-label={`在${column.label}创建事件`} onClick={() => setCreateStatus(column.status)}>+</Button>
                </div>
              </header>
              <div className="scroll-stable min-h-0 flex-1 overflow-y-auto p-2">
                {items.length === 0 ? <StateView icon={column.icon} title="没有事件" className="py-8" description="拖入卡片或从列头创建。" /> : items.map(item => (
                  <article
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onDragEnd={() => setDragId(undefined)}
                    aria-grabbed={dragId === item.id}
                    className="mb-2 rounded-card border border-border bg-surface p-3 shadow-none transition-transform hover:bg-surface-hover aria-grabbed:opacity-60"
                  >
                    <div className="flex items-center gap-2">
                      <Link to={`/events/${item.id}?ws=${params.get('ws') ?? ''}`} className="numeric font-micro text-brand hover:underline">{item.key}</Link>
                      <Badge tone={item.severity === 'sev1' ? 'danger' : item.severity === 'sev2' ? 'warning' : 'muted'}>{item.severity.toUpperCase()}</Badge>
                      <div className="ml-auto">
                        <DropdownMenu trigger={({ toggle }) => <Button variant="ghost" size="sm" aria-label={`${item.key} 快捷操作`} onClick={toggle}>…</Button>}>
                          <MenuItem onSelect={() => patch({ id: item.id })}>打开详情</MenuItem>
                          <MenuItem onSelect={() => updateData(current => ({ ...current, incidents: current.incidents.map(entry => entry.id === item.id ? { ...entry, assigneeId: current.members[0].id } : entry) }))}>分派负责人</MenuItem>
                          <MenuItem onSelect={() => updateData(current => ({ ...current, incidents: current.incidents.map(entry => entry.id === item.id ? { ...entry, tagIds: [...new Set([...entry.tagIds, 'board'])] } : entry) }))}>添加标签</MenuItem>
                          <MenuItem onSelect={() => { void navigator.clipboard?.writeText(item.key); showToast({ tone: 'success', title: '编号已复制' }) }}>复制编号</MenuItem>
                          <MenuItem danger onSelect={() => move(item.id, 'archived')}>归档</MenuItem>
                        </DropdownMenu>
                      </div>
                    </div>
                    <Link to={`/events/${item.id}?ws=${params.get('ws') ?? ''}`} className="mt-1 line-clamp-2 rounded-sm font-body hover:underline">{item.title}</Link>
                    <p className="truncate font-caption text-muted-foreground">{data.services.find(service => service.id === item.serviceId)?.name}</p>
                    <footer className="mt-2 flex items-center justify-between font-caption text-muted-foreground">
                      <span className="flex items-center gap-1"><span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-muted font-micro">{data.members.find(member => member.id === item.assigneeId)?.name.slice(0,1) ?? '—'}</span>{data.members.find(member => member.id === item.assigneeId)?.name ?? '未分派'}</span>
                      <span className="numeric">{item.comments.length} 评论 · {relativeTime(item.updatedAt)}</span>
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
      <CreateIncidentDialog open={!!createStatus} defaultStatus={createStatus ?? 'pending'} onClose={() => setCreateStatus(undefined)} />
    </div>
  )
}
