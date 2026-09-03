import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, List, Plus, Search, User } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/app-shell/page-header'
import { Toolbar, ToolbarSection, ToolbarSeparator } from '@/components/app-shell/toolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { SkeletonBoardColumn } from '@/components/shared/skeletons'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { SeverityBadge } from '@/components/shared/severity-badge'
import { formatRelativeTime, cn } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { toast } from 'sonner'
import type { Incident, IncidentStatus } from '@/lib/types'
import { useAppStore } from '@/lib/stores/app-store'

const COLUMNS: { id: IncidentStatus; label: string; tone: string }[] = [
  { id: 'triggered', label: '已触发', tone: 'text-destructive' },
  { id: 'acknowledged', label: '已确认', tone: 'text-warning' },
  { id: 'investigating', label: '排查中', tone: 'text-info' },
  { id: 'mitigated', label: '已缓解', tone: 'text-success' },
  { id: 'resolved', label: '已解决', tone: 'text-muted-foreground' },
]

export function EventsBoardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 200)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const incidentsQ = useQuery({ queryKey: ['incidents'], queryFn: () => api.listIncidents() })
  const membersQ = useQuery({ queryKey: ['members'], queryFn: api.members })
  const servicesQ = useQuery({ queryKey: ['services'], queryFn: api.services })

  const filtered = useMemo(() => {
    const items = incidentsQ.data ?? []
    if (!debouncedQ) return items
    const needle = debouncedQ.toLowerCase()
    return items.filter((i) =>
      i.title.toLowerCase().includes(needle) ||
      i.number.toLowerCase().includes(needle),
    )
  }, [incidentsQ.data, debouncedQ])

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) =>
      api.updateIncidentStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['incidents'] })
      const previous = queryClient.getQueryData<Incident[]>(['incidents'])
      queryClient.setQueryData<Incident[]>(['incidents'], (old) =>
        (old ?? []).map((i) => (i.id === id ? { ...i, status } : i)),
      )
      return { previous }
    },
    onError: (e, _vars, ctx) => {
      queryClient.setQueryData(['incidents'], ctx?.previous)
      toast.error('状态更新失败', { description: e instanceof Error ? e.message : undefined })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
    },
  })

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const id = e.active.id as string
    const overId = e.over?.id as IncidentStatus | undefined
    if (!overId) return
    const target = COLUMNS.find((c) => c.id === overId)
    if (!target) return
    const current = incidentsQ.data?.find((i) => i.id === id)
    if (!current || current.status === target.id) return
    statusMutation.mutate({ id, status: target.id })
  }

  const grouped = useMemo(() => {
    const map: Record<IncidentStatus, Incident[]> = {
      triggered: [], acknowledged: [], investigating: [], mitigated: [], resolved: [],
    }
    for (const i of filtered) map[i.status].push(i)
    return map
  }, [filtered])

  const activeIncident = activeId ? incidentsQ.data?.find((i) => i.id === activeId) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="事件看板"
        meta={`${filtered.length} 条`}
        description="拖动卡片变更状态；状态写入当前会话，刷新后会回到 mock 数据。"
        actions={
          <div className="flex h-8 rounded-md border border-input p-0.5">
            <button
              onClick={() => navigate('/events')}
              className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-label font-medium text-muted-foreground hover:text-foreground"
            >
              <List className="size-3.5" /> 列表
            </button>
            <button
              aria-pressed
              className="inline-flex h-7 items-center gap-1 rounded-sm bg-surface px-2 text-label font-medium text-foreground shadow-surface"
            >
              <Calendar className="size-3.5" /> 看板
            </button>
          </div>
        }
      />

      <Toolbar>
        <ToolbarSection className="flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-7" placeholder="搜索标题、编号…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </ToolbarSection>
        <ToolbarSeparator />
        <ToolbarSection>
          <Button variant="brand" size="sm" onClick={() => useAppStore.getState().setCreateIncidentOpen(true)}>
            <Plus className="size-4" /> 新建事件
          </Button>
        </ToolbarSection>
      </Toolbar>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {incidentsQ.isPending ? (
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonBoardColumn key={i} />)}
          </div>
        ) : incidentsQ.isError ? (
          <ErrorState onRetry={() => incidentsQ.refetch()} description={incidentsQ.error instanceof Error ? incidentsQ.error.message : undefined} />
        ) : filtered.length === 0 ? (
          <EmptyState title="没有事件" description="点击新建事件或调整筛选。" />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-4">
              {COLUMNS.map((col) => (
                <BoardColumn key={col.id} id={col.id} label={col.label} tone={col.tone} items={grouped[col.id]} members={membersQ.data ?? []} services={servicesQ.data ?? []} onOpen={(id) => navigate(`/events/${id}`)} />
              ))}
            </div>
            <DragOverlay>
              {activeIncident ? (
                <div className="rotate-2">
                  <KanbanCard incident={activeIncident} members={membersQ.data ?? []} services={servicesQ.data ?? []} dragging onOpen={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}

function BoardColumn({ id, label, tone, items, members, services, onOpen }: {
  id: IncidentStatus
  label: string
  tone: string
  items: Incident[]
  members: { id: string; name: string; initials: string; color: string }[]
  services: { id: string; name: string }[]
  onOpen: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      data-testid={`board-col-${id}`}
      className={cn(
        'flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-border bg-surface/40 p-3 transition-colors',
        isOver && 'border-brand bg-brand/8',
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className={cn('text-label font-medium uppercase tracking-wide', tone)}>{label}</h2>
        <Badge variant="ghost" className="text-micro tabular">{items.length}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-caption text-muted-foreground">
            把卡片拖到这里
          </div>
        ) : (
          items.map((it) => <DraggableCard key={it.id} incident={it} members={members} services={services} onOpen={() => onOpen(it.id)} />)
        )}
      </div>
    </div>
  )
}

function DraggableCard({ incident, members, services, onOpen }: {
  incident: Incident
  members: { id: string; name: string; initials: string; color: string }[]
  services: { id: string; name: string }[]
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: incident.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(isDragging && 'opacity-30')}
    >
      <KanbanCard incident={incident} members={members} services={services} onOpen={onOpen} />
    </div>
  )
}

function KanbanCard({ incident, members, services, dragging, onOpen }: {
  incident: Incident
  members: { id: string; name: string; initials: string; color: string }[]
  services: { id: string; name: string }[]
  dragging?: boolean
  onOpen: () => void
}) {
  const assignee = members.find((m) => m.id === incident.assigneeId)
  const service = services.find((s) => s.id === incident.serviceId)
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}
      className={cn(
        'cursor-grab rounded-lg border border-border bg-card p-3 shadow-surface',
        'hover:border-border hover:bg-card/80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        dragging && 'shadow-floating',
      )}
    >
      <div className="mb-2 flex items-center justify-between text-micro text-muted-foreground tabular">
        <span>{incident.number}</span>
        <SeverityBadge severity={incident.severity} />
      </div>
      <p className="line-clamp-2 text-body font-medium text-foreground">{incident.title}</p>
      <p className="mt-1 line-clamp-1 text-micro text-muted-foreground">{service?.name ?? incident.serviceId}</p>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {incident.tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="ghost" className="px-1 py-0 text-micro">{t}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-micro text-muted-foreground tabular">
          {assignee ? (
            <span className="flex items-center gap-1">
              <User className="size-3" />
              <Avatar initials={assignee.initials} color={assignee.color} className="size-4 text-[9px]" />
            </span>
          ) : null}
          <span>{formatRelativeTime(incident.occurredAt)}</span>
        </div>
      </div>
    </article>
  )
}
