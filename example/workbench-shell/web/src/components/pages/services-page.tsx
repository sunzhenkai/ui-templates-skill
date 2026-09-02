import { useEffect, useMemo, useState } from "react"
import { LayoutDashboard, Plus, Search, Server } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppStore } from "@/stores/app-store"
import * as api from "@/mocks/api"
import { statusColor, statusLabel } from "@/lib/format"
import type { Member, Service, Team } from "@/types"

export default function ServicesPage() {
  const store = useAppStore()
  const [services, setServices] = useState<Service[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  const load = async () => {
    setLoading(true)
    const [s, m, t] = await Promise.all([
      api.fetchServices(store.currentWorkspaceId),
      api.fetchMembers(store.currentWorkspaceId),
      api.fetchTeams(store.currentWorkspaceId),
    ])
    setServices(s)
    setMembers(m)
    setTeams(t)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [store.currentWorkspaceId])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return services
      .filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [services, query])

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        icon={<LayoutDashboard className="size-4" />}
        title="服务目录"
        count={filtered.length}
        description="管理所有服务、健康状态与负责团队"
        actions={
          <Button size="sm">
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">新建服务</span>
          </Button>
        }
      />

      <div className="flex h-12 items-center gap-2 border-b px-4">
        <Search className="size-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索服务…" className="h-8 w-full max-w-xs border-0 shadow-none focus-visible:ring-0" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-stable">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Server className="size-5" />} title="暂无服务" description={query ? "没有匹配的服务" : "当前工作区还没有服务"} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-lg border bg-surface p-3 hover-surface">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Server className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-body font-medium text-foreground">{s.name}</div>
                      <div className="truncate text-caption text-muted-foreground">{s.description}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusColor(s.status)}>
                    {statusLabel(s.status)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-t pt-2 text-caption text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">SLO {s.slo}%</span>
                    <span>·</span>
                    <span className="tabular-nums">{s.incidentCount} 事件</span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {s.ownerIds.slice(0, 3).map((id) => {
                      const m = memberMap.get(id)
                      return (
                        <div key={id} className="flex size-5 items-center justify-center rounded-full border border-background bg-muted text-micro text-muted-foreground" title={m?.name}>
                          {m?.name.slice(0, 1) ?? "?"}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {s.teamIds.map((tid) => {
                    const t = teamMap.get(tid)
                    return t ? (
                      <span key={tid} className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-micro text-muted-foreground" style={{ borderColor: t.color }}>
                        {t.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
