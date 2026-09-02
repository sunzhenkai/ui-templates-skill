import { useEffect, useState } from "react"
import { Bell, Building2, Settings, Shield, User, Users, Webhook } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppStore } from "@/stores/app-store"
import * as api from "@/mocks/api"
import { cn } from "@/lib/utils"
import type { Integration, Member, NotificationRule, Team, Workspace } from "@/types"

const tabs = [
  { id: "basic", label: "基本信息", icon: <Building2 className="size-4" /> },
  { id: "members", label: "成员与权限", icon: <Users className="size-4" /> },
  { id: "teams", label: "团队", icon: <Shield className="size-4" /> },
  { id: "notifications", label: "通知规则", icon: <Bell className="size-4" /> },
  { id: "integrations", label: "集成", icon: <Webhook className="size-4" /> },
  { id: "preferences", label: "个人偏好", icon: <User className="size-4" /> },
]

export default function SettingsPage() {
  const store = useAppStore()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])

  const load = async () => {
    const [ws, m, t, r, i] = await Promise.all([
      api.fetchWorkspace(store.currentWorkspaceId),
      api.fetchMembers(store.currentWorkspaceId),
      api.fetchTeams(store.currentWorkspaceId),
      api.fetchNotificationRules(store.currentWorkspaceId),
      api.fetchIntegrations(store.currentWorkspaceId),
    ])
    setWorkspace(ws ?? null)
    setMembers(m)
    setTeams(t)
    setRules(r)
    setIntegrations(i)
  }

  useEffect(() => {
    load()
  }, [store.currentWorkspaceId])

  const activeTab = tabs.find((t) => t.id === store.settingsTab)?.id ?? "basic"

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader icon={<Settings className="size-4" />} title="工作区设置" description="管理工作区、团队、成员与集成" />

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* 左侧页签 */}
        <aside className="flex shrink-0 flex-col border-b md:w-56 md:border-b-0 md:border-r">
          <div className="hidden p-2 text-micro uppercase tracking-wide text-muted-foreground md:block">帐户 / 空间</div>
          <Tabs value={activeTab} onValueChange={store.setSettingsTab} className="w-full">
            <TabsList className="h-auto w-full justify-start rounded-none bg-transparent p-1 md:flex-col md:items-stretch md:gap-0.5">
              {tabs.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="justify-start gap-2 data-[selected]:bg-muted/80 md:w-full md:px-3 md:py-1.5">
                  {t.icon}
                  <span className="hidden md:inline">{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </aside>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-stable">
          <div className="mx-auto max-w-3xl">
            {activeTab === "basic" && <BasicSettings workspace={workspace} onChange={setWorkspace} />}
            {activeTab === "members" && <MembersSettings members={members} teams={teams} onChange={load} />}
            {activeTab === "teams" && <TeamsSettings teams={teams} onChange={load} />}
            {activeTab === "notifications" && <NotificationsSettings rules={rules} onChange={load} />}
            {activeTab === "integrations" && <IntegrationsSettings integrations={integrations} onChange={load} />}
            {activeTab === "preferences" && <PreferencesSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}

function BasicSettings({ workspace, onChange }: { workspace: Workspace | null; onChange: (w: Workspace) => void }) {
  const store = useAppStore()
  const [form, setForm] = useState(workspace)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(workspace)
  }, [workspace])

  if (!form) return null

  const save = async () => {
    setSaving(true)
    const updated = await api.updateWorkspace(form.id, {
      name: form.name,
      description: form.description,
      timezone: form.timezone,
      defaultIncidentStatus: form.defaultIncidentStatus,
    })
    onChange(updated)
    store.addToast({ type: "success", title: "已保存" })
    setSaving(false)
  }

  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold text-foreground">基本信息</h2>
      <div className="grid gap-4 rounded-lg border bg-surface p-4">
        <Field label="工作区名称">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="描述">
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="默认时区">
          <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        </Field>
        <Field label="默认事件状态">
          <Select value={form.defaultIncidentStatus} onValueChange={(v) => setForm({ ...form, defaultIncidentStatus: v as never })}>
            <SelectItem value="open">待处理</SelectItem>
            <SelectItem value="acknowledged">已确认</SelectItem>
          </Select>
        </Field>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</Button>
        </div>
      </div>
    </section>
  )
}

