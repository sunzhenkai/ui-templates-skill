import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Paperclip, Send, UserRound } from 'lucide-react'
import { PageHeader } from '../components/shell'
import { Avatar, Badge, Button, Card, EmptyState, Input, Select, Tabs, Textarea } from '../components/ui'
import { formatDate, severityTone, statusTone } from '../lib'
import { changes, team } from '../data/mock'
import { useWorkbench } from '../store'

export function IncidentDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { incidents, services, updateIncident, addTimeline, pushToast } = useWorkbench()
  const incident = incidents.find((item) => item.id === id || item.number === id)
  const [tab, setTab] = useState('activity')
  const [comment, setComment] = useState('')
  if (!incident) return <div className="p-4"><EmptyState title="事件不存在" description="该事件可能已删除，或链接无效。" action={<Button onClick={() => navigate('/incidents')}>返回事件列表</Button>} /></div>
  const service = services.find((item) => item.id === incident.serviceId)
  const change = changes.find((item) => item.id === incident.changeId)
  const submitComment = () => { if (!comment.trim()) return; addTimeline(incident.id, comment.trim()); setComment(''); pushToast({ tone: 'success', title: '评论已发布' }) }
  return <div className="flex h-full flex-col" data-testid="incident-detail-page">
    <PageHeader title={`${incident.number} · ${incident.title}`} description={`${service?.name ?? '未知服务'} · 更新于 ${formatDate(incident.updatedAt)}`} actions={<><Button variant="ghost" onClick={() => navigate('/incidents')}><ArrowLeft className="size-4" />返回</Button><Button variant="primary" onClick={() => pushToast({ tone: 'success', title: '已标记为已读' })}>标记已读</Button></>} toolbar={<><Badge tone={severityTone(incident.severity) as never}>{incident.severity}</Badge><Badge tone={statusTone(incident.status) as never}>{incident.status}</Badge><span className="text-[11px] text-[var(--text-faint)]">{incident.team}</span><div className="ml-auto flex gap-2"><Select aria-label="修改状态" value={incident.status} onChange={(event) => updateIncident(incident.id, { status: event.target.value as typeof incident.status })}><option value="open">Open</option><option value="investigating">Investigating</option><option value="mitigated">Mitigated</option><option value="resolved">Resolved</option></Select></div></>} />
    <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-3">
        <Card className="p-4"><div className="flex items-start gap-3"><Avatar name={incident.assigneeId ?? '?'} size="lg" /><div className="min-w-0"><div className="text-[12px] text-[var(--text-faint)]">负责人</div><Select aria-label="负责人" value={incident.assigneeId ?? ''} onChange={(event) => updateIncident(incident.id, { assigneeId: event.target.value || null })}><option value="">未分配</option>{team.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</Select></div><div className="ml-auto text-right text-[11px] text-[var(--text-faint)]"><div>创建于</div><div>{formatDate(incident.createdAt)}</div></div></div><p className="mt-4 text-[13px] leading-6 text-[var(--text-muted)]">{incident.description}</p><div className="mt-4 flex flex-wrap gap-2">{incident.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}{change && <Badge tone="brand">变更 {change.id}</Badge>}</div></Card>
        <Tabs items={[{ id: 'activity', label: '活动记录' }, { id: 'comments', label: `评论 ${incident.timeline.filter((item) => item.kind === 'comment').length}` }, { id: 'attachments', label: `附件 ${incident.attachments.length}` }]} value={tab} onChange={setTab} />
        {tab === 'activity' && <Card className="p-4"><div className="space-y-5">{incident.timeline.length === 0 ? <EmptyState title="还没有活动记录" description="事件状态更新和评论会出现在这里。" /> : incident.timeline.map((item, index) => <div key={item.id} className="relative flex gap-3"><div className="absolute left-[13px] top-6 h-[calc(100%+20px)] w-px bg-[var(--border)] last:hidden" /><Avatar name={item.author} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[12px] font-medium">{item.author}</span><span className="text-[10px] text-[var(--text-faint)]">{formatDate(item.at)}</span><Badge>{item.kind}</Badge></div><p className="mt-1 text-[13px] text-[var(--text-muted)]">{item.text}</p>{index === incident.timeline.length - 1 && <div className="mt-3 flex gap-2"><Textarea aria-label="添加评论" className="min-h-20" placeholder="添加评论或更新…" value={comment} onChange={(event) => setComment(event.target.value)} /><Button variant="primary" size="icon" aria-label="发送评论" onClick={submitComment}><Send className="size-4" /></Button></div>}</div></div>)}</div></Card>}
        {tab === 'comments' && <Card className="p-4"><div className="flex gap-2"><Textarea aria-label="评论" placeholder="写下你的分析或更新…" value={comment} onChange={(event) => setComment(event.target.value)} /><Button variant="primary" size="icon" aria-label="发送评论" onClick={submitComment}><Send className="size-4" /></Button></div><div className="mt-4"><EmptyState title="评论视图" description="切换到活动记录可以查看完整时间线。" action={<Button onClick={() => setTab('activity')}><MessageSquare className="size-4" />查看时间线</Button>} /></div></Card>}
        {tab === 'attachments' && <Card className="p-4">{incident.attachments.length ? <div className="space-y-2">{incident.attachments.map((file) => <div key={file} className="flex items-center gap-2 rounded-md border border-[var(--border)] p-3 text-[12px]"><Paperclip className="size-4 text-[var(--text-faint)]" />{file}<Button size="sm" variant="ghost" className="ml-auto">下载</Button></div>)}</div> : <EmptyState title="没有附件" description="上传 trace、截图或日志后会显示在这里。" />}</Card>}
      </div>
      <aside className="space-y-3">
        <Card className="p-4"><h2 className="text-[12px] font-semibold">服务影响</h2><div className="mt-3 flex items-center gap-3"><span className={`size-2 rounded-full ${service?.health === 'operational' ? 'bg-[var(--success)]' : service?.health === 'degraded' ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'}`} /><div><div className="text-[13px] font-medium">{service?.name}</div><div className="text-[11px] text-[var(--text-faint)]">SLO {service?.slo}% · {service?.region}</div></div></div></Card>
        <Card className="p-4"><h2 className="text-[12px] font-semibold">关联变更</h2>{change ? <div className="mt-3 rounded-md border border-[var(--border)] p-3"><div className="text-[12px] font-medium">{change.id}</div><div className="mt-1 text-[11px] text-[var(--text-muted)]">{change.title}</div><Badge className="mt-2" tone="brand">{change.status}</Badge></div> : <p className="mt-3 text-[12px] text-[var(--text-muted)]">没有关联变更。</p>}</Card>
        <Card className="p-4"><h2 className="text-[12px] font-semibold">参与团队</h2><div className="mt-3 flex items-center gap-2"><Avatar name={incident.team} /><span className="text-[12px]">{incident.team}</span><UserRound className="ml-auto size-4 text-[var(--text-faint)]" /></div></Card>
        <Card className="p-4"><h2 className="text-[12px] font-semibold">危险操作</h2><Button variant="danger" className="mt-3 w-full" onClick={() => useWorkbench.getState().requestConfirm({ title: '删除事件？', message: `${incident.number} 会从当前工作区移除。`, confirmLabel: '删除', onConfirm: () => { pushToast({ tone: 'success', title: '已在演示中标记删除' }); navigate('/incidents') } })}>删除事件</Button></Card>
      </aside>
    </div>
  </div>
}
