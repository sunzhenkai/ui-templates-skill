import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  Inbox,
  ListFilter,
  MoreHorizontal,
  Save,
  RotateCcw,
  Siren,
  UserRoundPlus,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastError, toastSuccess } from "@/components/ui/toast";
import { getInbox, resolveInboxItem, MockError } from "@/mock/api";
import { formatRelative, severityLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/types/domain";

const KIND_META: Record<InboxItem["kind"], { label: string; icon: typeof Bell }> = {
  alert: { label: "告警", icon: Siren },
  assignment: { label: "分派", icon: UserRoundPlus },
  confirmation: { label: "确认", icon: ClipboardCheck },
};

/** 收件箱（ROUTE-006-B 主从）：320px 列表面板（筛选/批量在面板头）+ 详情区；URL 恢复选中项。 */
export function InboxPage() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const selectedId = params.get("selected") ?? "";
  const [compact, setCompact] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const type = params.get("type") ?? "all";
  const severity = params.get("severity") ?? "all";
  const status = params.get("status") ?? "open";

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["inbox"], queryFn: getInbox });

  const filtered = useMemo(() => {
    let items = data ?? [];
    if (type !== "all") items = items.filter((i) => i.kind === type);
    if (severity !== "all") items = items.filter((i) => i.severity === severity);
    if (status !== "all") items = items.filter((i) => i.status === status);
    return items;
  }, [data, type, severity, status]);

  const selected = filtered.find((i) => i.id === selectedId) ?? (data ?? []).find((i) => i.id === selectedId);
  const openCount = (data ?? []).filter((i) => i.status === "open").length;
  const hasFilter = type !== "all" || severity !== "all" || status !== "open";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const select = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set("selected", id);
    else next.delete("selected");
    setParams(next, { replace: true });
  };

  const resolve = useMutation({
    mutationFn: ({ id, next }: { id: string; next: InboxItem["status"] }) => resolveInboxItem(id, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toastSuccess("事项已处理", "收件箱计数已更新");
    },
    onError: (e) =>
      toastError("操作失败", e instanceof MockError ? e.message : "请重试", {
        label: "重试",
        onClick: () => resolve.mutate(resolve.variables!),
      }),
  });

  const markAll = async () => {
    const open = filtered.filter((i) => i.status === "open");
    try {
      await Promise.all(open.map((i) => resolveInboxItem(i.id, "done")));
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toastSuccess(`已批量处理 ${open.length} 项`);
    } catch {
      toastError("批量处理失败", "部分事项未完成，请重试");
    }
  };

  const listPanel = (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-[var(--layout-page-gutter)]">
        <h1 className="min-w-0 truncate text-body font-semibold">收件箱</h1>
        {openCount > 0 && (
          <span className="shrink-0 text-caption text-muted-foreground" aria-label={`${openCount} 条未处理`}>
            {openCount}
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Popover>
            <PopoverTrigger
              render={(props: React.ComponentProps<"button">) => (
                <Button variant="ghost" size="icon-sm" aria-label="筛选事项" aria-expanded={props["aria-expanded"]} {...props}>
                  <ListFilter className="size-4 text-muted-foreground" aria-hidden />
                </Button>
              )}
            />
            <PopoverContent align="end" className="w-64 p-3">
              <div className="flex flex-col gap-2.5">
                <FilterSelect label="事项类型" value={type} onChange={(v) => setParam("type", v)} items={typeItems} />
                <FilterSelect label="严重等级" value={severity} onChange={(v) => setParam("severity", v)} items={severityItems} />
                <FilterSelect label="处理状态" value={status} onChange={(v) => setParam("status", v)} items={statusItems} />
                {hasFilter && (
                  <Button variant="outline" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                    <RotateCcw aria-hidden /> 重置筛选
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(props: React.ComponentProps<"button">) => (
                <Button variant="ghost" size="icon-sm" aria-label="更多操作" {...props}>
                  <MoreHorizontal className="size-4 text-muted-foreground" aria-hidden />
                </Button>
              )}
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void markAll()}>
                <CheckCheck aria-hidden />
                全部标为已处理
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toastSuccess("筛选条件已保存", "下次进入将恢复当前筛选")}>
                <Save aria-hidden />
                保存当前筛选
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2" role="region" aria-label="收件箱列表" aria-busy={resolve.isPending}>
        {isLoading ? (
          <div aria-busy="true" className="flex flex-col gap-1 p-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert
              variant="destructive"
              title="收件箱加载失败"
              action={
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  重试
                </Button>
              }
            >
              模拟请求失败，可点击重试。
            </Alert>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            minimal
            icon={<Inbox />}
            title={(data ?? []).length === 0 ? "暂无通知" : "没有匹配的事项"}
            action={
              (data ?? []).length > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                  清除筛选
                </Button>
              ) : undefined
            }
            className="min-h-60"
          />
        ) : (
          <ul className="flex flex-col gap-0.5" aria-label="收件箱事项">
            {filtered.map((item) => {
              const meta = KIND_META[item.kind];
              const active = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => select(item.id)}
                    aria-current={active ? "true" : undefined}
                    data-selected={active}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left outline-none transition-colors",
                      "hover:bg-accent/50 focus-visible:outline-3 focus-visible:outline-ring/60",
                      active && "bg-accent text-accent-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        item.status === "open" ? "bg-brand/10 text-brand" : "bg-muted text-faint-foreground",
                      )}
                      aria-hidden
                    >
                      <meta.icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {item.severity && (
                          <Badge variant={item.severity === "sev1" ? "destructive" : "warning"} className="shrink-0">
                            {severityLabel[item.severity]}
                          </Badge>
                        )}
                        <span className={cn("min-w-0 flex-1 truncate text-label", item.status === "done" && "text-muted-foreground")}>
                          {item.title}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-caption text-muted-foreground">
                        <span className="truncate">{meta.label} · {item.source}</span>
                        <span className="ml-auto shrink-0 tabular-nums text-faint-foreground">{formatRelative(item.createdAt)}</span>
                      </span>
                    </span>
                    {item.status === "open" && (
                      <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="未处理" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  const detail = selected ? (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {compact && (
        <div className="border-b px-[var(--layout-page-gutter)] py-2">
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => select("")}>
            <ChevronLeft className="size-4" aria-hidden />
            返回列表
          </Button>
        </div>
      )}
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={selected.kind === "alert" ? "warning" : "info"}>{KIND_META[selected.kind].label}</Badge>
          {selected.severity && (
            <Badge variant={selected.severity === "sev1" ? "destructive" : "secondary"}>{severityLabel[selected.severity]}</Badge>
          )}
          {selected.status === "open" ? <Badge variant="brand">未处理</Badge> : <Badge variant="success">已处理</Badge>}
        </div>
        <h2 className="mt-3 text-title font-semibold">{selected.title}</h2>
        <p className="mt-1 text-body text-muted-foreground">
          来源 {selected.source} · {formatRelative(selected.createdAt)}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-body leading-relaxed text-foreground">{selected.detail}</p>
        <div className="mt-4 flex gap-2">
          {selected.status === "open" && (
            <Button size="sm" onClick={() => resolve.mutate({ id: selected.id, next: "done" })} disabled={resolve.isPending}>
              标记处理
            </Button>
          )}
          {selected.incident && (
            <Link
              to={`/incidents/${selected.incident}`}
              className="inline-flex h-8 items-center rounded-md border border-input px-3 text-label font-medium outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring/60"
            >
              打开关联事件
            </Link>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-muted-foreground">
      <EmptyState minimal icon={<Inbox />} title="收件箱为空" className="min-h-40" />
    </div>
  );

  // 紧凑路径：detail 占满整屏（含返回）；宽路径：双栏（列表 320px + 详情）
  if (compact) {
    return selected ? (
      <div className="flex h-full min-h-0 flex-col">{detail}</div>
    ) : (
      <div className="flex h-full min-h-0 flex-col">{listPanel}</div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <aside aria-label="收件箱列表面板" className="flex w-80 min-w-60 max-w-120 shrink-0 flex-col border-r">
        {listPanel}
      </aside>
      <section aria-label="收件箱详情" className="flex min-h-0 min-w-0 flex-1 flex-col">
        {detail}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <span id={`inbox-filter-${label}`} className="text-caption font-medium text-muted-foreground">
        {label}
      </span>
      <Select items={items} value={value} onValueChange={(v) => onChange((v as string) ?? "all")}>
        <SelectTrigger aria-labelledby={`inbox-filter-${label}`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const typeItems = [
  { value: "all", label: "全部类型" },
  { value: "alert", label: "告警" },
  { value: "assignment", label: "分派" },
  { value: "confirmation", label: "确认" },
];
const severityItems = [
  { value: "all", label: "全部等级" },
  { value: "sev1", label: "SEV-1" },
  { value: "sev2", label: "SEV-2" },
  { value: "sev3", label: "SEV-3" },
  { value: "sev4", label: "SEV-4" },
];
const statusItems = [
  { value: "open", label: "未处理" },
  { value: "done", label: "已处理" },
  { value: "all", label: "全部" },
];
