import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Filter, LayoutGrid, List, Pin, PinOff, Plus, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/app-shell/page-header'
import { Toolbar, ToolbarSection, ToolbarSeparator } from '@/components/app-shell/toolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SeverityBadge } from '@/components/shared/severity-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { SkeletonList } from '@/components/shared/skeletons'
import { formatRelativeTime, cn } from '@/lib/utils'
import { useAppStore } from '@/lib/stores/app-store'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { toast } from 'sonner'
import type { Incident, IncidentStatus } from '@/lib/types'
import { EventDetailSheet } from './event-detail-sheet'

const STATUS_OPTIONS: { value: IncidentStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'triggered', label: '已触发' },
  { value: 'acknowledged', label: '已确认' },
  { value: 'investigating', label: '排查中' },
  { value: 'mitigated', label: '已缓解' },
  { value: 'resolved', label: '已解决' },
]

const SEVERITY_OPTIONS = [
  { value: 'all', label: '全部等级' },
  { value: 'SEV1', label: 'SEV1' },
  { value: 'SEV2', label: 'SEV2' },
  { value: 'SEV3', label: 'SEV3' },
  { value: 'SEV4', label: 'SEV4' },
]

type ViewMode = 'list' | 'board'

export function EventsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()

  const viewMode = (params.get('view') as ViewMode) || 'list'
  const status = params.get('status') ?? 'all'
  const severity = params.get('severity') ?? 'all'
  const serviceId = params.get('service') ?? 'all'
  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'newest'

  const [draftQ, setDraftQ] = useState(q)
  const debouncedQ = useDebouncedValue(draftQ, 200)

  // Sync URL when debounced query changes
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (debouncedQ) next.set('q', debouncedQ)
    else next.delete('q')
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [debouncedQ]) // eslint-disable-line react-hooks/exhaustive-deps

  const incidentsQ = useQuery({
    queryKey: ['incidents'],
    queryFn: () => api.listIncidents(),
  })
  const servicesQ = useQuery({ queryKey: ['services'], queryFn: api.services })
  const membersQ = useQuery({ queryKey: ['members'], queryFn: api.members })

  const items = incidentsQ.data ?? []

  const filtered = useMemo(() => {
    let list = items
    if (q) {
      const needle = q.toLowerCase()
      list = list.filter((i) =>
        i.title.toLowerCase().includes(needle) ||
        i.number.toLowerCase().includes(needle) ||
        i.tags.some((t) => t.toLowerCase().includes(needle)),
      )
    }
    if (status !== 'all') list = list.filter((i) => i.status === status)
    if (severity !== 'all') list = list.filter((i) => i.severity === severity)
    if (serviceId !== 'all') list = list.filter((i) => i.serviceId === serviceId)
    list = [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      if (sort === 'severity') {
        const order = { SEV1: 0, SEV2: 1, SEV3: 2, SEV4: 3 } as const
        return order[a.severity] - order[b.severity]
      }
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return list
  }, [items, q, status, severity, serviceId, sort])

  function update(next: Record<string, string | null>) {
    const np = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '' || v === 'all') np.delete(k)
      else np.set(k, v)
    }
    setParams(np, { replace: true })
  }

  function reset() {
    setDraftQ('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => api.pinIncident(id, pinned),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['incidents'] }) },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="事件列表"
        meta={`共 ${filtered.length} 条`}
        description="按状态、等级、影响服务筛选；点击行打开详情。"
        actions={
          <>
            <div className="flex h-8 rounded-md border border-input p-0.5">
              <button
                aria-pressed={viewMode === 'list'}
                onClick={() => update({ view: 'list' })}
                className={cn('inline-flex h-7 items-center gap-1 rounded-sm px-2 text-label font-medium', viewMode === 'list' ? 'bg-surface text-foreground shadow-surface' : 'text-muted-foreground hover:text-foreground')}
              >
                <List className="size-3.5" /> 列表
              </button>
              <button
                aria-pressed={viewMode === 'board'}
                onClick={() => { update({ view: 'board' }); navigate('/events/board') }}
                className={cn('inline-flex h-7 items-center gap-1 rounded-sm px-2 text-label font-medium', viewMode === 'board' ? 'bg-surface text-foreground shadow-surface' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutGrid className="size-3.5" /> 看板
              </button>
            </div>
            <Button variant="brand" size="sm" onClick={() => useAppStore.getState().setCreateIncidentOpen(true)}>
              <Plus className="size-4" /> 新建事件
            </Button>
          </>
        }
      />

      <Toolbar>
        <ToolbarSection className="flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-7"
              placeholder="搜索标题、编号、标签…"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => update({ status: v })}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={severity} onValueChange={(v) => update({ severity: v })}>
            <SelectTrigger className="w-[110px]"><SelectValue placeholder="等级" /></SelectTrigger>
            <SelectContent>{SEVERITY_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={serviceId} onValueChange={(v) => update({ service: v })}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="影响服务" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部服务</SelectItem>
              {servicesQ.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </ToolbarSection>
        <ToolbarSeparator />
        <ToolbarSection>
          <Select value={sort} onValueChange={(v) => update({ sort: v })}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="排序" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">最新优先</SelectItem>
              <SelectItem value="oldest">最早优先</SelectItem>
              <SelectItem value="severity">按严重等级</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="size-4" /> 重置
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('保存筛选', { description: '实际项目会要求输入筛选名称并保存到工作区。' })}>
            <Filter className="size-4" /> 保存
          </Button>
        </ToolbarSection>
      </Toolbar>

      <div className="flex-1 overflow-y-auto" role="region" aria-label="事件列表">
        {incidentsQ.isPending ? (
          <SkeletonList rows={6} />
        ) : incidentsQ.isError ? (
          <ErrorState onRetry={() => incidentsQ.refetch()} description={incidentsQ.error instanceof Error ? incidentsQ.error.message : undefined} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? '还没有任何事件' : '没有符合筛选条件的事件'}
            description={items.length === 0 ? '点击右上角创建第一个事件。' : '尝试清除筛选或调整条件。'}
            action={items.length > 0 ? <Button variant="outline" size="sm" onClick={reset}>清除筛选</Button> : undefined}
          />
        ) : (
          <table className="w-full table-fixed text-body">
            <thead>
              <tr className="sticky top-0 z-10 h-9 border-b border-border bg-muted/60 text-left text-micro uppercase tracking-wide text-muted-foreground">
                <th className="w-8 px-3" aria-label="置顶"></th>
                <th className="w-24 px-3">编号</th>
                <th>标题</th>
                <th className="hidden w-28 px-3 lg:table-cell">服务</th>
                <th className="hidden w-24 px-3 md:table-cell">等级</th>
                <th className="hidden w-28 px-3 lg:table-cell">状态</th>
                <th className="hidden w-28 px-3 lg:table-cell">负责人</th>
                <th className="hidden w-32 px-3 md:table-cell">发生时间</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <EventRow
                  key={incident.id}
                  incident={incident}
                  serviceName={servicesQ.data?.find((s) => s.id === incident.serviceId)?.name}
                  assignee={membersQ.data?.find((m) => m.id === incident.assigneeId)?.name}
                  onOpen={() => navigate(`/events/${incident.id}`)}
                  onTogglePin={() => pinMutation.mutate({ id: incident.id, pinned: !incident.pinned })}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EventDetailSheet id={id ?? null} onClose={() => navigate('/events')} />
    </div>
  )
}

function EventRow({ incident, serviceName, assignee, onOpen, onTogglePin }: {
  incident: Incident
  serviceName?: string
  assignee?: string
  onOpen: () => void
  onTogglePin: () => void
}) {
  return (
    <tr className="h-12 border-b border-border hover:bg-accent/40">
      <td className="px-3 align-middle">
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={incident.pinned ? '取消置顶' : '置顶'}
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          {incident.pinned ? <Pin className="size-3.5 fill-brand text-brand" /> : <PinOff className="size-3.5" />}
        </button>
      </td>
      <td className="px-3 align-middle tabular text-caption text-muted-foreground">{incident.number}</td>
      <td className="px-3 align-middle">
        <button
          type="button"
          className="-mx-1 flex w-full flex-col items-start rounded px-1 py-0.5 text-left hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          onClick={onOpen}
        >
          <span className="line-clamp-1 font-medium text-foreground">{incident.title}</span>
          <div className="mt-0.5 flex items-center gap-1">
            {incident.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="ghost" className="px-1 py-0 text-micro">{t}</Badge>
            ))}
          </div>
        </button>
      </td>
      <td className="hidden px-3 align-middle text-caption text-muted-foreground lg:table-cell">{serviceName ?? '—'}</td>
      <td className="hidden px-3 align-middle md:table-cell"><SeverityBadge severity={incident.severity} /></td>
      <td className="hidden px-3 align-middle lg:table-cell"><StatusBadge status={incident.status} /></td>
      <td className="hidden px-3 align-middle text-caption text-muted-foreground lg:table-cell">{assignee ?? '未分派'}</td>
      <td className="hidden px-3 align-middle text-caption tabular text-muted-foreground md:table-cell">{formatRelativeTime(incident.occurredAt)}</td>
    </tr>
  )
}

