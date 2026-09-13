/** 服务目录（route/service-catalog）+ 服务详情（route/service-detail）+ 服务表单（route/modal-service-form）。 */
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, PlayCircle, Power } from "lucide-react";
import { api, type Service } from "../../data/mock";
import { formatDate } from "../../lib";
import { useAppConfirm } from "../../stores";
import {
  Badge, Button, Combobox, Dialog, EmptyState, ErrorState, Field, IconButton, Input,
  NativeSelect, SegmentedControl, Skeleton, SkeletonTable, Textarea,
  healthLabel, healthVariant,
} from "../../components/ui";
import { toastError, toastSuccess } from "../../components/ui/toast";
import { Breadcrumb, PageCanvas, PageHeader, PageToolbar, Panel } from "../../components/shell/page";

export function ServiceCatalogPage() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const askConfirm = useAppConfirm();
  const view = params.get("view") ?? "list";
  const health = params.get("health") ?? "";
  const team = params.get("team") ?? "";
  const env = params.get("env") ?? "";
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "updatedAt";
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["services"], queryFn: api.listServices });
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: api.listTeams });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers });
  const [formOpen, setFormOpen] = useState(false);

  const patch = (kv: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(kv)) {
      if (v == null || v === "") next.delete(k); else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);
  const teamById = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t])), [teams]);
  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (health) rows = rows.filter((s) => s.health === health);
    if (team) rows = rows.filter((s) => s.teamId === team);
    if (env) rows = rows.filter((s) => s.env === env);
    if (q) rows = rows.filter((s) => (s.name + s.key).toLowerCase().includes(q.toLowerCase()));
    return [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "incidents") return b.recentIncidents - a.recentIncidents;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [data, health, team, env, q, sort]);

  const disableService = async (s: Service) => {
    const ok = await askConfirm({
      title: `停用服务「${s.name}」？`,
      body: "停用后不允许创建新的关联事件，但历史事件仍可查看。",
      confirmLabel: "停用",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.setServiceHealth(s.id, "disabled");
      await qc.invalidateQueries({ queryKey: ["services"] });
      toastSuccess(`已停用 ${s.name}`);
    } catch (err) {
      toastError(`停用失败：${(err as Error).message}`);
    }
  };

  const enableService = async (s: Service) => {
    try {
      await api.setServiceHealth(s.id, "healthy");
      await qc.invalidateQueries({ queryKey: ["services"] });
      toastSuccess(`已恢复 ${s.name}`);
    } catch (err) {
      toastError(`恢复失败：${(err as Error).message}`);
    }
  };

  return (
    <>
      <PageHeader
        title="服务目录"
        count={filtered.length}
        actions={<Button variant="brand" size="sm" onClick={() => setFormOpen(true)}><Pencil className="size-3.5" aria-hidden /> 新建服务</Button>}
      />
      <PageToolbar>
        <SegmentedControl
          ariaLabel="视图切换"
          value={view}
          onChange={(k) => patch({ view: k })}
          options={[{ key: "list", label: "列表" }, { key: "cards", label: "卡片" }]}
        />
        <Input value={q} onChange={(e) => patch({ q: e.target.value })} placeholder="搜索服务…" aria-label="搜索服务" className="w-44" />
        <NativeSelect aria-label="健康状态" value={health} onChange={(e) => patch({ health: e.target.value })} className="w-28">
          <option value="">全部健康</option>
          <option value="healthy">健康</option><option value="degraded">降级</option><option value="down">故障</option><option value="disabled">已停用</option>
        </NativeSelect>
        <NativeSelect aria-label="所属团队" value={team} onChange={(e) => patch({ team: e.target.value })} className="w-32">
          <option value="">全部团队</option>
          {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="环境" value={env} onChange={(e) => patch({ env: e.target.value })} className="w-24">
          <option value="">全部环境</option><option value="prod">prod</option><option value="staging">staging</option><option value="dev">dev</option>
        </NativeSelect>
        <NativeSelect aria-label="排序" value={sort} onChange={(e) => patch({ sort: e.target.value })} className="w-32">
          <option value="updatedAt">按更新时间</option><option value="name">按名称</option><option value="incidents">按事件数</option>
        </NativeSelect>
      </PageToolbar>
      <PageCanvas className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <SkeletonTable rows={6} />
        ) : isError ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <Panel><EmptyState title="没有匹配的服务" hint="调整筛选条件，或新建服务。" /></Panel>
        ) : view === "list" ? (
          <Panel className="overflow-auto">
            <table className="w-full border-collapse text-body">
              <caption className="sr-only">服务列表</caption>
              <thead className="bg-surface">
                <tr className="border-b border-surface-border text-left text-caption text-muted-foreground">
                  {["服务", "所属团队", "负责人", "健康状态", "最近事件", "最近变更", "更新时间"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-surface-border last:border-0 hover:bg-surface-hover">
                    <td className="px-3 py-2">
                      <Link to={`/services/${s.id}`} className="font-medium no-underline hover:underline">{s.name}</Link>
                      <span className="ml-2 text-caption text-faint-foreground tabular-nums">{s.key}</span>
                    </td>
                    <td className="px-3 py-2 text-caption text-muted-foreground">{teamById.get(s.teamId)?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-caption text-muted-foreground">{memberById.get(s.ownerId)?.name ?? "—"}</td>
                    <td className="px-3 py-2"><Badge variant={healthVariant[s.health]}>{healthLabel[s.health]}</Badge></td>
                    <td className="px-3 py-2 text-caption tabular-nums">{s.recentIncidents}</td>
                    <td className="px-3 py-2 text-caption text-muted-foreground tabular-nums">{formatDate(s.lastChangeAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-caption text-muted-foreground tabular-nums">{formatDate(s.updatedAt)}</span>
                        <IconButton label={`编辑 ${s.name}`} size="icon-xs" onClick={() => setFormOpen(true)}><Pencil className="size-3" /></IconButton>
                        {s.health === "disabled" ? (
                          <IconButton label={`恢复 ${s.name}`} size="icon-xs" onClick={() => void enableService(s)}><PlayCircle className="size-3" /></IconButton>
                        ) : (
                          <IconButton label={`停用 ${s.name}`} size="icon-xs" onClick={() => void disableService(s)}><Power className="size-3" /></IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 max-lg:grid-cols-1 max-md:grid-cols-1">
            {filtered.map((s) => (
              <Panel key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/services/${s.id}`} className="text-body font-medium no-underline hover:underline">{s.name}</Link>
                    <p className="text-micro text-faint-foreground tabular-nums">{s.key}</p>
                  </div>
                  <Badge variant={healthVariant[s.health]}>{healthLabel[s.health]}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-caption text-muted-foreground">{s.description}</p>
                <div className="mt-3 flex items-center justify-between text-caption text-muted-foreground">
                  <span>{teamById.get(s.teamId)?.name}</span>
                  <span className="tabular-nums">事件 {s.recentIncidents}</span>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </PageCanvas>
      <ServiceFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
}

function ServiceFormDialog({ open, onClose, service }: { open: boolean; onClose: () => void; service?: Service }) {
  const qc = useQueryClient();
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: api.listTeams, enabled: open });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers, enabled: open });
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: api.listServices, enabled: open });
  const [form, setForm] = useState({ key: "", name: "", description: "", teamId: "", ownerId: "", env: "prod", repoUrl: "", docUrl: "", dependsOn: [] as string[] });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  const save = () => {
    const next: Record<string, string | null> = {
      name: form.name.trim() ? null : "名称必填",
      key: /^[a-z0-9-]+$/.test(form.key) ? null : "标识仅允许小写字母、数字与连字符",
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setSaving(true);
    api.upsertService({ ...form, env: form.env as Service["env"], id: service?.id })
      .then(() => {
        toastSuccess(service ? "服务已更新" : "服务已创建");
        void qc.invalidateQueries({ queryKey: ["services"] });
        onClose();
      })
      .catch((err: Error) => toastError(err.message, save))
      .finally(() => setSaving(false));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={service ? "编辑服务" : "新建服务"}
      widthClass="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="名称" required error={errors.name}>
          {(p) => <Input {...p} data-autofocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        </Field>
        <Field label="标识" required error={errors.key}>
          {(p) => <Input {...p} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="如 api-gateway（唯一）" />}
        </Field>
        <Field label="描述">
          {(p) => <Textarea {...p} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="所属团队">
            {(p) => (
              <NativeSelect {...p} value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
                <option value="">选择团队</option>
                {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </NativeSelect>
            )}
          </Field>
          <Field label="负责人">
            {(p) => (
              <NativeSelect {...p} value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
                <option value="">选择成员</option>
                {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </NativeSelect>
            )}
          </Field>
        </div>
        <Field label="依赖服务（可多选）">
          {() => (
            <Combobox
              options={(services ?? []).filter((s) => s.id !== service?.id).map((s) => ({ key: s.id, label: s.name }))}
              selected={form.dependsOn}
              onChange={(keys) => setForm({ ...form, dependsOn: keys })}
              placeholder="搜索并选择依赖服务"
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

export function ServiceDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const askConfirm = useAppConfirm();
  const { data: service, isPending, isError, error } = useQuery({
    queryKey: ["service", id],
    queryFn: () => api.getService(id ?? ""),
    enabled: !!id,
  });
  const { data: incidents } = useQuery({ queryKey: ["incidents"], queryFn: api.listIncidents });
  const { data: changes } = useQuery({ queryKey: ["changes"], queryFn: api.listChanges });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers });
  const [formOpen, setFormOpen] = useState(false);
  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);

  if (isPending) return <PageCanvas className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-40" /></PageCanvas>;
  if (isError) return <PageCanvas><ErrorState message={error.message} onRetry={() => void qc.invalidateQueries({ queryKey: ["service", id] })} /></PageCanvas>;
  if (!service) {
    return (
      <PageCanvas>
        <Panel>
          <EmptyState title="服务不存在" hint={`未找到 ${id}。`} action={<Link to="/services" className="no-underline"><Button variant="outline" size="sm">返回服务目录</Button></Link>} />
        </Panel>
      </PageCanvas>
    );
  }

  const serviceIncidents = (incidents ?? []).filter((i) => i.serviceId === service.id);
  const serviceChanges = (changes ?? []).filter((c) => c.serviceId === service.id);
  const deps = (service.dependsOn ?? []).map((d) => d).filter(Boolean);

  const toggleDisable = async () => {
    if (service.health === "disabled") {
      await api.setServiceHealth(service.id, "healthy");
      toastSuccess("服务已恢复");
      await qc.invalidateQueries({ queryKey: ["services"] });
      await qc.invalidateQueries({ queryKey: ["service", id] });
      return;
    }
    const ok = await askConfirm({ title: `停用服务「${service.name}」？`, body: "停用后不允许创建新的关联事件，历史事件仍可查看。", confirmLabel: "停用", danger: true });
    if (!ok) return;
    await api.setServiceHealth(service.id, "disabled");
    toastSuccess("服务已停用");
    await qc.invalidateQueries({ queryKey: ["services"] });
    await qc.invalidateQueries({ queryKey: ["service", id] });
  };

  return (
    <>
      <PageHeader
        title={service.name}
        actions={
          <>
            <Badge variant={healthVariant[service.health]}>{healthLabel[service.health]}</Badge>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}><Pencil className="size-3.5" aria-hidden /> 编辑</Button>
            <Button variant="outline" size="sm" onClick={() => void toggleDisable()}>
              <Power className="size-3.5" aria-hidden /> {service.health === "disabled" ? "恢复" : "停用"}
            </Button>
          </>
        }
      />
      <PageCanvas className="mx-auto w-full max-w-[var(--size-detail-rail)]">
        <Breadcrumb items={[{ label: "服务目录", to: "/services" }, { label: service.key }]} />
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <Panel className="p-4">
              <h2 className="text-title-sm font-semibold">基本信息</h2>
              <dl className="mt-2 grid grid-cols-[88px_1fr] gap-y-1.5 text-caption">
                <dt className="text-faint-foreground">标识</dt><dd className="tabular-nums">{service.key}</dd>
                <dt className="text-faint-foreground">负责人</dt><dd>{memberById.get(service.ownerId)?.name ?? "—"}</dd>
                <dt className="text-faint-foreground">环境</dt><dd>{service.env}</dd>
                <dt className="text-faint-foreground">仓库</dt><dd className="truncate">{service.repoUrl}</dd>
                <dt className="text-faint-foreground">文档</dt><dd className="truncate">{service.docUrl}</dd>
                <dt className="text-faint-foreground">依赖服务</dt>
                <dd>
                  {deps.length === 0 ? <span className="text-faint-foreground">无依赖</span> : (
                    <ul className="flex flex-wrap gap-1">
                      {deps.map((d) => (
                        <li key={d}><Link to={`/services/${d}`} className="no-underline hover:underline"><Badge variant="info">{d}</Badge></Link></li>
                      ))}
                    </ul>
                  )}
                </dd>
              </dl>
            </Panel>
            <Panel className="p-4">
              <h2 className="text-title-sm font-semibold">最近事件</h2>
              {serviceIncidents.length === 0 ? (
                <EmptyState title="无事件" hint="该服务近期没有关联事件。" />
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {serviceIncidents.map((i) => (
                    <li key={i.id} className="flex items-center justify-between text-caption">
                      <Link to={`/incidents/${i.id}`} className="no-underline hover:underline">{i.key} {i.title}</Link>
                      <span className="text-faint-foreground tabular-nums">{formatDate(i.startedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
          <aside className="space-y-4" aria-label="运行数据">
            <Panel className="p-3">
              <h2 className="text-label font-medium">健康检查记录</h2>
              {service.checks.length === 0 ? (
                <p className="mt-2 text-caption text-muted-foreground">健康检查失败或暂无记录。</p>
              ) : (
                <ul className="mt-2 space-y-1 text-caption">
                  {service.checks.slice(0, 5).map((c, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <Badge variant={c.ok ? "success" : "critical"}>{c.ok ? "通过" : "失败"}</Badge>
                      <span className="text-muted-foreground tabular-nums">{c.latencyMs}ms · {formatDate(c.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel className="p-3">
              <h2 className="text-label font-medium">最近变更</h2>
              {serviceChanges.length === 0 ? (
                <p className="mt-2 text-caption text-muted-foreground">无变更记录。</p>
              ) : (
                <ul className="mt-2 space-y-1 text-caption">
                  {serviceChanges.map((c) => (
                    <li key={c.id} className="flex items-center justify-between">
                      <span className="truncate">{c.id} {c.title}</span>
                      <Badge variant={c.status === "failed" ? "critical" : c.status === "done" ? "success" : "info"}>{c.status === "failed" ? "失败" : c.status === "done" ? "完成" : "进行中"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </aside>
        </div>
      </PageCanvas>
      <ServiceFormDialog open={formOpen} onClose={() => setFormOpen(false)} service={service} />
    </>
  );
}
