/** 事件详情（route/incident-detail）：状态流转、时间线、评论、右栏上下文、未保存离开确认（404/错误态覆盖）。 */
import { useEffect, useMemo, useState } from "react";
import { Link, useBlocker, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CircleAlert, GitBranch, Send } from "lucide-react";
import { api, type IncidentStatus, type TimelineEntry } from "../../data/mock";
import { cn, formatDateTime } from "../../lib";
import { useAppConfirm } from "../../stores";
import {
  Badge, Button, EmptyState, ErrorState, IconButton, Input, Skeleton,
  statusLabel, statusVariant, severityLabel, severityVariant, healthLabel, healthVariant,
} from "../../components/ui";
import { toastError, toastSuccess } from "../../components/ui/toast";
import { Breadcrumb, PageCanvas, PageHeader, Panel } from "../../components/shell/page";

const FLOW: Record<IncidentStatus, { to: IncidentStatus; label: string }[]> = {
  triage: [{ to: "processing", label: "开始处理" }, { to: "archived", label: "归档" }],
  processing: [{ to: "waiting", label: "等待外部" }, { to: "resolved", label: "标记解决" }],
  waiting: [{ to: "processing", label: "重新处理" }, { to: "resolved", label: "标记解决" }],
  resolved: [{ to: "processing", label: "重新打开" }, { to: "archived", label: "归档" }],
  archived: [{ to: "processing", label: "重新打开" }],
};

