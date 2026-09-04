import { CollectionSkeleton, EmptyState, ErrorState, PageHeader, SeverityBadge, StatusBadge, Toolbar } from "@/components/shared/chrome"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listInbox, listMembers, updateInbox, updateIncident } from "@/lib/api/client"
import { formatDate, inboxTypeLabel, severityLabel } from "@/lib/labels"
import { keys, queryClient } from "@/lib/query"
import type { InboxItem, InboxStatus, InboxType, Severity } from "@/types/domain"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"

export function InboxPage() {
  const { workspaceId = "ws-alpha" } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get("q") ?? ""
  const type = (params.get("type") ?? "") as InboxType | ""
  const severity = (params.get("severity") ?? "") as Severity | ""
  const status = (params.get("status") ?? "open") as InboxStatus | ""
  const page = Number(params.get("page") ?? "1")
  const pageSize = Number(params.get("pageSize") ?? "10")
  const selectedId = params.get("item")
  const inbox = useQuery({ queryKey: keys.inbox(workspaceId), queryFn: () => listInbox(workspaceId) })
  const members = useQuery({ queryKey: keys.members(workspaceId), queryFn: () => listMembers(workspaceId) })
  const [picked, setPicked] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  const filtered = useMemo(() => {
    return (inbox.data ?? []).filter((item) => {
      if (q && !`${item.number} ${item.title}`.toLowerCase().includes(q.toLowerCase())) return false
      if (type && item.type !== type) return false
      if (severity && item.severity !== severity) return false
      if (status && item.status !== status) return false
      return true
    })
  }, [inbox.data, q, severity, status, type])

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const selected = filtered.find((item) => item.id === selectedId) ?? null
  const selectedIndex = filtered.findIndex((item) => item.id === selectedId)

  function setFilter(next: Record<string, string>) {
    const copy = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value) copy.set(key, value)
      else copy.delete(key)
    }
    if (!("page" in next)) copy.set("page", "1")
    setParams(copy)
  }

  const mutate = useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: Partial<InboxItem> }) => updateInbox(ids, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.inbox(workspaceId) })
      toast.success("已更新收件箱")
      setPicked([])
    },
    onError: (error) => toast.error(error.message, { action: { label: "重试", onClick: () => mutate.reset() } }),
  })

  const unread = (inbox.data ?? []).filter((item) => item.status === "open").length

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader title="收件箱" description={`${unread} 条未处理`} actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={picked.length === 0} onClick={() => mutate.mutate({ ids: picked, patch: { status: "read" } })}>批量已读</Button>
          <Button size="sm" variant="outline" disabled={picked.length === 0} onClick={() => mutate.mutate({ ids: picked, patch: { status: "closed" } })}>批量关闭</Button>
        </div>
      } />
      <Toolbar>
        <Input className="w-40" value={q} placeholder="关键字" aria-label="搜索事项" onChange={(event) => setFilter({ q: event.target.value })} />
        <Select value={type} onValueChange={(value) => typeof value === "string" && setFilter({ type: value })}>
          <SelectTrigger aria-label="事项类型"><SelectValue placeholder="类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部类型</SelectItem>
            <SelectItem value="alert">告警</SelectItem>
            <SelectItem value="assigned">分派</SelectItem>
            <SelectItem value="confirmation">待确认</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={(value) => typeof value === "string" && setFilter({ severity: value })}>
          <SelectTrigger aria-label="严重等级"><SelectValue placeholder="等级" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部等级</SelectItem>
            {Object.entries(severityLabel).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => typeof value === "string" && setFilter({ status: value })}>
          <SelectTrigger aria-label="处理状态"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部状态</SelectItem>
            <SelectItem value="open">未处理</SelectItem>
            <SelectItem value="read">已读</SelectItem>
            <SelectItem value="closed">已关闭</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={() => setParams(new URLSearchParams())}>重置</Button>
        <Button size="sm" variant="outline" onClick={() => setSaved(true)}>{saved ? "已保存筛选" : "保存筛选"}</Button>
      </Toolbar>
      <div className="min-h-0 flex-1 overflow-auto pb-[var(--chat-fab-clearance)]">
        {inbox.isLoading ? <CollectionSkeleton /> : null}
        {inbox.isError ? <ErrorState message="收件箱加载失败" onRetry={() => void inbox.refetch()} /> : null}
        {inbox.isSuccess && filtered.length === 0 ? (
          <EmptyState title={inbox.data.length === 0 ? "没有事项" : "没有匹配结果"} description="调整筛选或等待新的告警。" filtered={Boolean(q || type || severity)} onClear={() => setParams(new URLSearchParams())} />
        ) : null}
        {inbox.isSuccess && pageItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    aria-label="全选当前结果"
                    checked={pageItems.every((item) => picked.includes(item.id)) && pageItems.length > 0}
                    onCheckedChange={(value) => setPicked(value ? pageItems.map((item) => item.id) : [])}
                  />
                </TableHead>
                <TableHead>编号</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>严重等级</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((item) => (
                <TableRow key={item.id} data-state={picked.includes(item.id) ? "selected" : undefined} className="cursor-pointer" onClick={() => setFilter({ item: item.id })}>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox aria-label={`选择 ${item.number}`} checked={picked.includes(item.id)} onCheckedChange={(value) => setPicked((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                  </TableCell>
                  <TableCell className="font-mono">{item.number}</TableCell>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>{inboxTypeLabel[item.type]}</TableCell>
                  <TableCell><SeverityBadge value={item.severity} /></TableCell>
                  <TableCell>{item.source}</TableCell>
                  <TableCell>{members.data?.find((member) => member.id === item.ownerId)?.name ?? item.ownerId}</TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                  <TableCell>{item.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t px-[var(--page-gutter)] py-2 text-sm">
        <span>共 {filtered.length} 条</span>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(value) => typeof value === "string" && setFilter({ pageSize: value })}>
            <SelectTrigger aria-label="每页条数"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setFilter({ page: String(page - 1) })}>上一页</Button>
          <span>第 {page} 页</span>
          <Button size="sm" variant="outline" disabled={page * pageSize >= filtered.length} onClick={() => setFilter({ page: String(page + 1) })}>下一页</Button>
        </div>
      </div>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setFilter({ item: "" }) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selected?.number} {selected?.title}</SheetTitle>
            <SheetDescription>事项详情</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="flex flex-col gap-3 p-4">
              <StatusBadge value={selected.incidentId ? "in-progress" : "pending-confirm"} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => mutate.mutate({ ids: [selected.id], patch: { status: "read" } })}>标记已读</Button>
                <Button size="sm" variant="outline" onClick={() => mutate.mutate({ ids: [selected.id], patch: { ownerId: "mem-chen" } })}>分派</Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  if (selected.incidentId) navigate(`/${workspaceId}/incidents/${selected.incidentId}`)
                  else {
                    await updateIncident("inc-1041", { pinned: true })
                    toast.success("已关联到现有事件")
                  }
                }}>转为事件</Button>
                <Button size="sm" variant="destructive" onClick={() => mutate.mutate({ ids: [selected.id], patch: { status: "closed" } })}>关闭</Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={selectedIndex <= 0} onClick={() => setFilter({ item: filtered[selectedIndex - 1]?.id ?? "" })}>上一条</Button>
                <Button size="sm" variant="ghost" disabled={selectedIndex >= filtered.length - 1} onClick={() => setFilter({ item: filtered[selectedIndex + 1]?.id ?? "" })}>下一条</Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
