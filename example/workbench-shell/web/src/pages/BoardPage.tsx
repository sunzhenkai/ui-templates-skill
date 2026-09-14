import { useMemo, useState } from 'react'
import { GripVertical, Plus } from 'lucide-react'
import { PageHeader } from '../components/shell'
import { Avatar, Badge, Button, Card, EmptyState, Input, Select } from '../components/ui'
import { severityTone, statusTone } from '../lib'
import { useWorkbench } from '../store'
import type { IncidentStatus } from '../data/mock'

const columns: { id: IncidentStatus; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'mitigated', label: 'Mitigated' },
  { id: 'resolved', label: 'Resolved' },
]

export function BoardPage() {
  const { incidents, services, updateIncident, setCreateOpen, pushToast } = useWorkbench()
  const [query, setQuery] = useState('')
  const [service, setService] = useState('all')
  const [dragging, setDragging] = useState<string | null>(null)
  const filtered = useMemo(() => incidents.filter((incident) => (!query || incident.title.toLowerCase().includes(query.toLowerCase())) && (service === 'all' || incident.serviceId === service)), [incidents, query, service])
  const drop = (status: IncidentStatus) => {
    if (!dragging) return
    updateIncident(dragging, { status })
    pushToast({ tone: 'success', title: `已移动到 ${status}` })
    setDragging(null)
  }
  return <div className="flex h-full flex-col" data-testid="board-page">
    <PageHeader title="事件看板" description="拖动卡片更新事件状态，列表和详情会同步变化。" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus className="size-4" />创建事件</Button>} toolbar={<><Input aria-label="搜索看板" className="max-w-64" placeholder="搜索事件…" value={query} onChange={(event) => setQuery(event.target.value)} /><Select aria-label="服务筛选" className="w-40" value={service} onChange={(event) => setService(event.target.value)}><option value="all">全部服务</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><div className="ml-auto text-[11px] text-[var(--text-faint)]">拖动后状态立即更新</div></>} />
    <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-3 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => <Card key={column.id} className="flex min-h-72 min-w-0 flex-col p-3" onDragOver={(event) => event.preventDefault()} onDrop={() => drop(column.id)}>
        <div className="mb-3 flex items-center gap-2"><span className="text-[12px] font-semibold">{column.label}</span><Badge tone={statusTone(column.id) as never}>{filtered.filter((item) => item.status === column.id).length}</Badge><Button size="sm" variant="ghost" className="ml-auto" aria-label={`在 ${column.label} 创建`} onClick={() => setCreateOpen(true)}><Plus className="size-3" /></Button></div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {filtered.filter((item) => item.status === column.id).map((incident) => <article key={incident.id} draggable onDragStart={() => setDragging(incident.id)} onDragEnd={() => setDragging(null)} className={`cursor-grab rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition active:cursor-grabbing ${dragging === incident.id ? 'opacity-60 ring-2 ring-[var(--ring)]' : 'hover:bg-[var(--surface-hover)]'}`}>
            <div className="flex items-center gap-2"><GripVertical className="size-3 text-[var(--text-faint)]" /><Badge tone={severityTone(incident.severity) as never}>{incident.severity}</Badge><span className="ml-auto text-[10px] text-[var(--text-faint)]">{incident.number}</span></div>
            <h3 className="mt-2 text-[13px] font-medium leading-5">{incident.title}</h3>
            <div className="mt-3 flex items-center gap-2"><Avatar name={incident.assigneeId ?? '?'} size="sm" /><span className="truncate text-[11px] text-[var(--text-muted)]">{services.find((item) => item.id === incident.serviceId)?.name}</span></div>
          </article>)}
          {filtered.filter((item) => item.status === column.id).length === 0 && <EmptyState title="暂无事件" description="拖动其他列的卡片到这里。" />}
        </div>
      </Card>)}
    </div>
  </div>
}
