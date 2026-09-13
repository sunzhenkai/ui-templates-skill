/** 值班日历（route/oncall-calendar）：月/周/日视图 + 班次表单（冲突/校验）+ 移动端议程。 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, eachDayOfInterval } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { api, type Shift } from "../../data/mock";
import { cn, formatDate } from "../../lib";
import { useAppConfirm } from "../../stores";
import {
  Badge, Button, Dialog, EmptyState, ErrorState, Field, IconButton, Input, NativeSelect,
  SegmentedControl, Skeleton,
} from "../../components/ui";
import { toastError, toastSuccess } from "../../components/ui/toast";
import { PageCanvas, PageHeader, PageToolbar, Panel } from "../../components/shell/page";

type View = "month" | "week" | "day";

export function OnCallPage() {
  const qc = useQueryClient();
  const askConfirm = useAppConfirm();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["shifts"], queryFn: api.listShifts });
  const { data: incidents } = useQuery({ queryKey: ["incidents"], queryFn: api.listIncidents });
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: api.listTeams });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers });
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date("2026-09-13T00:00:00+08:00"));
  const [team, setTeam] = useState("");
  const [member, setMember] = useState("");
  const [form, setForm] = useState<{ open: boolean; shift?: Shift; date?: Date }>({ open: false });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);
  const teamById = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t])), [teams]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (team) rows = rows.filter((s) => s.teamId === team);
    if (member) rows = rows.filter((s) => s.memberId === member);
    return rows;
  }, [data, team, member]);

  const range = useMemo((): Date[] => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    if (view === "week") {
      return eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) });
    }
    return [cursor];
  }, [view, cursor]);

  const shiftsOn = (d: Date) => filtered.filter((s) => isSameDay(parseISO(s.start), d));
  const incidentsOn = (d: Date) => (incidents ?? []).filter((i) => isSameDay(parseISO(i.startedAt), d));

  const step = (dir: 1 | -1) => {
    if (view === "month") setCursor((c) => addMonths(c, dir));
    else if (view === "week") setCursor((c) => addDays(c, 7 * dir));
    else setCursor((c) => addDays(c, dir));
  };

  const removeShift = async (shift: Shift) => {
    const ok = await askConfirm({ title: "删除班次", body: `${memberById.get(shift.memberId)?.name ?? ""} 的班次将被删除。`, confirmLabel: "删除", danger: true });
    if (!ok) return;
    try {
      await api.deleteShift(shift.id);
      toastSuccess("班次已删除");
      await qc.invalidateQueries({ queryKey: ["shifts"] });
    } catch (err) {
      toastError(`删除失败：${(err as Error).message}`);
    }
  };

  return (
    <>
      <PageHeader
        title="值班日历"
        count={filtered.length}
        actions={
          <Button variant="brand" size="sm" onClick={() => setForm({ open: true, date: cursor })}>
            <Plus className="size-3.5" aria-hidden /> 创建班次
          </Button>
        }
      />
      <PageToolbar>
        <SegmentedControl
          ariaLabel="日历视图"
          value={view}
          onChange={(k) => setView(k as View)}
          options={[{ key: "month", label: "月" }, { key: "week", label: "周" }, { key: "day", label: "日" }]}
        />
        <IconButton label="上一周期" variant="outline" onClick={() => step(-1)}><ChevronLeft className="size-4" /></IconButton>
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date("2026-09-13T00:00:00+08:00"))}>今天</Button>
        <IconButton label="下一周期" variant="outline" onClick={() => step(1)}><ChevronRight className="size-4" /></IconButton>
        <span className="text-label font-medium">{format(cursor, view === "day" ? "yyyy-MM-dd EEEE" : "yyyy年M月", { locale: zhCN })}</span>
        <div className="ml-auto flex gap-2">
          <NativeSelect aria-label="按团队过滤" value={team} onChange={(e) => setTeam(e.target.value)} className="w-32">
            <option value="">全部团队</option>
            {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="按人员过滤" value={member} onChange={(e) => setMember(e.target.value)} className="w-28">
            <option value="">全部人员</option>
            {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </NativeSelect>
        </div>
      </PageToolbar>
      <PageCanvas className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : isError ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <Panel className="overflow-hidden">
              {view === "day" ? (
                <DayAgenda day={cursor} shifts={shiftsOn(cursor)} incidents={incidentsOn(cursor)} memberById={memberById} onOpen={(s) => setForm({ open: true, shift: s })} onRemove={removeShift} />
              ) : (
                <div className="grid grid-cols-7 max-lg:hidden">
                  {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
                    <div key={w} className="border-b border-surface-border px-2 py-1.5 text-center text-micro text-muted-foreground">周{w}</div>
                  ))}
                  {range.map((d) => {
                    const dayShifts = shiftsOn(d);
                    const inMonth = isSameMonth(d, cursor);
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => setSelectedDay(d)}
                        onDoubleClick={() => setForm({ open: true, date: d })}
                        aria-label={`${format(d, "M月d日")}，${dayShifts.length} 个班次`}
                        className={cn(
                          "min-h-24 border-b border-r border-surface-border p-1.5 text-left align-top",
                          !inMonth && "opacity-40",
                          isSameDay(d, new Date("2026-09-13T00:00:00+08:00")) && "bg-brand-subtle",
                        )}
                      >
                        <span className="text-micro tabular-nums text-muted-foreground">{format(d, "d")}</span>
                        <div className="mt-1 space-y-1">
                          {dayShifts.slice(0, 2).map((s) => (
                            <span key={s.id} className="block truncate rounded-sm bg-brand-subtle px-1 text-micro text-brand" title={`${memberById.get(s.memberId)?.name} ${s.note}`}>
                              {memberById.get(s.memberId)?.name} · {s.note || "值班"}
                            </span>
                          ))}
                          {dayShifts.length > 2 && <span className="text-micro text-faint-foreground">+{dayShifts.length - 2}</span>}
                          {incidentsOn(d).length > 0 && (
                            <span className="block text-micro text-destructive">{incidentsOn(d).length} 起事件</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* 移动端议程列表（RESP-102：不要求完整月历网格） */}
              <ul className="divide-y divide-[color:var(--surface-border)] max-lg:block lg:hidden">
                {range.map((d) => (
                  <li key={d.toISOString()} className="flex items-center justify-between px-3 py-2 text-caption">
                    <span className="tabular-nums">{formatDate(d.toISOString())}</span>
                    <span>{shiftsOn(d).map((s) => memberById.get(s.memberId)?.name).join("、") || "无排班"}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <aside aria-label="当天详情">
              <Panel className="p-3">
                <h2 className="text-label font-medium">
                  <CalendarDays className="mr-1 inline size-3.5" aria-hidden />
                  {selectedDay ? `${format(selectedDay, "M月d日")} 详情` : "点击日期查看当天详情"}
                </h2>
                {selectedDay && (
                  <div className="mt-2 space-y-1.5 text-caption">
                    {shiftsOn(selectedDay).length === 0 && incidentsOn(selectedDay).length === 0 && (
                      <p className="text-muted-foreground">当日无班次、无事件。</p>
                    )}
                    {shiftsOn(selectedDay).map((s) => (
                      <p key={s.id}>{memberById.get(s.memberId)?.name} 值班（{s.note || "—"}）</p>
                    ))}
                    {incidentsOn(selectedDay).map((i) => (
                      <p key={i.id} className="text-destructive">{i.key} {i.title}</p>
                    ))}
                  </div>
                )}
              </Panel>
            </aside>
          </div>
        )}
      </PageCanvas>
      <ShiftFormDialog
        open={form.open}
        shift={form.shift}
        initialDate={form.date}
        teamById={teamById}
        memberById={memberById}
        onClose={() => setForm({ open: false })}
        onSaved={() => { void qc.invalidateQueries({ queryKey: ["shifts"] }); setForm({ open: false }); }}
      />
    </>
  );
}

