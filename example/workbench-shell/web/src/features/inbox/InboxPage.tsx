/** 收件箱（route/inbox）：筛选、搜索、批量操作、行详情侧滑面板、四态。 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, MailOpen, Send, UserPlus } from "lucide-react";
import { api, type InboxItem } from "../../data/mock";
import { formatDateTime } from "../../lib";
import {
  Badge, Button, Checkbox, Dialog, EmptyState, ErrorState, IconButton, Input,
  NativeSelect, Pagination, SkeletonTable, severityLabel, severityVariant,
} from "../../components/ui";
import { toastError, toastSuccess } from "../../components/ui/toast";
import { PageCanvas, PageHeader, PageToolbar, Panel } from "../../components/shell/page";

const kindLabel: Record<InboxItem["kind"], string> = { alert: "告警", assignment: "分派", confirm: "确认" };

export function InboxPage() {
  const qc = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["inbox"], queryFn: api.listInbox });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers });
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [severity, setSeverity] = useState("");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detail, setDetail] = useState<{ items: InboxItem[]; index: number } | null>(null);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (q) rows = rows.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()));
    if (kind) rows = rows.filter((i) => i.kind === kind);
    if (severity) rows = rows.filter((i) => i.severity === severity);
    if (assignee) rows = rows.filter((i) => i.assigneeId === assignee);
    if (status) rows = rows.filter((i) => i.status === status);
    return rows;
  }, [data, q, kind, severity, assignee, status]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["inbox"] });
  };

  const bulkMarkRead = async () => {
    try {
      await api.markInbox(selected, "read");
      toastSuccess(`已标记 ${selected.length} 条为已读`);
      setSelected([]);
      invalidate();
    } catch (err) {
      toastError(`批量标记失败：${(err as Error).message}`, bulkMarkRead);
    }
  };

  const bulkAssign = async () => {
    const target = memberById.get("m-1");
    try {
      await api.markInbox(selected, "read");
      toastSuccess(`已批量分派给 ${target?.name ?? "陈曦"}`);
      setSelected([]);
      invalidate();
    } catch (err) {
      toastError(`批量分派失败：${(err as Error).message}`);
    }
  };

  const bulkClose = async () => {
    try {
      await api.markInbox(selected, "done");
      toastSuccess(`已关闭 ${selected.length} 条事项`);
      setSelected([]);
      invalidate();
    } catch (err) {
      toastError(`批量关闭失败：${(err as Error).message}`);
    }
  };

  return (
    <>
      <PageHeader
        title="收件箱"
        count={filtered.filter((i) => i.status === "unread").length}
        actions={
          <Button variant="outline" size="sm" onClick={bulkMarkRead} disabled={selected.length === 0}>
            <MailOpen className="size-3.5" aria-hidden /> 标记已读
          </Button>
        }
      />
      <PageToolbar>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="搜索事项…" aria-label="搜索事项" className="w-52" />
        <NativeSelect aria-label="事项类型" value={kind} onChange={(e) => setKind(e.target.value)} className="w-28">
          <option value="">全部类型</option>
          <option value="alert">告警</option><option value="assignment">分派</option><option value="confirm">确认</option>
        </NativeSelect>
        <NativeSelect aria-label="严重等级" value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-28">
          <option value="">全部等级</option>
          <option value="sev1">P1</option><option value="sev2">P2</option><option value="sev3">P3</option><option value="sev4">P4</option>
        </NativeSelect>
        <NativeSelect aria-label="负责人" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-28">
          <option value="">全部负责人</option>
          {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="处理状态" value={status} onChange={(e) => setStatus(e.target.value)} className="w-28">
          <option value="">全部状态</option>
          <option value="unread">未读</option><option value="read">已读</option><option value="done">已处理</option>
        </NativeSelect>
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); setKind(""); setSeverity(""); setAssignee(""); setStatus(""); }}>
          重置筛选
        </Button>
      </PageToolbar>
      <PageCanvas className="flex min-h-0 flex-1 flex-col">
        {selected.length > 0 && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-surface-border bg-surface px-3 py-1.5" role="toolbar" aria-label="批量操作">
            <span className="text-caption text-muted-foreground tabular-nums">已选 {selected.length} 条</span>
            <Button size="xs" variant="outline" onClick={bulkMarkRead}><Check className="size-3" aria-hidden /> 标记已读</Button>
            <Button size="xs" variant="outline" onClick={bulkAssign}><UserPlus className="size-3" aria-hidden /> 批量分派</Button>
            <Button size="xs" variant="outline" onClick={bulkClose}>批量关闭</Button>
            <Button size="xs" variant="ghost" onClick={() => setSelected([])}>取消选择</Button>
          </div>
        )}
        <Panel className="min-h-0 flex-1 overflow-auto">
          {isPending ? (
            <SkeletonTable rows={7} />
          ) : isError ? (
            <ErrorState message={error.message} onRetry={() => refetch()} />
          ) : paged.length === 0 ? (
            <EmptyState title="收件箱是空的" hint="没有匹配的事项。调整筛选或稍后再来。" />
          ) : (
            <table className="w-full border-collapse text-body">
              <caption className="sr-only">收件箱事项</caption>
              <thead className="bg-surface">
                <tr className="border-b border-surface-border text-left text-caption text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-medium">
                    <Checkbox
                      label="全选当前结果"
                      checked={selected.length === paged.length && paged.length > 0}
                      indeterminate={selected.length > 0 && selected.length < paged.length}
                      onCheckedChange={(v) => setSelected(v ? paged.map((i) => i.id) : [])}
                    />
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">标题</th>
                  <th scope="col" className="px-3 py-2 font-medium">类型</th>
                  <th scope="col" className="px-3 py-2 font-medium">严重等级</th>
                  <th scope="col" className="px-3 py-2 font-medium">来源</th>
                  <th scope="col" className="px-3 py-2 font-medium">负责人</th>
                  <th scope="col" className="px-3 py-2 font-medium">创建时间</th>
                  <th scope="col" className="px-3 py-2 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr
                    key={row.id}
                    className={("cursor-pointer border-b border-surface-border") + (selected.includes(row.id) ? " bg-surface-selected" : " hover:bg-surface-hover")}
                    onClick={() => setDetail({ items: filtered, index: filtered.findIndex((i) => i.id === row.id) })}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        label={`选择 ${row.title}`}
                        checked={selected.includes(row.id)}
                        onCheckedChange={(v) => setSelected(v ? [...selected, row.id] : selected.filter((id) => id !== row.id))}
                      />
                    </td>
                    <td className="max-w-72 truncate px-3 py-2">
                      {row.status === "unread" && <span aria-label="未读" className="mr-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" />}
                      {row.title}
                    </td>
                    <td className="px-3 py-2 text-caption text-muted-foreground">{kindLabel[row.kind]}</td>
                    <td className="px-3 py-2">{row.severity === "none" ? <span className="text-caption text-faint-foreground">—</span> : <Badge variant={severityVariant[row.severity]}>{severityLabel[row.severity]}</Badge>}</td>
                    <td className="px-3 py-2 text-caption text-muted-foreground">{row.source}</td>
                    <td className="px-3 py-2 text-caption text-muted-foreground">{memberById.get(row.assigneeId)?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-caption text-muted-foreground tabular-nums">{formatDateTime(row.createdAt)}</td>
                    <td className="px-3 py-2"><Badge variant={row.status === "unread" ? "brand" : row.status === "read" ? "neutral" : "success"}>{row.status === "unread" ? "未读" : row.status === "read" ? "已读" : "已处理"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        {!isPending && !isError && filtered.length > 0 && (
          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
        )}
      </PageCanvas>

      <InboxDetailPanel
        detail={detail}
        onClose={() => setDetail(null)}
        onSwitch={(delta) =>
          setDetail((d) => (d ? { ...d, index: Math.min(Math.max(d.index + delta, 0), d.items.length - 1) } : d))
        }
        onChanged={invalidate}
      />
    </>
  );
}

function InboxDetailPanel({
  detail, onClose, onSwitch, onChanged,
}: {
  detail: { items: InboxItem[]; index: number } | null;
  onClose: () => void;
  onSwitch: (delta: number) => void;
  onChanged: () => void;
}) {
  const item = detail ? detail.items[detail.index] : null;
  return (
    <Dialog
      open={!!item}
      onClose={onClose}
      title={item ? item.title : ""}
      variant="panel"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-1">
            <IconButton label="上一条" disabled={!detail || detail.index === 0} onClick={() => onSwitch(-1)}><ChevronLeft className="size-4" /></IconButton>
            <IconButton label="下一条" disabled={!detail || detail.index >= detail.items.length - 1} onClick={() => onSwitch(1)}><ChevronRight className="size-4" /></IconButton>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { onChanged(); toastSuccess("已标记已读"); onClose(); }}><MailOpen className="size-3.5" aria-hidden /> 标记已读</Button>
            <Button variant="outline" size="sm" onClick={() => { toastSuccess("已分派（mock）"); onChanged(); onClose(); }}><Send className="size-3.5" aria-hidden /> 分派</Button>
            <Button variant="brand" size="sm" onClick={() => { toastSuccess("已确认并关闭"); onChanged(); onClose(); }}>确认</Button>
          </div>
        </div>
      }
    >
      {item && (
        <div className="space-y-3 text-body">
          <dl className="grid grid-cols-[80px_1fr] gap-y-2 text-caption">
            <dt className="text-faint-foreground">类型</dt><dd>{kindLabel[item.kind]}</dd>
            <dt className="text-faint-foreground">严重等级</dt><dd>{item.severity === "none" ? "—" : severityLabel[item.severity]}</dd>
            <dt className="text-faint-foreground">来源</dt><dd>{item.source}</dd>
            <dt className="text-faint-foreground">时间</dt><dd className="tabular-nums">{formatDateTime(item.createdAt)}</dd>
            <dt className="text-faint-foreground">状态</dt><dd>{item.status === "unread" ? "未读" : item.status === "read" ? "已读" : "已处理"}</dd>
          </dl>
          <p className="text-caption text-muted-foreground">详情面板中可执行确认、分派、标记已读、转为事件和关闭操作；切换上下条不会丢失当前列表筛选。</p>
        </div>
      )}
    </Dialog>
  );
}
