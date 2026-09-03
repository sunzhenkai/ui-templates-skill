import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ShieldAlert, ShieldCheck, ShieldOff, ShieldQuestion, X } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/app-shell/page-header'
import { Toolbar, ToolbarSection, ToolbarSeparator } from '@/components/app-shell/toolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/shared/skeletons'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import type { Service, ServiceHealth, ServiceTier } from '@/lib/types'

const HEALTH_META: Record<ServiceHealth, { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
  healthy: { label: '正常', tone: 'text-success', icon: ShieldCheck },
  degraded: { label: '降级', tone: 'text-warning', icon: ShieldQuestion },
  partial_outage: { label: '部分故障', tone: 'text-warning', icon: ShieldAlert },
  major_outage: { label: '严重故障', tone: 'text-destructive', icon: ShieldOff },
}

const TIER_LABEL: Record<ServiceTier, string> = {
  'tier-1': 'Tier 1',
  'tier-2': 'Tier 2',
  'tier-3': 'Tier 3',
}

export function ServicesPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [params, setParams] = useSearchParams()
  const tier = params.get('tier') ?? 'all'
  const health = params.get('health') ?? 'all'
  const ownerTeam = params.get('team') ?? 'all'
  const [q, setQ] = useState(params.get('q') ?? '')
  const debouncedQ = useDebouncedValue(q, 200)

  const servicesQ = useQuery({ queryKey: ['services'], queryFn: api.services })
  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: api.teams })

  const filtered = useMemo(() => {
    const items = servicesQ.data ?? []
    return items.filter((s) => {
      if (tier !== 'all' && s.tier !== tier) return false
      if (health !== 'all' && s.health !== health) return false
      if (ownerTeam !== 'all' && s.ownerTeamId !== ownerTeam) return false
      if (debouncedQ && !(s.name.toLowerCase().includes(debouncedQ.toLowerCase()) || s.description.toLowerCase().includes(debouncedQ.toLowerCase()))) return false
      return true
    })
  }, [servicesQ.data, tier, health, ownerTeam, debouncedQ])

  function update(next: Record<string, string | null>) {
    const np = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '' || v === 'all') np.delete(k)
      else np.set(k, v)
    }
    setParams(np, { replace: true })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="服务目录"
        meta={`共 ${filtered.length} 个服务`}
        description="服务健康等级与归属团队；点击卡片查看详情。"
      />
      <Toolbar>
        <ToolbarSection className="flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-7" placeholder="搜索服务名、描述…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={tier} onValueChange={(v) => update({ tier: v })}>
            <SelectTrigger className="w-[110px]"><SelectValue placeholder="层级" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部层级</SelectItem>
              <SelectItem value="tier-1">Tier 1</SelectItem>
              <SelectItem value="tier-2">Tier 2</SelectItem>
              <SelectItem value="tier-3">Tier 3</SelectItem>
            </SelectContent>
          </Select>
          <Select value={health} onValueChange={(v) => update({ health: v })}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="健康" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部健康</SelectItem>
              <SelectItem value="healthy">正常</SelectItem>
              <SelectItem value="degraded">降级</SelectItem>
              <SelectItem value="partial_outage">部分故障</SelectItem>
              <SelectItem value="major_outage">严重故障</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ownerTeam} onValueChange={(v) => update({ team: v })}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="归属团队" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部团队</SelectItem>
              {teamsQ.data?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </ToolbarSection>
        <ToolbarSeparator />
        <ToolbarSection>
          <Button variant="ghost" size="sm" onClick={() => { setQ(''); setParams(new URLSearchParams(), { replace: true }) }}>
            <X className="size-4" /> 重置
          </Button>
        </ToolbarSection>
      </Toolbar>

      <div className="flex-1 overflow-y-auto p-4">
        {servicesQ.isPending ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : servicesQ.isError ? (
          <ErrorState onRetry={() => servicesQ.refetch()} description={servicesQ.error instanceof Error ? servicesQ.error.message : undefined} />
        ) : filtered.length === 0 ? (
          <EmptyState title="没有匹配的服务" description="尝试调整筛选条件或关键字。" action={<Button variant="outline" size="sm" onClick={() => { setQ(''); setParams(new URLSearchParams(), { replace: true }) }}>清除筛选</Button>} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {filtered.map((s) => (
              <ServiceCard key={s.id} service={s} onOpen={() => navigate(`/services/${s.id}`)} />
            ))}
          </div>
        )}
      </div>

      <ServiceDetailSheet id={id ?? null} onClose={() => navigate('/services')} />
    </div>
  )
}

