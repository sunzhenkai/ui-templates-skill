import { useSearchParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, toastSuccess } from "@/components/ui/toast";
import { usePrefs } from "@/stores/prefs";
import { getMembers, MockError } from "@/mock/api";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "general", label: "常规" },
  { id: "notifications", label: "通知" },
  { id: "appearance", label: "外观" },
  { id: "members", label: "成员" },
  { id: "api-tokens", label: "API Tokens" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** 设置（ROUTE-007-C）：宽路径纵向 tabs，窄路径横排；tab 用 replace 语义（RESP-003/ROUTE-002）。 */
export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "general") as TabId;
  const setTab = (id: TabId) => {
    const next = new URLSearchParams(params);
    if (id === "general") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="设置" icon={<SettingsIcon />} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          role="tablist"
          aria-label="设置分区"
          aria-orientation="vertical"
          className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b bg-surface p-2 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:bg-transparent md:p-3"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2.5 text-label font-medium outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring/60",
                tab === t.id && "bg-accent text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label} className="min-h-0 flex-1 overflow-y-auto p-[var(--layout-page-gutter)]">
          {tab === "general" && <GeneralTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "appearance" && <AppearanceTab />}
          {tab === "members" && <MembersTab />}
          {tab === "api-tokens" && <ApiTokensTab />}
        </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const [name, setName] = useState("Ops Lab");
  const [error, setError] = useState("");
  return (
    <div className="max-w-xl space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>工作区</CardTitle>
          <CardDescription>工作区名称与默认行为。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ws-name">工作区名称</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(e.target.value.trim() ? "" : "名称不能为空");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "ws-name-err" : undefined}
            />
            <FieldError id="ws-name-err">{error}</FieldError>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => (error ? toastError("保存失败", error) : toastSuccess("设置已保存"))}
            >
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);
  const [sevOnly, setSevOnly] = useState(true);
  const rows = [
    { label: "邮件通知", desc: "SEV-1/2 事件触发与分派时发送邮件。", value: email, set: setEmail },
    { label: "桌面推送", desc: "浏览器通知推送（仅 Web）。", value: push, set: setPush },
    { label: "仅高严重等级", desc: "开启后仅接收 SEV-1/2 相关通知。", value: sevOnly, set: setSevOnly },
  ];
  return (
    <div className="max-w-xl space-y-3">
      {rows.map((r) => (
        <Card key={r.label}>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-label font-medium">{r.label}</p>
              <p className="mt-0.5 text-caption text-muted-foreground">{r.desc}</p>
            </div>
            <Switch checked={r.value} onCheckedChange={r.set} aria-label={r.label} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AppearanceTab() {
  const { theme, toggleTheme } = usePrefs();
  return (
    <div className="max-w-xl space-y-3">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-label font-medium">主题</p>
            <p className="mt-0.5 text-caption text-muted-foreground">当前：{theme === "light" ? "浅色" : "深色"}。两套主题共享同一角色键。</p>
          </div>
          <div className="flex gap-1.5" role="radiogroup" aria-label="主题">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                onClick={() => {
                  if (theme !== t) toggleTheme();
                }}
                className={cn(
                  "h-8 rounded-md border border-input px-3 text-label outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring/60",
                  theme === t && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {t === "light" ? "浅色" : "深色"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MembersTab() {
  const { data, isLoading } = useQuery({ queryKey: ["members"], queryFn: getMembers });
  const remove = useMutation({
    mutationFn: async (_id: string) => {
      throw new MockError("演示环境不允许移除成员");
    },
    onError: (e) => toastError("移除失败", e instanceof MockError ? e.message : "请重试"),
  });
  if (isLoading) {
    return (
      <div aria-busy="true" className="max-w-xl space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="max-w-xl space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>成员</CardTitle>
          <CardDescription>当前工作区成员与角色。</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarStack names={(data ?? []).map((m) => m.name)} max={5} />
          <ul className="mt-3 flex flex-col gap-2">
            {(data ?? []).map((m) => (
              <li key={m.id} className="flex items-center gap-2.5 rounded-md border border-surface-border p-2.5">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-label font-medium">{m.name}</p>
                  <p className="text-caption text-muted-foreground">
                    {m.team} · {m.role}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(m.id)}>
                  移除
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiTokensTab() {
  const [label, setLabel] = useState("");
  const [tokens, setTokens] = useState<{ label: string; prefix: string }[]>([
    { label: "CI 流水线", prefix: "opsk_ci_" },
  ]);
  return (
    <div className="max-w-xl space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>API Tokens</CardTitle>
          <CardDescription>用于自动化访问本工作区（演示数据，不会生效）。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Label htmlFor="token-label">Token 名称</Label>
              <Input id="token-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例如：备份脚本" />
            </div>
            <Button
              size="sm"
              disabled={!label.trim()}
              onClick={() => {
                setTokens((t) => [...t, { label: label.trim(), prefix: `opsk_${Math.random().toString(36).slice(2, 6)}_` }]);
                setLabel("");
                toastSuccess("Token 已创建", "请立即复制保存（演示数据）");
              }}
            >
              创建
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {tokens.map((t, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-md border border-surface-border p-2.5">
                <span className="min-w-0 flex-1 truncate text-label font-medium">{t.label}</span>
                <code className="font-mono text-caption text-muted-foreground">{t.prefix}****</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTokens((prev) => prev.filter((_, j) => j !== i));
                    toastSuccess("Token 已吊销");
                  }}
                >
                  吊销
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
