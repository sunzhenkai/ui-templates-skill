import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, BarChart3, Bell, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp,
  Command, Inbox, LayoutGrid, Menu, Moon, Plus, Search, Server, Settings, Sun, User,
  X,
} from 'lucide-react'
import { changes, team, workspaces, type IncidentStatus, type Severity } from '../data/mock'
import { cn, formatDate, severityTone, statusTone } from '../lib'
import { useWorkbench } from '../store'
import { Avatar, Badge, Button, Card, Dialog, IconButton, Input, Select, Spinner, Textarea } from './ui'

const navGroups = [
  { label: '个人', items: [{ to: '/inbox', label: '收件箱', icon: Inbox, count: 'inbox' }] },
  { label: '运维', items: [
    { to: '/incidents', label: '事件', icon: Bell, count: 'incidents' },
    { to: '/board', label: '看板', icon: LayoutGrid },
    { to: '/services', label: '服务', icon: Server },
    { to: '/oncall', label: '值班', icon: CalendarDays },
    { to: '/analytics', label: '分析', icon: BarChart3 },
  ] },
  { label: '配置', items: [{ to: '/settings', label: '设置', icon: Settings }] },
]

export function AppShell() {
  const { workspaceId, setWorkspace, theme, toggleTheme, sidebarOpen, setSidebarOpen, sidebarWidth, setSidebarWidth, inbox, incidents, commandOpen, setCommandOpen, createOpen, setCreateOpen, shortcutsOpen, setShortcutsOpen } = useWorkbench()
  const navigate = useNavigate()
  const location = useLocation()
  const workspace = workspaces.find((item) => item.id === workspaceId) ?? workspaces[0]
  const currentNav = navGroups.flatMap((group) => group.items).find((item) => location.pathname.startsWith(item.to))
  const title = currentNav?.label ?? '工作台'
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const editable = event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true) }
      else if (!editable && event.key.toLowerCase() === 'c') { event.preventDefault(); setCreateOpen(true) }
      else if (!editable && event.key === '?') { setShortcutsOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCommandOpen, setCreateOpen, setShortcutsOpen])

  useEffect(() => { setSidebarOpen(false) }, [location.pathname, setSidebarOpen])

  const counts = useMemo(() => ({
    inbox: inbox.filter((item) => item.status === 'unread').length,
    incidents: incidents.filter((item) => item.status !== 'resolved').length,
  }), [inbox, incidents])

  return (
    <div className="min-h-svh bg-[var(--app-shell)] text-[var(--text)]">
      <div className="flex min-h-svh">
        <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] transition-transform duration-200 lg:static lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')} style={{ width: sidebarWidth }} data-testid="app-sidebar">
          <div className="flex h-14 items-center gap-2 border-b border-[var(--sidebar-border)] px-3">
            <WorkspaceSwitcher workspace={workspace} onSelect={(id) => { setWorkspace(id); navigate('/incidents') }} />
            <div className="ml-auto flex items-center gap-1">
              <IconButton label="搜索" onClick={() => setCommandOpen(true)}><Search className="size-4" /></IconButton>
              <IconButton label="关闭侧栏" className="lg:hidden" onClick={() => setSidebarOpen(false)}><X className="size-4" /></IconButton>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <Button variant="primary" className="mb-3 w-full justify-start" onClick={() => setCreateOpen(true)}><Plus className="size-4" />创建事件 <kbd className="ml-auto rounded border border-white/25 px-1 text-[10px]">C</kbd></Button>
            {navGroups.map((group) => <div key={group.label} className="mb-4"><div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">{group.label}</div><nav className="space-y-0.5">{group.items.map((item) => {
              const Icon = item.icon
              const count = item.count ? counts[item.count as keyof typeof counts] : 0
              return <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('flex h-8 items-center gap-2 rounded-[var(--radius-control)] px-2 text-[13px] text-[var(--text-muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]', isActive || location.pathname === item.to ? 'bg-[var(--sidebar-accent)] font-medium text-[var(--text)]' : 'hover:bg-[var(--sidebar-accent)] hover:text-[var(--text)]')}><Icon className="size-4" /><span>{item.label}</span>{count > 0 && <span className="ml-auto rounded-full bg-[var(--brand-soft)] px-1.5 text-[10px] text-[var(--brand)]">{count}</span>}</NavLink>
            })}</nav></div>)}
            <div className="mb-4"><button className="flex w-full items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-faint)]"><ChevronDown className="size-3" />置顶事件</button><div className="mt-1 space-y-0.5">{incidents.slice(0, 3).map((incident) => <button key={incident.id} className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-left text-[12px] text-[var(--text-muted)] hover:bg-[var(--sidebar-accent)]" onClick={() => navigate(`/incidents/${incident.id}`)}><span className={cn('size-1.5 rounded-full', incident.severity === 'critical' ? 'bg-[var(--danger)]' : incident.severity === 'high' ? 'bg-[var(--warning)]' : 'bg-[var(--info)]')} /><span className="truncate">{incident.number} · {incident.title}</span></button>)}</div></div>
          </div>
          <div className="border-t border-[var(--sidebar-border)] p-2">
            <button className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-2 text-left hover:bg-[var(--sidebar-accent)]" onClick={() => setShortcutsOpen(true)}><CircleHelp className="size-4 text-[var(--text-faint)]" /><span className="text-[12px] text-[var(--text-muted)]">快捷键帮助</span><kbd className="ml-auto rounded border border-[var(--border)] px-1 text-[10px] text-[var(--text-faint)]">?</kbd></button>
            <div className="mt-1 flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-2"><Avatar name="林" /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium">林澈</div><div className="truncate text-[11px] text-[var(--text-faint)]">{workspace.plan}</div></div><IconButton label="切换主题" onClick={toggleTheme}>{theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}</IconButton></div>
          </div>
          <button aria-label="调整侧栏宽度" className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize" onPointerDown={(event) => { dragRef.current = { startX: event.clientX, startWidth: sidebarWidth }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={(event) => { if (dragRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) setSidebarWidth(dragRef.current.startWidth + event.clientX - dragRef.current.startX) }} onPointerUp={(event) => { dragRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId) }} />
        </aside>
        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/45 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <main className="min-w-0 flex-1 p-2 lg:p-3">
          <div className="flex min-h-[calc(100svh-1rem)] flex-col overflow-hidden rounded-[var(--radius-content)] border border-[var(--border)] bg-[var(--page-canvas)] shadow-[var(--shadow-surface)] lg:min-h-[calc(100svh-1.5rem)]">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)] px-4">
              <IconButton label="打开侧栏" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="size-4" /></IconButton>
              <div className="flex items-center gap-2 text-[13px]"><span className="text-[var(--text-faint)]">工作台</span><ChevronRight className="size-3 text-[var(--text-faint)]" /><span className="font-medium">{title}</span></div>
              <div className="ml-auto flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => setCommandOpen(true)}><Search className="size-4" />搜索 <kbd className="hidden rounded border border-[var(--border)] px-1 text-[10px] text-[var(--text-faint)] sm:inline">⌘K</kbd></Button><IconButton label="创建事件" onClick={() => setCreateOpen(true)}><Plus className="size-4" /></IconButton></div>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden"><Outlet /></div>
          </div>
        </main>
      </div>
      <SearchCommand open={commandOpen} onClose={() => setCommandOpen(false)} />
      <CreateIncidentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ConfirmDialog />
      <ToastViewport />
    </div>
  )
}

