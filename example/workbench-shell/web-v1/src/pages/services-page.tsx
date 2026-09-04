import { CollectionSkeleton, EmptyState, ErrorState, HealthBadge, PageHeader, Toolbar } from "@/components/shared/chrome"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getService, listHealthChecks, listMembers, listServices, listTeams, serviceFormSchema, setServiceStatus, upsertService } from "@/lib/api/client"
import { formatDate } from "@/lib/labels"
import { keys, queryClient } from "@/lib/query"
import type { Environment, HealthState, Service } from "@/types/domain"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"

export function ServicesPage() {
  const { workspaceId = "ws-alpha" } = useParams()
  const [params, setParams] = useSearchParams()
  const view = params.get("view") === "cards" ? "cards" : "list"
  const q = params.get("q") ?? ""
  const health = (params.get("health") ?? "") as HealthState | ""
  const services = useQuery({ queryKey: keys.services(workspaceId), queryFn: () => listServices(workspaceId) })
  const members = useQuery({ queryKey: keys.members(workspaceId), queryFn: () => listMembers(workspaceId) })
  const teams = useQuery({ queryKey: keys.teams(workspaceId), queryFn: () => listTeams(workspaceId) })
  const [editing, setEditing] = useState<Partial<Service> | null>(null)
  const [disableId, setDisableId] = useState<string | null>(null)
  const [sort, setSort] = useState<"name" | "incidents" | "updated">("name")

  const filtered = useMemo(() => {
    const rows = (services.data ?? []).filter((item) => {
      if (q && !`${item.name} ${item.slug}`.toLowerCase().includes(q.toLowerCase())) return false
      if (health && item.health !== health) return false
      if (params.get("team") && item.teamId !== params.get("team")) return false
      if (params.get("env") && item.environment !== params.get("env")) return false
      return true
    })
    return rows.sort((a, b) => {
      if (sort === "incidents") return b.recentIncidentCount - a.recentIncidentCount
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt)
      return a.name.localeCompare(b.name)
    })
  }, [health, params, q, services.data, sort])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader title="服务目录" actions={<Button size="sm" onClick={() => setEditing({ workspaceId, dependsOn: [], environment: "prod" })}>新建服务</Button>} />
      <Toolbar>
        <ToggleGroup value={[view]} onValueChange={(value) => { const next = value[0]; if (next) { const copy = new URLSearchParams(params); copy.set("view", next); setParams(copy) } }}>
          <ToggleGroupItem value="list">列表</ToggleGroupItem>
          <ToggleGroupItem value="cards">卡片</ToggleGroupItem>
        </ToggleGroup>
        <Input className="w-40" value={q} placeholder="关键字" aria-label="搜索服务" onChange={(event) => { const copy = new URLSearchParams(params); copy.set("q", event.target.value); setParams(copy) }} />
        <Select value={sort} onValueChange={(value) => typeof value === "string" && setSort(value as typeof sort)}>
          <SelectTrigger aria-label="排序"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">按名称</SelectItem>
            <SelectItem value="incidents">按事件数</SelectItem>
            <SelectItem value="updated">按更新时间</SelectItem>
          </SelectContent>
        </Select>
      </Toolbar>
      <div className="min-h-0 flex-1 overflow-auto p-[var(--page-gutter)] pb-[var(--chat-fab-clearance)]">
        {services.isLoading ? <CollectionSkeleton /> : null}
        {services.isError ? <ErrorState message="服务目录加载失败" onRetry={() => void services.refetch()} /> : null}
        {services.isSuccess && filtered.length === 0 ? <EmptyState title="没有服务" description="新建服务或清除筛选。" /> : null}
        {view === "list" && filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>团队</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>健康</TableHead>
                <TableHead>最近事件</TableHead>
                <TableHead>最近变更</TableHead>
                <TableHead>更新时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Link className="underline-offset-2 hover:underline" to={`/${workspaceId}/services/${item.id}`}>{item.name}</Link></TableCell>
                  <TableCell>{teams.data?.find((team) => team.id === item.teamId)?.name}</TableCell>
                  <TableCell>{members.data?.find((member) => member.id === item.ownerId)?.name}</TableCell>
                  <TableCell><HealthBadge value={item.health} /></TableCell>
                  <TableCell>{item.recentIncidentCount}</TableCell>
                  <TableCell>{formatDate(item.lastChangeAt)}</TableCell>
                  <TableCell>{formatDate(item.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {view === "cards" ? (
          <div className="grid gap-3 [container-type:inline-size] [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]">
            {filtered.map((item) => (
              <Card key={item.id}>
                <CardHeader><CardTitle><Link to={`/${workspaceId}/services/${item.id}`}>{item.name}</Link></CardTitle></CardHeader>
                <CardContent className="flex items-center justify-between">
                  <HealthBadge value={item.health} />
                  <Button size="xs" variant="outline" onClick={() => setDisableId(item.id)}>{item.status === "disabled" ? "恢复" : "停用"}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
      <ServiceForm open={Boolean(editing)} value={editing} workspaceId={workspaceId} onClose={() => setEditing(null)} />
      <AlertDialog open={Boolean(disableId)} onOpenChange={(open) => { if (!open) setDisableId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>停用服务？</AlertDialogTitle>
            <AlertDialogDescription>停用后不能再创建新的关联事件，历史事件仍可查看。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => disableId && void setServiceStatus(disableId, "disabled").then(() => queryClient.invalidateQueries())}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ServiceForm({ open, value, workspaceId, onClose }: { open: boolean; value: Partial<Service> | null; workspaceId: string; onClose: () => void }) {
  const teams = useQuery({ queryKey: keys.teams(workspaceId), queryFn: () => listTeams(workspaceId), enabled: open })
  const members = useQuery({ queryKey: keys.members(workspaceId), queryFn: () => listMembers(workspaceId), enabled: open })
  const [name, setName] = useState(value?.name ?? "")
  const [slug, setSlug] = useState(value?.slug ?? "")
  const [error, setError] = useState("")
  const mutation = useMutation({
    mutationFn: () => upsertService(workspaceId, serviceFormSchema.parse({
      name,
      slug,
      description: value?.description ?? "",
      teamId: value?.teamId || teams.data?.[0]?.id || "",
      ownerId: value?.ownerId || members.data?.[0]?.id || "",
      environment: (value?.environment ?? "prod") as Environment,
      repoUrl: value?.repoUrl ?? "",
      docsUrl: value?.docsUrl ?? "",
      dependsOn: value?.dependsOn ?? [],
      alertRules: value?.alertRules ?? "",
    })),
    onSuccess: async () => { await queryClient.invalidateQueries(); toast.success("服务已保存"); onClose() },
    onError: (err) => setError(err.message),
  })
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{value?.id ? "编辑服务" : "新建服务"}</DialogTitle></DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>名称</FieldLabel>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel>标识</FieldLabel>
            <Input value={slug} onChange={(event) => setSlug(event.target.value)} />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "保存中" : "保存"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ServiceDetailPage() {
  const { workspaceId = "ws-alpha", serviceId = "" } = useParams()
  const navigate = useNavigate()
  const service = useQuery({ queryKey: keys.service(serviceId), queryFn: () => getService(serviceId) })
  const checks = useQuery({ queryKey: keys.healthChecks(serviceId), queryFn: () => listHealthChecks(serviceId), enabled: Boolean(service.data) })
  const all = useQuery({ queryKey: keys.services(workspaceId), queryFn: () => listServices(workspaceId) })
  if (service.isLoading) return <CollectionSkeleton />
  if (service.isError) return <ErrorState message="服务详情加载失败" onRetry={() => void service.refetch()} />
  if (!service.data) return <EmptyState title="服务不存在" description="返回目录选择其他服务。" action={<Button render={<Link to={`/${workspaceId}/services`} />}>返回</Button>} />
  const item = service.data
  const deps = (all.data ?? []).filter((row) => item.dependsOn.includes(row.id))
  const dependents = (all.data ?? []).filter((row) => row.dependsOn.includes(item.id))
  return (
    <div className="h-full overflow-auto p-[var(--page-gutter)] pb-[var(--chat-fab-clearance)]">
      <PageHeader title={item.name} description={item.slug} actions={<Button size="sm" variant="outline" onClick={() => navigate(`/${workspaceId}/services`)}>返回</Button>} />
      <div className="mt-4 space-y-3">
        <p>{item.description}</p>
        <HealthBadge value={item.health} />
        <p>环境 {item.environment} · 仓库 {item.repoUrl}</p>
        <h2 className="text-[length:var(--type-title-sm)]">依赖</h2>
        {deps.length === 0 ? <EmptyState title="无依赖关系" description="此服务没有上游依赖。" /> : deps.map((row) => <Link key={row.id} to={`/${workspaceId}/services/${row.id}`}>{row.name}</Link>)}
        <h2 className="text-[length:var(--type-title-sm)]">被依赖</h2>
        {dependents.map((row) => <p key={row.id}>{row.name}</p>)}
        <h2 className="text-[length:var(--type-title-sm)]">健康检查</h2>
        {(checks.data ?? []).map((row) => (
          <p key={row.id}>{row.name} · {row.status === "fail" ? "失败" : "通过"} · {row.detail}</p>
        ))}
      </div>
    </div>
  )
}
