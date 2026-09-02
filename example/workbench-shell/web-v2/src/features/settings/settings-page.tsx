import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { NavigationTrigger } from '@/components/layout/app-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Badge, Button, Checkbox, Field, Input, Select, Skeleton, StateView, Switch, Textarea } from '@/components/ui/primitives'
import { ConfirmDialog, Dialog } from '@/components/ui/overlay'
import { useSimulatedLoad } from '@/lib/page-load'
import { uniqueId } from '@/lib/utils'
import type { Integration, Member, NotificationRule, Severity, Team, Workspace, WorkspaceData } from '@/types'

const tabs = [
  { group: '基本信息', value: 'general', label: '基本信息' },
  { group: '访问控制', value: 'members', label: '成员与权限' },
  { group: '访问控制', value: 'teams', label: '团队' },
  { group: '运维配置', value: 'rules', label: '通知规则' },
  { group: '运维配置', value: 'integrations', label: '集成' },
  { group: '个人', value: 'preference', label: '个人偏好' },
] as const
type Tab = typeof tabs[number]['value']

export function SettingsPage() {
  const { data, updateData, showToast } = useApp()
  const [params, setParams] = useSearchParams()
  const load = useSimulatedLoad('settings')
  const rawTab = params.get('tab') ?? 'general'
  const tab: Tab = tabs.some(item => item.value === rawTab) ? rawTab as Tab : 'general'
  const patch = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => { if (!value) next.delete(key); else next.set(key, value) })
    setParams(next)
  }

  if (load.loading) return <div className="min-h-0 flex-1 p-4"><Skeleton className="h-12" /><div className="mt-3 grid gap-3 lg:grid-cols-[224px_1fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>
  if (load.error) return <StateView tone="danger" className="flex-1" icon="!" title="设置加载失败" description={load.error.message} action={<Button variant="primary" onClick={load.reload}>重试</Button>} />
  if (!data) return null
  const safeData: WorkspaceData = data

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader icon="⚙" title="工作区设置" description={safeData.workspace.name} left={<NavigationTrigger />} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav aria-label="设置页签" className="scroll-stable shrink-0 overflow-x-auto border-b border-border lg:w-56 lg:border-b-0 lg:border-r">
          <div className="flex gap-1 p-2 lg:flex-col">
            {tabs.map(item => (
              <button key={item.value} type="button" aria-current={tab === item.value ? 'true' : undefined} onClick={() => patch({ tab: item.value })} className={`h-8 shrink-0 rounded-sm px-2 text-left font-label hover:bg-surface-hover aria-current:bg-surface-selected ${tab === item.value ? 'bg-surface-selected' : ''}`}>{item.label}</button>
            ))}
          </div>
        </nav>
        <div className="scroll-stable min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-192 grid gap-4 pb-20 lg:pb-4">
            {tab === 'general' && <GeneralTab />}
            {tab === 'members' && <MembersTab />}
            {tab === 'teams' && <TeamsTab />}
            {tab === 'rules' && <RulesTab />}
            {tab === 'integrations' && <IntegrationsTab />}
            {tab === 'preference' && <PreferenceTab />}
          </div>
        </div>
      </div>
    </div>
  )

  function GeneralTab() {
    const initial = safeData.workspace
    const [form, setForm] = useState<Workspace>(initial)
    const [saving, setSaving] = useState(false)
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)
    const save = async () => {
      setSaving(true)
      await new Promise(resolve => setTimeout(resolve, 500))
      if (form.name.includes('失败')) { setSaving(false); showToast({ tone: 'error', title: '保存失败', description: '名称包含“失败”时模拟保存失败。', action: { label: '重试', onClick: () => void save() } }); return }
      updateData(current => ({ ...current, workspace: form })); setSaving(false); showToast({ tone: 'success', title: '基本信息已保存' })
    }
    return (
      <section aria-labelledby="general-title" className="rounded-card border border-border p-4">
        <h2 id="general-title" className="font-title">基本信息</h2>
        <form className="mt-4 grid gap-4" onSubmit={event => { event.preventDefault(); void save() }}>
          <Field label="工作区名称" required htmlFor="ws-name"><Input id="ws-name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="描述" htmlFor="ws-desc"><Textarea id="ws-desc" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="默认时区" htmlFor="ws-tz"><Select id="ws-tz" value={form.timezone} onChange={event => setForm(current => ({ ...current, timezone: event.target.value }))}>{['Asia/Shanghai','UTC','America/New_York'].map(value => <option key={value} value={value}>{value}</option>)}</Select></Field>
            <Field label="默认事件状态" htmlFor="ws-status"><Select id="ws-status" value={form.defaultStatus} onChange={event => setForm(current => ({ ...current, defaultStatus: event.target.value as Workspace['defaultStatus'] }))}>{['pending','processing','waiting','resolved','archived'].map(value => <option key={value} value={value}>{value}</option>)}</Select></Field>
          </div>
          <FormActions dirty={dirty} saving={saving} onCancel={() => setForm(initial)} onSave={() => void save()} />
        </form>
      </section>
    )
  }

  function MembersTab() {
    const [inviteOpen, setInviteOpen] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', role: 'engineer', teamId: safeData.teams[0].id })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [confirm, setConfirm] = useState<{ member: Member; action: 'pause' | 'resume' | 'remove' }>()
    const roleFilter = params.get('role') ?? ''
    const rows = safeData.members.filter(member => !roleFilter || member.role === roleFilter)
    const invite = () => {
      const next: Record<string, string> = {}
      if (!form.name.trim()) next.name = '请输入姓名'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = '请输入有效邮箱'
      setErrors(next)
      if (Object.keys(next).length) return
      updateData(current => ({ ...current, members: [...current.members, { id: uniqueId('member'), name: form.name, email: form.email, role: form.role as Member['role'], teamId: form.teamId, status: 'active' }] }))
      setInviteOpen(false); setForm({ name: '', email: '', role: 'engineer', teamId: safeData.teams[0].id }); showToast({ tone: 'success', title: '邀请已发送' })
    }
    return (
      <section aria-labelledby="members-title" className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="members-title" className="font-title">成员与权限</h2>
          <Select className="ml-auto w-auto" aria-label="角色筛选" value={roleFilter} onChange={event => patch({ role: event.target.value })}><option value="">全部角色</option>{['owner','admin','engineer','viewer'].map(value => <option key={value} value={value}>{value}</option>)}</Select>
          <Button variant="primary" onClick={() => setInviteOpen(true)}>邀请成员</Button>
        </div>
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-160"><thead className="bg-surface"><tr><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">成员</th><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">角色</th><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">团队</th><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">状态</th><th className="border-b border-border px-3 py-2 text-left font-caption text-muted-foreground">操作</th></tr></thead>
          <tbody>{rows.map(member => <tr key={member.id} className="border-b border-surface-border"><td className="px-3 py-2"><div className="font-body">{member.name}</div><div className="font-caption text-muted-foreground">{member.email}</div></td><td className="px-3 py-2"><Select aria-label={`${member.name} 角色`} value={member.role} onChange={event => { updateData(current => ({ ...current, members: current.members.map(item => item.id === member.id ? { ...item, role: event.target.value as Member['role'] } : item) })); showToast({ tone: 'success', title: '角色已更新' }) }}>{['owner','admin','engineer','viewer'].map(value => <option key={value} value={value}>{value}</option>)}</Select></td><td className="px-3 py-2 font-body">{safeData.teams.find(team => team.id === member.teamId)?.name}</td><td className="px-3 py-2"><Badge tone={member.status === 'active' ? 'success' : 'warning'}>{member.status}</Badge></td><td className="px-3 py-2"><Button size="sm" onClick={() => setConfirm({ member, action: member.status === 'active' ? 'pause' : 'resume' })}>{member.status === 'active' ? '暂停' : '恢复'}</Button><Button size="sm" variant="danger" className="ml-1" onClick={() => setConfirm({ member, action: 'remove' })}>移除</Button></td></tr>)}</tbody></table>
        </div>
        <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="邀请成员" size="sm" footer={<><Button onClick={() => setInviteOpen(false)}>取消</Button><Button variant="primary" onClick={invite}>发送邀请</Button></>}>
          <div className="grid gap-3"><Field label="姓名" required error={errors.name}><Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} aria-label="姓名" /></Field><Field label="邮箱" required error={errors.email}><Input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} aria-label="邮箱" /></Field><Field label="角色"><Select value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value }))} aria-label="邀请角色">{['admin','engineer','viewer'].map(value => <option key={value} value={value}>{value}</option>)}</Select></Field><Field label="所属团队"><Select value={form.teamId} onChange={event => setForm(current => ({ ...current, teamId: event.target.value }))} aria-label="所属团队">{safeData.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</Select></Field></div>
        </Dialog>
        <ConfirmDialog open={!!confirm} title={confirm?.action === 'remove' ? '移除成员' : '更新成员状态'} message={`确认对 ${confirm?.member.name} 执行 ${confirm?.action} 操作？`} confirmLabel="确认" onClose={() => setConfirm(undefined)} onConfirm={() => { if (!confirm) return; updateData(current => current.members.some(item => item.id === confirm.member.id) && confirm.action === 'remove' ? { ...current, members: current.members.filter(item => item.id !== confirm.member.id) } : { ...current, members: current.members.map(item => item.id === confirm.member.id ? { ...item, status: confirm.action === 'pause' ? 'paused' : 'active' } : item) }); showToast({ tone: 'success', title: '成员已更新' }); setConfirm(undefined) }} />
      </section>
    )
  }

  function TeamsTab() {
    const [dialog, setDialog] = useState<Team>()
    const [open, setOpen] = useState(false)
    const [confirm, setConfirm] = useState<Team>()
    const [form, setForm] = useState({ name: '', description: '', serviceIds: [] as string[], memberIds: [] as string[], status: 'active' as Team['status'] })
    const submit = () => {
      if (!form.name.trim()) return
      if (dialog) updateData(current => ({ ...current, teams: current.teams.map(team => team.id === dialog.id ? { ...team, ...form } : team), members: current.members.map(member => form.memberIds.includes(member.id) ? { ...member, teamId: dialog.id } : member) }))
      else {
        const teamId = uniqueId('team')
        updateData(current => ({ ...current, teams: [...current.teams, { id: teamId, ...form, serviceIds: form.serviceIds }], members: current.members.map(member => form.memberIds.includes(member.id) ? { ...member, teamId } : member) }))
      }
      setOpen(false); showToast({ tone: 'success', title: dialog ? '团队已更新' : '团队已创建' })
    }
    return (
      <section aria-labelledby="teams-title" className="grid gap-3">
        <div className="flex items-center gap-2"><h2 id="teams-title" className="font-title">团队</h2><Button variant="primary" className="ml-auto" onClick={() => { setDialog(undefined); setForm({ name: '', description: '', serviceIds: [], memberIds: [], status: 'active' }); setOpen(true) }}>新建团队</Button></div>
        <div className="grid gap-3 md:grid-cols-2">{safeData.teams.map(team => (
          <article key={team.id} className="rounded-card border border-border p-3">
            <div className="flex items-start gap-2"><h3 className="font-title-sm">{team.name}</h3><Badge tone={team.status === 'active' ? 'success' : 'muted'} className="ml-auto">{team.status}</Badge></div>
            <p className="mt-1 font-caption text-muted-foreground">{team.description}</p>
            <p className="mt-2 font-caption">成员 {safeData.members.filter(member => member.teamId === team.id).length} · 服务 {team.serviceIds.length}</p>
            <div className="mt-2 flex gap-1"><Button size="sm" onClick={() => { setDialog(team); setForm({ name: team.name, description: team.description, serviceIds: team.serviceIds, memberIds: safeData.members.filter(member => member.teamId === team.id).map(member => member.id), status: team.status }); setOpen(true) }}>编辑</Button><Button size="sm" variant="danger" onClick={() => setConfirm(team)}>停用</Button></div>
          </article>
        ))}</div>
        <Dialog open={open} onClose={() => setOpen(false)} title={dialog ? '编辑团队' : '新建团队'} size="sm" footer={<><Button onClick={() => setOpen(false)}>取消</Button><Button variant="primary" onClick={submit}>保存</Button></>}>
          <div className="grid gap-3"><Field label="团队名称" required><Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} aria-label="团队名称" /></Field><Field label="描述"><Textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} aria-label="团队描述" /></Field><Field label="负责服务"><div className="grid max-h-32 gap-1 overflow-auto rounded-control border border-border p-2">{safeData.services.map(service => <Checkbox key={service.id} label={service.name} checked={form.serviceIds.includes(service.id)} onChange={() => setForm(current => ({ ...current, serviceIds: current.serviceIds.includes(service.id) ? current.serviceIds.filter(id => id !== service.id) : [...current.serviceIds, service.id] }))} />)}</div></Field>
          <Field label="团队成员"><div className="grid max-h-32 gap-1 overflow-auto rounded-control border border-border p-2">{safeData.members.map(member => <Checkbox key={member.id} label={member.name} checked={form.memberIds.includes(member.id)} onChange={() => setForm(current => ({ ...current, memberIds: current.memberIds.includes(member.id) ? current.memberIds.filter(id => id !== member.id) : [...current.memberIds, member.id] }))} />)}</div></Field></div>
        </Dialog>
        <ConfirmDialog open={!!confirm} title="停用团队" message={`确认停用 ${confirm?.name}？`} confirmLabel="停用" onClose={() => setConfirm(undefined)} onConfirm={() => { if (!confirm) return; updateData(current => ({ ...current, teams: current.teams.map(team => team.id === confirm.id ? { ...team, status: 'disabled' } : team) })); showToast({ tone: 'success', title: '团队已停用' }); setConfirm(undefined) }} />
      </section>
    )
  }

  function RulesTab() {
    const [dialog, setDialog] = useState<NotificationRule>()
    const [open, setOpen] = useState(false)
    const [confirm, setConfirm] = useState<NotificationRule>()
    const [form, setForm] = useState<NotificationRule>({ id: '', name: '', trigger: 'incident.created', severities: [], audience: '', channel: 'email', quietHours: '关闭', enabled: true })
    const submit = () => {
      if (!form.name.trim() || !form.audience) return
      if (dialog) updateData(current => ({ ...current, rules: current.rules.map(rule => rule.id === dialog.id ? form : rule) }))
      else updateData(current => ({ ...current, rules: [...current.rules, { ...form, id: uniqueId('rule') }] }))
      setOpen(false); showToast({ tone: 'success', title: dialog ? '规则已更新' : '规则已创建' })
    }
    return (
      <section aria-labelledby="rules-title" className="grid gap-3">
        <div className="flex items-center gap-2"><h2 id="rules-title" className="font-title">通知规则</h2><Button variant="primary" className="ml-auto" onClick={() => { setDialog(undefined); setForm({ id: '', name: '', trigger: 'incident.created', severities: [], audience: safeData.teams[0].id, channel: 'email', quietHours: '关闭', enabled: true }); setOpen(true) }}>新建规则</Button></div>
        <div className="grid gap-2">{safeData.rules.map(rule => (
          <article key={rule.id} className="flex flex-wrap items-center gap-2 rounded-card border border-border p-3">
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-body">{rule.name}</h3><Badge tone={rule.enabled ? 'success' : 'muted'}>{rule.enabled ? '启用' : '停用'}</Badge></div><p className="mt-1 font-caption text-muted-foreground">{rule.trigger} · {rule.channel} · {rule.quietHours}</p></div>
            <Switch checked={rule.enabled} label={`${rule.name} 通知开关`} onChange={value => updateData(current => ({ ...current, rules: current.rules.map(item => item.id === rule.id ? { ...item, enabled: value } : item) }))} />
            <Button size="sm" onClick={() => { setDialog(rule); setForm(rule); setOpen(true) }}>编辑</Button><Button size="sm" variant="danger" onClick={() => setConfirm(rule)}>删除</Button>
          </article>
        ))}</div>
        <Dialog open={open} onClose={() => setOpen(false)} title={dialog ? '编辑规则' : '新建规则'} size="md" footer={<><Button onClick={() => setOpen(false)}>取消</Button><Button variant="primary" onClick={submit}>保存</Button></>}>
          <div className="grid gap-3"><Field label="规则名称" required><Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} aria-label="规则名称" /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="触发事件"><Select value={form.trigger} onChange={event => setForm(current => ({ ...current, trigger: event.target.value }))} aria-label="触发事件">{['incident.created','incident.escalated','change.failed'].map(value => <option key={value} value={value}>{value}</option>)}</Select></Field><Field label="接收对象"><Select value={form.audience} onChange={event => setForm(current => ({ ...current, audience: event.target.value }))} aria-label="接收对象"><option value="">请选择</option>{safeData.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</Select></Field><Field label="通知渠道"><Select value={form.channel} onChange={event => setForm(current => ({ ...current, channel: event.target.value as NotificationRule['channel'] }))} aria-label="通知渠道">{['email','webhook','sms'].map(value => <option key={value} value={value}>{value}</option>)}</Select></Field><Field label="静默时间"><Input value={form.quietHours} onChange={event => setForm(current => ({ ...current, quietHours: event.target.value }))} aria-label="静默时间" /></Field></div>
          <Field label="严重等级"><div className="flex gap-3">{['sev1','sev2','sev3','sev4'].map(value => <Checkbox key={value} label={value.toUpperCase()} checked={form.severities.includes(value as Severity)} onChange={() => setForm(current => ({ ...current, severities: current.severities.includes(value as Severity) ? current.severities.filter(item => item !== value) : [...current.severities, value as Severity] }))} />)}</div></Field>
        </div>
        </Dialog>
        <ConfirmDialog open={!!confirm} title="删除通知规则" message={`确认删除 ${confirm?.name}？`} confirmLabel="删除" onClose={() => setConfirm(undefined)} onConfirm={() => { if (!confirm) return; updateData(current => ({ ...current, rules: current.rules.filter(rule => rule.id !== confirm.id) })); showToast({ tone: 'success', title: '规则已删除' }); setConfirm(undefined) }} />
      </section>
    )
  }

  function IntegrationsTab() {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({ name: '', url: '' })
    const [confirm, setConfirm] = useState<Integration>()
    const [testing, setTesting] = useState<string>()
    const submit = () => { if (!form.name || !form.url) return; updateData(current => ({ ...current, integrations: [...current.integrations, { id: uniqueId('int'), ...form, enabled: true }] })); setOpen(false); setForm({ name: '', url: '' }); showToast({ tone: 'success', title: 'Webhook 已新增' }) }
    const test = async (integration: Integration) => {
      setTesting(integration.id); await new Promise(resolve => setTimeout(resolve, 600))
      const result = integration.url.includes('fail') ? { status: 'failed' as const, message: '连接被拒绝' } : { status: 'success' as const, message: '连接正常' }
      updateData(current => ({ ...current, integrations: current.integrations.map(item => item.id === integration.id ? { ...item, lastTest: { ...result, at: new Date().toISOString() } } : item) }))
      setTesting(undefined); showToast({ tone: result.status === 'success' ? 'success' : 'error', title: result.status === 'success' ? '测试成功' : '测试失败', description: result.message })
    }
    return (
      <section aria-labelledby="integrations-title" className="grid gap-3">
        <div className="flex items-center gap-2"><h2 id="integrations-title" className="font-title">集成</h2><Button variant="primary" className="ml-auto" onClick={() => setOpen(true)}>新增 Webhook</Button></div>
        <div className="grid gap-2">{safeData.integrations.map(integration => (
          <article key={integration.id} className="rounded-card border border-border p-3">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-body">{integration.name}</h3><Badge tone={integration.enabled ? 'success' : 'muted'}>{integration.enabled ? '启用' : '停用'}</Badge><Switch className="ml-auto" checked={integration.enabled} label={`${integration.name} 启用状态`} onChange={value => updateData(current => ({ ...current, integrations: current.integrations.map(item => item.id === integration.id ? { ...item, enabled: value } : item) }))} /></div>
            <p className="mt-1 break-all font-caption text-muted-foreground">{integration.url}</p>
            {integration.lastTest && <p className="mt-1 font-caption"><Badge tone={integration.lastTest.status === 'success' ? 'success' : 'danger'}>{integration.lastTest.status}</Badge> {integration.lastTest.message}</p>}
            <div className="mt-2 flex gap-1"><Button size="sm" loading={testing === integration.id} onClick={() => void test(integration)}>测试连接</Button><Button size="sm" variant="danger" onClick={() => setConfirm(integration)}>删除</Button></div>
          </article>
        ))}</div>
        <Dialog open={open} onClose={() => setOpen(false)} title="新增 Webhook" size="sm" footer={<><Button onClick={() => setOpen(false)}>取消</Button><Button variant="primary" onClick={submit}>保存</Button></>}><div className="grid gap-3"><Field label="名称" required><Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} aria-label="Webhook 名称" /></Field><Field label="URL" required hint="URL 包含 fail 可模拟测试失败"><Input value={form.url} onChange={event => setForm(current => ({ ...current, url: event.target.value }))} aria-label="Webhook URL" /></Field></div></Dialog>
        <ConfirmDialog open={!!confirm} title="删除集成" message={`确认删除 ${confirm?.name}？`} confirmLabel="删除" onClose={() => setConfirm(undefined)} onConfirm={() => { if (!confirm) return; updateData(current => ({ ...current, integrations: current.integrations.filter(item => item.id !== confirm.id) })); showToast({ tone: 'success', title: '集成已删除' }); setConfirm(undefined) }} />
      </section>
    )
  }

  function PreferenceTab() {
    const initial = safeData.preference
    const [form, setForm] = useState(initial)
    const [saving, setSaving] = useState(false)
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)
    const save = async () => { setSaving(true); await new Promise(resolve => setTimeout(resolve, 400)); updateData(current => ({ ...current, preference: form })); setSaving(false); showToast({ tone: 'success', title: '个人偏好已保存' }) }
    return <section aria-labelledby="pref-title" className="rounded-card border border-border p-4"><h2 id="pref-title" className="font-title">个人偏好</h2><form className="mt-4 grid gap-4" onSubmit={event => { event.preventDefault(); void save() }}><Field label="默认首页" htmlFor="default-route"><Select id="default-route" value={form.defaultRoute} onChange={event => setForm(current => ({ ...current, defaultRoute: event.target.value }))}>{[['/inbox','收件箱'],['/events','事件列表'],['/board','事件看板'],['/analytics','交付分析']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</Select></Field><Field label="时区" htmlFor="pref-tz"><Select id="pref-tz" value={form.timezone} onChange={event => setForm(current => ({ ...current, timezone: event.target.value }))}>{['Asia/Shanghai','UTC'].map(value => <option key={value} value={value}>{value}</option>)}</Select></Field><label className="flex items-center justify-between rounded-card border border-border p-3"><span>接收通知</span><Switch checked={form.notifications} label="接收通知" onChange={value => setForm(current => ({ ...current, notifications: value }))} /></label><label className="flex items-center justify-between rounded-card border border-border p-3"><span>启用键盘快捷键</span><Switch checked={form.shortcuts} label="启用键盘快捷键" onChange={value => setForm(current => ({ ...current, shortcuts: value }))} /></label><FormActions dirty={dirty} saving={saving} onCancel={() => setForm(initial)} onSave={() => void save()} /></form></section>
  }
}

function FormActions({ dirty, saving, onCancel, onSave }: { dirty: boolean; saving: boolean; onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-surface-border pt-3">
      <Button onClick={onCancel} disabled={!dirty || saving}>取消</Button>
      <Button variant="primary" loading={saving} disabled={!dirty} onClick={onSave}>保存</Button>
      {dirty && <span role="status" className="font-caption text-warning">有未保存修改</span>}
    </div>
  )
}
