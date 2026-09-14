import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDownAZ, Columns3, Filter, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '../components/shell'
import { Avatar, Badge, Button, Card, EmptyState, Input, Select, Tabs } from '../components/ui'
import { formatDate, severityTone, statusTone } from '../lib'
import { useWorkbench } from '../store'

export function IncidentsPage() {
  const navigate = useNavigate()
  const { incidents, services, setCreateOpen } = useWorkbench()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<'table' | 'board'>(searchParams.get('view') === 'board' ? 'board' : 'table')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [service, setService] = useState('all')
  const [sort, setSort] = useState<'updated' | 'severity' | 'number'>('updated')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const pageSize = 8
  const filtered = useMemo(() => {
    const items = incidents.filter((incident) => {
      if (query && !`${incident.number} ${incident.title}`.toLowerCase().includes(query.toLowerCase())) return false
      if (status !== 'all' && incident.status !== status) return false
      if (severity !== 'all' && incident.severity !== severity) return false
      if (service !== 'all' && incident.serviceId !== service) return false
      return true
    })
    return items.sort((a, b) => sort === 'number' ? b.number.localeCompare(a.number) : sort === 'severity' ? severityOrder(a.severity) - severityOrder(b.severity) : b.updatedAt.localeCompare(a.updatedAt))
  }, [incidents, query, status, severity, service, sort])
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
  const showLoading = () => { setLoading(true); window.setTimeout(() => setLoading(false), 450) }
  return <div className="flex h-full flex-col" data-testid="incidents-page">
    <PageHeader title="事件" description={`${incidents.filter((item) => item.status !== 'resolved').length} 个进行中`} actions={<><Button onClick={showLoading}><RefreshCw className="size-4" />刷新</Button><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus className="size-4" />创建事件</Button></>} toolbar={<>
      <Input aria-label="搜索事件" className="max-w-64" placeholder="搜索编号或标题…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} />
      <Select aria-label="事件状态" className="w-32" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="mitigated">Mitigated</option><option value="resolved">Resolved</option></Select>
      <Select aria-label="严重等级" className="w-28" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="all">全部等级</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>
      <Select aria-label="服务" className="w-36" value={service} onChange={(event) => setService(event.target.value)}><option value="all">全部服务</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
      <Button variant="ghost" onClick={() => { setStatus('all'); setSeverity('all'); setService('all'); setQuery('') }}>重置</Button>
      <div className="ml-auto flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="排序" onClick={() => setSort(sort === 'updated' ? 'severity' : sort === 'severity' ? 'number' : 'updated')}><ArrowDownAZ className="size-4" /></Button><Button variant="ghost" size="icon" aria-label="列设置"><Columns3 className="size-4" /></Button></div>
    </>} />
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <div className="mb-3 flex items-center justify-between"><Tabs items={[{ id: 'table', label: '列表' }, { id: 'board', label: '看板' }]} value={view} onChange={(value) => setView(value as 'table' | 'board')} /><div className="text-[11px] text-[var(--text-faint)]">{filtered.length} 个结果 · 排序：{sort}</div></div>
      {loading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-[var(--surface-hover)]" />)}</div> : paged.length === 0 ? <EmptyState title="没有匹配事件" description="尝试调整筛选条件，或创建一个新事件。" action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus className="size-4" />创建事件</Button>} /> : view === 'table' ? <Card className="min-h-0 flex-1 overflow-auto"><table className="w-full min-w-[760px] border-collapse text-left text-[12px]"><thead className="sticky top-0 z-10 bg-[var(--surface)] text-[11px] text-[var(--text-faint)]"><tr className="border-b border-[var(--border)]"><th className="px-3 py-2 font-medium">事件</th><th className="px-3 py-2 font-medium">服务</th><th className="px-3 py-2 font-medium">等级</th><th className="px-3 py-2 font-medium">状态</th><th className="px-3 py-2 font-medium">负责人</th><th className="px-3 py-2 font-medium">更新时间</th></tr></thead><tbody>{paged.map((incident) => <tr key={incident.id} className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]" onClick={() => navigate(`/incidents/${incident.id}`)}><td className="max-w-[360px] px-3 py-2"><div className="truncate font-medium">{incident.number} · {incident.title}</div><div className="mt-0.5 flex gap-1">{incident.tags.map((tag) => <span key={tag} className="text-[10px] text-[var(--text-faint)]">#{tag}</span>)}</div></td><td className="px-3 py-2 text-[var(--text-muted)]">{services.find((item) => item.id === incident.serviceId)?.name}</td><td className="px-3 py-2"><Badge tone={severityTone(incident.severity) as never}>{incident.severity}</Badge></td><td className="px-3 py-2"><Badge tone={statusTone(incident.status) as never}>{incident.status}</Badge></td><td className="px-3 py-2"><div className="flex items-center gap-2"><Avatar name={incident.assigneeId ?? '?'} size="sm" /><span>{incident.assigneeId ?? '未分配'}</span></div></td><td className="px-3 py-2 text-[var(--text-faint)]">{formatDate(incident.updatedAt)}</td></tr>)}</tbody></table></Card> : <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto md:grid-cols-2 xl:grid-cols-4">{['open', 'investigating', 'mitigated', 'resolved'].map((column) => <Card key={column} className="flex min-h-64 flex-col p-3"><div className="mb-3 flex items-center justify-between"><span className="text-[12px] font-medium capitalize">{column}</span><Badge>{filtered.filter((item) => item.status === column).length}</Badge></div><div className="space-y-2">{filtered.filter((item) => item.status === column).map((incident) => <button key={incident.id} className="w-full rounded-lg border border-[var(--border)] p-3 text-left hover:bg-[var(--surface-hover)]" onClick={() => navigate(`/incidents/${incident.id}`)}><div className="flex items-center gap-2"><Badge tone={severityTone(incident.severity) as never}>{incident.severity}</Badge><span className="text-[10px] text-[var(--text-faint)]">{incident.number}</span></div><div className="mt-2 text-[13px] font-medium">{incident.title}</div></button>)}</div></Card>)}</div>}
      {view === 'table' && filtered.length > pageSize && <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--text-muted)]"><span>第 {page} / {Math.ceil(filtered.length / pageSize)} 页</span><div className="flex gap-2"><Button size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>上一页</Button><Button size="sm" disabled={page >= Math.ceil(filtered.length / pageSize)} onClick={() => setPage((value) => value + 1)}>下一页</Button></div></div>}
    </div>
  </div>
}

function severityOrder(severity: string) { return severity === 'critical' ? 0 : severity === 'high' ? 1 : severity === 'medium' ? 2 : 3 }
