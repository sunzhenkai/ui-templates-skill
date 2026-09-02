import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { DetailHeader } from '@/components/layout/page-header'
import { Badge, Button, Checkbox, Field, Input, Select, Skeleton, StateView, Textarea } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/overlay'
import { useSimulatedLoad } from '@/lib/page-load'
import { formatDateTime, relativeTime, uniqueId } from '@/lib/utils'
import type { Attachment, Comment, Incident, IncidentStatus } from '@/types'

const actions: Record<IncidentStatus, { to: IncidentStatus; label: string }[]> = {
  pending: [{ to: 'processing', label: '确认并开始处理' }],
  processing: [{ to: 'waiting', label: '等待外部' }, { to: 'resolved', label: '标记解决' }],
  waiting: [{ to: 'processing', label: '恢复处理' }, { to: 'resolved', label: '标记解决' }],
  resolved: [{ to: 'processing', label: '重新打开' }, { to: 'archived', label: '归档' }],
  archived: [{ to: 'processing', label: '重新打开' }],
}

export function IncidentDetailPage() {
  const { incidentId } = useParams()
  const { data, updateData, showToast } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const load = useSimulatedLoad('incident-detail', 220, [incidentId])
  const [comment, setComment] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [editingId, setEditingId] = useState<string>()
  const [editText, setEditText] = useState('')
  const dirty = comment.trim().length > 0

  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const incident = data?.incidents.find(item => item.id === incidentId)
  const similar = useMemo(() => data?.incidents.filter(item => item.id !== incident?.id && (item.serviceId === incident?.serviceId || item.severity === incident?.severity)).slice(0, 3) ?? [], [data, incident])
  const relatedChanges = data?.changes.filter(change => incident?.changeIds.includes(change.id) || change.serviceId === incident?.serviceId).slice(0, 3) ?? []
  const relatedAlerts = data?.inbox.filter(item => item.severity === incident?.severity).slice(0, 3) ?? []

  if (load.loading) return <div className="min-h-0 flex-1 p-4"><Skeleton className="h-12" /><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]"><div className="grid gap-3"><Skeleton className="h-8" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div><Skeleton className="hidden h-full lg:block" /></div></div>
  if (load.error) return <StateView tone="danger" className="flex-1" icon="!" title="事件详情加载失败" description={load.error.message} action={<Button variant="primary" onClick={load.reload}>重试</Button>} />
  if (!data || !incident) return <StateView icon="?" className="flex-1" title="事件不存在" description="可能已被删除或地址无效。" action={<Button onClick={() => navigate('/events')}>返回事件列表</Button>} />

  const mutate = (changes: Partial<Incident>, text?: string) => {
    const now = new Date().toISOString()
    updateData(current => ({ ...current, incidents: current.incidents.map(item => item.id === incident.id ? { ...item, ...changes, updatedAt: now, timeline: text ? [...item.timeline, { id: uniqueId('tl'), at: now, actor: '当前用户', kind: 'field', text }] : item.timeline } : item) }))
  }
  const changeStatus = (status: IncidentStatus) => {
    if (status === 'archived') { setConfirmArchive(true); return }
    const now = new Date().toISOString()
    updateData(current => ({ ...current, incidents: current.incidents.map(item => item.id === incident.id ? {
      ...item, status, updatedAt: now, resolvedAt: status === 'resolved' ? now : item.resolvedAt,
      timeline: [...item.timeline, { id: uniqueId('tl'), at: now, actor: '当前用户', kind: 'status', text: `状态变更为 ${status}。` }]
    } : item) }))
    showToast({ tone: 'success', title: '状态已更新', description: `当前状态：${status}` })
  }
  const addComment = () => {
    if (!comment.trim()) return
    const now = new Date().toISOString()
    const entry: Comment = { id: uniqueId('cm'), authorId: data.members[0].id, authorName: '林川', at: now, text: comment, attachments: [], own: true }
    updateData(current => ({ ...current, incidents: current.incidents.map(item => item.id === incident.id ? { ...item, comments: [...item.comments, entry], timeline: [...item.timeline, { id: uniqueId('tl'), at: now, actor: '林川', kind: 'comment', text: comment }] } : item) }))
    setComment(''); showToast({ tone: 'success', title: '评论已发布' })
  }
  const uploadFiles = (files: FileList) => {
    const list: Attachment[] = [...files].map(file => ({ id: uniqueId('at'), name: file.name, size: '1.0 MB', progress: 100, status: file.name.includes('fail-upload') ? 'error' : 'done' }))
    mutate({ attachments: [...incident.attachments, ...list] })
    if (list.some(file => file.status === 'error')) showToast({ tone: 'error', title: '附件上传失败', description: '文件名包含 fail-upload 时模拟失败。', action: { label: '重试', onClick: () => mutate({ attachments: incident.attachments.map(file => ({ ...file, status: 'done' })) }) } })
    else showToast({ tone: 'success', title: '附件上传完成' })
  }
  const timeline = incident.timeline.length ? incident.timeline : []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DetailHeader
        title={`${incident.key} · ${incident.title}`}
        backTo={`/events?ws=${params.get('ws') ?? ''}`}
        backLabel="事件列表"
        breadcrumb={[{ label: '事件列表', to: `/events?ws=${params.get('ws') ?? ''}` }, { label: '看板', to: `/board?ws=${params.get('ws') ?? ''}` }, { label: incident.key }]}
        actions={actions[incident.status].map(action => <Button key={action.to} size="sm" variant={action.to === 'resolved' ? 'primary' : 'outline'} onClick={() => changeStatus(action.to)}>{action.label}</Button>)}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <main aria-label="事件主内容" className="scroll-stable min-h-0 flex-1 overflow-y-auto p-4 pb-20 lg:pb-4">
          <div className="mx-auto max-w-224 grid gap-5 px-2 md:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={incident.severity === 'sev1' ? 'danger' : incident.severity === 'sev2' ? 'warning' : 'muted'}>{incident.severity.toUpperCase()}</Badge>
              <Badge tone={incident.status === 'resolved' ? 'success' : incident.status === 'archived' ? 'muted' : incident.status === 'waiting' ? 'warning' : 'brand'}>{incident.status}</Badge>
              <span className="numeric font-caption text-muted-foreground">更新于 {relativeTime(incident.updatedAt)}</span>
            </div>
            <section className="grid gap-4 rounded-card border border-border p-4">
              <h2 className="font-title-sm">摘要与影响</h2>
              <p className="font-body text-muted-foreground">{incident.summary}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div><dt className="font-caption text-muted-foreground">负责人</dt><dd><Select aria-label="变更负责人" value={incident.assigneeId} onChange={event => mutate({ assigneeId: event.target.value }, `负责人变更为 ${data.members.find(member => member.id === event.target.value)?.name}`)}>{data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</Select></dd></div>
                <div><dt className="font-caption text-muted-foreground">参与团队</dt><dd className="font-body">{incident.teamIds.map(id => data.teams.find(team => team.id === id)?.name).join('、')}</dd></div>
                <div><dt className="font-caption text-muted-foreground">关联服务</dt><dd><Link className="rounded-sm text-brand hover:underline" to={`/services/${incident.serviceId}?ws=${params.get('ws') ?? ''}`}>{data.services.find(service => service.id === incident.serviceId)?.name}</Link></dd></div>
                <div><dt className="font-caption text-muted-foreground">关联变更</dt><dd className="flex flex-wrap gap-1 font-body">{incident.changeIds.length ? incident.changeIds.map(id => { const change=data.changes.find(item => item.id === id); return change ? <button key={id} type="button" className="rounded-sm border border-border px-1 font-caption hover:bg-surface-hover" onClick={() => mutate({ changeIds: incident.changeIds.filter(value => value !== id) }, `取消关联变更 ${change.key}`)}>{change.key} ×</button> : null }) : <span>无</span>}</dd></div>
                <div><dt className="font-caption text-muted-foreground">发生时间</dt><dd className="numeric font-body">{formatDateTime(incident.startedAt)}</dd></div>
                <div><dt className="font-caption text-muted-foreground">解决时间</dt><dd className="numeric font-body">{incident.resolvedAt ? formatDateTime(incident.resolvedAt) : '未解决'}</dd></div>
              </dl>
              <div className="border-t border-surface-border pt-3">
                <p className="font-caption text-muted-foreground">标签</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {incident.tagIds.map(tag => <Badge key={tag}>{tag}<button type="button" aria-label={`移除标签 ${tag}`} className="ml-1" onClick={() => mutate({ tagIds: incident.tagIds.filter(value => value !== tag) }, `移除标签 ${tag}`)}>×</button></Badge>)}
                  <div className="flex items-center gap-1">
                    <label className="sr-only" htmlFor="new-tag">添加标签</label>
                    <Input id="new-tag" className="h-7 w-28" value={tagInput} onChange={event => setTagInput(event.target.value)} />
                    <Button size="sm" onClick={() => { if (tagInput && !incident.tagIds.includes(tagInput)) mutate({ tagIds: [...incident.tagIds, tagInput] }, `添加标签 ${tagInput}`); setTagInput('') }}>添加</Button>
                  </div>
                </div>
              </div>
            </section>

            <section aria-label="活动时间线" className="rounded-card border border-border p-4">
              <h2 className="font-title-sm">活动时间线</h2>
              {timeline.length === 0 ? <StateView icon="◷" title="暂无时间线" description="状态变更和评论会记录在这里。" /> : (
                <ol className="mt-3 grid gap-3">
                  {timeline.map(entry => (
                    <li key={entry.id} className="border-l border-border pl-3">
                      <div className="flex flex-wrap items-center gap-2 font-caption text-muted-foreground">
                        <span>{entry.actor}</span><Badge>{entry.kind}</Badge><span className="numeric">{formatDateTime(entry.at)}</span>
                      </div>
                      <p className="font-body">{entry.text}</p>
                    </li>
                  ))}
                </ol>
              )}
              <div className="mt-4 border-t border-surface-border pt-4">
                <Field label="添加评论" hint="点击成员名插入 @ 提及" htmlFor="comment">
                  <Textarea id="comment" value={comment} onChange={event => setComment(event.target.value)} placeholder="输入更新，例如 @赵晴 已完成回滚" />
                </Field>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {data.members.slice(0, 4).map(member => <Button key={member.id} size="sm" onClick={() => setComment(current => `${current}${current ? ' ' : ''}@${member.name} `)}>@{member.name}</Button>)}
                  <label className="ml-auto">
                    <span className="sr-only">上传附件</span>
                    <input type="file" multiple onChange={event => event.target.files && uploadFiles(event.target.files)} className="h-8 rounded-control border border-border bg-surface px-2 file:border-0" />
                  </label>
                  <Button variant="primary" onClick={addComment}>发布</Button>
                </div>
                {incident.attachments.length > 0 && (
                  <ul className="mt-3 grid gap-1">
                    {incident.attachments.map(file => (
                      <li key={file.id} className="flex items-center gap-2 rounded-card border border-border px-2 py-1">
                        <span aria-hidden>📎</span><span className="truncate font-caption">{file.name}</span>
                        <span className="numeric ml-auto font-caption text-muted-foreground">{file.size}</span>
                        <Badge tone={file.status === 'error' ? 'danger' : 'success'}>{file.status === 'error' ? '失败' : '完成'}</Badge>
                        {file.status === 'error' && <Button size="sm" onClick={() => mutate({ attachments: incident.attachments.map(entry => entry.id === file.id ? { ...entry, status: 'done' } : entry) })}>重试</Button>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section aria-label="评论列表" className="grid gap-3">
              {incident.comments.map(entry => (
                <article key={entry.id} className="rounded-card border border-border p-3">
                  <header className="flex items-center gap-2">
                    <span className="font-label">{entry.authorName}</span><span className="numeric font-caption text-muted-foreground">{formatDateTime(entry.at)}</span>
                  </header>
                  {editingId === entry.id ? (
                    <div className="mt-2 grid gap-2">
                      <Textarea value={editText} onChange={event => setEditText(event.target.value)} aria-label="编辑评论" />
                      <div className="flex gap-2"><Button size="sm" variant="primary" onClick={() => { mutate({}, undefined); updateData(current => ({ ...current, incidents: current.incidents.map(item => item.id === incident.id ? { ...item, comments: item.comments.map(cm => cm.id === entry.id ? { ...cm, text: editText } : cm) } : item) })); setEditingId(undefined) }}>保存</Button><Button size="sm" onClick={() => setEditingId(undefined)}>取消</Button></div>
                    </div>
                  ) : <p className="mt-1 font-body">{entry.text}</p>}
                  {entry.own && editingId !== entry.id && <footer className="mt-2 flex gap-2"><Button size="sm" onClick={() => { setEditingId(entry.id); setEditText(entry.text) }}>编辑</Button><Button size="sm" variant="danger" onClick={() => updateData(current => ({ ...current, incidents: current.incidents.map(item => item.id === incident.id ? { ...item, comments: item.comments.filter(cm => cm.id !== entry.id) } : item) }))}>删除</Button></footer>}
                </article>
              ))}
            </section>
          </div>
        </main>

        <aside aria-label="事件属性与上下文" className="hidden w-80 shrink-0 overflow-y-auto border-l border-border p-4 lg:block">
          <div className="grid gap-5">
            <section><h2 className="font-title-sm">属性</h2><dl className="mt-2 grid gap-2 font-body"><div className="flex justify-between"><dt className="text-muted-foreground">影响用户</dt><dd className="numeric">{incident.impactedUsers.toLocaleString()}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">响应</dt><dd className="numeric">{incident.responseMinutes} 分钟</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">恢复</dt><dd className="numeric">{incident.restoreMinutes} 分钟</dd></div></dl></section>
            <section><h2 className="font-title-sm">服务健康</h2><p className="mt-1 flex items-center gap-2"><Badge tone={data.services.find(service => service.id === incident.serviceId)?.health === 'healthy' ? 'success' : 'warning'}>{data.services.find(service => service.id === incident.serviceId)?.health}</Badge><Link className="font-caption text-brand hover:underline" to={`/services/${incident.serviceId}?ws=${params.get('ws') ?? ''}`}>查看服务</Link></p></section>
            <section><h2 className="font-title-sm">相似事件</h2>{similar.length ? <ul className="mt-2 grid gap-2">{similar.map(item => <li key={item.id}><Link to={`/events/${item.id}?ws=${params.get('ws') ?? ''}`} className="block rounded-card border border-border p-2 hover:bg-surface-hover"><span className="numeric block font-micro text-brand">{item.key}</span><span className="line-clamp-2 font-caption">{item.title}</span></Link></li>)}</ul> : <p className="font-caption text-faint">暂无相似事件</p>}</section>
            <section><h2 className="font-title-sm">最近变更</h2>{relatedChanges.length ? <ul className="mt-2 grid gap-1 font-caption">{relatedChanges.map(change => <li key={change.id} className="flex justify-between"><span>{change.key}</span><Badge tone={change.status === 'failed' ? 'danger' : change.status === 'running' ? 'brand' : 'success'}>{change.status}</Badge></li>)}</ul> : <p className="font-caption text-faint">暂无关联变更</p>}</section>
            <section><h2 className="font-title-sm">相关告警</h2>{relatedAlerts.length ? <ul className="mt-2 grid gap-1 font-caption">{relatedAlerts.map(alert => <li key={alert.id}>{alert.title}</li>)}</ul> : <p className="font-caption text-faint">暂无相关告警</p>}</section>
          </div>
        </aside>
      </div>
      <ConfirmDialog open={confirmArchive} title="归档事件" message={`${incident.key} 将进入归档状态。`} confirmLabel="归档" onClose={() => setConfirmArchive(false)} onConfirm={() => { setConfirmArchive(false); changeStatus('archived') }} />
      {dirty && <div role="status" className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface p-2 font-caption text-muted-foreground lg:left-0">评论尚未发布，离开页面前请确认。</div>}
      <Checkbox label="" className="sr-only" checked={false} onChange={() => {}} aria-hidden />
    </div>
  )
}
