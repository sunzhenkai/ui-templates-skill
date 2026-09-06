import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Columns3, Filter, Plus, RotateCcw, Siren, Table2 } from "lucide-react";
import { PageHeader, Toolbar } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Pagination } from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { BoardView } from "@/features/board";
import { getIncidents, getMembers, getServices } from "@/mock/api";
import { formatRelative, incidentStatusLabel, severityLabel } from "@/lib/format";
import { useShell } from "@/components/shell/shell-context";
import { cn } from "@/lib/utils";

const ALL_COLUMNS = [
  { id: "number", label: "编号", core: true },
  { id: "title", label: "标题", core: true },
  { id: "severity", label: "等级", core: true },
  { id: "status", label: "状态", core: true },
  { id: "service", label: "服务", core: false },
  { id: "assignee", label: "负责人", core: false },
  { id: "updatedAt", label: "更新时间", core: false },
] as const;

type ColumnId = (typeof ALL_COLUMNS)[number]["id"];
type SortKey = "updatedAt" | "severity" | "number";

const PAGE_SIZE = 5;

/** 事件列表（ROUTE-005-A）：表格/看板双视图；筛选/排序/分页/列配置全部 URL 恢复。 */
export function IncidentsPage() {
  const [params, setParams] = useSearchParams();
  const { openCreate } = useShell();
  const view = params.get("view") === "board" ? "board" : "list";

  const q = params.get("q") ?? "";
  const severity = params.get("severity") ?? "all";
  const service = params.get("service") ?? "all";
  const owner = params.get("owner") ?? "all";
  const sort = (params.get("sort") as SortKey) ?? "updatedAt";
  const page = Number(params.get("page") ?? "1");
  const [enabledCols, setEnabledCols] = useState<Set<ColumnId>>(new Set(ALL_COLUMNS.map((c) => c.id)));

  const incidents = useQuery({ queryKey: ["incidents"], queryFn: getIncidents });
  const services = useQuery({ queryKey: ["services"], queryFn: getServices });
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });

  const filtered = useMemo(() => {
    const severityRank: Record<string, number> = { sev1: 0, sev2: 1, sev3: 2, sev4: 3 };
    let items = incidents.data ?? [];
    if (q) items = items.filter((i) => `${i.number} ${i.title}`.toLowerCase().includes(q.toLowerCase()));
    if (severity !== "all") items = items.filter((i) => i.severity === severity);
    if (service !== "all") items = items.filter((i) => i.service === service);
    if (owner !== "all") items = items.filter((i) => i.assignee === owner);
    const sorted = [...items].sort((a, b) => {
      if (sort === "severity") return severityRank[a.severity] - severityRank[b.severity];
      if (sort === "number") return a.number.localeCompare(b.number);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return sorted;
  }, [incidents.data, q, severity, service, owner, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const memberName = (id: string | null) => members.data?.find((m) => m.id === id)?.name ?? "未指派";
  const hasFilter = q || severity !== "all" || service !== "all" || owner !== "all";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="事件"
        icon={<Siren />}
        actions={
          <Button variant="default" size="sm" onClick={openCreate}>
            <Plus aria-hidden /> 创建事件
          </Button>
        }
      />
      <Toolbar>
        <Select items={viewItems} value={view} onValueChange={(v) => setParam("view", (v as string) === "list" ? "all" : (v as string))}>
          <SelectTrigger className="h-7 w-24" aria-label="视图切换">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="list">
              <span className="flex items-center gap-1.5">
                <Table2 className="size-3.5" aria-hidden /> 表格
              </span>
            </SelectItem>
            <SelectItem value="board">
              <span className="flex items-center gap-1.5">
                <Columns3 className="size-3.5" aria-hidden /> 看板
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setParam("q", e.target.value)} placeholder="搜索事件…" aria-label="搜索事件" className="h-7 w-44" />
        <Select items={severityItems} value={severity} onValueChange={(v) => setParam("severity", v as string)}>
          <SelectTrigger className="h-7 w-28" aria-label="等级筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部等级</SelectItem>
            <SelectItem value="sev1">SEV-1</SelectItem>
            <SelectItem value="sev2">SEV-2</SelectItem>
            <SelectItem value="sev3">SEV-3</SelectItem>
            <SelectItem value="sev4">SEV-4</SelectItem>
          </SelectContent>
        </Select>
        <Select items={serviceItems(services.data ?? [])} value={service} onValueChange={(v) => setParam("service", v as string)}>
          <SelectTrigger className="h-7 w-32" aria-label="服务筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部服务</SelectItem>
            {(services.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={ownerItems(members.data ?? [])} value={owner} onValueChange={(v) => setParam("owner", v as string)}>
          <SelectTrigger className="h-7 w-28" aria-label="负责人筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部负责人</SelectItem>
            {(members.data ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            <RotateCcw aria-hidden /> 重置
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(props: React.ComponentProps<"button">) => (
                <Button variant="outline" size="sm" {...props}>
                  <Filter aria-hidden /> 列配置
                </Button>
              )}
            />
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>显示列</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_COLUMNS.filter((c) => c.core).map((c) => (
                <DropdownMenuCheckboxItem key={c.id} checked disabled>
                  {c.label}（核心列）
                </DropdownMenuCheckboxItem>
              ))}
              {ALL_COLUMNS.filter((c) => !c.core).map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={enabledCols.has(c.id)}
                  onCheckedChange={() => {
                    setEnabledCols((prev) => {
                      const next = new Set(prev);
                      if (next.has(c.id)) next.delete(c.id);
                      else next.add(c.id);
                      return next;
                    });
                  }}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Badge variant="secondary">{filtered.length} 个事件</Badge>
        </div>
      </Toolbar>

      <div className="min-h-0 flex-1 overflow-hidden" role="region" aria-label="事件集合">
        {incidents.isLoading ? (
          <div aria-busy="true" className="flex h-full flex-col gap-px p-[var(--layout-page-gutter)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : incidents.isError ? (
          <div className="p-6">
            <Alert variant="destructive" title="事件加载失败" action={
              <Button variant="outline" size="sm" onClick={() => incidents.refetch()}>重试</Button>
            }>
              模拟请求失败，可点击重试。
            </Alert>
          </div>
        ) : view === "board" ? (
          <BoardView />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Siren />}
            title={(incidents.data ?? []).length === 0 ? "还没有事件" : "没有匹配的事件"}
            description={(incidents.data ?? []).length === 0 ? "创建第一个事件，或等待告警触发。" : "调整筛选条件后再试。"}
            action={
              (incidents.data ?? []).length === 0 ? (
                <Button variant="default" size="sm" onClick={openCreate}>
                  <Plus aria-hidden /> 创建事件
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                  清除筛选
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto px-[var(--layout-page-gutter)] pb-2">
              <table className="w-full border-collapse text-body" aria-label="事件列表">
                <thead>
                  <tr className="border-b">
                    {ALL_COLUMNS.filter((c) => c.core || enabledCols.has(c.id)).map((col) => (
                      <th
                        key={col.id}
                        scope="col"
                        aria-sort={col.id === sort ? "descending" : "none"}
                        className={cn(
                          "h-9 bg-page-canvas px-3 text-left text-label font-medium text-muted-foreground",
                          col.id !== "title" && "whitespace-nowrap",
                        )}
                      >
                        {col.id === "updatedAt" || col.id === "severity" || col.id === "number" ? (
                          <button
                            type="button"
                            onClick={() => setParam("sort", col.id)}
                            className="inline-flex items-center gap-1 rounded-xs outline-none hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60"
                          >
                            {col.label}
                            <span aria-hidden className="text-faint-foreground">
                              {sort === col.id ? "↓" : "↕"}
                            </span>
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((incident) => (
                    <tr key={incident.id} className="border-b transition-colors hover:bg-surface-hover">
                      {ALL_COLUMNS.filter((c) => c.core || enabledCols.has(c.id)).map((col) => (
                        <td key={col.id} className="h-11 px-3 align-middle text-label">
                          {col.id === "number" && (
                            <Link
                              to={`/incidents/${incident.id}`}
                              className="font-mono text-caption font-medium text-brand outline-none hover:underline focus-visible:outline-3 focus-visible:outline-ring/60"
                            >
                              {incident.number}
                            </Link>
                          )}
                          {col.id === "title" && (
                            <Link
                              to={`/incidents/${incident.id}`}
                              className="block max-w-md truncate outline-none hover:underline focus-visible:outline-3 focus-visible:outline-ring/60"
                            >
                              {incident.pinned && <span aria-label="已置顶">📌 </span>}
                              {incident.title}
                            </Link>
                          )}
                          {col.id === "severity" && (
                            <Badge variant={incident.severity === "sev1" ? "destructive" : incident.severity === "sev2" ? "warning" : "secondary"}>
                              {severityLabel[incident.severity]}
                            </Badge>
                          )}
                          {col.id === "status" && (
                            <Badge variant={statusVariant(incident.status)}>{incidentStatusLabel[incident.status]}</Badge>
                          )}
                          {col.id === "service" && <span className="text-caption">{incident.service}</span>}
                          {col.id === "assignee" && (
                            <span className="flex items-center gap-1.5 text-caption">
                              <Avatar name={memberName(incident.assignee)} size="xs" />
                              {memberName(incident.assignee)}
                            </span>
                          )}
                          {col.id === "updatedAt" && (
                            <span className="text-caption text-muted-foreground">{formatRelative(incident.updatedAt)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="shrink-0 border-t px-[var(--layout-page-gutter)] py-1.5">
              <Pagination page={safePage} pageCount={pageCount} onPage={(p) => setParam("page", String(p))} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function statusVariant(status: string) {
  switch (status) {
    case "triggered":
      return "destructive" as const;
    case "acknowledged":
      return "warning" as const;
    case "investigating":
      return "brand" as const;
    case "mitigated":
      return "info" as const;
    case "resolved":
      return "success" as const;
    default:
      return "secondary" as const;
  }
}

const viewItems = [
  { value: "list", label: "表格" },
  { value: "board", label: "看板" },
];
const severityItems = [
  { value: "all", label: "全部等级" },
  { value: "sev1", label: "SEV-1" },
  { value: "sev2", label: "SEV-2" },
  { value: "sev3", label: "SEV-3" },
  { value: "sev4", label: "SEV-4" },
];
function serviceItems(services: { id: string; name: string }[]) {
  return [{ value: "all", label: "全部服务" }, ...services.map((s) => ({ value: s.name, label: s.name }))];
}
function ownerItems(members: { id: string; name: string }[]) {
  return [{ value: "all", label: "全部负责人" }, ...members.map((m) => ({ value: m.id, label: m.name }))];
}
