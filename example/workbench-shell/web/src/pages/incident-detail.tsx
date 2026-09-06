import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pin, PinOff, Siren } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shell/confirm-dialog";
import { addComment, getIncidents, togglePin, updateIncidentStatus, MockError } from "@/mock/api";
import { formatDateTime, formatRelative, incidentStatusLabel, severityLabel } from "@/lib/format";
import { statusVariant } from "@/pages/incidents";
import { toastError, toastSuccess } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** 事件详情（ROUTE-006-B）：详情时间线 + 属性面板；master 保留事件列表。 */
export function IncidentDetailPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "changes" ? "changes" : "timeline";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  const incidents = useQuery({ queryKey: ["incidents"], queryFn: getIncidents });
  const incident = (incidents.data ?? []).find((i) => i.id === id || i.number === id);

  const status = useMutation({
    mutationFn: ({ next, force }: { next: string; force?: boolean }) => {
      if (next === "resolved" && !force && (incident?.severity === "sev1" || incident?.severity === "sev2")) {
        return Promise.reject(new MockError("高严重等级事件需先确认后解决"));
      }
      return updateIncidentStatus(id, next as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      toastSuccess("状态已更新");
    },
    onError: (e) =>
      toastError("状态更新失败", e instanceof Error ? e.message : "请重试", {
        label: "仍要解决",
        onClick: () => status.mutate({ next: "resolved", force: true }),
      }),
  });

  const pin = useMutation({
    mutationFn: () => togglePin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      toastSuccess(incident?.pinned ? "已取消置顶" : "已置顶到侧栏");
    },
  });

  const comment_ = useMutation({
    mutationFn: (body: string) => addComment(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      setComment("");
      toastSuccess("评论已发布");
    },
    onError: (e) => toastError("评论失败", e instanceof MockError ? e.message : "请重试", { label: "重试", onClick: () => comment_.mutate(comment) }),
  });

  if (incidents.isLoading) {
    return (
      <div aria-busy="true" className="flex h-full min-h-0 flex-col">
        <PageHeader title={<Skeleton className="h-4 w-48" />} />
        <div className="grid flex-1 grid-cols-[1fr_16rem] gap-4 overflow-hidden p-[var(--layout-page-gutter)]">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader title="事件详情" />
        <EmptyState
          icon={<Siren />}
          title="事件不存在"
          description="该事件可能已被删除，或链接有误。"
          action={
            <Button variant="outline" onClick={() => navigate("/incidents")}>
              返回事件列表
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono text-title-sm text-brand">{incident.number}</span>
            <span className="min-w-0 truncate">{incident.title}</span>
          </span>
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={incident.pinned ? "取消置顶" : "置顶事件"}
              onClick={() => pin.mutate()}
            >
              {incident.pinned ? <PinOff className="size-4" aria-hidden /> : <Pin className="size-4" aria-hidden />}
            </Button>
            {incident.status !== "resolved" && incident.status !== "cancelled" && (
              <Button variant="outline" size="sm" onClick={() => setConfirmClose(true)}>
                关闭事件
              </Button>
            )}
            <Select items={statusItems} value={incident.status} onValueChange={(v) => status.mutate({ next: v as string })}>
              <SelectTrigger className="h-7 w-28" aria-label="修改状态">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
      <div className="flex items-center gap-2 border-b px-[var(--layout-page-gutter)] py-1.5">
        <Link
          to="/incidents"
          className="inline-flex items-center gap-1 rounded-xs text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          返回列表
        </Link>
        <Breadcrumb
          items={[
            { label: "事件", to: "/incidents" },
            { label: incident.number },
          ]}
          className="ml-auto"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_18rem] lg:overflow-hidden">
        <div className="min-h-0 overflow-y-auto p-[var(--layout-page-gutter)]">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={incident.severity === "sev1" ? "destructive" : incident.severity === "sev2" ? "warning" : "secondary"}>
              {severityLabel[incident.severity]}
            </Badge>
            <Badge variant={statusVariant(incident.status)}>{incidentStatusLabel[incident.status]}</Badge>
            {incident.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
          <p className="mt-3 max-w-2xl text-body-lg leading-relaxed">{incident.description}</p>
          {incident.relatedChange && (
            <p className="mt-2 text-caption text-muted-foreground">
              关联变更：<span className="font-mono">{incident.relatedChange}</span>
            </p>
          )}
          <Separator className="my-4" />

          <div role="tablist" aria-label="详情视图" className="flex items-center gap-1">
            {[
              ["timeline", "时间线"],
              ["changes", "关联记录"],
            ].map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  if (value === "timeline") next.delete("tab");
                  else next.set("tab", value);
                  setParams(next, { replace: true });
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-label font-medium outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring/60",
                  tab === value && "bg-secondary text-secondary-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "timeline" ? (
            <>
              <ol className="mt-3 flex flex-col gap-3" aria-label="事件时间线" role="list">
                <li className="flex gap-3">
                  <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="text-label font-medium">事件创建</p>
                    <p className="text-micro text-faint-foreground">{formatDateTime(incident.createdAt)}</p>
                  </div>
                </li>
                {incident.comments.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={c.author} size="sm" className="mt-0.5" />
                    <div className="min-w-0 flex-1 rounded-md border border-surface-border bg-card p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-label font-medium">{c.author}</span>
                        <span className="text-micro text-faint-foreground">{formatRelative(c.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-body">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <form
                className="mt-4 flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (comment.trim()) comment_.mutate(comment.trim());
                }}
              >
                <div className="min-w-0 flex-1">
                  <Textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="留下评论…（@ 可提及成员）"
                    aria-label="评论内容"
                  />
                </div>
                <Button type="submit" disabled={!comment.trim() || comment_.isPending} aria-busy={comment_.isPending}>
                  发布
                </Button>
              </form>
            </>
          ) : (
            <Alert className="mt-3" variant="info" title="关联记录">
              该事件{incident.relatedChange ? `关联变更 ${incident.relatedChange}` : "暂无关联变更"}，相关服务{" "}
              <Link to={`/services`} className="text-brand underline-offset-2 hover:underline">
                查看服务目录
              </Link>
              。
            </Alert>
          )}
        </div>

        <aside aria-label="事件属性" className="border-t bg-surface p-3 lg:border-t-0 lg:border-l lg:overflow-y-auto">
          <h2 className="text-label font-semibold text-muted-foreground">属性</h2>
          <dl className="mt-2 flex flex-col gap-2.5 text-label">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">负责人</dt>
              <dd className="font-medium">{incident.assignee ?? "未指派"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">影响服务</dt>
              <dd className="font-medium">
                <Link to={`/services`} className="outline-none hover:underline focus-visible:outline-3 focus-visible:outline-ring/60">
                  {incident.service}
                </Link>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">创建时间</dt>
              <dd className="font-medium">{formatDateTime(incident.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">更新时间</dt>
              <dd className="font-medium">{formatRelative(incident.updatedAt)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="关闭事件"
        description={`将 ${incident.number} 标记为已解决？该操作会通知相关成员。`}
        confirmLabel="标记已解决"
        onConfirm={() => {
          setConfirmClose(false);
          status.mutate({ next: "resolved" });
        }}
      />
    </div>
  );
}

const statusItems = [
  { value: "triggered", label: "已触发" },
  { value: "acknowledged", label: "已确认" },
  { value: "investigating", label: "处理中" },
  { value: "mitigated", label: "已缓解" },
  { value: "resolved", label: "已解决" },
  { value: "cancelled", label: "已取消" },
];
