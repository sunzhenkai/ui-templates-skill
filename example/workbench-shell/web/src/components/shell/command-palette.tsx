import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Search } from "lucide-react";
import { getChanges, getIncidents, getMembers, getServices } from "@/mock/api";
import { severityLabel } from "@/lib/format";
import { Kbd } from "@/components/ui/kbd";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ResultKind = "incident" | "service" | "member" | "change";

interface Result {
  kind: ResultKind;
  id: string;
  label: string;
  detail: string;
  to: string;
}

const KIND_LABEL: Record<ResultKind, string> = {
  incident: "事件",
  service: "服务",
  member: "成员",
  change: "变更",
};

/**
 * 全局搜索/命令面板（AX-074..078 + AX-046..050）。
 * dialog + combobox 语义；分类结果；键盘上下/Enter/Esc；输入过滤不丢已选项。
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<ResultKind | "all">("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState(false);

  const incidents = useQuery({ queryKey: ["incidents"], queryFn: getIncidents, enabled: open });
  const services = useQuery({ queryKey: ["services"], queryFn: getServices, enabled: open });
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers, enabled: open });
  const changes = useQuery({ queryKey: ["changes"], queryFn: getChanges, enabled: open });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setKindFilter("all");
      setActiveIndex(0);
      setError(false);
    }
  }, [open]);

  const loading = incidents.isLoading || services.isLoading || members.isLoading || changes.isLoading;

  const all: Result[] = [
    ...(incidents.data ?? []).map((i) => ({
      kind: "incident" as const,
      id: i.id,
      label: `${i.number} ${i.title}`,
      detail: severityLabel[i.severity],
      to: `/incidents/${i.id}`,
    })),
    ...(services.data ?? []).map((s) => ({
      kind: "service" as const,
      id: s.id,
      label: s.name,
      detail: s.description,
      to: `/services/${s.id}`,
    })),
    ...(members.data ?? []).map((m) => ({
      kind: "member" as const,
      id: m.id,
      label: m.name,
      detail: `${m.team} · ${m.role}`,
      to: `/services`,
    })),
    ...(changes.data ?? []).map((c) => ({
      kind: "change" as const,
      id: c.id,
      label: c.title,
      detail: c.id,
      to: `/incidents`,
    })),
  ];

  const q = query.trim().toLowerCase();
  let results = q
    ? all.filter((r) => `${r.label} ${r.detail}`.toLowerCase().includes(q))
    : all.slice(0, 8);
  if (kindFilter !== "all") results = results.filter((r) => r.kind === kindFilter);

  const grouped: [ResultKind, Result[]][] = (
    ["incident", "service", "member", "change"] as ResultKind[]
  )
    .map((k) => [k, results.filter((r) => r.kind === k)] as [ResultKind, Result[]])
    .filter(([, items]) => items.length > 0);

  const flat = grouped.flatMap(([, items]) => items);

  const open_ = (r: Result) => {
    onOpenChange(false);
    navigate(r.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && flat[activeIndex]) {
      e.preventDefault();
      open_(flat[activeIndex]);
    }
  };

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/25 data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0" />
        <BaseDialog.Popup
          aria-label="搜索"
          onKeyDown={onKeyDown}
          className={cn(
            "fixed left-1/2 top-[12vh] z-50 w-[min(36rem,92vw)] -translate-x-1/2 overflow-hidden rounded-lg border border-surface-border bg-popover text-popover-foreground shadow-floating outline-none",
            "data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95",
            "data-[ending-style]:animate-out data-[ending-style]:fade-out-0",
          )}
        >
          <div className="flex items-center gap-2 border-b px-3.5 py-3">
            <Search className="size-4 shrink-0 text-faint-foreground" aria-hidden />
            <input
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-listbox"
              aria-label="搜索事件、服务、成员和变更"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="搜索事件、服务、成员、变更…"
              className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-faint-foreground"
              autoFocus
            />
            <Kbd>Esc</Kbd>
          </div>
          <div className="flex items-center gap-1 border-b px-3 py-1.5" role="group" aria-label="结果类型筛选">
            {(["all", "incident", "service", "member", "change"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kindFilter === k}
                onClick={() => {
                  setKindFilter(k);
                  setActiveIndex(0);
                }}
                className={cn(
                  "rounded-xs px-1.5 py-0.5 text-caption outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring/60",
                  kindFilter === k && "bg-secondary text-secondary-foreground",
                )}
              >
                {k === "all" ? "全部" : KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-1.5" id="command-palette-listbox" role="listbox" aria-label="搜索结果">
            {error ? (
              <div role="alert" className="p-6 text-center">
                <p className="text-body font-medium">搜索失败</p>
                <p className="mt-1 text-caption text-muted-foreground">发生了模拟错误。</p>
                <button
                  type="button"
                  onClick={() => setError(false)}
                  className="mt-2 text-label font-medium text-brand underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-ring/60"
                >
                  重试
                </button>
              </div>
            ) : loading ? (
              <div aria-busy="true" className="flex items-center justify-center gap-2 p-6 text-caption text-muted-foreground">
                <Spinner className="size-4" />
                搜索中…
              </div>
            ) : flat.length === 0 ? (
              <div role="status" className="p-6 text-center">
                <p className="text-body font-medium">无匹配结果</p>
                <p className="mt-1 text-caption text-muted-foreground">换个关键字试试。</p>
              </div>
            ) : (
              grouped.map(([kind, items]) => (
                <div key={kind} role="group" aria-label={KIND_LABEL[kind]}>
                  <p className="px-2 pt-1.5 pb-1 text-micro font-medium text-faint-foreground">
                    {KIND_LABEL[kind]} · {items.length}
                  </p>
                  {items.map((r) => {
                    const index = flat.indexOf(r);
                    return (
                      <div
                        key={`${r.kind}-${r.id}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        onClick={() => open_(r)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-label outline-none",
                          index === activeIndex && "bg-accent text-accent-foreground",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{r.label}</span>
                        <span className="shrink-0 text-caption text-muted-foreground">{r.detail}</span>
                        {r.kind === "member" && <Avatar name={r.label} size="xs" />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

