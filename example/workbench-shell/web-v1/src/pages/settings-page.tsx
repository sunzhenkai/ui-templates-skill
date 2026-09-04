import { CollectionSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/shared/chrome"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { getWorkspace, inviteMember, listIntegrations, listMembers, listNotificationRules, listTeams, testIntegration, updateMember, updateWorkspace, upsertIntegration, upsertNotificationRule, upsertTeam } from "@/lib/api/client"
import { keys, queryClient } from "@/lib/query"
import { usePrefsStore } from "@/stores/prefs-store"
import { SETTINGS_TABS, type SettingsTab } from "@/types/domain"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useBlocker, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"

const TAB_LABEL: Record<SettingsTab, string> = {
  general: "基本信息",
  members: "成员与权限",
  teams: "团队",
  notifications: "通知规则",
  integrations: "集成",
  preferences: "个人偏好",
}

export function SettingsPage() {
  const { workspaceId = "ws-alpha" } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = (params.get("tab") ?? "general") as SettingsTab
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [dirty, setDirty] = useState(false)
  const blocker = useBlocker(dirty)
  const workspace = useQuery({ queryKey: keys.workspace(workspaceId), queryFn: () => getWorkspace(workspaceId) })
  const members = useQuery({ queryKey: keys.members(workspaceId), queryFn: () => listMembers(workspaceId) })
  const teams = useQuery({ queryKey: keys.teams(workspaceId), queryFn: () => listTeams(workspaceId) })
  const rules = useQuery({ queryKey: keys.rules(workspaceId), queryFn: () => listNotificationRules(workspaceId) })
  const integrations = useQuery({ queryKey: keys.integrations(workspaceId), queryFn: () => listIntegrations(workspaceId) })
  const prefs = usePrefsStore()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState("https://hooks.example.test/new")

  useEffect(() => {
    if (workspace.data) {
      setName(workspace.data.name)
      setDescription(workspace.data.description)
      setDirty(false)
    }
  }, [workspace.data])

  const save = useMutation({
    mutationFn: () => updateWorkspace(workspaceId, { name, description }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: keys.workspace(workspaceId) }); toast.success("设置已保存"); setDirty(false) },
    onError: (error) => toast.error(error.message, { action: { label: "重试", onClick: () => save.mutate() } }),
  })

  if (workspace.isLoading) return <CollectionSkeleton />
  if (workspace.isError) return <ErrorState message="设置加载失败" onRetry={() => void workspace.refetch()} />

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader title="工作区设置" />
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (typeof value !== "string") return
          const copy = new URLSearchParams(params)
          copy.set("tab", value)
          setParams(copy, { replace: true })
        }}
        orientation="vertical"
        className="min-h-0 flex-1 overflow-hidden p-[var(--page-gutter)] data-horizontal:flex-col data-vertical:flex-row"
      >
        <TabsList variant="line" className="h-auto w-full max-w-full overflow-x-auto md:w-44 md:flex-col">
          {SETTINGS_TABS.map((item) => (
            <TabsTrigger key={item} value={item}>{TAB_LABEL[item]}</TabsTrigger>
          ))}
        </TabsList>
        <div className="min-h-0 flex-1 overflow-auto pb-[var(--chat-fab-clearance)]">
          <TabsContent value="general" className="space-y-3 p-3">
            <FieldGroup>
              <Field>
                <FieldLabel>工作区名称</FieldLabel>
                <Input value={name} onChange={(event) => { setName(event.target.value); setDirty(true) }} />
              </Field>
              <Field>
                <FieldLabel>描述</FieldLabel>
                <Textarea value={description} onChange={(event) => { setDescription(event.target.value); setDirty(true) }} />
              </Field>
            </FieldGroup>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "保存中" : "保存"}</Button>
              <Button variant="outline" onClick={() => { if (workspace.data) { setName(workspace.data.name); setDescription(workspace.data.description); setDirty(false) } }}>取消</Button>
            </div>
          </TabsContent>
          <TabsContent value="members" className="p-3">
            <Button size="sm" className="mb-3" onClick={() => setInviteOpen(true)}>邀请成员</Button>
            {members.data?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>成员</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.data.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}<div className="text-xs text-muted-foreground">{member.email}</div></TableCell>
                      <TableCell>
                        <Select value={member.role} onValueChange={(value) => typeof value === "string" && void updateMember(member.id, { role: value as typeof member.role }).then(() => queryClient.invalidateQueries())}>
                          <SelectTrigger aria-label={`${member.name} 角色`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">owner</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                            <SelectItem value="member">member</SelectItem>
                            <SelectItem value="viewer">viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{member.status}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="xs" variant="outline" onClick={() => void updateMember(member.id, { status: member.status === "paused" ? "active" : "paused" }).then(() => queryClient.invalidateQueries())}>{member.status === "paused" ? "恢复" : "暂停"}</Button>
                        <Button size="xs" variant="destructive" onClick={() => setRemoveId(member.id)}>移除</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <EmptyState title="没有成员" description="邀请第一位成员。" />}
          </TabsContent>
          <TabsContent value="teams" className="p-3">
            <Button size="sm" className="mb-3" onClick={() => void upsertTeam(workspaceId, { name: "新团队", description: "", memberIds: [], serviceIds: [] }).then(() => queryClient.invalidateQueries())}>新建团队</Button>
            {(teams.data ?? []).map((team) => (
              <div key={team.id} className="mb-2 rounded-md border p-3">
                <p>{team.name} · {team.status}</p>
                <p className="text-sm text-muted-foreground">{team.description || "无描述"}</p>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="notifications" className="p-3">
            <Button size="sm" className="mb-3" onClick={() => void upsertNotificationRule(workspaceId, { name: "新规则", trigger: "incident.created", severity: "any", target: "team-sre", channel: "in-app", quietHours: "", enabled: true }).then(() => queryClient.invalidateQueries())}>创建规则</Button>
            {(rules.data ?? []).map((rule) => (
              <div key={rule.id} className="mb-2 flex items-center justify-between rounded-md border p-3">
                <div>
                  <p>{rule.name}</p>
                  <p className="text-sm text-muted-foreground">{rule.trigger} · {rule.channel}</p>
                </div>
                <Switch checked={rule.enabled} onCheckedChange={(value) => void upsertNotificationRule(workspaceId, { ...rule, enabled: Boolean(value) }).then(() => queryClient.invalidateQueries())} aria-label={`启用 ${rule.name}`} />
              </div>
            ))}
          </TabsContent>
          <TabsContent value="integrations" className="space-y-3 p-3">
            <Field>
              <FieldLabel>Webhook URL</FieldLabel>
              <Input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} />
            </Field>
            <Button size="sm" onClick={() => void upsertIntegration(workspaceId, { name: "新 Webhook", kind: "webhook", url: webhookUrl, enabled: true }).then(() => queryClient.invalidateQueries())}>新增 Webhook</Button>
            {(integrations.data ?? []).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p>{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.url}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="xs" variant="outline" onClick={() => void testIntegration(item.id).then((result) => toast[result.ok ? "success" : "error"](result.ok ? "连接成功" : "连接失败"))}>测试连接</Button>
                  <Switch checked={item.enabled} onCheckedChange={(value) => void upsertIntegration(workspaceId, { ...item, enabled: Boolean(value) }).then(() => queryClient.invalidateQueries())} aria-label={`启用 ${item.name}`} />
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="preferences" className="space-y-4 p-3">
            <Field>
              <FieldLabel>默认首页</FieldLabel>
              <Select value={prefs.defaultHome} onValueChange={(value) => typeof value === "string" && prefs.setDefaultHome(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox">收件箱</SelectItem>
                  <SelectItem value="incidents">事件列表</SelectItem>
                  <SelectItem value="board">事件看板</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center justify-between gap-2 text-sm">
              通知开关
              <Switch checked={prefs.notificationsEnabled} onCheckedChange={(value) => prefs.setNotificationsEnabled(Boolean(value))} />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm">
              快捷键
              <Switch checked={prefs.shortcutsEnabled} onCheckedChange={(value) => prefs.setShortcutsEnabled(Boolean(value))} />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm">
              模拟失败
              <Switch checked={prefs.forceFail} onCheckedChange={(value) => prefs.setForceFail(Boolean(value))} />
            </label>
            <Field>
              <FieldLabel>模拟延迟 {prefs.delayMs}ms</FieldLabel>
              <Slider value={[prefs.delayMs]} min={0} max={1200} onValueChange={(value) => prefs.setDelayMs(Array.isArray(value) ? value[0] ?? 0 : value)} />
            </Field>
          </TabsContent>
        </div>
      </Tabs>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>邀请成员</DialogTitle></DialogHeader>
          <Field data-invalid={Boolean(emailError)}>
            <FieldLabel>邮箱</FieldLabel>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} />
            {emailError ? <FieldError>{emailError}</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>取消</Button>
            <Button onClick={() => {
              void inviteMember(workspaceId, email, "member", []).then(async () => {
                setEmailError("")
                setInviteOpen(false)
                await queryClient.invalidateQueries()
                toast.success("已发送邀请")
              }).catch((error: Error) => setEmailError(error.message))
            }}>邀请</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(removeId)} onOpenChange={(open) => { if (!open) setRemoveId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除成员？</AlertDialogTitle>
            <AlertDialogDescription>确认后该成员将无法访问工作区。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeId && void updateMember(removeId, { status: "paused" }).then(() => queryClient.invalidateQueries())}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {blocker.state === "blocked" ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
          <div role="alertdialog" className="rounded-lg bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-floating)]">
            <p>有未保存修改，确认离开？</p>
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
