import { useEffect, useMemo, useState } from "react"
import { Inbox, Check, X, Filter, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectItem } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAppStore, syncUrl } from "@/stores/app-store"
import * as api from "@/mocks/api"
import { formatRelativeTime, severityColor, severityLabel, statusLabel } from "@/lib/format"
import type { InboxItem, Member } from "@/types"

export default function InboxPage() {
  const store = useAppStore()
  const [items, setItems] = useState<InboxItem[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedIds, setSelectedIds] = useState(new Set<string>())

  const workspaceId = store.currentWorkspaceId

  const load = async () => {
    setLoading(true)
    try {
      const [inbox, m] = await Promise.all([api.fetchInbox(workspaceId), api.fetchMembers(workspaceId)])
      setItems(inbox)
      setMembers(m)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [workspaceId])

  const filtered = useMemo(() => {
    return items
      .filter((it) => {
        if (typeFilter !== "all" && it.type !== typeFilter) return false
        if (statusFilter !== "all" && it.status !== statusFilter) return false
        if (!query) return true
        const q = query.toLowerCase()
        return it.title.toLowerCase().includes(q) || it.source.toLowerCase().includes(q)
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [items, query, typeFilter, statusFilter])

  const selectedItem = useMemo(() => items.find((it) => it.id === store.selectedId), [items, store.selectedId])

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map((it) => it.id)))
  }

  const withSelected = async (fn: (ids: string[]) => Promise<unknown>, successMsg: string) => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    await fn(ids)
    store.addToast({ title: successMsg, type: "success" })
    setSelectedIds(new Set())
    await load()
  }

  const memberMap = useMemo(() => {
    const map = new Map<string, Member>()
    members.forEach((m) => map.set(m.id, m))
    return map
  }, [members])

  const unreadCount = useMemo(() => items.filter((it) => !it.read && it.status === "pending").length, [items])

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={<Inbox className="size-4" />}
        title="收件箱"
        count={unreadCount}
        description="待处理通知与指派"
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-3.5" />
            刷新
          </Button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 列表栏 */}
        <div className="flex w-full flex-col border-r lg:w-[420px]">
          <div className="flex items-center gap-2 border-b p-3">
            <div className="relative flex-1">
              <Filter className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索通知…"
                className="h-7 pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="alert">告警</SelectItem>
              <SelectItem value="incident">事件</SelectItem>
              <SelectItem value="task">任务</SelectItem>
              <SelectItem value="approval">审批</SelectItem>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待处理</SelectItem>
              <SelectItem value="handled">已处理</SelectItem>
              <SelectItem value="dismissed">已忽略</SelectItem>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
              <span className="text-caption text-muted-foreground">已选 {selectedIds.size}</span>
              <Button size="xs" variant="outline" onClick={() => withSelected(api.markInboxRead, "已标记为已读")}>
                <Check className="size-3.5" />
                已读
              </Button>
              <Button size="xs" variant="outline" onClick={() => withSelected(api.dismissInbox, "已关闭")}>
                <X className="size-3.5" />
                关闭
              </Button>
              <Select
                value=""
                onValueChange={(v) => withSelected((ids) => api.assignInboxOwner(ids, v), "已分派")}
                className="w-28"
              >
                <SelectItem value="">分派给…</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Inbox className="size-5" />}
                  title="没有通知"
                  description="当前筛选条件下暂无通知。"
                />
              </div>
            ) : (
              <div className="divide-y">
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-3 py-2">
                  <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} indeterminate={selectedIds.size > 0 && selectedIds.size < filtered.length} onCheckedChange={toggleAll} />
                  <span className="text-caption text-muted-foreground">{filtered.length} 条</span>
                </div>
                {filtered.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => {
                      store.setSelectedId(it.id)
                      syncUrl({ selectedId: it.id })
                    }}
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-muted/50 ${store.selectedId === it.id ? "bg-surface-selected" : ""}`}
                  >
                    <Checkbox
                      checked={selectedIds.has(it.id)}
                      onCheckedChange={() => toggleOne(it.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-body truncate ${!it.read ? "font-medium" : ""}`}>{it.title}</span>
                        {!it.read && <span className="size-2 rounded-full bg-primary" />}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-caption text-muted-foreground">
                        <Badge className={severityColor(it.severity)}>{severityLabel(it.severity)}</Badge>
                        <span>{it.source}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(it.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 详情栏 */}
        <div className="hidden flex-1 flex-col overflow-auto lg:flex">
          {selectedItem ? (
            <div className="border-b p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-title-sm font-medium text-foreground">{selectedItem.title}</h2>
                  <div className="mt-2 flex items-center gap-2 text-caption text-muted-foreground">
                    <Badge className={severityColor(selectedItem.severity)}>{severityLabel(selectedItem.severity)}</Badge>
                    <Badge variant="outline">{statusLabel(selectedItem.status)}</Badge>
                    <span>来自 {selectedItem.source}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(selectedItem.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => withSelected(() => api.markInboxRead([selectedItem.id]), "已标记为已读")}>
                    <Check className="size-3.5" />
                    已读
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => withSelected(() => api.dismissInbox([selectedItem.id]), "已关闭")}>
                    <X className="size-3.5" />
                    关闭
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-caption font-medium text-muted-foreground">负责人</h3>
                  <div className="mt-1 flex items-center gap-2">
                    {selectedItem.ownerId ? (
                      <>
                        <Avatar className="size-6">
                          <AvatarFallback>{memberMap.get(selectedItem.ownerId)?.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-body">{memberMap.get(selectedItem.ownerId)?.name ?? "未分配"}</span>
                      </>
                    ) : (
                      <span className="text-body text-muted-foreground">未分配</span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-caption font-medium text-muted-foreground">类型</h3>
                  <p className="text-body text-foreground capitalize">{selectedItem.type}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={<Inbox className="size-5" />}
                title="选择一项查看详情"
                description="点击左侧通知查看详细信息与操作。"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
