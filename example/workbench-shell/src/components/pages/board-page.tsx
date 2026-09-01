import { useEffect, useMemo, useState } from "react"
import { LayoutGrid, Plus } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppStore, syncUrl } from "@/stores/app-store"
import * as api from "@/mocks/api"
import { severityColor, severityLabel, statusColor, statusLabel } from "@/lib/format"
import type { Incident, IncidentStatus } from "@/types"

const COLUMNS: { key: IncidentStatus; label: string; tint: string }[] = [
  { key: "open", label: "待处理", tint: "bg-red-50/50 dark:bg-red-900/10" },
  { key: "acknowledged", label: "已确认", tint: "bg-yellow-50/50 dark:bg-yellow-900/10" },
  { key: "investigating", label: "调查中", tint: "bg-purple-50/50 dark:bg-purple-900/10" },
  { key: "resolved", label: "已解决", tint: "bg-green-50/50 dark:bg-green-900/10" },
  { key: "closed", label: "已关闭", tint: "bg-muted/30" },
]

export default function BoardPage() {
  const store = useAppStore()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const workspaceId = store.currentWorkspaceId

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.fetchIncidents(workspaceId)
      setIncidents(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [workspaceId])

  const grouped = useMemo(() => {
    const map: Record<IncidentStatus, Incident[]> = {
      open: [],
      acknowledged: [],
      investigating: [],
      resolved: [],
      closed: [],
    }
    incidents.forEach((inc) => {
      if (!map[inc.status]) map[inc.status] = []
      map[inc.status].push(inc)
    })
    return map
  }, [incidents])

  const handleDrop = async (status: IncidentStatus) => {
    if (!draggingId) return
    const inc = incidents.find((i) => i.id === draggingId)
    if (!inc || inc.status === status) {
      setDraggingId(null)
      return
    }
    try {
      await api.updateIncident(draggingId, { status })
      store.addToast({ title: `已移动至「${statusLabel(status)}」`, type: "success" })
      await load()
    } catch {
      store.addToast({ title: "移动失败", type: "error" })
    } finally {
      setDraggingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={<LayoutGrid className="size-4" />}
        title="事件看板"
        count={incidents.length}
        description="拖拽卡片变更状态"
        actions={
          <Button size="sm" onClick={() => store.setDialog("create-incident")}>
            <Plus className="size-3.5" />
            创建事件
          </Button>
        }
      />

      <div className="flex flex-1 gap-3 overflow-auto p-3">
        {loading ? (
          COLUMNS.map((col) => (
            <div key={col.key} className="flex w-72 shrink-0 flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ))
        ) : incidents.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<LayoutGrid className="size-5" />}
              title="暂无事件"
              description="看板为空，先创建一条事件。"
              action={
                <Button size="sm" onClick={() => store.setDialog("create-incident")}>
                  创建事件
                </Button>
              }
            />
          </div>
        ) : (
          COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`flex w-72 shrink-0 flex-col rounded-lg border ${col.tint}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(col.key)
              }}
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-body font-medium text-foreground">{col.label}</span>
                <Badge variant="outline">{grouped[col.key].length}</Badge>
              </div>
              <div className="flex-1 space-y-2 overflow-auto p-2">
                {grouped[col.key].map((inc) => (
                  <div
                    key={inc.id}
                    draggable
                    onDragStart={() => setDraggingId(inc.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => {
                      store.setSelectedId(inc.id)
                      syncUrl({ selectedId: inc.id })
                    }}
                    className={`cursor-grab rounded-lg border bg-background p-3 active:cursor-grabbing ${store.selectedId === inc.id ? "ring-1 ring-ring" : ""} ${draggingId === inc.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-body font-medium text-foreground">{inc.title}</span>
                      <Badge className={severityColor(inc.severity)}>{severityLabel(inc.severity)}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-caption text-muted-foreground">{inc.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge className={statusColor(inc.status)}>{statusLabel(inc.status)}</Badge>
                      <span className="ml-auto text-micro tabular-nums text-muted-foreground">{inc.number}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
