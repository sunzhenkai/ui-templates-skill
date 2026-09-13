/** 全局浮层宿主：命令面板（⌘K）、创建事件（C）、快捷键帮助、聊天窗口、确认框。 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChatWindow } from "./AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, FileText, GitBranch, Search, User } from "lucide-react";
import { api, type Severity } from "../../data/mock";
import { useOverlayStore } from "../../stores";
import { cn } from "../../lib";
import {
  Button, Combobox, ConfirmHost, Dialog, Field, IconButton, Input, NativeSelect, Textarea,
} from "../ui";
import { toastError, toastSuccess } from "../ui/toast";

const SHORTCUTS = [
  ["⌘K / Ctrl+K", "打开全局搜索"],
  ["C", "创建事件（输入框内不触发）"],
  ["?", "打开快捷键帮助"],
  ["Esc", "关闭当前浮层"],
];

export function CommandPalette() {
  const open = useOverlayStore((s) => s.searchOpen);
  const close = useOverlayStore((s) => s.closeSearch);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["search", q],
    queryFn: () => api.searchAll(q),
    enabled: open && q.trim().length > 0,
  });

  const results = useMemo(() => {
    if (!data) return [] as { key: string; group: string; label: string; sub: string; to: string; icon: typeof Search }[];
    const rows = [
      ...data.incidents.map((i) => ({ key: `inc-${i.id}`, group: "事件", label: `${i.key} ${i.title}`, sub: i.severity, to: `/incidents/${i.id}`, icon: CircleAlert })),
      ...data.services.map((s) => ({ key: `svc-${s.id}`, group: "服务", label: s.name, sub: s.key, to: `/services/${s.id}`, icon: GitBranch })),
      ...data.members.map((m) => ({ key: `mem-${m.id}`, group: "成员", label: m.name, sub: m.email, to: `/settings?tab=members`, icon: User })),
      ...data.changes.map((c) => ({ key: `chg-${c.id}`, group: "变更", label: `${c.id} ${c.title}`, sub: c.status, to: `/incidents?tag=${c.id}`, icon: FileText })),
    ];
    return type === "all" ? rows : rows.filter((r) => r.group === type);
  }, [data, type]);

  useEffect(() => setCursor(0), [q, type]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(); // AX-104：Esc 关闭并还原触发器焦点
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="absolute inset-0 bg-foreground/30" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        className="animate-overlay-in absolute left-1/2 top-16 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-surface-border bg-popover text-popover-foreground shadow-floating max-sm:inset-4 max-sm:w-auto max-sm:translate-x-0"
      >
        <div className="flex items-center gap-2 border-b border-surface-border px-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            data-autofocus
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
              if (e.key === "Enter" && results[cursor]) { close(); navigate(results[cursor].to); }
            }}
            placeholder="搜索事件、服务、成员、变更…"
            aria-label="搜索关键字"
            className="h-12 flex-1 bg-transparent text-body outline-none"
          />
          <kbd className="rounded-sm bg-muted px-1 text-micro text-muted-foreground">Esc</kbd>
        </div>
        <div className="flex gap-1 px-3 py-2" role="group" aria-label="类型筛选">
          {["all", "事件", "服务", "成员", "变更"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-micro",
                type === t ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-surface-hover",
              )}
            >
              {t === "all" ? "全部" : t}
            </button>
          ))}
        </div>
        <div className="max-h-80 overflow-y-auto border-t border-surface-border" role="listbox" aria-label="搜索结果">
          {isFetching && <p className="px-4 py-3 text-caption text-muted-foreground" role="status">搜索中…</p>}
          {isError && (
            <div className="px-4 py-3 text-caption text-destructive" role="alert">
              搜索失败。<button onClick={() => refetch()} className="underline">重试</button>
            </div>
          )}
          {!isFetching && !isError && q && results.length === 0 && (
            <p className="px-4 py-3 text-caption text-muted-foreground">无匹配结果</p>
          )}
          {results.map((r, i) => (
            <button
              key={r.key}
              role="option"
              aria-selected={i === cursor}
              onClick={() => { close(); navigate(r.to); }}
              className={cn("flex w-full items-center gap-2 px-4 py-2 text-left text-body", i === cursor ? "bg-surface-selected" : "hover:bg-surface-hover")}
            >
              <r.icon className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1 truncate">{r.label}</span>
              <span className="text-caption text-faint-foreground">{r.group} · {r.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CreateIncidentDialog() {
  const open = useOverlayStore((s) => s.createOpen);
  const close = useOverlayStore((s) => s.closeCreate);
  const qc = useQueryClient();
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: api.listServices, enabled: open });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers, enabled: open });
  const { data: changes } = useQuery({ queryKey: ["changes"], queryFn: api.listChanges, enabled: open });
  const [form, setForm] = useState({ title: "", serviceId: "", severity: "sev3" as Severity, assigneeId: "", tags: "", description: "", changeIds: [] as string[] });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const next: Record<string, string | null> = {
      title: form.title.trim() ? null : "标题必填",
      serviceId: form.serviceId ? null : "影响服务必填",
      severity: form.severity ? null : "严重等级必填",
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setSubmitting(true);
    api.createIncident({
      title: form.title.trim(),
      serviceId: form.serviceId,
      severity: form.severity,
      assigneeId: form.assigneeId || null,
      tags: form.tags.split(/[,，\s]+/).filter(Boolean),
      description: form.description,
    })
      .then((inc) => {
        toastSuccess(`事件 ${inc.key} 已创建`);
        void qc.invalidateQueries({ queryKey: ["incidents"] });
        void qc.invalidateQueries({ queryKey: ["inbox"] });
        close();
      })
      .catch((err: Error) => toastError(`提交失败：${err.message}（输入已保留）`, submit))
      .finally(() => setSubmitting(false));
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="创建事件"
      widthClass="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>取消</Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "提交中…" : "提交"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="标题" required error={errors.title}>
          {(p) => <Input {...p} data-autofocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="一句话描述问题" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="影响服务" required error={errors.serviceId}>
            {(p) => (
              <NativeSelect {...p} value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                <option value="">选择服务</option>
                {(services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </NativeSelect>
            )}
          </Field>
          <Field label="严重等级" required error={errors.severity}>
            {(p) => (
              <NativeSelect {...p} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}>
                <option value="sev1">P1 严重</option>
                <option value="sev2">P2 高</option>
                <option value="sev3">P3 中</option>
                <option value="sev4">P4 低</option>
              </NativeSelect>
            )}
          </Field>
        </div>
        <Field label="负责人">
          {(p) => (
            <NativeSelect {...p} value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">暂不指派</option>
              {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </NativeSelect>
          )}
        </Field>
        <Field label="参与团队与关联变更">
          {() => (
            <Combobox
              options={(changes ?? []).map((c) => ({ key: c.id, label: `${c.id} ${c.title}` }))}
              selected={form.changeIds}
              onChange={(ids) => setForm({ ...form, changeIds: ids })}
              placeholder="选择关联变更（可多选）"
            />
          )}
        </Field>
        <Field label="标签">
          {(p) => <Input {...p} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="以空格分隔，如 prod traffic" />}
        </Field>
        <Field label="描述">
          {(p) => <Textarea {...p} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        </Field>
        <Field label="附件">
          {() => (
            <FileUpload />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function FileUpload() {
  const [uploads, setUploads] = useState<{ name: string; progress: number; failed: boolean }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const add = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const item = { name: f.name, progress: 0, failed: false };
      setUploads((u) => [...u, item]);
      const timer = setInterval(() => {
        setUploads((u) =>
          u.map((x) => {
            if (x.name !== item.name || x.failed) return x;
            const progress = x.progress + 20;
            if (progress >= 100) clearInterval(timer);
            return { ...x, progress: Math.min(progress, 100) };
          }),
        );
      }, 120);
    }
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-md border border-dashed border-input bg-surface px-3 py-3 text-caption text-muted-foreground hover:bg-surface-hover"
      >
        点击选择或拖拽文件到此处
      </button>
      <input ref={inputRef} type="file" multiple className="hidden" aria-label="选择文件" onChange={(e) => add(e.target.files)} />
      <ul className="mt-1 space-y-1">
        {uploads.map((u) => (
          <li key={u.name} className="flex items-center gap-2 text-caption">
            <span className="flex-1 truncate">{u.name}</span>
            {u.failed ? (
              <>
                <span className="text-destructive">上传失败</span>
                <button className="text-brand underline" onClick={() => setUploads((x) => x.map((y) => (y.name === u.name ? { ...y, failed: false, progress: 0 } : y)))}>重试</button>
              </>
            ) : (
              <span role="progressbar" aria-valuenow={u.progress} aria-valuemin={0} aria-valuemax={100} className="tabular-nums text-muted-foreground">{u.progress}%</span>
            )}
            <IconButton label={`移除附件 ${u.name}`} size="icon-xs" onClick={() => setUploads((x) => x.filter((y) => y.name !== u.name))}>×</IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShortcutsDialog() {
  const open = useOverlayStore((s) => s.shortcutsOpen);
  const setOpen = useOverlayStore((s) => s.setShortcutsOpen);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="键盘快捷键" widthClass="max-w-sm">
      <table className="w-full text-body">
        <caption className="sr-only">可用快捷键列表</caption>
        <tbody>
          {SHORTCUTS.map(([k, d]) => (
            <tr key={k} className="border-b border-surface-border last:border-0">
              <td className="py-2 pr-4"><kbd className="rounded-sm bg-muted px-1.5 py-0.5 text-caption">{k}</kbd></td>
              <td className="py-2 text-muted-foreground">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}

export function OverlayHost() {
  const confirm = useOverlayStore((s) => s.confirm);
  return (
    <>
      <CommandPalette />
      <CreateIncidentDialog />
      <ShortcutsDialog />
            <ChatWindow />
      {confirm && <ConfirmDialogFromStore />}
    </>
  );
}

function ConfirmDialogFromStore() {
  const confirm = useOverlayStore((s) => s.confirm);
  const close = useOverlayStore((s) => s.closeConfirm);
  return <ConfirmHost confirm={confirm} onClose={close} />;
}