export function IncidentDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const askConfirm = useAppConfirm();
  const { data: incident, isPending, isError, error } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => api.getIncident(id ?? ""),
    enabled: !!id,
  });
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: api.listServices });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers });
  const { data: incidents } = useQuery({ queryKey: ["incidents"], queryFn: api.listIncidents });
  const [comment, setComment] = useState("");
  const [dirty, setDirty] = useState(false);

  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);
  const service = services?.find((s) => s.id === incident?.serviceId);

  // prompts：离开页面前未提交修改需确认（blocker 同步判定，异步确认后 proceed/reset）
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    askConfirm({ title: "有未提交的评论", body: "离开将丢失当前输入，确认离开？", confirmLabel: "离开", danger: true }).then((ok) =>
      ok ? blocker.proceed() : blocker.reset(),
    );
  }, [blocker, askConfirm]);

  if (isPending) {
    return (
      <PageCanvas className="space-y-3">
        <Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-24" />
      </PageCanvas>
    );
  }
  if (isError) {
    return <PageCanvas><ErrorState message={error.message} onRetry={() => void qc.invalidateQueries({ queryKey: ["incident", id] })} /></PageCanvas>;
  }
  if (!incident) {
    return (
      <PageCanvas>
        <Panel>
          <EmptyState
            title="事件不存在"
            hint={`未找到 ${id}，可能已被删除。`}
            action={<Link to="/incidents" className="no-underline"><Button variant="outline" size="sm">返回事件列表</Button></Link>}
          />
        </Panel>
      </PageCanvas>
    );
  }

  const transitions = FLOW[incident.status] ?? [];

  const transition = async (next: IncidentStatus, label: string) => {
    try {
      await api.updateIncident(incident.id, { status: next });
      await api.addComment(incident.id, "m-1", `状态流转：${label}`);
      await qc.invalidateQueries({ queryKey: ["incident", incident.id] });
      await qc.invalidateQueries({ queryKey: ["incidents"] });
      toastSuccess(`${incident.key} 已${label}`);
    } catch (err) {
      toastError(`状态流转失败：${(err as Error).message}`, () => void transition(next, label));
    }
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.addComment(incident.id, "m-1", comment.trim());
      setComment("");
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["incident", incident.id] });
      toastSuccess("评论已添加");
    } catch (err) {
      toastError(`评论失败：${(err as Error).message}`, submitComment);
    }
  };

  const timeline = incident.timeline;

  return (
    <>
      <PageHeader
        title={`${incident.key} ${incident.title}`}
        actions={
          <>
            <Badge variant={statusVariant[incident.status]}>{statusLabel[incident.status]}</Badge>
            {transitions.map((t) => (
              <Button key={t.to} variant={t.label === "归档" ? "outline" : "primary"} size="sm" disabled={t.label === "标记解决" && incident.status === "resolved"} onClick={() => void transition(t.to, t.label)}>
                {t.label}
              </Button>
            ))}
          </>
        }
      />
      <PageCanvas className="mx-auto w-full max-w-[var(--size-detail-rail)]">
        <Breadcrumb items={[{ label: "事件", to: "/incidents" }, { label: incident.key }]} />
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <Panel className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={severityVariant[incident.severity]}>{severityLabel[incident.severity]}</Badge>
                {incident.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                <span className="text-caption text-muted-foreground">
                  负责人：{memberById.get(incident.assigneeId ?? "")?.name ?? "未指派"} · 开始 {formatDateTime(incident.startedAt)}
                </span>
              </div>
              <h2 className="mt-3 text-title-sm font-semibold">摘要与影响</h2>
              <p className="mt-1 text-body text-muted-foreground">{incident.impact}</p>
              <dl className="mt-3 grid grid-cols-[88px_1fr] gap-y-1.5 text-caption">
                <dt className="text-faint-foreground">影响服务</dt>
                <dd>
                  {service ? (
                    <Link to={`/services/${service.id}`} className="no-underline hover:underline">
                      <GitBranch className="mr-1 inline size-3" aria-hidden />{service.name}
                      <Badge variant={healthVariant[service.health]} className="ml-2">{healthLabel[service.health]}</Badge>
                    </Link>
                  ) : "—"}
                </dd>
                <dt className="text-faint-foreground">参与团队</dt><dd>{incident.teamId}</dd>
                <dt className="text-faint-foreground">开始时间</dt><dd className="tabular-nums">{formatDateTime(incident.startedAt)}</dd>
                <dt className="text-faint-foreground">解决时间</dt><dd className="tabular-nums">{incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "—"}</dd>
              </dl>
            </Panel>

            <Panel className="p-4">
              <h2 className="text-title-sm font-semibold">时间线</h2>
              {timeline.length === 0 ? (
                <EmptyState title="暂无时间线记录" />
              ) : (
                <ol className="mt-3 space-y-0">
                  {timeline.map((entry) => <TimelineRow key={entry.id} entry={entry} memberById={memberById} />)}
                </ol>
              )}
              <form
                className="mt-3 flex items-center gap-2 border-t border-surface-border pt-3"
                onSubmit={(e) => { e.preventDefault(); void submitComment(); }}
              >
                <Input
                  value={comment}
                  onChange={(e) => { setComment(e.target.value); setDirty(true); }}
                  placeholder="添加评论，@ 成员可唤起选择…"
                  aria-label="添加评论"
                  className="flex-1"
                />
                <IconButton label="发送评论" variant="primary" onClick={() => void submitComment()}><Send className="size-4" /></IconButton>
              </form>
            </Panel>
          </div>

          <aside className="space-y-4" aria-label="上下文面板">
            <Panel className="p-3">
              <h2 className="text-label font-medium">相似事件</h2>
              <ul className="mt-2 space-y-1.5">
                {(incidents ?? []).filter((i) => i.serviceId === incident.serviceId && i.id !== incident.id).slice(0, 3).map((i) => (
                  <li key={i.id}>
                    <Link to={`/incidents/${i.id}`} className="flex items-center gap-1.5 text-caption no-underline hover:underline">
                      <CircleAlert className="size-3 shrink-0 text-faint-foreground" aria-hidden />
                      <span className="truncate">{i.key} {i.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel className="p-3">
              <h2 className="text-label font-medium">受影响服务健康</h2>
              {service && (
                <div className="mt-2 flex items-center justify-between text-caption">
                  <Link to={`/services/${service.id}`} className="no-underline hover:underline">{service.name}</Link>
                  <Badge variant={healthVariant[service.health]}>{healthLabel[service.health]}</Badge>
                </div>
              )}
            </Panel>
            <Panel className="p-3">
              <h2 className="text-label font-medium">最近变更</h2>
              <p className="mt-2 text-caption text-muted-foreground">
                <ArrowLeft className="mr-1 inline size-3" aria-hidden />查看 <Link to={`/services/${incident.serviceId}`} className="no-underline hover:underline">服务详情</Link> 获取变更记录。
              </p>
            </Panel>
          </aside>
        </div>
      </PageCanvas>
    </>
  );
}

function TimelineRow({ entry, memberById }: { entry: TimelineEntry; memberById: Map<string, { id: string; name: string }> }) {
  const icon = { status: "◆", comment: "◇", field: "✎", attachment: "📎" }[entry.kind];
  return (
    <li className="relative border-l border-surface-border pb-3 pl-4 last:pb-0">
      <span aria-hidden className={cn("absolute -left-[7px] top-0.5 flex size-3.5 items-center justify-center rounded-full bg-surface text-micro text-muted-foreground ring-1 ring-surface-border")}>
        {icon}
      </span>
      <p className="text-body">
        <span className="font-medium">{memberById.get(entry.authorId)?.name ?? "系统"}</span>{" "}
        <span className="text-muted-foreground">{entry.text}</span>
        {entry.from && entry.to && (
          <span className="text-muted-foreground">（{entry.from} → {entry.to}）</span>
        )}
      </p>
      <p className="text-micro text-faint-foreground tabular-nums">{formatDateTime(entry.at)}</p>
    </li>
  );
}