function MembersSettings({ members, teams, onChange }: { members: Member[]; teams: Team[]; onChange: () => void }) {
  const store = useAppStore()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("engineer")
  const [teamId, setTeamId] = useState("")
  const [error, setError] = useState("")

  const invite = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("邮箱格式不正确")
      return
    }
    setError("")
    const id = `m-${Date.now()}`
    await api.updateMember(id, {
      id,
      workspaceId: store.currentWorkspaceId,
      name: email.split("@")[0],
      email,
      role: role as never,
      teamIds: teamId ? [teamId] : [],
      active: true,
    } as Member)
    store.addToast({ type: "success", title: "邀请已发送" })
    setEmail("")
    onChange()
  }

  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold text-foreground">成员与权限</h2>
      <div className="grid gap-3 rounded-lg border bg-surface p-4">
        <div className="flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" className={cn(error && "border-destructive")} />
          <Select value={role} onValueChange={setRole}>
            <SelectItem value="owner">所有者</SelectItem>
            <SelectItem value="admin">管理员</SelectItem>
            <SelectItem value="engineer">工程师</SelectItem>
            <SelectItem value="viewer">观察者</SelectItem>
          </Select>
          <Select value={teamId} onValueChange={setTeamId} placeholder="团队">
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </Select>
          <Button onClick={invite}>邀请</Button>
        </div>
        {error && <span className="text-caption text-destructive">{error}</span>}
        <div className="divide-y">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-body text-foreground">{m.name}</div>
                <div className="text-caption text-muted-foreground">{m.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{m.role}</Badge>
                <Switch checked={m.active} onCheckedChange={async () => { await api.updateMember(m.id, { active: !m.active }); onChange() }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TeamsSettings({ teams, onChange }: { teams: Team[]; onChange: () => void }) {
  const store = useAppStore()
  const [name, setName] = useState("")

  const create = async () => {
    if (!name.trim()) return
    await api.createTeam({ workspaceId: store.currentWorkspaceId, name, color: "#3b82f6", memberIds: [], serviceIds: [], active: true })
    store.addToast({ type: "success", title: "团队已创建" })
    setName("")
    onChange()
  }

  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold text-foreground">团队</h2>
      <div className="grid gap-3 rounded-lg border bg-surface p-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="团队名称" />
          <Button onClick={create}>新建</Button>
        </div>
        <div className="divide-y">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-body text-foreground">{t.name}</span>
              </div>
              <div className="text-caption text-muted-foreground">{t.memberIds.length} 成员</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function NotificationsSettings({ rules, onChange }: { rules: NotificationRule[]; onChange: () => void }) {
  const store = useAppStore()
  const [name, setName] = useState("")

  const create = async () => {
    if (!name.trim()) return
    await api.createRule({ workspaceId: store.currentWorkspaceId, name, event: "incident.created", severity: ["critical"], recipients: [], channels: ["email"], muteMinutes: 0, active: true })
    store.addToast({ type: "success", title: "规则已创建" })
    setName("")
    onChange()
  }

  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold text-foreground">通知规则</h2>
      <div className="grid gap-3 rounded-lg border bg-surface p-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="规则名称" />
          <Button onClick={create}>新建</Button>
        </div>
        <div className="divide-y">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-body text-foreground">{r.name}</div>
                <div className="text-caption text-muted-foreground">{r.channels.join(", ")} · {r.severity.join(", ")}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={r.active} onCheckedChange={async () => { await api.updateRule(r.id, { active: !r.active }); onChange() }} />
                <Button variant="ghost" size="xs" onClick={async () => { await api.deleteRule(r.id); onChange() }}>删除</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function IntegrationsSettings({ integrations, onChange }: { integrations: Integration[]; onChange: () => void }) {
  const store = useAppStore()
  const [name, setName] = useState("")
  const [type, setType] = useState<"webhook" | "slack">("webhook")

  const create = async () => {
    if (!name.trim()) return
    await api.createIntegration({ workspaceId: store.currentWorkspaceId, name, type, active: true })
    store.addToast({ type: "success", title: "集成已添加" })
    setName("")
    onChange()
  }

  const test = async (id: string) => {
    try {
      await api.testIntegration(id)
      store.addToast({ type: "success", title: "测试连接成功" })
    } catch (e) {
      store.addToast({ type: "error", title: "测试连接失败" })
    }
    onChange()
  }

  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold text-foreground">集成</h2>
      <div className="grid gap-3 rounded-lg border bg-surface p-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="集成名称" />
          <Select value={type} onValueChange={(v) => setType(v as never)}>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="slack">Slack</SelectItem>
          </Select>
          <Button onClick={create}>新增</Button>
        </div>
        <div className="divide-y">
          {integrations.map((i) => (
            <div key={i.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-body text-foreground">{i.name}</div>
                <div className="text-caption text-muted-foreground">{i.type} · {i.lastTested ? (i.lastTested === "success" ? "测试成功" : "测试失败") : "未测试"}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={i.active} onCheckedChange={async () => { await api.updateService(i.id, { active: !i.active } as never); onChange() }} />
                <Button variant="ghost" size="xs" onClick={() => test(i.id)}>测试</Button>
                <Button variant="ghost" size="xs" onClick={async () => { await api.deleteIntegration(i.id); onChange() }}>删除</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PreferencesSettings() {
  const store = useAppStore()
  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold text-foreground">个人偏好</h2>
      <div className="grid gap-3 rounded-lg border bg-surface p-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-body text-foreground">启用通知</div>
            <div className="text-caption text-muted-foreground">接收桌面通知提醒</div>
          </div>
          <Switch checked={true} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-body text-foreground">快捷键</div>
            <div className="text-caption text-muted-foreground">启用全局快捷键</div>
          </div>
          <Switch checked={true} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-body text-foreground">模拟请求失败</div>
            <div className="text-caption text-muted-foreground">用于验证错误状态和重试</div>
          </div>
          <Switch checked={store.simulateFailure} onCheckedChange={store.setSimulateFailure} />
        </div>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-caption text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
