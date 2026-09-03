import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Mail, Network, Plus, Save, Trash2, Users, Webhook, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/app-shell/page-header'
import { Toolbar } from '@/components/app-shell/toolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarStack } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { SkeletonList } from '@/components/shared/skeletons'
import { ErrorState } from '@/components/shared/error-state'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AppPreference, Integration, NotificationRule, Severity } from '@/lib/types'

const TABS = [
  { id: 'basic', label: '基本信息', icon: Building2 },
  { id: 'members', label: '成员与权限', icon: Users },
  { id: 'teams', label: '团队', icon: Users },
  { id: 'notifications', label: '通知规则', icon: Mail },
  { id: 'integrations', label: '集成', icon: Network },
  { id: 'preferences', label: '个人偏好', icon: Zap },
] as const

type TabId = typeof TABS[number]['id']

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabId) || 'basic'

  function setTab(id: TabId) {
    const next = new URLSearchParams(params)
    next.set('tab', id)
    setParams(next, { replace: true })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="工作区设置" description="基本信息、成员、团队、通知规则、集成与个人偏好。" />

      <div className="flex min-h-0 flex-1">
        {/* Vertical tabs on md+ */}
        <nav aria-label="设置导航" className="hidden w-56 shrink-0 border-r border-border bg-background p-3 md:block">
          <ul className="flex flex-col gap-0.5">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={cn(
                    'flex h-8 w-full items-center gap-2 rounded-md px-2 text-body font-medium',
                    tab === t.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  <t.icon className="size-4" /> {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Horizontal tabs on mobile */}
        <div className="md:hidden">
          <Toolbar divided={false} className="overflow-x-auto">
            <ul className="flex w-max gap-1">
              {TABS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={tab === t.id ? 'page' : undefined}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-label font-medium',
                      tab === t.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60',
                    )}
                  >
                    <t.icon className="size-3.5" /> {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </Toolbar>
        </div>

        <section className="min-w-0 flex-1 overflow-y-auto p-6" style={{ maxWidth: 'var(--settings-content-width, 1024px)' }}>
          {tab === 'basic' ? <BasicInfoTab /> : null}
          {tab === 'members' ? <MembersTab /> : null}
          {tab === 'teams' ? <TeamsTab /> : null}
          {tab === 'notifications' ? <NotificationsTab /> : null}
          {tab === 'integrations' ? <IntegrationsTab /> : null}
          {tab === 'preferences' ? <PreferencesTab /> : null}
        </section>
      </div>
    </div>
  )
}

// ---------- BasicInfoTab ----------
function BasicInfoTab() {
  const queryClient = useQueryClient()
  const wsId = useAppStore((s) => s.currentWorkspaceId)
  const workspace = useAppStore((s) => s.workspaces.find((w) => w.id === wsId))
  const [draft, setDraft] = useState({ name: workspace?.name ?? '', description: '', timezone: workspace?.timezone ?? '', defaultStatus: workspace?.defaultStatus ?? 'triggered' })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setDraft({ name: workspace?.name ?? '', description: '', timezone: workspace?.timezone ?? '', defaultStatus: workspace?.defaultStatus ?? 'triggered' })
    setDirty(false)
  }, [workspace?.id])

  async function save() {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 240))
    setSaving(false)
    setDirty(false)
    toast.success('已保存')
    void queryClient.invalidateQueries({ queryKey: ['workspace'] })
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <h2 className="text-title-sm font-medium">基本信息</h2>
      <p className="text-caption text-muted-foreground">工作区名称、描述、默认时区和默认事件状态。</p>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ws-name">名称</Label>
          <Input id="ws-name" value={draft.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDraft({ ...draft, name: e.target.value }); setDirty(true) }} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ws-desc">描述</Label>
          <Textarea id="ws-desc" rows={3} value={draft.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setDraft({ ...draft, description: e.target.value }); setDirty(true) }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ws-tz">默认时区</Label>
            <Select value={draft.timezone} onValueChange={(v) => { setDraft({ ...draft, timezone: v }); setDirty(true) }}>
              <SelectTrigger id="ws-tz"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ws-status">默认事件状态</Label>
            <Select value={draft.defaultStatus} onValueChange={(v) => { setDraft({ ...draft, defaultStatus: v as typeof draft.defaultStatus }); setDirty(true) }}>
              <SelectTrigger id="ws-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="triggered">已触发</SelectItem>
                <SelectItem value="acknowledged">已确认</SelectItem>
                <SelectItem value="investigating">排查中</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={!dirty || saving} onClick={() => { setDraft({ name: workspace?.name ?? '', description: '', timezone: workspace?.timezone ?? '', defaultStatus: workspace?.defaultStatus ?? 'triggered' }); setDirty(false) }}>取消</Button>
        <Button variant="brand" disabled={!dirty || saving} onClick={save}>
          <Save className="size-4" /> {saving ? '保存中…' : '保存修改'}
        </Button>
      </div>
      {dirty ? <p className="text-caption text-warning">有未保存的修改</p> : null}
    </div>
  )
}

