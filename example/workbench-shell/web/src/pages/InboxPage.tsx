import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, Filter, Inbox as InboxIcon, UserPlus, XCircle } from 'lucide-react'
import { PageHeader } from '../components/shell'
import { Avatar, Badge, Button, Card, EmptyState, Input, Select } from '../components/ui'
import { formatDate, severityTone } from '../lib'
import { useWorkbench } from '../store'

export function InboxPage() {
  const navigate = useNavigate()
  const { inbox, bulkInbox, updateInbox, requestConfirm, pushToast } = useWorkbench()
  const [selected, setSelected] = useState<string[]>([])
  const [type, setType] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const filtered = useMemo(() => inbox.filter((item) => {
    if (type !== 'all' && item.type !== type) return false
    if (severity !== 'all' && item.severity !== severity) return false
    if (source !== 'all' && item.source !== source) return false
    if (status !== 'all' && item.status !== status) return false
    if (query && !item.title.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [inbox, type, severity, source, status, query])
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const allSelected = filtered.length > 0 && filtered.every((item) => selected.includes(item.id))
  const runBulk = (action: 'read' | 'assign' | 'close') => {
    if (!selected.length) return
    const perform = () => { bulkInbox(selected, action === 'read' ? { status: 'read' } : action === 'close' ? { status: 'resolved' } : { assigneeId: 'm1' }); pushToast({ tone: 'success', title: '批量操作已完成', message: `${selected.length} 项已更新` }); setSelected([]) }
    if (action === 'close') requestConfirm({ title: '关闭选中事项？', message: `${selected.length} 项事项会被标记为已解决。`, confirmLabel: '关闭事项', onConfirm: perform })
    else perform()
  }
  const reset = () => { setType('all'); setSeverity('all'); setSource('all'); setStatus('all'); setQuery('') }
  const simulateLoading = () => { setLoading(true); window.setTimeout(() => setLoading(false), 600) }
  return <div className="flex h-full flex-col" data-testid="inbox-page">
    <PageHeader title="收件箱" description={`${inbox.filter((item) => item.status === 'unread').length} 条未处理`} actions={<><Button onClick={simulateLoading}><Filter className="size-4" />刷新</Button><Button variant="primary" onClick={() => navigate('/incidents')}><InboxIcon className="size-4" />查看事件</Button></>} toolbar={<>
      <Input aria-label="搜索收件箱" className="max-w-56" placeholder="搜索事项…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select aria-label="事项类型" className="w-32" value={type} onChange={(event) => setType(event.target.value)}><option value="all">全部类型</option><option value="alert">告警</option><option value="assignment">分派</option><option value="confirmation">确认</option><option value="mention">提及</option></Select>
      <Select aria-label="严重等级" className="w-28" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="all">全部等级</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>
      <Select aria-label="来源" className="w-32" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">全部来源</option>{[...new Set(inbox.map((item) => item.source))].map((item) => <option key={item}>{item}</option>)}</Select>
      <Select aria-label="处理状态" className="w-28" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option><option value="unread">未读</option><option value="read">已读</option><option value="resolved">已解决</option></Select>
      <Button variant="ghost" onClick={reset}>重置</Button>
      <div className="ml-auto flex items-center gap-2"><Button size="sm" disabled={!selected.length} onClick={() => runBulk('read')}><CheckCheck className="size-4" />标记已读</Button><Button size="sm" disabled={!selected.length} onClick={() => runBulk('assign')}><UserPlus className="size-4" />分派给我</Button><Button size="sm" disabled={!selected.length} onClick={() => runBulk('close')}><XCircle className="size-4" />关闭</Button></div>
    </>} />
    <div className="min-h-0 flex-1 overflow-auto p-3">
      {loading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-[var(--surface-hover)]" />)}</div> : filtered.length === 0 ? <EmptyState title="没有匹配事项" description="调整筛选条件或重置后重试。" action={<Button onClick={reset}>重置筛选</Button>} /> : <Card className="overflow-hidden">
        <div className="flex h-9 items-center gap-3 border-b border-[var(--border)] px-3 text-[11px] font-medium text-[var(--text-faint)]"><input type="checkbox" aria-label="全选当前结果" checked={allSelected} onChange={() => setSelected(allSelected ? [] : filtered.map((item) => item.id))} /><span className="w-20">类型</span><span className="min-w-0 flex-1">标题</span><span className="hidden w-24 sm:block">来源</span><span className="w-20">等级</span><span className="hidden w-20 md:block">负责人</span><span className="hidden w-28 lg:block">创建时间</span><span className="w-20">状态</span></div>
        {filtered.map((item) => <div key={item.id} role="button" tabIndex={0} className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-[var(--border)] px-3 text-[12px] last:border-0 hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]" onClick={() => { updateInbox(item.id, { status: 'read' }); if (item.incidentId) navigate(`/incidents/${item.incidentId}`) }} onKeyDown={(event) => event.key === 'Enter' && navigate(item.incidentId ? `/incidents/${item.incidentId}` : '/inbox')}><input type="checkbox" aria-label={`选择 ${item.title}`} checked={selected.includes(item.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggle(item.id)} /><span className="w-20 capitalize text-[var(--text-faint)]">{item.type}</span><span className="min-w-0 flex-1 truncate font-medium">{item.title}</span><span className="hidden w-24 truncate text-[var(--text-muted)] sm:block">{item.source}</span><span className="w-20"><Badge tone={severityTone(item.severity) as never}>{item.severity}</Badge></span><span className="hidden w-20 items-center gap-1 md:flex">{item.assigneeId ? <><Avatar name={item.assigneeId} size="sm" /><span className="truncate text-[11px]">{item.assigneeId}</span></> : <span className="text-[var(--text-faint)]">未分配</span>}</span><span className="hidden w-28 text-[11px] text-[var(--text-faint)] lg:block">{formatDate(item.createdAt)}</span><span className="w-20"><Badge tone={item.status === 'unread' ? 'brand' : item.status === 'resolved' ? 'success' : 'neutral'}>{item.status}</Badge></span></div>)}
      </Card>}
    </div>
  </div>
}
