import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, GitBranch, MessageSquare, Paperclip, Send, UserCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { SkeletonList } from '@/components/shared/skeletons'
import { ErrorState } from '@/components/shared/error-state'
import { SeverityBadge } from '@/components/shared/severity-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'
import type { IncidentStatus } from '@/lib/types'

const STATUS_FLOW: IncidentStatus[] = ['triggered', 'acknowledged', 'investigating', 'mitigated', 'resolved']

export function EventDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const open = !!id
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')

  const incidentQ = useQuery({
    queryKey: ['incident', id],
    queryFn: () => (id ? api.getIncident(id) : Promise.resolve(null)),
    enabled: open,
  })
  const membersQ = useQuery({ queryKey: ['members'], queryFn: api.members, enabled: open })
  const servicesQ = useQuery({ queryKey: ['services'], queryFn: api.services, enabled: open })
  const changesQ = useQuery({ queryKey: ['changes'], queryFn: api.changes, enabled: open })

  useEffect(() => {
    if (!open) setComment('')
  }, [open])

  const incident = incidentQ.data

  const statusMutation = useMutation({
    mutationFn: (status: IncidentStatus) => api.updateIncidentStatus(id!, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incident', id] })
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('状态已更新')
    },
    onError: (e) => toast.error('更新失败', { description: e instanceof Error ? e.message : undefined }),
  })
  const assignMutation = useMutation({
    mutationFn: (assigneeId: string | null) => api.assignIncident(id!, assigneeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incident', id] })
      toast.success('已分派')
    },
  })
  const commentMutation = useMutation({
    mutationFn: (body: string) => api.addComment(id!, body),
    onSuccess: () => {
      setComment('')
      void queryClient.invalidateQueries({ queryKey: ['incident', id] })
      toast.success('评论已发布')
    },
  })

  const service = incident ? servicesQ.data?.find((s) => s.id === incident.serviceId) : null
  const assignee = incident ? membersQ.data?.find((m) => m.id === incident.assigneeId) : null
  const linkedChanges = changesQ.data?.filter((c) => incident?.changeIds.includes(c.id)) ?? []

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent>
        {!incidentQ.isPending && !incident && id ? (
          <SheetBody>
            <div className="py-12 text-center">
              <p className="text-body font-medium">事件不存在</p>
              <p className="mt-1 text-caption text-muted-foreground">该事件可能已被删除或归档。</p>
              <Button className="mt-4" variant="outline" onClick={onClose}>关闭</Button>
            </div>
          </SheetBody>
        ) : incidentQ.isPending ? (
          <SheetBody><SkeletonList rows={5} /></SheetBody>
        ) : incidentQ.isError ? (
          <SheetBody><ErrorState onRetry={() => incidentQ.refetch()} description={incidentQ.error instanceof Error ? incidentQ.error.message : undefined} /></SheetBody>
        ) : incident ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 text-micro text-muted-foreground tabular">
                <span>{incident.number}</span>
                <Separator orientation="vertical" className="h-3" />
                <span>{service?.name ?? incident.serviceId}</span>
              </div>
              <SheetTitle>{incident.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
                {incident.pinned ? <Badge variant="brand">置顶</Badge> : null}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-4">
              <p className="text-body text-foreground">{incident.description}</p>

              {incident.tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {incident.tags.map((t) => <Badge key={t} variant="ghost">{t}</Badge>)}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-3 text-caption">
                <div>
                  <p className="text-muted-foreground">发生时间</p>
                  <p className="tabular">{formatDate(incident.occurredAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">创建时间</p>
                  <p className="tabular">{formatRelativeTime(incident.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">影响服务</p>
                  <p>{service?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">负责人</p>
                  <Select value={incident.assigneeId ?? ''} onValueChange={(v) => assignMutation.mutate(v || null)}>
                    <SelectTrigger className="mt-0.5 h-7"><SelectValue placeholder="未分派" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">未分派</SelectItem>
                      {membersQ.data?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-micro uppercase tracking-wide text-muted-foreground">状态流转</p>
                <Select value={incident.status} onValueChange={(v) => statusMutation.mutate(v as IncidentStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_FLOW.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {linkedChanges.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-micro uppercase tracking-wide text-muted-foreground">关联变更</p>
                  <ul className="space-y-1.5">
                    {linkedChanges.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-caption">
                        <GitBranch className="size-3.5 text-warning" />
                        <span className="flex-1 truncate">{c.title}</span>
                        <Badge variant="outline" className="text-micro">{c.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {incident.attachments.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-micro uppercase tracking-wide text-muted-foreground">附件</p>
                  <ul className="space-y-1.5">
                    {incident.attachments.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-caption">
                        <Paperclip className="size-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate">{a.name}</span>
                        <span className="text-micro text-muted-foreground tabular">{Math.round(a.size / 1024)} KB</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Separator />

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-micro uppercase tracking-wide text-muted-foreground">
                  <MessageSquare className="size-3" /> 评论（{incident.comments.length}）
                </p>
                <div className="space-y-2">
                  {incident.comments.length === 0 ? (
                    <p className="text-caption text-muted-foreground">还没有评论，第一条说点什么？</p>
                  ) : (
                    incident.comments.map((c) => {
                      const author = membersQ.data?.find((m) => m.id === c.authorId)
                      return (
                        <div key={c.id} className="flex gap-2 rounded-md border border-border bg-surface p-3">
                          <Avatar initials={author?.initials ?? '??'} color={author?.color} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-label font-medium">{author?.name ?? c.authorId}</span>
                              <span className="text-micro text-muted-foreground tabular">{formatRelativeTime(c.createdAt)}</span>
                            </div>
                            <p className="mt-0.5 whitespace-pre-line text-body">{c.body}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-2">
                    <UserCircle2 className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="写一条评论，使用 @ 提及成员…"
                      rows={2}
                      className="min-h-[40px] border-0 bg-transparent p-1 focus-visible:ring-0"
                    />
                    <Button
                      size="sm"
                      variant="brand"
                      disabled={!comment.trim() || commentMutation.isPending}
                      onClick={() => commentMutation.mutate(comment.trim())}
                    >
                      <Send className="size-3.5" /> 发布
                    </Button>
                  </div>
                </div>
              </div>

              {incident.activity.length > 0 ? (
                <div>
                  <p className="mb-2 text-micro uppercase tracking-wide text-muted-foreground">活动记录</p>
                  <ol className="relative space-y-2 border-l border-border pl-4">
                    {incident.activity.slice().reverse().slice(0, 6).map((a) => {
                      const actor = membersQ.data?.find((m) => m.id === a.actorId)
                      return (
                        <li key={a.id} className="relative">
                          <span className="absolute -left-[19px] top-1.5 inline-block size-2 rounded-full bg-brand/40 ring-2 ring-surface" aria-hidden />
                          <p className="text-caption">
                            <span className="font-medium">{actor?.name ?? a.actorId}</span>
                            <span className="text-muted-foreground"> · {a.kind}</span>
                            {a.note ? <span className="text-muted-foreground"> · {a.note}</span> : null}
                          </p>
                          <p className="text-micro text-muted-foreground tabular">
                            <Calendar className="mr-0.5 inline size-2.5" />
                            {formatDate(a.at)}
                          </p>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              ) : null}
            </SheetBody>

            <SheetFooter>
              <Button variant="outline" onClick={onClose}>关闭</Button>
              {assignee ? <span className="self-center text-caption text-muted-foreground">当前负责人：{assignee.name}</span> : null}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
