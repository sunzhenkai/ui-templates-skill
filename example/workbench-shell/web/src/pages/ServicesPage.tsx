import { useState } from 'react'
import { Activity, CheckCircle2, ExternalLink, Server, TriangleAlert } from 'lucide-react'
import { PageHeader } from '../components/shell'
import { Badge, Button, Card, EmptyState, Input } from '../components/ui'
import { statusTone } from '../lib'
import { useWorkbench } from '../store'

export function ServicesPage() {
  const { services, updateService, pushToast } = useWorkbench()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const filtered = services.filter((service) => service.name.toLowerCase().includes(query.toLowerCase()))
  const current = services.find((service) => service.id === selected)
  return <div className="flex h-full flex-col" data-testid="services-page">
    <PageHeader title="服务目录" description="服务健康、SLO 和负责人一览。" actions={<Button onClick={() => pushToast({ tone: 'success', title: '服务目录已刷新' })}><Activity className="size-4" />刷新</Button>} toolbar={<Input aria-label="搜索服务" className="max-w-64" placeholder="搜索服务…" value={query} onChange={(event) => setQuery(event.target.value)} />} />
    <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.length === 0 ? <EmptyState title="没有匹配服务" description="尝试其他关键词。" /> : filtered.map((service) => <Card key={service.id} className="p-4" onClick={() => setSelected(service.id)}><div className="flex items-start justify-between gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[var(--surface-hover)]"><Server className="size-4 text-[var(--text-muted)]" /></div><Badge tone={statusTone(service.health) as never}>{service.health}</Badge></div><h2 className="mt-3 text-[14px] font-semibold">{service.name}</h2><p className="mt-1 text-[11px] text-[var(--text-faint)]">{service.owner} · {service.region}</p><div className="mt-4 grid grid-cols-2 gap-2 text-[11px]"><div className="rounded-md bg-[var(--surface-hover)] p-2"><div className="text-[var(--text-faint)]">SLO</div><div className="mt-1 text-[14px] font-semibold">{service.slo}%</div></div><div className="rounded-md bg-[var(--surface-hover)] p-2"><div className="text-[var(--text-faint)]">事件</div><div className="mt-1 text-[14px] font-semibold">{service.incidents}</div></div></div></Card>)}</div>
      <aside>{current ? <Card className="sticky top-3 p-4"><div className="flex items-start justify-between"><div><h2 className="text-[16px] font-semibold">{current.name}</h2><p className="mt-1 text-[11px] text-[var(--text-faint)]">{current.owner} · {current.region}</p></div><Button variant="ghost" size="sm"><ExternalLink className="size-4" />打开</Button></div><div className="mt-4 rounded-lg border border-[var(--border)] p-3"><div className="flex items-center gap-2">{current.health === 'operational' ? <CheckCircle2 className="size-4 text-[var(--success)]" /> : <TriangleAlert className="size-4 text-[var(--warning)]" />}<span className="text-[12px] font-medium">当前健康度</span><Badge className="ml-auto" tone={statusTone(current.health) as never}>{current.health}</Badge></div><p className="mt-2 text-[12px] text-[var(--text-muted)]">过去 24 小时没有新的错误预算突破。</p></div><div className="mt-4 space-y-2"><Button className="w-full justify-start" onClick={() => updateService(current.id, { health: 'operational' })}>标记为 operational</Button><Button className="w-full justify-start" onClick={() => updateService(current.id, { health: 'degraded' })}>标记为 degraded</Button><Button className="w-full justify-start" onClick={() => pushToast({ tone: 'info', title: '已创建服务备注' })}>添加备注</Button></div></Card> : <Card className="grid min-h-64 place-items-center p-6 text-center"><div><Server className="mx-auto size-6 text-[var(--text-faint)]" /><p className="mt-2 text-[12px] text-[var(--text-muted)]">选择一个服务查看详情</p></div></Card>}</aside>
    </div>
  </div>
}
