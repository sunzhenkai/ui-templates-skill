/** 工作区设置（route/settings）：基本信息/成员/团队/通知规则/集成/个人偏好，未保存提醒与危险确认。 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Pencil, Plus, Settings2, SlidersHorizontal, Trash2, UserPlus, Users, Webhook } from "lucide-react";
import { cn } from "../../lib";
import { api, type NotificationRule, type Severity } from "../../data/mock";
import { useAppConfirm } from "../../stores";
import {
  Badge, Button, Combobox, Dialog, Field, IconButton, Input, NativeSelect, Switch,
  Textarea,
} from "../../components/ui";
import { toastError, toastSuccess } from "../../components/ui/toast";
import { PageHeader, Panel } from "../../components/shell/page";

// pattern/section-nav（1.3.2）：icon + label 解剖 + 分组标签
const NAV_GROUPS: { label: string; items: { key: string; label: string; icon: typeof Settings2 }[] }[] = [
  {
    label: "基础",
    items: [{ key: "general", label: "基本信息", icon: Settings2 }],
  },
  {
    label: "成员",
    items: [
      { key: "members", label: "成员与权限", icon: Users },
      { key: "teams", label: "团队", icon: Users },
    ],
  },
  {
    label: "通知与集成",
    items: [
      { key: "rules", label: "通知规则", icon: Bell },
      { key: "integrations", label: "集成", icon: Webhook },
    ],
  },
  {
    label: "偏好",
    items: [{ key: "preferences", label: "个人偏好", icon: SlidersHorizontal }],
  },
];

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "general";
  return (
    <>
      <PageHeader title="工作区设置" />
      {/* pattern/section-nav：二级导航位于内容卡片内部左列（rule/LAYOUT-107 卡片内） */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <aside
          aria-label="设置导航"
          className="shrink-0 border-b border-surface-border md:flex md:w-60 md:flex-col md:border-b-0 md:border-r"
        >
          <nav
            aria-label="设置分区"
            className="flex gap-1 overflow-x-auto p-2 md:min-h-0 md:flex-col md:overflow-y-auto md:p-3 md:space-y-5"
          >
            {NAV_GROUPS.map((group) => (
              <section key={group.label} aria-labelledby={`settings-group-${group.label}`}>
                <h2
                  id={`settings-group-${group.label}`}
                  className="mb-1.5 hidden px-3 text-caption font-medium text-muted-foreground md:block"
                >
                  {group.label}
                </h2>
                <ul className="flex gap-1 md:flex-col md:gap-0.5">
                  {group.items.map((item) => {
                    const active = item.key === tab;
                    return (
                      <li key={item.key}>
                        <button
                          aria-current={active ? "page" : undefined}
                          onClick={() => setParams({ tab: item.key }, { replace: true })}
                          className={cn(
                            "flex min-h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-body outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            active
                              ? "bg-surface-selected font-medium text-surface-selected-foreground"
                              : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                          )}
                        >
                          <item.icon className="size-4 shrink-0" aria-hidden />
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>
        </aside>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl">
            {tab === "general" && <GeneralTab />}
            {tab === "members" && <MembersTab />}
            {tab === "teams" && <TeamsTab />}
            {tab === "rules" && <RulesTab />}
            {tab === "integrations" && <IntegrationsTab />}
            {tab === "preferences" && <PreferencesTab />}
          </div>
        </div>
      </div>
    </>
  );
}

function UnsavedGuard({ dirty }: { dirty: boolean }) {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  return dirty ? <p role="status" className="mb-2 text-caption text-warning">有未保存的修改</p> : null;
}

function GeneralTab() {
  const { data } = useQuery({ queryKey: ["workspaces"], queryFn: api.listWorkspaces });
  const ws = data?.[0];
  const [name, setName] = useState(ws?.name ?? "");
  const [description, setDescription] = useState(ws?.description ?? "");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (ws && !dirty) {
      setName(ws.name);
      setDescription(ws.description);
    }
  }, [ws, dirty]);
  return (
    <Panel className="p-4">
      <h2 className="text-title-sm font-semibold">基本信息</h2>
      <UnsavedGuard dirty={dirty} />
      <div className="mt-3 space-y-3">
        <Field label="工作区名称">{(p) => <Input {...p} value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} />}</Field>
        <Field label="描述">{(p) => <Textarea {...p} value={description} onChange={(e) => { setDescription(e.target.value); setDirty(true); }} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="默认时区">
            {(p) => (
              <NativeSelect {...p} defaultValue="Asia/Shanghai">
                <option>Asia/Shanghai</option><option>UTC</option><option>America/New_York</option>
              </NativeSelect>
            )}
          </Field>
          <Field label="默认事件状态">
            {(p) => (
              <NativeSelect {...p} defaultValue="triage">
                <option value="triage">待确认</option><option value="processing">处理中</option>
              </NativeSelect>
            )}
          </Field>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => { setDirty(false); toastSuccess("已保存"); }}>保存</Button>
          <Button variant="ghost" onClick={() => { setDirty(false); toastSuccess("已取消修改"); }}>取消</Button>
        </div>
      </div>
    </Panel>
  );
}

function MembersTab() {
  const qc = useQueryClient();
  const askConfirm = useAppConfirm();
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers });
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: api.listTeams });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");

  const filtered = (members ?? []).filter((m) => !roleFilter || m.role === roleFilter);

  const remove = async (id: string, name: string) => {
    const ok = await askConfirm({ title: `移除成员「${name}」？`, body: "移除后将失去工作区访问权限。", confirmLabel: "移除", danger: true });
    if (!ok) return;
    try {
      await api.removeMember(id);
      toastSuccess("成员已移除");
      await qc.invalidateQueries({ queryKey: ["members"] });
    } catch (err) {
      toastError(`移除失败：${(err as Error).message}`);
    }
  };

  const togglePause = async (id: string, current: string) => {
    try {
      await api.setMemberStatus(id, current === "active" ? "paused" : "active");
      await qc.invalidateQueries({ queryKey: ["members"] });
      toastSuccess(current === "active" ? "成员已暂停" : "成员已恢复");
    } catch (err) {
      toastError(`操作失败：${(err as Error).message}`);
    }
  };

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-semibold">成员与权限</h2>
        <Button variant="brand" size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="size-3.5" aria-hidden /> 邀请成员</Button>
      </div>
      <div className="mt-3">
        <NativeSelect aria-label="角色筛选" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-36">
          <option value="">全部角色</option><option value="admin">管理员</option><option value="member">成员</option><option value="viewer">观察者</option>
        </NativeSelect>
      </div>
      <table className="mt-3 w-full border-collapse text-body">
        <caption className="sr-only">成员列表</caption>
        <thead>
          <tr className="border-b border-surface-border text-left text-caption text-muted-foreground">
            <th scope="col" className="py-2 font-medium">成员</th>
            <th scope="col" className="py-2 font-medium">角色</th>
            <th scope="col" className="py-2 font-medium">团队</th>
            <th scope="col" className="py-2 font-medium">状态</th>
            <th scope="col" className="py-2 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((m) => (
            <tr key={m.id} className="border-b border-surface-border last:border-0">
              <td className="py-2">
                <p className="font-medium">{m.name}</p>
                <p className="text-caption text-muted-foreground">{m.email}</p>
              </td>
              <td className="py-2">
                <NativeSelect aria-label={`修改 ${m.name} 的角色`} value={m.role} onChange={(e) => void api.listMembers().then(() => toastSuccess(`角色已更新为 ${e.target.value}`))} className="h-7 w-24 text-caption">
                  <option value="admin">管理员</option><option value="member">成员</option><option value="viewer">观察者</option>
                </NativeSelect>
              </td>
              <td className="py-2 text-caption text-muted-foreground">{teams?.find((t) => t.id === m.teamId)?.name ?? "—"}</td>
              <td className="py-2"><Badge variant={m.status === "active" ? "success" : "warning"}>{m.status === "active" ? "正常" : "已暂停"}</Badge></td>
              <td className="py-2 text-right">
                <IconButton label={`${m.status === "active" ? "暂停" : "恢复"} ${m.name}`} size="icon-xs" onClick={() => void togglePause(m.id, m.status)}>
                  {m.status === "active" ? "⏸" : "▶"}
                </IconButton>
                <IconButton label={`移除 ${m.name}`} size="icon-xs" onClick={() => void remove(m.id, m.name)}>
                  <Trash2 className="size-3" />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} teamById={new Map((teams ?? []).map((t) => [t.id, t]))} />
    </Panel>
  );
}

