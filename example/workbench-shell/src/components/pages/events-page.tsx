import { useEffect, useMemo, useState } from "react"
import { List, Filter, ArrowUpDown, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectItem } from "@/components/ui/select"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppStore, syncUrl } from "@/stores/app-store"
import * as api from "@/mocks/api"
import { formatDate, severityColor, severityLabel, statusColor, statusLabel } from "@/lib/format"
import type { Incident } from "@/types"

type SortKey = "createdAt" | "severity" | "status" | "title"

export default function EventsPage() {
  const store = useAppStore()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDesc, setSortDesc] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const workspaceId = store.currentWorkspaceId

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.fetchIncidents(workspaceId).then((data) => {
      if (!cancelled) {
        setIncidents(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  const filtered = useMemo(() => {
    return incidents
      .filter((inc) => {
        if (statusFilter !== "all" && inc.status !== statusFilter) return false
        if (severityFilter !== "all" && inc.severity !== severityFilter) return false
        if (!query) return true
        const q = query.toLowerCase()
        return inc.title.toLowerCase().includes(q) || inc.number.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        else if (sortKey === "severity") {
          const order = { critical: 0, high: 1, medium: 2, low: 3 }
          cmp = (order[a.severity] ?? 99) - (order[b.severity] ?? 99)
        } else if (sortKey === "status") {
          cmp = a.status.localeCompare(b.status)
        } else {
          cmp = a.title.localeCompare(b.title)
        }
        return sortDesc ? -cmp : cmp
      })
  }, [incidents, query, statusFilter, severityFilter, sortKey, sortDesc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const sortButton = (key: SortKey, label: string) => {
    const active = sortKey === key
    return (
      <button
        onClick={() => {
          if (active) setSortDesc((v) => !v)
          else {
            setSortKey(key)
            setSortDesc(true)
          }
        }}
        className={`flex items-center gap-1 text-caption ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
      >
        {label}
        <ArrowUpDown className={`size-3 transition-transform ${active && sortDesc ? "rotate-180" : ""}`} />
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={<List className="size-4" />}
        title="事件"
        count={incidents.length}
        description="事件列表（表格视图）"
        actions={
          <Button size="sm" onClick={() => store.setDialog("create-incident")}>
            创建事件
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative flex min-w-[200px] flex-1">
          <Filter className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索编号或标题…"
            className="h-7 pl-8"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value="open">待处理</SelectItem>
          <SelectItem value="acknowledged">已确认</SelectItem>
          <SelectItem value="investigating">调查中</SelectItem>
          <SelectItem value="resolved">已解决</SelectItem>
          <SelectItem value="closed">已关闭</SelectItem>
        </Select>
        <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1) }}>
          <SelectItem value="all">全部级别</SelectItem>
          <SelectItem value="critical">P0 严重</SelectItem>
          <SelectItem value="high">P1 高</SelectItem>
          <SelectItem value="medium">P2 中</SelectItem>
          <SelectItem value="low">P3 低</SelectItem>
        </Select>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<List className="size-5" />}
            title="暂无事件"
            description="调整筛选条件或创建新事件。"
            action={
              <Button size="sm" onClick={() => store.setDialog("create-incident")}>
                创建事件
              </Button>
            }
          />
        ) : (
          <div className="rounded-lg border">
            <table className="w-full text-left text-body">
              <thead className="border-b bg-muted/50 text-caption text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{sortButton("title", "标题")}</th>
                  <th className="px-3 py-2 font-medium">{sortButton("severity", "级别")}</th>
                  <th className="px-3 py-2 font-medium">{sortButton("status", "状态")}</th>
                  <th className="px-3 py-2 font-medium">编号</th>
                  <th className="px-3 py-2 font-medium">{sortButton("createdAt", "创建时间")}</th>
                  <th className="px-3 py-2 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageRows.map((inc) => (
                  <tr key={inc.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{inc.title}</div>
                      <div className="text-caption text-muted-foreground">{inc.description.slice(0, 40)}…</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={severityColor(inc.severity)}>{severityLabel(inc.severity)}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={statusColor(inc.status)}>{statusLabel(inc.status)}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono-nums text-caption text-muted-foreground">{inc.number}</td>
                    <td className="px-3 py-2 text-caption text-muted-foreground">{formatDate(inc.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          store.setPage("board")
                          store.setSelectedId(inc.id)
                          syncUrl({ page: "board", selectedId: inc.id, eventView: "board" })
                        }}
                      >
                        看板
                        <ExternalLink className="ml-1 size-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between border-t px-3 py-2">
          <span className="text-caption text-muted-foreground">
            第 {page} / {totalPages} 页，共 {filtered.length} 条
          </span>
          <div className="flex items-center gap-2">
            <Button size="icon-xs" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button size="icon-xs" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
