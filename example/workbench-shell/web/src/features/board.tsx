import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@/lib/dnd-utils";
import { GripVertical, Plus, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { getIncidents, getMembers, updateIncidentStatus, MockError } from "@/mock/api";
import { formatRelative, severityLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Incident, IncidentStatus } from "@/types/domain";

const COLUMNS: { id: IncidentStatus; label: string }[] = [
  { id: "triggered", label: "已触发" },
  { id: "acknowledged", label: "已确认" },
  { id: "investigating", label: "处理中" },
  { id: "mitigated", label: "已缓解" },
  { id: "resolved", label: "已解决" },
];

const COLUMN_TONE: Partial<Record<IncidentStatus, string>> = {
  triggered: "bg-destructive/5",
  acknowledged: "bg-warning/5",
  investigating: "bg-brand/5",
  mitigated: "bg-info/5",
  resolved: "bg-success/5",
};

/**
 * 事件看板（ROUTE-005-A 看板形态，NN-014：PageHeader/Toolbar 几何不变）。
 * dnd-kit 拖动跨列；dragging 与 drop 目标均有非颜色反馈（AX-020）。
 */
export function BoardView() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["incidents"], queryFn: getIncidents });
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });
  const [dragging, setDragging] = useState<Incident | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const byColumn = useMemo(() => {
    const map = new Map<IncidentStatus, Incident[]>(COLUMNS.map((c) => [c.id, []]));
    (data ?? []).forEach((i) => map.get(i.status)?.push(i));
    return map;
  }, [data]);

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) => updateIncidentStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }),
    onError: (e) => {
      import("@/components/ui/toast").then(({ toastError }) =>
        toastError("状态更新失败", e instanceof MockError ? e.message : "请重试", {
          label: "重试",
          onClick: () => move.mutate(move.variables!),
        }),
      );
    },
  });

  const memberName = (id: string | null) => members.data?.find((m) => m.id === id)?.name ?? "未指派";

  const onDragStart = (e: DragStartEvent) => setDragging((data ?? []).find((i) => i.id === e.active.id) ?? null);
  const onDragOver = (e: DragOverEvent) => setOverCol((e.over?.id as string | undefined) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    setOverCol(null);
    const incident = (data ?? []).find((i) => i.id === e.active.id);
    const target = e.over?.id as IncidentStatus | undefined;
    if (incident && target && incident.status !== target) move.mutate({ id: incident.id, status: target });
  };

  if (isLoading) {
    return (
      <div aria-busy="true" className="grid h-full grid-flow-col auto-cols-[minmax(16rem,1fr)] gap-3 overflow-x-auto p-[var(--layout-page-gutter)]">
        {COLUMNS.map((c) => (
          <div key={c.id} className="flex flex-col gap-2 rounded-md bg-surface-hover/40 p-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Siren />}
          title="看板加载失败"
          description="模拟请求失败。"
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div
        role="region"
        aria-label="事件看板"
        className="grid h-full grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-3 overflow-x-auto p-[var(--layout-page-gutter)]"
      >
        {COLUMNS.map((col) => (
          <BoardColumn
            key={col.id}
            column={col}
            incidents={byColumn.get(col.id) ?? []}
            over={overCol === col.id}
            memberName={memberName}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div className="w-64 rotate-2 rounded-md border border-brand bg-popover p-2.5 shadow-floating">
            <p className="font-mono text-micro text-brand">{dragging.number}</p>
            <p className="mt-0.5 line-clamp-2 text-label font-medium">{dragging.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  column,
  incidents,
  over,
  memberName,
}: {
  column: { id: IncidentStatus; label: string };
  incidents: Incident[];
  over: boolean;
  memberName: (id: string | null) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.label}列，${incidents.length} 个事件`}
      className={cn(
        "flex min-h-0 flex-col rounded-md bg-surface-hover/40 outline-none",
        COLUMN_TONE[column.id],
        (over || isOver) && "ring-2 ring-inset ring-brand",
      )}
    >
      <header className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-1.5">
        <span
          aria-hidden
          className={cn(
            "size-2.5 rounded-full",
            column.id === "triggered" && "bg-destructive",
            column.id === "acknowledged" && "bg-warning",
            column.id === "investigating" && "bg-brand",
            column.id === "mitigated" && "bg-info",
            column.id === "resolved" && "bg-success",
          )}
        />
        <span className="text-label font-medium">{column.label}</span>
        <span className="text-micro text-muted-foreground">{incidents.length}</span>
        <div className="ml-auto flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(props: React.ComponentProps<"button">) => (
                <Button variant="ghost" size="icon-sm" aria-label={`${column.label} 列菜单`} {...props}>
                  ⋯
                </Button>
              )}
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>按等级排序</DropdownMenuItem>
              <DropdownMenuItem disabled>折叠本列</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon-sm" aria-label={`在 ${column.label} 中创建事件`}>
            <Plus className="size-3.5" aria-hidden />
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {incidents.length === 0 ? (
          <p className="my-6 text-center text-caption text-faint-foreground">无事件</p>
        ) : (
          incidents.map((incident) => (
            <BoardCard key={incident.id} incident={incident} memberName={memberName} />
          ))
        )}
      </div>
    </section>
  );
}

function BoardCard({ incident, memberName }: { incident: Incident; memberName: (id: string | null) => string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: incident.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      data-dragging={isDragging}
      className={cn(
        "group rounded-md border border-surface-border bg-card p-2.5 shadow-surface outline-none focus-within:outline-3 focus-within:outline-ring/60",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          aria-label={`拖动 ${incident.number}`}
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab rounded-xs text-faint-foreground outline-none hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" aria-hidden />
        </button>
        <Link
          to={`/incidents/${incident.id}`}
          className="min-w-0 flex-1 rounded-xs outline-none focus-visible:outline-3 focus-visible:outline-ring/60"
        >
          <p className="font-mono text-micro text-brand">{incident.number}</p>
          <p className="mt-0.5 line-clamp-2 text-label font-medium group-hover:underline">{incident.title}</p>
          <p className="mt-1 line-clamp-1 text-micro text-muted-foreground">{incident.description}</p>
        </Link>
      </div>
      <div className="mt-2 flex items-center gap-1.5 pl-5">
        <Badge variant={incident.severity === "sev1" ? "destructive" : "secondary"}>{severityLabel[incident.severity]}</Badge>
        <Avatar name={memberName(incident.assignee)} size="xs" />
        <span className="min-w-0 flex-1 truncate text-micro text-muted-foreground">{memberName(incident.assignee)}</span>
        <span className="text-micro text-faint-foreground">{formatRelative(incident.updatedAt)}</span>
      </div>
    </div>
  );
}
