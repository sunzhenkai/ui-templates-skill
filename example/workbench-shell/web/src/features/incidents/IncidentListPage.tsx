/**
 * 事件列表（route/incident-list · 代表切片）。
 * 筛选 chips、URL 恢复、排序、列配置持久化、行选择、批量操作、分页、导出、四态。
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Columns3, Download, Plus, RefreshCw, Search } from "lucide-react";
import { api, type Incident, type IncidentStatus } from "../../data/mock";
import { formatDate } from "../../lib";
import { useUiStore, useAppConfirm, useOverlayStore } from "../../stores";
import {
  Badge, Button, Checkbox, EmptyState, ErrorState, Input, Menu,
  Pagination, SkeletonTable, statusLabel, statusVariant, severityLabel, severityVariant, NativeSelect,
} from "../../components/ui";
import { toastError, toastSuccess } from "../../components/ui/toast";
import { PageCanvas, PageHeader, PageToolbar, Panel } from "../../components/shell/page";

type SortKey = "startedAt" | "severity" | "updatedAt";

const ALL_COLUMNS = [
  { key: "key", label: "编号", locked: true },
  { key: "title", label: "标题", locked: true },
  { key: "status", label: "状态" },
  { key: "severity", label: "严重等级" },
  { key: "serviceId", label: "影响服务" },
  { key: "assigneeId", label: "负责人" },
  { key: "startedAt", label: "开始时间" },
  { key: "resolvedAt", label: "解决时间" },
  { key: "updatedAt", label: "更新时间" },
];

const statusFilters: { value: IncidentStatus; label: string }[] = [
  { value: "triage", label: "待确认" },
  { value: "processing", label: "处理中" },
  { value: "waiting", label: "等待外部" },
  { value: "resolved", label: "已解决" },
  { value: "archived", label: "已归档" },
];

export function IncidentListPage() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const askConfirm = useAppConfirm();
  const columnConfig = useUiStore((s) => s.columnConfig);
  const setColumns = useUiStore((s) => s.setColumns);
  const [selected, setSelected] = useState<string[]>([]);
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({ queryKey: ["incidents"], queryFn: api.listIncidents });

  // URL 参数 = 筛选唯一事实（prompts：URL 恢复）
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const severity = params.get("severity") ?? "";
  const service = params.get("service") ?? "";
  const sort = (params.get("sort") as SortKey) ?? "updatedAt";
  const dir = (params.get("dir") ?? "desc") as "asc" | "desc";
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("pageSize") ?? 10);

  const patch = (kv: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(kv)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in kv)) next.delete("page");
    setParams(next, { replace: true });
  };

  const { data: services } = useQuery({ queryKey: ["services"], queryFn: api.listServices });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (q) rows = rows.filter((i) => (i.title + i.key + i.tags.join()).toLowerCase().includes(q.toLowerCase()));
    if (status) rows = rows.filter((i) => i.status === status);
    if (severity) rows = rows.filter((i) => i.severity === severity);
    if (service) rows = rows.filter((i) => i.serviceId === service);
    const order = { sev1: 0, sev2: 1, sev3: 2, sev4: 3 };
    rows = [...rows].sort((a, b) => {
      const av = sort === "severity" ? order[a.severity] : new Date(a[sort]).getTime();
      const bv = sort === "severity" ? order[b.severity] : new Date(b[sort]).getTime();
      return dir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [data, q, status, severity, service, sort, dir]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const serviceById = useMemo(() => new Map((services ?? []).map((s) => [s.id, s])), [services]);
  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);
  const visibleCols = columnConfig["incidents"] ?? ALL_COLUMNS.map((c) => c.key);
  const chips = [
    q && { key: "q", label: `关键字: ${q}` },
    status && { key: "status", label: `状态: ${statusLabel[status] ?? status}` },
    severity && { key: "severity", label: `等级: ${severityLabel[severity] ?? severity}` },
    service && { key: "service", label: `服务: ${serviceById.get(service)?.name ?? service}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const toggleSort = (key: SortKey) => patch({ sort: key, dir: sort === key && dir === "desc" ? "asc" : "desc" });

  const bulkStatus = async (next: IncidentStatus) => {
    try {
      await Promise.all(selected.map((id) => api.updateIncident(id, { status: next })));
      await qc.invalidateQueries({ queryKey: ["incidents"] });
      toastSuccess(`已批量更新 ${selected.length} 条事件状态`);
      setSelected([]);
    } catch (err) {
      toastError(`批量更新失败：${(err as Error).message}`, () => void bulkStatus(next));
    }
  };

  const bulkArchive = async () => {
    const ok = await askConfirm({
      title: `归档 ${selected.length} 条事件？`,
      body: "归档后事件只读，可在已归档筛选中查看。",
      confirmLabel: "归档",
      danger: true,
    });
    if (ok) await bulkStatus("archived");
  };

  const removeSelected = async () => {
    const ok = await askConfirm({
      title: `删除 ${selected.length} 条事件？`,
      body: "删除不可恢复（mock 数据将在会话中移除）。",
      confirmLabel: "删除",
      danger: true,
    });
    if (!ok) return;
    try {
      await Promise.all(selected.map((id) => api.updateIncident(id, { status: "archived", tags: ["deleted"] })));
      toastSuccess("已删除（标记归档）");
      setSelected([]);
      await qc.invalidateQueries({ queryKey: ["incidents"] });
    } catch (err) {
      toastError(`删除失败：${(err as Error).message}`);
    }
  };

  const exportCsv = () => {
    const header = ["编号", "标题", "状态", "严重等级", "影响服务", "负责人", "开始时间"].join(",");
    const lines = filtered.map((i) => [i.key, i.title, statusLabel[i.status], severityLabel[i.severity], serviceById.get(i.serviceId)?.name ?? "", memberById.get(i.assigneeId ?? "")?.name ?? "未指派", formatDate(i.startedAt)].join(","));
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incidents.csv";
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess("已导出当前结果");
  };

  return (
    <>
      <PageHeader
        title="事件"
        count={filtered.length}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-3.5" aria-hidden /> 导出当前结果</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={("size-3.5") + (isFetching ? " animate-spin" : "")} aria-hidden /> 刷新
            </Button>
            <CreateButton />
          </>
        }
      />
      <PageToolbar>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-faint-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="搜索编号、标题、标签…"
            aria-label="搜索事件"
            className="w-56 pl-7"
          />
        </div>
        <NativeSelect aria-label="按状态筛选" value={status} onChange={(e) => patch({ status: e.target.value })} className="w-32">
          <option value="">全部状态</option>
          {statusFilters.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="按严重等级筛选" value={severity} onChange={(e) => patch({ severity: e.target.value })} className="w-28">
          <option value="">全部等级</option>
          <option value="sev1">P1</option><option value="sev2">P2</option><option value="sev3">P3</option><option value="sev4">P4</option>
        </NativeSelect>
        <NativeSelect aria-label="按服务筛选" value={service} onChange={(e) => patch({ service: e.target.value })} className="w-36">
          <option value="">全部服务</option>
          {(services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </NativeSelect>
        <Menu
          trigger={(tp) => (
            <Button {...tp} variant="outline" size="sm"><Columns3 className="size-3.5" aria-hidden /> 列配置</Button>
          )}
          items={ALL_COLUMNS.filter((c) => !c.locked).map((c) => ({
            key: c.key,
            label: (visibleCols.includes(c.key) ? "✓ " : "　 ") + c.label,
            onSelect: () => setColumns("incidents", visibleCols.includes(c.key) ? visibleCols.filter((k) => k !== c.key) : [...visibleCols, c.key]),
          }))}
        />
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1" aria-label="生效筛选">
            {chips.map((c) => (
              <button key={c.key} onClick={() => patch({ [c.key]: null })} className="rounded-full bg-brand-subtle px-2 py-0.5 text-micro text-brand hover:bg-brand-subtle-hover" aria-label={`移除筛选 ${c.label}`}>
                {c.label} ×
              </button>
            ))}
          </div>
        )}
      </PageToolbar>
      <PageCanvas className="flex min-h-0 flex-1 flex-col">
        {selected.length > 0 && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-surface-border bg-surface px-3 py-1.5" role="toolbar" aria-label="批量操作">
            <span className="text-caption text-muted-foreground tabular-nums">已选 {selected.length} 条</span>
            <Button size="xs" variant="outline" onClick={() => bulkStatus("processing")}>开始处理</Button>
            <Button size="xs" variant="outline" onClick={() => bulkStatus("waiting")}>标记等待外部</Button>
            <Button size="xs" variant="outline" onClick={bulkArchive}>归档</Button>
            <Button size="xs" variant="destructive-surface" onClick={removeSelected}>删除</Button>
            <Button size="xs" variant="ghost" onClick={() => setSelected([])}>取消选择</Button>
          </div>
        )}
        <Panel className="min-h-0 flex-1 overflow-auto">
          {isPending ? (
            <SkeletonTable rows={8} />
          ) : isError ? (
            <ErrorState message={error.message} onRetry={() => refetch()} />
          ) : paged.length === 0 ? (
            <EmptyState
              title="没有匹配的事件"
              hint="调整筛选条件或创建新事件。"
              action={<CreateButton />}
            />
          ) : (
            <table className="w-full border-collapse text-body">
              <caption className="sr-only">事件列表</caption>
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-surface-border text-left text-caption text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-medium">
                    <Checkbox
                      label="全选当前结果"
                      checked={selected.length === paged.length && paged.length > 0}
                      indeterminate={selected.length > 0 && selected.length < paged.length}
                      onCheckedChange={(v) => setSelected(v ? paged.map((i) => i.id) : [])}
                    />
                  </th>
                  {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((c) => (
                    <th key={c.key} scope="col" className="px-3 py-2 font-medium" aria-sort={sort === c.key ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                      {["startedAt", "severity", "updatedAt"].includes(c.key) ? (
                        <button onClick={() => toggleSort(c.key as SortKey)} className="inline-flex items-center gap-1 hover:text-foreground">
                          {c.label} <ArrowDownUp className="size-3" aria-hidden />
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <IncidentRow
                    key={row.id} row={row} visibleCols={visibleCols}
                    checked={selected.includes(row.id)}
                    onCheck={(v) => setSelected(v ? [...selected, row.id] : selected.filter((id) => id !== row.id))}
                    serviceById={serviceById} memberById={memberById}
                  />
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        {!isPending && !isError && filtered.length > 0 && (
          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={(p) => patch({ page: String(p) })} onPageSize={(n) => patch({ pageSize: String(n), page: "1" })} />
        )}
      </PageCanvas>
    </>
  );
}

function IncidentRow({
  row, visibleCols, checked, onCheck, serviceById, memberById,
}: {
  row: Incident;
  visibleCols: string[];
  checked: boolean;
  onCheck: (v: boolean) => void;
  serviceById: Map<string, { id: string; name: string }>;
  memberById: Map<string, { id: string; name: string }>;
}) {
  const cells: Record<string, React.ReactNode> = {
    key: <Link to={`/incidents/${row.id}`} className="font-medium no-underline text-brand tabular-nums hover:underline">{row.key}</Link>,
    title: <Link to={`/incidents/${row.id}`} className="no-underline hover:underline">{row.title}</Link>,
    status: <Badge variant={statusVariant[row.status]}>{statusLabel[row.status]}</Badge>,
    severity: <Badge variant={severityVariant[row.severity]}>{severityLabel[row.severity]}</Badge>,
    serviceId: serviceById.get(row.serviceId) ? (
      <Link to={`/services/${row.serviceId}`} className="text-caption no-underline text-muted-foreground hover:underline">{serviceById.get(row.serviceId)!.name}</Link>
    ) : <span className="text-caption text-faint-foreground">—</span>,
    assigneeId: <span className="text-caption text-muted-foreground">{memberById.get(row.assigneeId ?? "")?.name ?? "未指派"}</span>,
    startedAt: <span className="text-caption text-muted-foreground tabular-nums">{formatDate(row.startedAt)}</span>,
    resolvedAt: <span className="text-caption text-muted-foreground tabular-nums">{row.resolvedAt ? formatDate(row.resolvedAt) : "—"}</span>,
    updatedAt: <span className="text-caption text-muted-foreground tabular-nums">{formatDate(row.updatedAt)}</span>,
  };
  return (
    <tr className={("border-b border-surface-border transition-colors") + (checked ? " bg-surface-selected" : " hover:bg-surface-hover")}>
      <td className="px-3 py-2"><Checkbox label={`选择 ${row.key}`} checked={checked} onCheckedChange={onCheck} /></td>
      {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((c) => (
        <td key={c.key} className="px-3 py-2">{cells[c.key]}</td>
      ))}
    </tr>
  );
}

function CreateButton() {
  const openCreate = useOverlayStore((s) => s.openCreate);
  return (
    <Button variant="brand" size="sm" onClick={() => openCreate()}>
      <Plus className="size-3.5" aria-hidden /> 新建事件
    </Button>
  );
}