function WorkspaceSwitcher({ workspace, onSelect }: { workspace: typeof workspaces[number]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return <div className="relative min-w-0 flex-1"><button className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-1.5 py-1 text-left outline-none hover:bg-[var(--sidebar-accent)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]" onClick={() => setOpen((value) => !value)}><span className="grid size-7 place-items-center rounded-md bg-[var(--brand)] text-[11px] font-bold text-white">D</span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{workspace.name}</span><span className="block truncate text-[10px] text-[var(--text-faint)]">{workspace.plan}</span></span><ChevronDown className="size-3 text-[var(--text-faint)]" /></button>{open && <Card className="absolute left-0 top-10 z-50 w-64 p-1">{workspaces.map((item) => <button key={item.id} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-[var(--surface-hover)]" onClick={() => { onSelect(item.id); setOpen(false) }}><span className="grid size-6 place-items-center rounded bg-[var(--brand-soft)] text-[10px] font-bold text-[var(--brand)]">{item.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px]">{item.name}</span><span className="block text-[10px] text-[var(--text-faint)]">{item.plan}</span></span>{item.id === workspace.id && <Check className="size-4 text-[var(--brand)]" />}</button>)}</Card>}</div>
}

export function PageHeader({ title, description, actions, toolbar }: { title: string; description?: string; actions?: React.ReactNode; toolbar?: React.ReactNode }) {
  return <div className="shrink-0 border-b border-[var(--border)]"><div className="flex h-12 items-center gap-3 px-4"><div className="min-w-0"><h1 className="truncate text-[16px] font-semibold">{title}</h1>{description && <p className="truncate text-[11px] text-[var(--text-faint)]">{description}</p>}</div><div className="ml-auto flex items-center gap-2">{actions}</div></div>{toolbar && <div className="flex min-h-12 items-center gap-2 border-t border-[var(--border)] px-4 py-2">{toolbar}</div>}</div>
}

function SearchCommand({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { incidents, services, pushToast } = useWorkbench()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) { setQuery(''); setError(false); window.setTimeout(() => inputRef.current?.focus(), 20) } }, [open])
  useEffect(() => {
    if (!query) return
    setLoading(true)
    const timer = window.setTimeout(() => { setLoading(false); setError(query.toLowerCase() === 'fail') }, 260)
    return () => window.clearTimeout(timer)
  }, [query])
  const results = useMemo(() => {
    const needle = query.toLowerCase()
    const groups = [
      { type: 'incidents', label: '事件', items: incidents.filter((item) => `${item.number} ${item.title}`.toLowerCase().includes(needle)).slice(0, 4).map((item) => ({ id: item.id, title: `${item.number} · ${item.title}`, meta: item.status, run: () => navigate(`/incidents/${item.id}`) })) },
      { type: 'services', label: '服务', items: services.filter((item) => item.name.toLowerCase().includes(needle)).map((item) => ({ id: item.id, title: item.name, meta: item.health, run: () => navigate('/services') })) },
      { type: 'team', label: '成员', items: team.filter((item) => item.name.toLowerCase().includes(needle)).map((item) => ({ id: item.id, title: item.name, meta: item.role, run: () => navigate('/settings?tab=members') })) },
      { type: 'changes', label: '变更', items: changes.filter((item) => item.title.toLowerCase().includes(needle)).map((item) => ({ id: item.id, title: item.title, meta: item.status, run: () => navigate('/analytics') })) },
    ]
    return groups.filter((group) => type === 'all' || group.type === type)
  }, [query, type, incidents, services, navigate])
  if (!open) return null
  const total = results.reduce((sum, group) => sum + group.items.length, 0)
  return <div className="fixed inset-0 z-50 bg-black/55 p-4 pt-[12vh]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-label="全局搜索" className="mx-auto max-w-2xl overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-floating)]"><div className="flex items-center gap-2 border-b border-[var(--border)] px-4"><Search className="size-4 text-[var(--text-faint)]" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); if (event.key === 'Enter' && results[0]?.items[0]) { results[0].items[0].run(); onClose() } }} placeholder="搜索事件、服务、成员或变更…" className="h-12 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--text-faint)]" /><kbd className="rounded border border-[var(--border)] px-1 text-[10px] text-[var(--text-faint)]">Esc</kbd></div><div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2 text-[12px]"><button className={cn('rounded px-2 py-1', type === 'all' ? 'bg-[var(--surface-hover)] text-[var(--text)]' : 'text-[var(--text-muted)]')} onClick={() => setType('all')}>全部</button>{['incidents', 'services', 'team', 'changes'].map((item) => <button key={item} className={cn('rounded px-2 py-1', type === item ? 'bg-[var(--surface-hover)] text-[var(--text)]' : 'text-[var(--text-muted)]')} onClick={() => setType(item)}>{item}</button>)}</div><div className="max-h-[55vh] overflow-y-auto p-2">{loading ? <div className="flex items-center gap-2 p-4 text-[13px] text-[var(--text-muted)]"><Spinner />加载中…</div> : error ? <div className="p-8 text-center"><p className="text-[13px] text-[var(--danger)]">搜索失败，请检查模拟网络开关。</p><Button className="mt-3" onClick={() => { setError(false); setQuery(query + ' ') }}>重试</Button></div> : query && total === 0 ? <div className="p-8 text-center text-[13px] text-[var(--text-muted)]">没有匹配结果</div> : query ? <div className="space-y-2">{results.map((group) => group.items.length > 0 && <div key={group.type}><div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">{group.label} · {group.items.length}</div>{group.items.map((item) => <button key={item.id} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-[var(--surface-hover)]" onClick={() => { item.run(); onClose() }}><span className="min-w-0 flex-1 truncate text-[13px]">{item.title}</span><Badge>{item.meta}</Badge></button>)}</div>)}</div> : <div className="grid gap-2 p-3 sm:grid-cols-2">{incidents.slice(0, 4).map((incident) => <button key={incident.id} className="rounded-md border border-[var(--border)] p-3 text-left hover:bg-[var(--surface-hover)]" onClick={() => { navigate(`/incidents/${incident.id}`); onClose() }}><div className="flex items-center gap-2"><Badge tone={severityTone(incident.severity) as never}>{incident.severity}</Badge><span className="text-[11px] text-[var(--text-faint)]">{incident.number}</span></div><div className="mt-2 truncate text-[13px] font-medium">{incident.title}</div></button>)}</div>}</div><div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--text-faint)]"><span>↑↓ 选择 · Enter 打开 · Esc 关闭</span><span>{total > 0 ? `${total} 个结果` : '输入关键字开始搜索'}</span></div></section></div>
}

function CreateIncidentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { services, addIncident, pushToast } = useWorkbench()
  const [form, setForm] = useState({ title: '', serviceId: services[0]?.id ?? '', severity: 'high' as Severity, status: 'open' as IncidentStatus, assigneeId: 'm1', team: 'Platform', description: '', tags: '', changeId: '', attachment: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  useEffect(() => { if (open) { setErrors({}); setSaveError(false); setSaving(false) } }, [open])
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const submit = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.title.trim()) nextErrors.title = '请输入标题'
    if (!form.serviceId) nextErrors.serviceId = '请选择影响服务'
    if (!form.severity) nextErrors.severity = '请选择严重等级'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    setSaveError(false)
    window.setTimeout(() => {
      if (form.title.toLowerCase().includes('fail')) { setSaving(false); setSaveError(true); pushToast({ tone: 'error', title: '事件创建失败', message: '模拟请求失败，输入已保留。' }); return }
      const incident = addIncident({ title: form.title.trim(), serviceId: form.serviceId, severity: form.severity, status: form.status, assigneeId: form.assigneeId || null, team: form.team, description: form.description, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), changeId: form.changeId || undefined, attachments: form.attachment ? [form.attachment] : [] })
      setSaving(false)
      onClose()
      pushToast({ tone: 'success', title: `已创建 ${incident.number}`, message: incident.title })
    }, 500)
  }
  return <Dialog open={open} onClose={onClose} title="创建事件" description="提交后会同步更新列表、看板和收件箱计数。" size="lg" footer={<><Button variant="ghost" onClick={() => setForm((current) => ({ ...current, title: '', description: '', tags: '' }))}>清空</Button><Button variant="ghost" onClick={onClose}>取消</Button><Button variant="primary" onClick={submit} disabled={saving}>{saving ? <><Spinner />提交中…</> : '提交事件'}</Button></>}><div className="grid gap-4 sm:grid-cols-2"><Field label="标题 *" error={errors.title}><Input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="例如：Checkout p95 延迟升高" /></Field><Field label="影响服务 *" error={errors.serviceId}><Select value={form.serviceId} onChange={(event) => update('serviceId', event.target.value)}>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Select></Field><Field label="严重等级 *" error={errors.severity}><Select value={form.severity} onChange={(event) => update('severity', event.target.value)}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field><Field label="当前状态"><Select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="open">Open</option><option value="investigating">Investigating</option><option value="mitigated">Mitigated</option><option value="resolved">Resolved</option></Select></Field><Field label="负责人"><Select value={form.assigneeId} onChange={(event) => update('assigneeId', event.target.value)}><option value="">未分配</option>{team.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</Select></Field><Field label="参与团队"><Select value={form.team} onChange={(event) => update('team', event.target.value)}>{['Platform', 'Core', 'Web', 'Data', 'Support', 'Release'].map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="发生时间"><Input type="datetime-local" defaultValue="2026-09-15T08:00" /></Field><Field label="关联变更"><Select value={form.changeId} onChange={(event) => update('changeId', event.target.value)}><option value="">无</option>{changes.map((change) => <option key={change.id} value={change.id}>{change.id} · {change.title}</option>)}</Select></Field><Field label="标签"><Input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="latency, checkout" /></Field><Field label="附件"><Input type="file" onChange={(event) => update('attachment', event.target.files?.[0]?.name ?? '')} /></Field><div className="sm:col-span-2"><Field label="描述"><Textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="描述影响、时间范围和目前采取的措施…" /></Field></div>{saveError && <div className="sm:col-span-2 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-[12px] text-[var(--danger)]">提交失败，输入已保留。请检查标题中是否包含 fail，或点击提交重试。</div>}</div></Dialog>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-[12px] font-medium text-[var(--text-muted)]"><span>{label}</span>{children}{error && <span className="text-[11px] text-[var(--danger)]">{error}</span>}</label> }

function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Dialog open={open} onClose={onClose} title="快捷键帮助" size="sm" footer={<Button onClick={onClose}>知道了</Button>}><div className="space-y-3 text-[13px]">{['⌘/Ctrl + K 打开全局搜索', 'C 创建事件（输入框内不触发）', '? 打开快捷键帮助', 'Esc 关闭弹层', 'Enter 打开搜索结果'].map((item) => <div key={item} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2"><span>{item.split(' ')[0]}</span><span className="text-right text-[var(--text-muted)]">{item.split(' ').slice(1).join(' ')}</span></div>)}</div></Dialog>
}

function ConfirmDialog() { const { confirmRequest, clearConfirm } = useWorkbench(); if (!confirmRequest) return null; return <Dialog open onClose={clearConfirm} title={confirmRequest.title} description={confirmRequest.message} size="sm" footer={<><Button variant="ghost" onClick={clearConfirm}>取消</Button><Button variant="danger" onClick={() => { confirmRequest.onConfirm(); clearConfirm() }}>{confirmRequest.confirmLabel ?? '确认'}</Button></>}><p className="text-[13px] text-[var(--text-muted)]">此操作会立即影响当前工作区状态。</p></Dialog> }

function ToastViewport() { const { toasts, dismissToast } = useWorkbench(); return <div aria-live="polite" className="fixed bottom-4 right-4 z-[60] w-[min(360px,calc(100vw-2rem))] space-y-2">{toasts.map((toast) => <Card key={toast.id} className={cn('flex items-start gap-3 p-3', toast.tone === 'error' && 'border-[var(--danger)]', toast.tone === 'success' && 'border-[var(--success)]')}><span className={cn('mt-0.5 size-2 rounded-full', toast.tone === 'success' ? 'bg-[var(--success)]' : toast.tone === 'error' ? 'bg-[var(--danger)]' : 'bg-[var(--info)]')} /><div className="min-w-0 flex-1"><div className="text-[12px] font-medium">{toast.title}</div>{toast.message && <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{toast.message}</div>}{toast.retry && <button className="mt-1 text-[11px] text-[var(--brand)]" onClick={toast.retry}>重试</button>}</div><IconButton label="关闭通知" className="size-6" onClick={() => dismissToast(toast.id)}><X className="size-3" /></IconButton></Card>)}</div> }