function DayAgenda({
  day, shifts, incidents, memberById, onOpen, onRemove,
}: {
  day: Date;
  shifts: Shift[];
  incidents: { id: string; key: string; title: string }[];
  memberById: Map<string, { id: string; name: string }>;
  onOpen: (s: Shift) => void;
  onRemove: (s: Shift) => void;
}) {
  return (
    <div className="p-3">
      <p className="text-caption text-muted-foreground">{format(day, "yyyy-MM-dd EEEE", { locale: zhCN })}</p>
      {shifts.length === 0 && incidents.length === 0 ? (
        <EmptyState title="当日无安排" hint="无班次、无事件。" />
      ) : (
        <ul className="mt-2 space-y-2">
          {shifts.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
              <span className="text-body">
                {memberById.get(s.memberId)?.name} <span className="text-caption text-muted-foreground">{format(parseISO(s.start), "HH:mm")}–{format(parseISO(s.end), "HH:mm")} {s.note}</span>
              </span>
              <span className="flex gap-1">
                <IconButton label="编辑班次" size="icon-xs" onClick={() => onOpen(s)}>✎</IconButton>
                <IconButton label="删除班次" size="icon-xs" onClick={() => void onRemove(s)}>🗑</IconButton>
              </span>
            </li>
          ))}
          {incidents.map((i) => (
            <li key={i.id} className="flex items-center gap-2 text-caption text-destructive">
              <Badge variant="critical">{i.key}</Badge> {i.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ShiftFormDialog({
  open, shift, initialDate, teamById, memberById, onClose, onSaved,
}: {
  open: boolean;
  shift?: Shift;
  initialDate?: Date;
  teamById: Map<string, { id: string; name: string }>;
  memberById: Map<string, { id: string; name: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => ({
    teamId: shift?.teamId ?? "team-sre",
    memberId: shift?.memberId ?? "m-1",
    start: shift?.start ?? (initialDate ? format(initialDate, "yyyy-MM-dd") + "T09:00" : "2026-09-13T09:00"),
    end: shift?.end ?? (initialDate ? format(initialDate, "yyyy-MM-dd") + "T21:00" : "2026-09-13T21:00"),
    handoffId: shift?.handoffId ?? "",
    note: shift?.note ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = (force: boolean) => {
    setSaving(true);
    setError(null);
    api.upsertShift({
      id: shift?.id,
      teamId: form.teamId,
      memberId: form.memberId,
      start: new Date(form.start).toISOString(),
      end: new Date(form.end).toISOString(),
      handoffId: form.handoffId || null,
      note: force ? `${form.note}（强制保存）` : form.note,
    })
      .then(() => {
        toastSuccess(shift ? "班次已更新" : "班次已创建");
        onSaved();
      })
      .catch((err: Error) => {
        if (err.message.includes("重叠")) {
          setError(`${err.message}。可选择强制保存。`);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={shift ? "编辑班次" : "创建班次"}
      widthClass="max-w-md"
      footer={
        <>
          {shift && (
            <Button variant="destructive-surface" onClick={() => void api.deleteShift(shift.id).then(() => { toastSuccess("已删除"); onSaved(); })}>
              删除
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => save(false)} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="团队">
          {(p) => (
            <NativeSelect {...p} value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              {[...teamById.values()].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </NativeSelect>
          )}
        </Field>
        <Field label="值班人员">
          {(p) => (
            <NativeSelect {...p} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              {[...memberById.values()].map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </NativeSelect>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="开始时间">
            {(p) => <Input {...p} type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />}
          </Field>
          <Field label="结束时间">
            {(p) => <Input {...p} type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />}
          </Field>
        </div>
        <Field label="交接对象">
          {(p) => (
            <NativeSelect {...p} value={form.handoffId} onChange={(e) => setForm({ ...form, handoffId: e.target.value })}>
              <option value="">无</option>
              {[...memberById.values()].map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </NativeSelect>
          )}
        </Field>
        <Field label="备注">
          {(p) => <Input {...p} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />}
        </Field>
        {error && (
          <div role="alert" className="rounded-md bg-destructive-surface p-2 text-caption text-destructive">
            {error}
            {error.includes("重叠") && (
              <Button variant="destructive-surface" size="xs" className="ml-2" onClick={() => save(true)}>强制保存</Button>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
