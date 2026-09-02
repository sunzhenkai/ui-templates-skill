import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { NavigationTrigger } from '@/components/layout/app-shell'
import { PageHeader, Toolbar } from '@/components/layout/page-header'
import { Badge, Button, Input, SegmentedControl, Select, Skeleton, StateView } from '@/components/ui/primitives'
import { ConfirmDialog, DropdownMenu, MenuItem } from '@/components/ui/overlay'
import { ServiceFormDialog } from './service-form'
import { useSimulatedLoad } from '@/lib/page-load'
import { relativeTime } from '@/lib/utils'
import type { Service } from '@/types'

export function ServicesPage() {
  const { data, updateData, showToast } = useApp()
  const [params, setParams] = useSearchParams()
  const load = useSimulatedLoad('services')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Service>()
  const [confirm, setConfirm] = useState<{ type: 'disable' | 'enable'; service: Service }>()
  const get = (key: string) => params.get(key) ?? ''
  const patch = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => { if (!value) next.delete(key); else next.set(key, value) })
    setParams(next)
  }
  const rows = data?.services ?? []
  const incidentCount = (serviceId: string) => data?.incidents.filter(item => item.serviceId === serviceId).length ?? 0
  const filtered = useMemo(() => rows.filter(service => {
    if (get('q') && !`${service.name} ${service.key} ${service.description}`.toLowerCase().includes(get('q').toLowerCase())) return false
    if (get('health') && service.health !== get('health')) return false
    if (get('teamId') && service.teamId !== get('teamId')) return false
    if (get('environment') && service.environment !== get('environment')) return false
    return true
  }).sort((left, right) => {
    const sort = get('sort') || 'name'
    if (sort === 'events') return (incidentCount(right.id) - incidentCount(left.id))
    if (sort === 'updated') return right.lastChangeAt.localeCompare(left.lastChangeAt)
    return left.name.localeCompare(right.name)
  }), [params, rows])

  if (load.loading) return <div className="min-h-0 flex-1 p-4"><Skeleton className="h-12" /><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0,1,2,3,4,5].map(index => <Skeleton key={index} className="h-36" />)}</div></div>
  if (load.error) return <StateView tone="danger" className="flex-1" icon="!" title="服务目录加载失败" description={load.error.message} action={<Button variant="primary" onClick={load.reload}>重试</Button>} />
  if (!data) return null
  const view = (params.get('view') ?? 'cards') as 'list' | 'cards'

  const healthTone = (health: Service['health']) => health === 'healthy' ? 'success' : health === 'degraded' ? 'warning' : health === 'down' ? 'danger' : 'muted'
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader icon="◈" title="服务目录" description={`${filtered.length} 个服务`} left={<NavigationTrigger />} actions={<Button size="sm" variant="primary" onClick={() => { setEditing(undefined); setFormOpen(true) }}>新建服务</Button>} />
      <Toolbar>
        <SegmentedControl label="视图" value={view} onChange={value => patch({ view: value })} options={[{ value: 'cards', label: '聚合卡片' }, { value: 'list', label: '列表视图' }]} />
        <Input className="w-40" value={get('q')} onChange={event => patch({ q: event.target.value })} placeholder="搜索服务" aria-label="搜索服务" />
        <Select className="w-auto" aria-label="健康状态" value={get('health')} onChange={event => patch({ health: event.target.value })}><option value="">全部健康状态</option>{['healthy','degraded','down','disabled'].map(value => <option key={value} value={value}>{value}</option>)}</Select>
        <Select className="w-auto" aria-label="所属团队" value={get('teamId')} onChange={event => patch({ teamId: event.target.value })}><option value="">全部团队</option>{data.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</Select>
        <Select className="w-auto" aria-label="环境" value={get('environment')} onChange={event => patch({ environment: event.target.value })}><option value="">全部环境</option>{['production','staging','development'].map(value => <option key={value} value={value}>{value}</option>)}</Select>
        <Select className="ml-auto w-auto" aria-label="排序" value={get('sort') || 'name'} onChange={event => patch({ sort: event.target.value })}><option value="name">按名称</option><option value="events">按事件数量</option><option value="updated">按更新时间</option></Select>
      </Toolbar>
      <div className="scroll-stable min-h-0 flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? <StateView icon="◈" title="暂无服务" description="创建服务后可跟踪事件和健康状态。" action={<Button variant="primary" onClick={() => setFormOpen(true)}>新建服务</Button>} /> : view === 'cards' ? (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {filtered.map(service => (
              <article key={service.id} className="rounded-card border border-border bg-surface p-3 hover:bg-surface-hover">
                <header className="flex items-start gap-2">
                  <Link to={`/services/${service.id}?ws=${params.get('ws') ?? ''}`} className="min-w-0 flex-1 rounded-sm font-title-sm hover:underline">{service.name}</Link>
                  <DropdownMenu trigger={({ toggle }) => <Button size="sm" variant="ghost" aria-label={`${service.name} 操作`} onClick={toggle}>…</Button>}>
                    <MenuItem onSelect={() => { setEditing(service); setFormOpen(true) }}>编辑</MenuItem>
                    <MenuItem danger={service.status === 'active'} onSelect={() => setConfirm({ type: service.status === 'active' ? 'disable' : 'enable', service })}>{service.status === 'active' ? '停用' : '恢复'}</MenuItem>
                  </DropdownMenu>
                </header>
                <p className="line-clamp-2 font-caption text-muted-foreground">{service.description}</p>
                <div className="mt-2 flex flex-wrap gap-1"><Badge tone={healthTone(service.health)}>{service.health}</Badge><Badge>{service.environment}</Badge><Badge>{data.teams.find(team => team.id === service.teamId)?.name}</Badge></div>
                <footer className="mt-3 flex items-center justify-between font-caption text-muted-foreground"><span>{data.members.find(member => member.id === service.ownerId)?.name}</span><span className="numeric">{relativeTime(service.lastChangeAt)}</span></footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-200">
              <thead className="bg-surface"><tr><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">服务名称</th><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">所属团队</th><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">负责人</th><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">健康</th><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">最近事件</th><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">更新时间</th></tr></thead>
              <tbody>{filtered.map(service => (
                <tr key={service.id} className="border-b border-surface-border hover:bg-surface-hover">
                  <td className="px-3 py-2"><Link to={`/services/${service.id}?ws=${params.get('ws') ?? ''}`} className="rounded-sm font-body hover:underline">{service.name}</Link></td>
                  <td className="px-3 py-2 font-body">{data.teams.find(team => team.id === service.teamId)?.name}</td>
                  <td className="px-3 py-2 font-body">{data.members.find(member => member.id === service.ownerId)?.name}</td>
                  <td className="px-3 py-2"><Badge tone={healthTone(service.health)}>{service.health}</Badge></td>
                  <td className="numeric px-3 py-2 font-body">{data.incidents.filter(item => item.serviceId === service.id).length}</td>
                  <td className="numeric px-3 py-2 font-caption text-muted-foreground">{relativeTime(service.lastChangeAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <ServiceFormDialog open={formOpen} service={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog open={!!confirm} title={confirm?.type === 'disable' ? '停用服务' : '恢复服务'} message={`确认${confirm?.type === 'disable' ? '停用' : '恢复'} ${confirm?.service.name}？停用后不允许创建新的关联事件。`} confirmLabel={confirm?.type === 'disable' ? '停用' : '恢复'} onClose={() => setConfirm(undefined)} onConfirm={() => {
        if (!confirm) return
        const nextHealth = confirm.type === 'disable' ? 'disabled' : 'healthy'
        updateData(current => ({ ...current, services: current.services.map(item => item.id === confirm.service.id ? { ...item, status: confirm.type === 'disable' ? 'disabled' : 'active', health: nextHealth } : item) }))
        showToast({ tone: 'success', title: confirm.type === 'disable' ? '服务已停用' : '服务已恢复' }); setConfirm(undefined)
      }} />
    </div>
  )
}
