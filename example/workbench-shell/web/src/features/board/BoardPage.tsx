/** 事件看板（route/incident-board）：五状态列 + dnd-kit 拖动 + 键盘移动替代（AX-103）+ 失败回滚。 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { Copy, GitBranch, MoreHorizontal, UserPlus } from "lucide-react";
import { api, type Incident, type IncidentStatus } from "../../data/mock";
import { cn, formatDateTime } from "../../lib";
import { useAppConfirm } from "../../stores";
import {
  Badge, Button, EmptyState, IconButton, Menu, NativeSelect, Skeleton,
  statusLabel, severityLabel, severityVariant,
} from "../../components/ui";
import { toastError, toastSuccess } from "../../components/ui/toast";
import { PageCanvas, PageHeader, PageToolbar } from "../../components/shell/page";

const COLUMNS: IncidentStatus[] = ["triage", "processing", "waiting", "resolved", "archived"];

export function BoardPage() {
  const qc = useQueryClient();
  const askConfirm = useAppConfirm();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["incidents"], queryFn: api.listIncidents });
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: api.listServices });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers });
  const [scope, setScope] = useState("all");
  const [severity, setSeverity] = useState("");
  const [service, setService] = useState("");
  const [assignee, setAssignee] = useState("");
  const [mobileCol, setMobileCol] = useState<IncidentStatus>("triage");
  const [dragging, setDragging] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);
  const serviceById = useMemo(() => new Map((services ?? []).map((s) => [s.id, s])), [services]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (scope === "mine") rows = rows.filter((i) => i.assigneeId === "m-1");
    if (scope === "team") rows = rows.filter((i) => i.teamId === "team-sre");
    if (severity) rows = rows.filter((i) => i.severity === severity);
    if (service) rows = rows.filter((i) => i.serviceId === service);
    if (assignee) rows = rows.filter((i) => i.assigneeId === assignee);
    return rows;
  }, [data, scope, severity, service, assignee]);

  const moveCard = async (id: string, next: IncidentStatus) => {
    const before = data?.find((i) => i.id === id);
    if (!before || before.status === next) return;
    try {
      await api.updateIncident(id, { status: next });
      await qc.invalidateQueries({ queryKey: ["incidents"] });
      await qc.invalidateQueries({ queryKey: ["inbox"] });
      toastSuccess(`${before.key} → ${statusLabel[next]}`);
    } catch (err) {
      toastError(`移动失败：${(err as Error).message}（已恢复原位置）`, () => void moveCard(id, next));
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const id = String(e.active.id);
    const target = e.over?.id as IncidentStatus | undefined;
    if (target) void moveCard(id, target);
  };

  const archiveCard = async (card: Incident) => {
    const ok = await askConfirm({ title: `归档 ${card.key}？`, body: "归档后事件只读。", confirmLabel: "归档", danger: true });
    if (ok) void moveCard(card.id, "archived");
  };

  return (
    <>
      <PageHeader title="事件看板" count={filtered.length} />
      <PageToolbar>
        <NativeSelect aria-label="看板范围" value={scope} onChange={(e) => setScope(e.target.value)} className="w-32">
          <option value="all">全部事件</option>
          <option value="mine">我的事件</option>
          <option value="team">我的团队</option>
        </NativeSelect>
        <NativeSelect aria-label="按等级过滤" value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-28">
          <option value="">全部等级</option>
          <option value="sev1">P1</option><option value="sev2">P2</option><option value="sev3">P3</option><option value="sev4">P4</option>
        </NativeSelect>
        <NativeSelect aria-label="按服务过滤" value={service} onChange={(e) => setService(e.target.value)} className="w-32">
          <option value="">全部服务</option>
          {(services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="按负责人过滤" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-32">
          <option value="">全部负责人</option>
          {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </NativeSelect>
        <span className="lg:hidden">
          <NativeSelect aria-label="选择看板列" value={mobileCol} onChange={(e) => setMobileCol(e.target.value as IncidentStatus)} className="w-28">
            {COLUMNS.map((c) => <option key={c} value={c}>{statusLabel[c]}</option>)}
          </NativeSelect>
        </span>
      </PageToolbar>
      <PageCanvas className="min-h-0 flex-1 overflow-x-auto">
        {isPending ? (
          <div className="grid grid-cols-5 gap-3">
            {COLUMNS.map((c) => (
              <div key={c} className="space-y-2 rounded-lg border border-surface-border bg-surface p-2">
                <Skeleton className="h-6 w-24" /><Skeleton className="h-16" /><Skeleton className="h-16" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div role="alert"><p className="text-destructive">{error.message}</p><Button variant="outline" size="sm" onClick={() => refetch()}>重试</Button></div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={(e: DragStartEvent) => setDragging(String(e.active.id))}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDragging(null)}
          >
            <div className="flex min-h-full gap-3 max-lg:hidden">
              {COLUMNS.map((col) => (
                <BoardColumn
                  key={col} col={col} cards={filtered.filter((i) => i.status === col)}
                  filterActive={!!(severity || service || assignee)}
                  onCardAction={archiveCard} memberById={memberById} serviceById={serviceById}
                  dragging={dragging}
                />
              ))}
            </div>
            <div className="lg:hidden">
              <BoardColumn
                col={mobileCol} cards={filtered.filter((i) => i.status === mobileCol)}
                filterActive={!!(severity || service || assignee)}
                onCardAction={archiveCard} memberById={memberById} serviceById={serviceById}
                dragging={dragging}
              />
            </div>
          </DndContext>
        )}
      </PageCanvas>
    </>
  );
}

function BoardColumn({
  col, cards, filterActive, onCardAction, memberById, serviceById, dragging,
}: {
  col: IncidentStatus;
  cards: Incident[];
  filterActive: boolean;
  onCardAction: (card: Incident) => void;
  memberById: Map<string, { id: string; name: string }>;
  serviceById: Map<string, { id: string; name: string }>;
  dragging: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col });
  return (
    <section
      ref={setNodeRef}
      aria-label={`看板列：${statusLabel[col]}，${cards.length} 条`}
      className={cn(
        "flex max-h-full min-h-40 w-72 shrink-0 flex-col rounded-lg border border-surface-border bg-surface shadow-surface",
        isOver && "ring-2 ring-brand/50",
        dragging && "opacity-90",
      )}
    >
      <header className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
        <h2 className="text-label font-medium">{statusLabel[col]}</h2>
        <Badge count={cards.length} />
        <span className="ml-auto text-caption text-faint-foreground tabular-nums">
          {filterActive ? `筛选后 ${cards.length}` : ""}
        </span>
        <CreateInColumn col={col} />
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {cards.length === 0 && <EmptyState title="此列为空" hint="拖动卡片到此，或从列头创建。" />}
        {cards.map((card) => (
          <BoardCard key={card.id} card={card} onArchive={() => onCardAction(card)} memberById={memberById} serviceById={serviceById} />
        ))}
      </div>
    </section>
  );
}

function CreateInColumn({ col }: { col: IncidentStatus }) {
  const openCreate = useOverlayStoreSafe((s) => s.openCreate);
  return (
    <IconButton label={`在「${statusLabel[col]}」列创建事件`} size="icon-xs" onClick={() => openCreate(undefined, col)}>
      +
    </IconButton>
  );
}

import { useOverlayStore as useOverlayStoreSafe } from "../../stores";

function BoardCard({
  card, onArchive, memberById, serviceById,
}: {
  card: Incident;
  onArchive: () => void;
  memberById: Map<string, { id: string; name: string }>;
  serviceById: Map<string, { id: string; name: string }>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <article
      ref={setNodeRef}
      aria-label={`${card.key} ${card.title}`}
      className={cn(
        "group rounded-md border border-surface-border bg-card p-2.5 shadow-surface",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...attributes} {...listeners}
          aria-label={`拖动 ${card.key}，或使用卡片菜单中的「移动到列」`}
          className="mt-0.5 cursor-grab touch-none text-faint-foreground hover:text-foreground"
        >
          <MoreHorizontal className="size-3 rotate-90" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-micro text-faint-foreground tabular-nums">{card.key}</p>
          <Link to={`/incidents/${card.id}`} className="line-clamp-2 text-body font-medium no-underline hover:underline">
            {card.title}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <Badge variant={severityVariant[card.severity]}>{severityLabel[card.severity]}</Badge>
            {serviceById.get(card.serviceId) && (
              <span className="inline-flex items-center gap-1 text-micro text-muted-foreground">
                <GitBranch className="size-3" aria-hidden />{serviceById.get(card.serviceId)!.name}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-micro text-muted-foreground">
            <span>{memberById.get(card.assigneeId ?? "")?.name ?? "未指派"}</span>
            <span className="tabular-nums">{formatDateTime(card.updatedAt).slice(5)}</span>
          </div>
        </div>
        <Menu
          trigger={(tp) => <IconButton {...tp} label={`卡片操作 ${card.key}`}><MoreHorizontal className="size-4" /></IconButton>}
          items={[
            { key: "assign", label: "分派负责人", icon: <UserPlus className="size-3.5" />, onSelect: () => toastSuccess(`已分派 ${card.key}（mock）`) },
            { key: "tag", label: "添加标签", onSelect: () => toastSuccess("已添加标签（mock）") },
            { key: "copy", label: "复制编号", icon: <Copy className="size-3.5" />, onSelect: () => void navigator.clipboard?.writeText(card.key).then(() => toastSuccess(`已复制 ${card.key}`)) },
            { key: "archive", label: "归档", danger: true, onSelect: onArchive },
          ]}
        />
      </div>
      {/* AX-103：键盘可达的移动替代 */}
      <div className="mt-1.5 flex flex-wrap gap-1 border-t border-surface-border pt-1.5 max-lg:hidden">
        {COLUMNS.filter((c) => c !== card.status).map((c) => (
          <button
            key={c}
            onClick={() => void api.updateIncident(card.id, { status: c }).then(() => toastSuccess(`${card.key} → ${statusLabel[c]}`))}
            className="rounded-full px-1.5 py-0.5 text-micro text-muted-foreground hover:bg-surface-hover"
          >
            → {statusLabel[c]}
          </button>
        ))}
      </div>
    </article>
  );
}
