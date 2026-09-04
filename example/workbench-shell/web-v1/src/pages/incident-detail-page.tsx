import { CollectionSkeleton, EmptyState, ErrorState, HealthBadge, PageHeader, SeverityBadge, StatusBadge } from "@/components/shared/chrome"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { addAttachment, addComment, deleteComment, editComment, getIncident, listHealthChecks, listMembers, listServices, listTimeline, updateIncident } from "@/lib/api/client"
import { allowedTransitions, formatDate, statusLabel } from "@/lib/labels"
import { keys, queryClient } from "@/lib/query"
import { CURRENT_USER_ID } from "@/mock/db"
import type { IncidentStatus } from "@/types/domain"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link, useBlocker, useParams } from "react-router"
import { toast } from "sonner"

export function IncidentDetailPage() {
  const { workspaceId = "ws-alpha", incidentId = "" } = useParams()
  const incident = useQuery({ queryKey: keys.incident(incidentId), queryFn: () => getIncident(incidentId) })
  const timeline = useQuery({ queryKey: keys.timeline(incidentId), queryFn: () => listTimeline(incidentId), enabled: Boolean(incident.data) })
  const members = useQuery({ queryKey: keys.members(workspaceId), queryFn: () => listMembers(workspaceId) })
  const services = useQuery({ queryKey: keys.services(workspaceId), queryFn: () => listServices(workspaceId) })
  const [draft, setDraft] = useState("")
  const [tag, setTag] = useState("")
  const [upload, setUpload] = useState(0)
  const dirty = draft.trim().length > 0
  const blocker = useBlocker(dirty)

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  const comment = useMutation({
    mutationFn: () => addComment(incidentId, draft, members.data?.filter((item) => draft.includes(`@${item.name}`)).map((item) => item.id) ?? []),
    onSuccess: async () => {
      setDraft("")
      await queryClient.invalidateQueries()
      toast.success("评论已发布")
    },
    onError: (error) => toast.error(error.message, { action: { label: "重试", onClick: () => comment.mutate() } }),
  })

  if (incident.isLoading) return <CollectionSkeleton />
  if (incident.isError) return <ErrorState message="事件详情加载失败" onRetry={() => void incident.refetch()} />
  if (!incident.data) {
    return (
      <div className="p-[var(--page-gutter)]">
        <Alert>
          <AlertTitle>事件不存在</AlertTitle>
          <AlertDescription>请返回列表选择其他事件。<Button render={<Link to={`/${workspaceId}/incidents`} />}>返回列表</Button></AlertDescription>
        </Alert>
      </div>
    )
  }

  const item = incident.data
  const nextStates = allowedTransitions[item.status]
  const relatedServices = (services.data ?? []).filter((service) => item.serviceIds.includes(service.id))
  const health = useQuery({ queryKey: keys.healthChecks(item.serviceIds[0] ?? ""), queryFn: () => listHealthChecks(item.serviceIds[0] ?? ""), enabled: Boolean(item.serviceIds[0]) })

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          title={`${item.number} ${item.title}`}
          description={<StatusBadge value={item.status} />}
          leading={
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink render={<Link to={`/${workspaceId}/incidents`} />}>事件</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>{item.number}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
          actions={
            <div className="flex gap-2">
              {nextStates.map((state) => (
                <Button key={state} size="sm" variant={state === "archived" ? "destructive" : "outline"} onClick={() => void updateIncident(item.id, { status: state }).then(() => queryClient.invalidateQueries())}>
                  {statusLabel[state]}
                </Button>
              ))}
              {INCIDENT_STATUSES_HIDDEN(item.status).map((state) => (
                <span key={state} className="sr-only">{statusLabel[state]} 不可用：当前状态不允许</span>
              ))}
            </div>
          }
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full pb-[var(--chat-fab-clearance)]">
            <div className="space-y-4 p-[var(--page-gutter)]">
              <p>{item.description}</p>
              <div className="flex flex-wrap gap-2">
                <SeverityBadge value={item.severity} />
                {item.tags.map((value) => <Badge key={value} variant="secondary">{value}</Badge>)}
                <form className="flex gap-1" onSubmit={(event) => { event.preventDefault(); void updateIncident(item.id, { tags: [...item.tags, tag] }).then(() => { setTag(""); return queryClient.invalidateQueries() }) }}>
                  <Input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="添加标签" aria-label="添加标签" className="h-7 w-28" />
                </form>
              </div>
              <p className="text-sm text-muted-foreground">负责人 {members.data?.find((member) => member.id === item.ownerId)?.name} · 开始 {formatDate(item.startedAt)}</p>
              <div className="flex flex-wrap gap-2">
                {relatedServices.map((service) => (
                  <Link key={service.id} to={`/${workspaceId}/services/${service.id}`} className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                    {service.name} <HealthBadge value={service.health} />
                  </Link>
                ))}
              </div>
              {timeline.isSuccess && timeline.data.length === 0 ? <EmptyState title="暂无时间线" description="添加第一条评论。" /> : null}
              <ol className="space-y-3">
                {(timeline.data ?? []).map((event) => (
                  <li key={event.id} className="rounded-md border bg-[var(--surface)] p-3">
                    <p className="text-[length:var(--type-caption)] text-muted-foreground">{formatDate(event.createdAt)} · {event.kind}{event.edited ? " · 已编辑" : ""}</p>
                    <p>{event.body}</p>
                    {event.kind === "comment" && event.actorId === CURRENT_USER_ID ? (
                      <div className="mt-2 flex gap-2">
                        <Button size="xs" variant="ghost" onClick={() => { const next = window.prompt("编辑评论", event.body); if (next) void editComment(event.id, next).then(() => queryClient.invalidateQueries()) }}>编辑</Button>
                        <Button size="xs" variant="ghost" onClick={() => void deleteComment(event.id).then(() => queryClient.invalidateQueries())}>删除</Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
              <div className="sticky bottom-0 space-y-2 bg-[var(--page-canvas)] pt-2">
                <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="添加评论，使用 @ 成员" aria-label="评论" />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => comment.mutate()} disabled={!draft.trim() || comment.isPending}>{comment.isPending ? "发布中" : "发布评论"}</Button>
                  <label className="text-sm">
                    上传附件
                    <Input type="file" className="mt-1" onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      setUpload(30)
                      const timer = window.setInterval(() => setUpload((value) => Math.min(90, value + 20)), 120)
                      void addAttachment(item.id, file.name, file.name.includes("fail")).then(async () => {
                        window.clearInterval(timer)
                        setUpload(100)
                        await queryClient.invalidateQueries()
                        toast.success("附件已上传")
                      }).catch((error: Error) => {
                        window.clearInterval(timer)
                        setUpload(0)
                        toast.error(error.message, { action: { label: "重试", onClick: () => void addAttachment(item.id, file.name) } })
                      })
                    }} />
                  </label>
                </div>
                {upload > 0 && upload < 100 ? <Progress value={upload} aria-label="上传进度" /> : null}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-l p-4 md:block">
        <h2 className="mb-2 text-[length:var(--type-label)]">上下文</h2>
        <p className="text-sm text-muted-foreground">相似事件、最近变更和相关告警</p>
        <Separator className="my-3" />
        <Link className="block text-sm underline-offset-2 hover:underline" to={`/${workspaceId}/incidents`}>查看更多事件</Link>
        {health.data?.some((row) => row.status === "fail") ? <Alert className="mt-3" variant="destructive"><AlertTitle>健康检查失败</AlertTitle></Alert> : null}
      </aside>
      {blocker.state === "blocked" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div role="alertdialog" className="rounded-lg bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-floating)]">
            <p>有未提交的评论，确认离开？</p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={() => blocker.reset?.()}>留下</Button>
              <Button onClick={() => blocker.proceed?.()}>离开</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function INCIDENT_STATUSES_HIDDEN(current: IncidentStatus) {
  const all: IncidentStatus[] = ["pending-confirm", "in-progress", "waiting-external", "resolved", "archived"]
  return all.filter((item) => item !== current && !allowedTransitions[current].includes(item))
}