import { useAppStore } from '@/lib/stores/app-store'

// ---------- MembersTab ----------
function MembersTab() {
  const membersQ = useQuery({ queryKey: ['members'], queryFn: api.members })
  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: api.teams })
  const [inviteOpen, setInviteOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  if (membersQ.isPending) return <SkeletonList rows={5} />
  if (membersQ.isError) return <ErrorState onRetry={() => membersQ.refetch()} description={membersQ.error instanceof Error ? membersQ.error.message : undefined} />

  return (
    <div className="mx-auto max-w-[768px] space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-medium">成员与权限</h2>
        <Button variant="brand" size="sm" onClick={() => setInviteOpen(true)}>
          <Plus className="size-4" /> 邀请成员
        </Button>
      </div>
      <table className="w-full text-body">
        <thead>
          <tr className="h-9 border-b border-border text-left text-micro uppercase tracking-wide text-muted-foreground">
            <th className="px-2">成员</th>
            <th className="hidden px-2 md:table-cell">邮箱</th>
            <th className="px-2">角色</th>
            <th className="hidden px-2 lg:table-cell">所属团队</th>
            <th className="px-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {membersQ.data?.map((m) => (
            <tr key={m.id} className="h-12 border-b border-border">
              <td className="px-2"><div className="flex items-center gap-2"><Avatar initials={m.initials} color={m.color} /> <span>{m.name}</span> {!m.active ? <Badge variant="ghost">已暂停</Badge> : null}</div></td>
              <td className="hidden px-2 text-caption text-muted-foreground md:table-cell">{m.email}</td>
              <td className="px-2"><Badge variant={m.role === 'owner' ? 'brand' : 'outline'}>{m.role}</Badge></td>
              <td className="hidden px-2 text-caption text-muted-foreground lg:table-cell">
                {(m.teamIds ?? []).map((id) => teamsQ.data?.find((t) => t.id === id)?.name).filter(Boolean).join('、') || '—'}
              </td>
              <td className="px-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(m.id)}>
                  <Trash2 className="size-3.5" /> 移除
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(v) => !v && setConfirmRemove(null)}
        title="移除成员"
        description="移除后该成员将无法访问此工作区。"
        destructive
        confirmLabel="移除"
        onConfirm={async () => { await Promise.resolve(); toast.success('已移除') }}
      />
    </div>
  )
}

function InviteMemberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('responder')
  const [team, setTeam] = useState('')
  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: api.teams })
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>邀请成员</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">邮箱</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={email.length > 0 && !valid} />
            {email && !valid ? <p className="text-micro text-destructive">邮箱格式不正确</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-role">角色</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="responder">Responder</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-team">所属团队</Label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger id="invite-team"><SelectValue placeholder="选择团队" /></SelectTrigger>
              <SelectContent>
                {teamsQ.data?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="brand" disabled={!valid} onClick={() => { toast.success('邀请已发送'); onOpenChange(false) }}>发送邀请</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- TeamsTab ----------
function TeamsTab() {
  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: api.teams })
  const membersQ = useQuery({ queryKey: ['members'], queryFn: api.members })
  return (
    <div className="mx-auto max-w-[768px] space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-medium">团队</h2>
        <Button variant="brand" size="sm" onClick={() => toast.info('新建团队', { description: '实际项目会弹出团队编辑器。' })}>
          <Plus className="size-4" /> 新建团队
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {teamsQ.data?.map((t) => {
          const teamMembers = (membersQ.data ?? []).filter((m) => t.memberIds.includes(m.id))
          return (
            <article key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-surface">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-body font-medium">{t.name}</h3>
                  <p className="mt-0.5 text-caption text-muted-foreground">{t.description}</p>
                </div>
                <Badge variant={t.active ? 'success' : 'ghost'}>{t.active ? '活跃' : '停用'}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <AvatarStack items={teamMembers.map((m) => ({ id: m.id, initials: m.initials, color: m.color }))} max={4} />
                <span className="text-caption text-muted-foreground tabular">{teamMembers.length} 人</span>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

// ---------- NotificationsTab ----------
function NotificationsTab() {
  const rulesQ = useQuery({ queryKey: ['notification-rules'], queryFn: api.notificationRules })
  const queryClient = useQueryClient()
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteNotificationRule(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notification-rules'] }); toast.success('已删除') },
  })
  const upsertMut = useMutation({
    mutationFn: (rule: NotificationRule) => api.upsertNotificationRule(rule),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notification-rules'] }); toast.success('已保存') },
  })
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [editing, setEditing] = useState<NotificationRule | null>(null)

  return (
    <div className="mx-auto max-w-[768px] space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-medium">通知规则</h2>
        <Button variant="brand" size="sm" onClick={() => setEditing({
          id: `rule-${Date.now()}`,
          name: '新规则',
          trigger: 'triggered',
          severity: ['SEV1'],
          channels: ['push'],
          recipients: [],
          enabled: true,
        })}>
          <Plus className="size-4" /> 新建规则
        </Button>
      </div>
      <table className="w-full text-body">
        <thead>
          <tr className="h-9 border-b border-border text-left text-micro uppercase tracking-wide text-muted-foreground">
            <th className="px-2">名称</th>
            <th className="hidden px-2 md:table-cell">触发</th>
            <th className="hidden px-2 md:table-cell">等级</th>
            <th className="hidden px-2 lg:table-cell">渠道</th>
            <th className="px-2">启用</th>
            <th className="px-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {rulesQ.data?.map((r) => (
            <tr key={r.id} className="h-12 border-b border-border">
              <td className="px-2 font-medium">{r.name}</td>
              <td className="hidden px-2 text-caption text-muted-foreground md:table-cell">{r.trigger}</td>
              <td className="hidden px-2 md:table-cell">
                <div className="flex gap-1">{r.severity.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
              </td>
              <td className="hidden px-2 text-caption text-muted-foreground lg:table-cell">{r.channels.join(', ')}</td>
              <td className="px-2"><Switch checked={r.enabled} onCheckedChange={(v) => upsertMut.mutate({ ...r, enabled: v })} aria-label="启用" /></td>
              <td className="px-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>编辑</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmId(r.id)}><Trash2 className="size-3.5" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(v) => !v && setConfirmId(null)}
        title="删除通知规则"
        destructive
        confirmLabel="删除"
        onConfirm={async () => { if (confirmId) await deleteMut.mutateAsync(confirmId) }}
      />

      {editing ? (
        <RuleEditorDialog rule={editing} onClose={() => setEditing(null)} onSave={(r) => upsertMut.mutate(r)} />
      ) : null}
    </div>
  )
}

function RuleEditorDialog({ rule, onClose, onSave }: { rule: NotificationRule; onClose: () => void; onSave: (r: NotificationRule) => void }) {
  const [draft, setDraft] = useState<NotificationRule>(rule)
  const SEVERITIES: Severity[] = ['SEV1', 'SEV2', 'SEV3', 'SEV4']
  function toggleSeverity(s: Severity) {
    setDraft({
      ...draft,
      severity: draft.severity.includes(s) ? draft.severity.filter((x) => x !== s) : [...draft.severity, s],
    })
  }
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>编辑规则</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>名称</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>严重等级</Label>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITIES.map((s) => (
                <button key={s} type="button" onClick={() => toggleSeverity(s)} className="focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 rounded-full">
                  <Badge variant={draft.severity.includes(s) ? 'brand' : 'outline'} className="cursor-pointer">{s}</Badge>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>渠道</Label>
            <div className="flex gap-1.5">
              {(['email', 'sms', 'push'] as const).map((c) => (
                <button key={c} type="button" onClick={() => setDraft({ ...draft, channels: draft.channels.includes(c) ? draft.channels.filter((x) => x !== c) : [...draft.channels, c] })} className="focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 rounded-full">
                  <Badge variant={draft.channels.includes(c) ? 'brand' : 'outline'} className="cursor-pointer">{c}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="brand" onClick={() => { onSave(draft); onClose() }}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- IntegrationsTab ----------
function IntegrationsTab() {
  const intsQ = useQuery({ queryKey: ['integrations'], queryFn: api.integrations })
  const queryClient = useQueryClient()
  const testMut = useMutation({
    mutationFn: (id: string) => api.testIntegration(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['integrations'] }); toast.success('测试连接成功') },
    onError: (e) => toast.error('测试失败', { description: e instanceof Error ? e.message : undefined }),
  })
  const upsertMut = useMutation({
    mutationFn: (i: Integration) => api.upsertIntegration(i),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['integrations'] }); toast.success('已保存') },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteIntegration(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['integrations'] }); toast.success('已删除') },
  })
  const [editing, setEditing] = useState<Integration | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-[768px] space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-medium">集成</h2>
        <Button variant="brand" size="sm" onClick={() => setEditing({
          id: `int-${Date.now()}`,
          name: '新 Webhook',
          kind: 'webhook',
          status: 'connected',
          url: '',
        })}>
          <Plus className="size-4" /> 新增 Webhook
        </Button>
      </div>
      <table className="w-full text-body">
        <thead>
          <tr className="h-9 border-b border-border text-left text-micro uppercase tracking-wide text-muted-foreground">
            <th className="px-2">名称</th>
            <th className="hidden px-2 md:table-cell">类型</th>
            <th className="px-2">状态</th>
            <th className="hidden px-2 lg:table-cell">最近测试</th>
            <th className="px-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {intsQ.data?.map((i) => (
            <tr key={i.id} className="h-12 border-b border-border">
              <td className="px-2 font-medium">{i.name}</td>
              <td className="hidden px-2 text-caption text-muted-foreground md:table-cell">
                <Badge variant="outline"><Webhook className="size-3" /> {i.kind}</Badge>
              </td>
              <td className="px-2">
                <Badge variant={i.status === 'connected' ? 'success' : i.status === 'error' ? 'destructive' : 'ghost'}>
                  {i.status === 'connected' ? '已连接' : i.status === 'error' ? '错误' : '已停用'}
                </Badge>
              </td>
              <td className="hidden px-2 text-caption text-muted-foreground lg:table-cell tabular">
                {i.lastTestAt ? new Date(i.lastTestAt).toLocaleString('zh-CN') : '—'}
                {i.lastTestResult ? <Badge variant={i.lastTestResult === 'success' ? 'success' : 'destructive'} className="ml-2">{i.lastTestResult === 'success' ? '成功' : '失败'}</Badge> : null}
              </td>
              <td className="px-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => testMut.mutate(i.id)} disabled={testMut.isPending}>测试</Button>
                <Button variant="ghost" size="sm" onClick={() => upsertMut.mutate({ ...i, status: i.status === 'connected' ? 'disabled' : 'connected' })}>{i.status === 'disabled' ? '启用' : '停用'}</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmId(i.id)}><Trash2 className="size-3.5" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(v) => !v && setConfirmId(null)}
        title="删除集成"
        destructive
        confirmLabel="删除"
        onConfirm={async () => { if (confirmId) await deleteMut.mutateAsync(confirmId) }}
      />

      {editing ? (
        <IntegrationEditor integration={editing} onClose={() => setEditing(null)} onSave={(i) => upsertMut.mutate(i)} />
      ) : null}
    </div>
  )
}

function IntegrationEditor({ integration, onClose, onSave }: { integration: Integration; onClose: () => void; onSave: (i: Integration) => void }) {
  const [draft, setDraft] = useState<Integration>(integration)
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{integration.name.includes('新') ? '新增' : '编辑'} Webhook</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>名称</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>URL</Label>
            <Input value={draft.url ?? ''} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://hooks.example.com/..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="brand" onClick={() => { onSave(draft); onClose() }}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- PreferencesTab ----------
function PreferencesTab() {
  const wsId = useAppStore((s) => s.currentWorkspaceId)
  const prefsQ = useQuery({ queryKey: ['preferences', wsId], queryFn: () => api.preferences(wsId) })
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<AppPreference | null>(null)
  useEffect(() => { setDraft(prefsQ.data ?? null) }, [prefsQ.data])
  const saveMut = useMutation({
    mutationFn: (p: AppPreference) => api.savePreferences(wsId, p),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['preferences', wsId] }); toast.success('已保存') },
  })

  if (!draft) return <SkeletonList rows={3} />

  return (
    <div className="mx-auto max-w-[640px] space-y-3">
      <h2 className="text-title-sm font-medium">个人偏好</h2>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>默认首页</Label>
          <Select value={draft.defaultHome} onValueChange={(v) => setDraft({ ...draft, defaultHome: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="/inbox">收件箱</SelectItem>
              <SelectItem value="/events">事件列表</SelectItem>
              <SelectItem value="/events/board">事件看板</SelectItem>
              <SelectItem value="/services">服务目录</SelectItem>
              <SelectItem value="/oncall">值班</SelectItem>
              <SelectItem value="/analytics">交付分析</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>时区</Label>
          <Select value={draft.timezone} onValueChange={(v) => setDraft({ ...draft, timezone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
              <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
          <div><p className="text-body">通知</p><p className="text-caption text-muted-foreground">接收邮件、推送等通知</p></div>
          <Switch checked={draft.notifications} onCheckedChange={(v) => setDraft({ ...draft, notifications: v })} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
          <div><p className="text-body">启用快捷键</p><p className="text-caption text-muted-foreground">⌘K 搜索、C 创建事件、? 帮助</p></div>
          <Switch checked={draft.shortcuts} onCheckedChange={(v) => setDraft({ ...draft, shortcuts: v })} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="brand" onClick={() => saveMut.mutate(draft)} disabled={saveMut.isPending}>
          <Save className="size-4" /> 保存
        </Button>
      </div>
    </div>
  )
}