function ServiceCard({ service, onOpen }: { service: Service; onOpen: () => void }) {
  const meta = HEALTH_META[service.health]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left shadow-surface',
        'hover:border-foreground/20 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
      )}
    >
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-micro">{TIER_LABEL[service.tier]}</Badge>
        <span className={cn('flex items-center gap-1 text-caption font-medium', meta.tone)}>
          <Icon className="size-3.5" /> {meta.label}
        </span>
      </div>
      <h3 className="font-mono text-body font-semibold leading-5">{service.name}</h3>
      <p className="line-clamp-2 text-caption text-muted-foreground">{service.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        {service.tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="ghost" className="px-1 py-0 text-micro">{t}</Badge>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-micro tabular text-muted-foreground">
        <span>开放事件 {service.openIncidents}</span>
        <span>MTTR {service.mttrMinutes}m</span>
      </div>
    </button>
  )
}

import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SkeletonList } from '@/components/shared/skeletons'

function ServiceDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const open = !!id
  const serviceQ = useQuery({
    queryKey: ['service-detail', id],
    queryFn: () => (id ? api.services().then((all) => all.find((s) => s.id === id) ?? null) : Promise.resolve(null)),
    enabled: open,
  })
  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: api.teams, enabled: open })
  const incidentsQ = useQuery({ queryKey: ['incidents'], queryFn: () => api.listIncidents(), enabled: open })

  const service = serviceQ.data
  const team = service && teamsQ.data ? teamsQ.data.find((t) => t.id === service.ownerTeamId) : undefined
  const incidents = (incidentsQ.data ?? []).filter((i) => i.serviceId === id).slice(0, 5)
  const meta = service ? HEALTH_META[service.health] : null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent>
        {serviceQ.isPending ? (
          <SheetBody><SkeletonList rows={5} /></SheetBody>
        ) : !service ? (
          <SheetBody>
            <div className="py-12 text-center">
              <p className="text-body font-medium">服务不存在</p>
              <Button className="mt-4" variant="outline" onClick={onClose}>关闭</Button>
            </div>
          </SheetBody>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono">{service.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                {meta ? (
                  <span className={cn('inline-flex items-center gap-1 text-caption font-medium', meta.tone)}>
                    <meta.icon className="size-3.5" /> {meta.label}
                  </span>
                ) : null}
                <Badge variant="outline" className="text-micro">{TIER_LABEL[service.tier]}</Badge>
                {team ? <Badge variant="ghost" className="text-micro">{team.name}</Badge> : null}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <p className="text-body">{service.description}</p>
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-surface p-3 text-caption">
                <div><p className="text-muted-foreground">开放事件</p><p className="tabular text-body font-medium">{service.openIncidents}</p></div>
                <div><p className="text-muted-foreground">MTTR</p><p className="tabular text-body font-medium">{service.mttrMinutes}m</p></div>
                <div><p className="text-muted-foreground">标签</p><p>{service.tags.length}</p></div>
              </div>
              <div>
                <p className="mb-1.5 text-micro uppercase tracking-wide text-muted-foreground">近期事件</p>
                {incidents.length === 0 ? (
                  <p className="text-caption text-muted-foreground">该服务近期没有事件。</p>
                ) : (
                  <ul className="space-y-1.5">
                    {incidents.map((i) => (
                      <li key={i.id} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-caption">
                        <span className="tabular text-muted-foreground">{i.number}</span>
                        <span className="flex-1 truncate px-2">{i.title}</span>
                        <Badge variant="outline">{i.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SheetBody>
            <SheetFooter><Button variant="outline" onClick={onClose}>关闭</Button></SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