function InviteDialog({ open, onClose, teamById }: { open: boolean; onClose: () => void; teamById: Map<string, { id: string; name: string }> }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const submit = () => {
    setSending(true);
    setError(null);
    api.inviteMember(email, role as "member", teamId || null)
      .then(() => {
        toastSuccess(`邀请已发送至 ${email}`);
        void qc.invalidateQueries({ queryKey: ["members"] });
        onClose();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSending(false));
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="邀请成员"
      widthClass="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={submit} disabled={sending}>{sending ? "发送中…" : "发送邀请"}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="邮箱" required error={error}>
          {(p) => <Input {...p} data-autofocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />}
        </Field>
        <Field label="角色">
          {(p) => (
            <NativeSelect {...p} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">成员</option><option value="admin">管理员</option><option value="viewer">观察者</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="所属团队">
          {(p) => (
            <NativeSelect {...p} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">暂不分配</option>
              {[...teamById.values()].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </NativeSelect>
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function TeamsTab() {
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: api.listTeams });
  const askConfirm = useAppConfirm();
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-semibold">团队</h2>
        <Button variant="brand" size="sm" onClick={() => toastSuccess("新建团队（mock）")}><Plus className="size-3.5" aria-hidden /> 新建团队</Button>
      </div>
      <ul className="mt-3 space-y-2">
        {(teams ?? []).map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
            <div>
              <p className="text-body font-medium">{t.name}</p>
              <p className="text-caption text-muted-foreground tabular-nums">{t.memberIds.length} 名成员 · 负责服务 {t.serviceIds.length} 个</p>
            </div>
            <div className="flex gap-1">
              <IconButton label={`编辑 ${t.name}`} size="icon-xs" onClick={() => toastSuccess("编辑团队（mock）")}><Pencil className="size-3" /></IconButton>
              <IconButton
                label={`停用 ${t.name}`}
                size="icon-xs"
                onClick={async () => {
                  const ok = await askConfirm({ title: `停用团队「${t.name}」？`, body: "停用后团队不再接收分派。", confirmLabel: "停用", danger: true });
                  if (ok) toastSuccess("团队已停用（mock）");
                }}
              >
                <Trash2 className="size-3" />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RulesTab() {
  const qc = useQueryClient();
  const { data: rules } = useQuery({ queryKey: ["rules"], queryFn: api.listRules });
  const [editing, setEditing] = useState<NotificationRule | "new" | null>(null);

  const toggle = async (rule: NotificationRule) => {
    await api.upsertRule({ ...rule, enabled: !rule.enabled });
    await qc.invalidateQueries({ queryKey: ["rules"] });
    toastSuccess(`规则已${rule.enabled ? "停用" : "启用"}`);
  };

  const remove = async (rule: NotificationRule) => {
    await api.deleteRule(rule.id);
    await qc.invalidateQueries({ queryKey: ["rules"] });
    toastSuccess("规则已删除");
  };

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-semibold">通知规则</h2>
        <Button variant="brand" size="sm" onClick={() => setEditing("new")}><Plus className="size-3.5" aria-hidden /> 新建规则</Button>
      </div>
      <ul className="mt-3 space-y-2">
        {(rules ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
            <div>
              <p className="text-body font-medium">{r.name}</p>
              <p className="text-caption text-muted-foreground">
                {r.trigger} · {[...r.severities].map((s) => s.toUpperCase()).join("/")} · {r.channel}
                {r.muted && <Badge variant="warning" className="ml-1">静默</Badge>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={r.enabled} label={`启用 ${r.name}`} onCheckedChange={() => void toggle(r)} />
              <IconButton label={`编辑 ${r.name}`} size="icon-xs" onClick={() => setEditing(r)}><Pencil className="size-3" /></IconButton>
              <IconButton label={`删除 ${r.name}`} size="icon-xs" onClick={() => void remove(r)}><Trash2 className="size-3" /></IconButton>
            </div>
          </li>
        ))}
      </ul>
      <RuleDialog rule={editing === "new" ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </Panel>
  );
}

function RuleDialog({ rule, open, onClose }: { rule: NotificationRule | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<NotificationRule>(
    rule ?? { id: "", name: "", trigger: "incident.created", severities: ["sev1"], channel: "email", targetId: "m-1", muted: false, enabled: true },
  );
  useEffect(() => {
    setForm(rule ?? { id: "", name: "", trigger: "incident.created", severities: ["sev1"], channel: "email", targetId: "m-1", muted: false, enabled: true });
  }, [rule]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={rule ? "编辑通知规则" : "新建通知规则"}
      widthClass="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            onClick={() =>
              void api.upsertRule(form).then(() => {
                toastSuccess("规则已保存");
                void qc.invalidateQueries({ queryKey: ["rules"] });
                onClose();
              })
            }
          >
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="规则名称" required>{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
        <Field label="触发事件">
          {(p) => (
            <NativeSelect {...p} value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
              <option value="incident.created">事件创建</option><option value="alert.fired">告警触发</option><option value="daily.digest">每日汇总</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="严重等级（多选）">
          {() => (
            <Combobox
              options={[{ key: "sev1", label: "P1" }, { key: "sev2", label: "P2" }, { key: "sev3", label: "P3" }, { key: "sev4", label: "P4" }]}
              selected={[...form.severities]}
              onChange={(keys) => setForm({ ...form, severities: keys as Severity[] })}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="通知渠道">
            {(p) => (
              <NativeSelect {...p} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as "email" })}>
                <option value="email">邮件</option><option value="webhook">Webhook</option><option value="sms">短信</option>
              </NativeSelect>
            )}
          </Field>
          <Field label="接收对象">
            {(p) => <Input {...p} value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })} />}
          </Field>
        </div>
        <Field label="静默时间">
          {(p) => <Input {...p} placeholder="如 22:00-08:00" />}
        </Field>
        <Field label="启用状态">
          {() => <Switch checked={form.enabled} label="启用规则" onCheckedChange={(v) => setForm({ ...form, enabled: v })} />}
        </Field>
      </div>
    </Dialog>
  );
}

function IntegrationsTab() {
  const qc = useQueryClient();
  const askConfirm = useAppConfirm();
  const { data: integrations } = useQuery({ queryKey: ["integrations"], queryFn: api.listIntegrations });
  const [testing, setTesting] = useState<string | null>(null);

  const add = () =>
    void api
      .upsertIntegration({ id: "", name: `Webhook ${Date.now() % 1000}`, type: "webhook", url: "https://hook.example.com/new", enabled: false })
      .then(() => {
        toastSuccess("Webhook 已新增");
        void qc.invalidateQueries({ queryKey: ["integrations"] });
      });

  const test = (id: string) => {
    setTesting(id);
    api
      .testIntegration()
      .then((r) => toastSuccess(`测试连接成功（${r.latencyMs}ms，mock 未发出真实请求）`))
      .catch((err: Error) => toastError(`测试失败：${err.message}`))
      .finally(() => setTesting(null));
  };

  const remove = async (id: string, name: string) => {
    const ok = await askConfirm({ title: `删除集成「${name}」？`, body: "删除后通知不再推送。", confirmLabel: "删除", danger: true });
    if (!ok) return;
    await api.deleteIntegration(id);
    await qc.invalidateQueries({ queryKey: ["integrations"] });
    toastSuccess("集成已删除");
  };

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title-sm font-semibold">集成</h2>
        <Button variant="brand" size="sm" onClick={add}><Plus className="size-3.5" aria-hidden /> 新增 Webhook</Button>
      </div>
      <ul className="mt-3 space-y-2">
        {(integrations ?? []).map((it) => (
          <li key={it.id} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
            <div className="min-w-0">
              <p className="text-body font-medium">{it.name}</p>
              <p className="truncate text-caption text-muted-foreground">{it.url}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={it.enabled ? "success" : "neutral"}>{it.enabled ? "启用" : "停用"}</Badge>
              <Button variant="outline" size="xs" onClick={() => test(it.id)} disabled={testing === it.id}>
                {testing === it.id ? "测试中…" : "测试连接"}
              </Button>
              <IconButton label={`删除 ${it.name}`} size="icon-xs" onClick={() => void remove(it.id, it.name)}><Trash2 className="size-3" /></IconButton>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function PreferencesTab() {
  const [prefs, setPrefs] = useState({ home: "/inbox", timezone: "Asia/Shanghai", notify: true, shortcuts: true });
  return (
    <Panel className="p-4">
      <h2 className="text-title-sm font-semibold">个人偏好</h2>
      <div className="mt-3 max-w-md space-y-3">
        <Field label="默认首页">
          {(p) => (
            <NativeSelect {...p} value={prefs.home} onChange={(e) => setPrefs({ ...prefs, home: e.target.value })}>
              <option value="/inbox">收件箱</option><option value="/incidents">事件</option><option value="/analytics">分析</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="时区">
          {(p) => (
            <NativeSelect {...p} value={prefs.timezone} onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}>
              <option>Asia/Shanghai</option><option>UTC</option>
            </NativeSelect>
          )}
        </Field>
        <div className="flex items-center justify-between">
          <span className="text-body">接收通知</span>
          <Switch checked={prefs.notify} label="接收通知" onCheckedChange={(v) => setPrefs({ ...prefs, notify: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-body">键盘快捷键</span>
          <Switch checked={prefs.shortcuts} label="键盘快捷键" onCheckedChange={(v) => setPrefs({ ...prefs, shortcuts: v })} />
        </div>
        <Button variant="primary" onClick={() => toastSuccess("偏好已保存")}>保存</Button>
      </div>
    </Panel>
  );
}
