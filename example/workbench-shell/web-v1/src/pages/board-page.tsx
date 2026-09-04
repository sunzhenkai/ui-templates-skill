import { CollectionSkeleton, EmptyState, ErrorState, PageHeader, SeverityBadge, Toolbar } from "@/components/shared/chrome"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { listIncidents, updateIncident } from "@/lib/api/client"
import { CURRENT_USER_ID } from "@/mock/db"
import { formatDate, statusLabel } from "@/lib/labels"
import { keys, queryClient } from "@/lib/query"
import { isOverlayMode, useShellMode } from "@/hooks/use-shell-mode"
import { INCIDENT_STATUSES, type Incident, type IncidentStatus } from "@/types/domain"
import { DndContext, type DragEndEvent, PointerSensor, useDroppable, useDraggable, useSensor, useSensors } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { useMutation, useQuery } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate, useOutletContext, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"

function Column({ id, children, count }: { id: IncidentStatus; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section ref={setNodeRef} className={`flex min-h-0 w-72 shrink-0 flex-col rounded-lg border bg-[var(--surface)] ${isOver ? "ring-2 ring-[var(--brand)]" : ""}`} aria-label={statusLabel[id]}>
      <header className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-[length:var(--type-label)]">{statusLabel[id]}</h2>
        <span className="text-[length:var(--type-caption)] text-muted-foreground">{count}</span>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">{children}</div>
    </section>
  )
}

function CardItem({ incident, workspaceId }: { incident: Incident; workspaceId: string }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: incident.id })
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <Card
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform) }}
            className={`cursor-grab ${isDragging ? "opacity-60" : ""}`}
            {...listeners}
            {...attributes}
          />
        }
      >
        <CardHeader className="p-3">
          <CardTitle className="text-[length:var(--type-label)]">{incident.number} {incident.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-3 pt-0 text-[length:var(--type-caption)] text-muted-foreground">
          <SeverityBadge value={incident.severity} />
          <p>更新 {formatDate(incident.updatedAt)} · 评论 {incident.commentCount}</p>
        </CardContent>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => navigate(`/${workspaceId}/incidents/${incident.id}`)}>打开详情</ContextMenuItem>
        <ContextMenuItem onClick={() => void updateIncident(incident.id, { ownerId: "mem-chen" }).then(() => queryClient.invalidateQueries())}>分派负责人</ContextMenuItem>
        <ContextMenuItem onClick={() => void navigator.clipboard.writeText(incident.number)}>复制编号</ContextMenuItem>
        <ContextMenuItem onClick={() => void updateIncident(incident.id, { status: "archived" }).then(() => queryClient.invalidateQueries())}>归档</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function BoardPage() {
  const { workspaceId = "ws-alpha" } = useParams()
  const [params, setParams] = useSearchParams()
  const ctx = useOutletContext<{ openCreate: (status?: IncidentStatus) => void }>()
  const mode = useShellMode()
  const mobile = isOverlayMode(mode)
  const [mobileColumn, setMobileColumn] = useState<IncidentStatus>("pending-confirm")
  const incidents = useQuery({ queryKey: keys.incidents(workspaceId), queryFn: () => listIncidents(workspaceId) })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const scope = params.get("scope") ?? "all"
  const severity = params.get("severity") ?? ""
  const owner = params.get("owner") ?? ""
  const service = params.get("service") ?? ""

  const filtered = useMemo(() => {
    return (incidents.data ?? []).filter((item) => {
      if (scope === "mine" && item.ownerId !== CURRENT_USER_ID) return false
      if (scope === "team" && !item.teamIds.includes("team-sre")) return false
      if (severity && item.severity !== severity) return false
      if (owner && item.ownerId !== owner) return false
      if (service && !item.serviceIds.includes(service)) return false
      return true
    })
  }, [incidents.data, owner, scope, service, severity])

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) => updateIncident(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      toast.success("状态已更新")
    },
    onError: (error) => toast.error(error.message, { action: { label: "重试", onClick: () => mutation.reset() } }),
  })

  async function onDragEnd(event: DragEndEvent) {
    const over = event.over?.id
    const id = String(event.active.id)
    if (!over || !INCIDENT_STATUSES.includes(over as IncidentStatus)) return
    const previous = incidents.data?.find((item) => item.id === id)
    try {
      await mutation.mutateAsync({ id, status: over as IncidentStatus })
    } catch {
      toast.error("拖动失败，已恢复原位置")
      if (previous) await updateIncident(id, { status: previous.status })
    }
  }

  const columns = mobile ? [mobileColumn] : INCIDENT_STATUSES

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader title="事件看板" description="按状态列跟踪处理流程" />
      <Toolbar>
        <ToggleGroup value={[scope]} onValueChange={(value) => { const next = value[0]; if (next) { const copy = new URLSearchParams(params); copy.set("scope", next); setParams(copy) } }}>
          <ToggleGroupItem value="mine">我的事件</ToggleGroupItem>
          <ToggleGroupItem value="team">我的团队</ToggleGroupItem>
          <ToggleGroupItem value="all">全部事件</ToggleGroupItem>
        </ToggleGroup>
        <Select value={severity} onValueChange={(value) => typeof value === "string" && setParams((current) => { current.set("severity", value); return current })}>
          <SelectTrigger aria-label="按严重等级过滤"><SelectValue placeholder="等级" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部</SelectItem>
            <SelectItem value="critical">紧急</SelectItem>
            <SelectItem value="high">高</SelectItem>
            <SelectItem value="medium">中</SelectItem>
            <SelectItem value="low">低</SelectItem>
          </SelectContent>
        </Select>
        {mobile ? (
          <Select value={mobileColumn} onValueChange={(value) => typeof value === "string" && setMobileColumn(value as IncidentStatus)}>
            <SelectTrigger aria-label="看板列"><SelectValue /></SelectTrigger>
            <SelectContent>
              {INCIDENT_STATUSES.map((item) => <SelectItem key={item} value={item}>{statusLabel[item]}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
      </Toolbar>
      <div className="min-h-0 flex-1 overflow-x-auto p-[var(--page-gutter)] pb-[var(--chat-fab-clearance)]">
        {incidents.isLoading ? <CollectionSkeleton /> : null}
        {incidents.isError ? <ErrorState message="看板加载失败" onRetry={() => void incidents.refetch()} /> : null}
        {incidents.isSuccess ? (
          <DndContext sensors={sensors} onDragEnd={(event) => void onDragEnd(event)}>
            <div className="flex h-full min-h-[28rem] gap-3">
              {columns.map((column) => {
                const items = filtered.filter((item) => item.status === column)
                return (
                  <Column key={column} id={column} count={items.length}>
                    <Button size="xs" variant="ghost" onClick={() => ctx?.openCreate(column)}><PlusIcon />在此列创建</Button>
                    {items.length === 0 ? <EmptyState title="无匹配事件" description="该列当前没有过滤结果。" /> : items.map((item) => <CardItem key={item.id} incident={item} workspaceId={workspaceId} />)}
                  </Column>
                )
              })}
            </div>
          </DndContext>
        ) : null}
      </div>
    </div>
  )
}
