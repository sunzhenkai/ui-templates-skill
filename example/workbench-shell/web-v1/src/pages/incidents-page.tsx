import { CollectionSkeleton, EmptyState, ErrorState, PageHeader, SeverityBadge, StatusBadge, Toolbar } from "@/components/shared/chrome"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteIncidents, listIncidents, listMembers, listServices, updateIncident } from "@/lib/api/client"
import { formatDate, severityLabel, statusLabel } from "@/lib/labels"
import { keys, queryClient } from "@/lib/query"
import { usePrefsStore } from "@/stores/prefs-store"
import type { IncidentStatus, Severity } from "@/types/domain"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Columns3Icon, DownloadIcon, PlusIcon, RefreshCwIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useOutletContext, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"

const COLUMNS = [
  { id: "number", label: "编号" },
  { id: "title", label: "标题" },
  { id: "status", label: "状态" },
  { id: "severity", label: "严重等级" },
  { id: "services", label: "影响服务" },
  { id: "owner", label: "负责人" },
  { id: "startedAt", label: "开始时间" },
  { id: "resolvedAt", label: "解决时间" },
  { id: "updatedAt", label: "更新时间" },
]

export function IncidentsPage() {
  const { workspaceId = "ws-alpha" } = useParams()
  const [params, setParams] = useSearchParams()
  const ctx = useOutletContext<{ openCreate: () => void }>()
  const incidents = useQuery({ queryKey: keys.incidents(workspaceId), queryFn: () => listIncidents(workspaceId) })
  const members = useQuery({ queryKey: keys.members(workspaceId), queryFn: () => listMembers(workspaceId) })
  const services = useQuery({ queryKey: keys.services(workspaceId), queryFn: () => listServices(workspaceId) })
  const visibility = usePrefsStore((state) => state.columnVisibility)
  const setVisibility = usePrefsStore((state) => state.setColumnVisibility)
  const [picked, setPicked] = useState<string[]>([])
  const [confirm, setConfirm] = useState<"delete" | "archive" | null>(null)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "updatedAt", dir: "desc" })
  const status = (params.get("status") ?? "") as IncidentStatus | ""
  const severity = (params.get("severity") ?? "") as Severity | ""
  const q = params.get("q") ?? ""
  const page = Number(params.get("page") ?? "1")
  const pageSize = Number(params.get("pageSize") ?? "10")

  const filtered = useMemo(() => {
    const rows = (incidents.data ?? []).filter((item) => {
      if (status && item.status !== status) return false
      if (severity && item.severity !== severity) return false
      if (q && !`${item.number} ${item.title}`.toLowerCase().includes(q.toLowerCase())) return false
      if (params.get("service") && !item.serviceIds.includes(params.get("service") ?? "")) return false
      return true
    })
    return rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1
      const left = String(a[sort.key as keyof typeof a] ?? "")
      const right = String(b[sort.key as keyof typeof b] ?? "")
      return left.localeCompare(right) * dir
    })
  }, [incidents.data, params, q, severity, sort, status])

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const chips = [
    status ? { key: "status", label: statusLabel[status] } : null,
    severity ? { key: "severity", label: severityLabel[severity] } : null,
    q ? { key: "q", label: q } : null,
    params.get("service") ? { key: "service", label: params.get("service") ?? "" } : null,
  ].filter(Boolean) as { key: string; label: string }[]

  function setFilter(next: Record<string, string>) {
    const copy = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value) copy.set(key, value)
      else copy.delete(key)
    }
    if (!("page" in next)) copy.set("page", "1")
    setParams(copy)
  }

  const remove = useMutation({
    mutationFn: async () => {
      if (confirm === "delete") await deleteIncidents(picked)
      else await Promise.all(picked.map((id) => updateIncident(id, { status: "archived" })))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.incidents(workspaceId) })
      toast.success("批量操作完成")
      setPicked([])
      setConfirm(null)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader title="事件列表" description={`${filtered.length} 条结果`} actions={
        <div className="flex gap-2">
          <Button size="sm" variant="brand" onClick={() => ctx?.openCreate()}><PlusIcon data-icon="inline-start" />新建事件</Button>
          <Button size="sm" variant="outline" onClick={() => {
            const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = "incidents.json"
            link.click()
          }}><DownloadIcon />导出</Button>
          <Button size="sm" variant="outline" onClick={() => void incidents.refetch()}><RefreshCwIcon />刷新</Button>
        </div>
      } />
      <Toolbar>
        <Input className="w-40" value={q} placeholder="搜索" aria-label="搜索事件" onChange={(event) => setFilter({ q: event.target.value })} />
        <Select value={status} onValueChange={(value) => typeof value === "string" && setFilter({ status: value })}>
          <SelectTrigger aria-label="事件状态"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部状态</SelectItem>
            {Object.entries(statusLabel).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={(value) => typeof value === "string" && setFilter({ severity: value })}>
          <SelectTrigger aria-label="严重等级"><SelectValue placeholder="等级" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部等级</SelectItem>
            {Object.entries(severityLabel).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
            <Columns3Icon />列
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {COLUMNS.map((column) => (
              <DropdownMenuItem key={column.id} onClick={() => setVisibility({ ...visibility, [column.id]: !visibility[column.id] })}>
                {visibility[column.id] === false ? "显示" : "隐藏"} {column.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(window.location.href); toast.success("已复制分享链接") }}>复制 URL</Button>
      </Toolbar>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-[var(--page-gutter)] py-2">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="cursor-pointer" onClick={() => setFilter({ [chip.key]: "" })}>{chip.label} ×</Badge>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto pb-[var(--chat-fab-clearance)]">
        {incidents.isLoading ? <CollectionSkeleton /> : null}
        {incidents.isError ? <ErrorState message="事件列表加载失败" onRetry={() => void incidents.refetch()} /> : null}
        {incidents.isSuccess && filtered.length === 0 ? <EmptyState title="没有事件" description="创建事件或清除筛选。" filtered={chips.length > 0} onClear={() => setParams(new URLSearchParams())} /> : null}
        {incidents.isSuccess && pageItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Checkbox aria-label="全选" checked={pageItems.every((item) => picked.includes(item.id))} onCheckedChange={(value) => setPicked(value ? pageItems.map((item) => item.id) : [])} /></TableHead>
                {COLUMNS.filter((column) => visibility[column.id] !== false).map((column) => (
                  <TableHead key={column.id} aria-sort={sort.key === column.id ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => setSort({ key: column.id, dir: sort.key === column.id && sort.dir === "asc" ? "desc" : "asc" })}>{column.label}</button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Checkbox aria-label={`选择 ${item.number}`} checked={picked.includes(item.id)} onCheckedChange={(value) => setPicked((current) => value ? [...current, item.id] : current.filter((id) => id !== item.id))} /></TableCell>
                  {visibility.number !== false ? <TableCell className="font-mono"><Link className="underline-offset-2 hover:underline" to={`/${workspaceId}/incidents/${item.id}`}>{item.number}</Link></TableCell> : null}
                  {visibility.title !== false ? <TableCell><Link to={`/${workspaceId}/incidents/${item.id}`}>{item.title}</Link></TableCell> : null}
                  {visibility.status !== false ? <TableCell><StatusBadge value={item.status} /></TableCell> : null}
                  {visibility.severity !== false ? <TableCell><SeverityBadge value={item.severity} /></TableCell> : null}
                  {visibility.services !== false ? <TableCell>{item.serviceIds.map((id) => {
                    const service = services.data?.find((row) => row.id === id)
                    return service ? <Link key={id} className="mr-2 underline-offset-2 hover:underline" to={`/${workspaceId}/services/${id}`}>{service.name}</Link> : id
                  })}</TableCell> : null}
                  {visibility.owner !== false ? <TableCell><Link to={`/${workspaceId}/settings/members`}>{members.data?.find((member) => member.id === item.ownerId)?.name}</Link></TableCell> : null}
                  {visibility.startedAt !== false ? <TableCell>{formatDate(item.startedAt)}</TableCell> : null}
                  {visibility.resolvedAt !== false ? <TableCell>{formatDate(item.resolvedAt)}</TableCell> : null}
                  {visibility.updatedAt !== false ? <TableCell>{formatDate(item.updatedAt)}</TableCell> : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t px-[var(--page-gutter)] py-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!picked.length} onClick={() => void Promise.all(picked.map((id) => updateIncident(id, { ownerId: "mem-chen" }))).then(() => queryClient.invalidateQueries())}>分派</Button>
          <Button size="sm" variant="outline" disabled={!picked.length} onClick={() => setConfirm("archive")}>归档</Button>
          <Button size="sm" variant="destructive" disabled={!picked.length} onClick={() => setConfirm("delete")}>删除</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setFilter({ page: String(page - 1) })}>上一页</Button>
          <Button size="sm" variant="outline" disabled={page * pageSize >= filtered.length} onClick={() => setFilter({ page: String(page + 1) })}>下一页</Button>
        </div>
      </div>
      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => { if (!open) setConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "delete" ? "删除事件？" : "归档事件？"}</AlertDialogTitle>
            <AlertDialogDescription>此操作会更新列表和统计，且不可自动撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
