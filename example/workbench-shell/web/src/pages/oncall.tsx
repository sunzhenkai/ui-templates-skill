import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarClock, Trash2 } from "lucide-react";
import { PageHeader, Toolbar } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, type CalendarDayMeta } from "@/components/ui/calendar";
import { TimeInput } from "@/components/ui/time-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/shell/confirm-dialog";
import { getMembers, getShifts, getTeams, deleteShift, upsertShift, MockError } from "@/mock/api";
import { toastError, toastSuccess } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Shift } from "@/types/domain";

type View = "month" | "week" | "day";

/** 值班日历（ROUTE-005-A）：月/周/日视图 + 班次编辑与冲突检测（AX-082..085）。 */
export function OncallPage() {
  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as View) ?? "month";
  const team = params.get("team") ?? "all";
  const anchor = params.get("date") ?? format(new Date(), "yyyy-MM-dd");
  const [month, setMonth] = useState(parseISO(anchor));
  const [selected, setSelected] = useState(anchor);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Shift | null>(null);

  const qc = useQueryClient();
  const shifts = useQuery({ queryKey: ["shifts"], queryFn: getShifts });
  const teams = useQuery({ queryKey: ["teams"], queryFn: getTeams });
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });

  const filtered = useMemo(
    () => (shifts.data ?? []).filter((s) => team === "all" || s.team === team),
    [shifts.data, team],
  );

  const memberName = (id: string) => members.data?.find((m) => m.id === id)?.name ?? id;

  const upsert = useMutation({
    mutationFn: upsertShift,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      setEditing(null);
      setCreating(null);
      toastSuccess("班次已保存");
    },
    onError: (e) =>
      toastError("保存失败", e instanceof MockError ? e.message : "请重试", {
        label: "重试",
        onClick: () => upsert.mutate(upsert.variables!),
      }),
  });

  const remove = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      setDeleting(null);
      toastSuccess("班次已删除");
    },
    onError: () => toastError("删除失败", "请重试"),
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const badges = useMemo<Record<string, CalendarDayMeta>>(() => {
    const map: Record<string, CalendarDayMeta> = {};
    const nameOf = (id: string) => members.data?.find((m) => m.id === id)?.name ?? id;
    filtered.forEach((s) => {
      map[s.date] = map[s.date] ?? { badges: [] };
      map[s.date].badges!.push({
        label: `${s.slot === "day" ? "白班" : "夜班"} ${nameOf(s.member)}`,
        tone: s.slot === "day" ? "brand" : "info",
      });
    });
    return map;
  }, [filtered, members.data]);

  const weekDays = useMemo(() => {
    const base = parseISO(selected);
    return Array.from({ length: 7 }, (_, i) => format(addDays(base, i - ((base.getDay() + 6) % 7)), "yyyy-MM-dd"));
  }, [selected]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="值班日历"
        icon={<CalendarClock />}
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreating(selected)}
          >
            新建班次
          </Button>
        }
      />
      <Toolbar>
        <Select items={viewItems} value={view} onValueChange={(v) => setParam("view", (v as string) ?? "month")}>
          <SelectTrigger className="h-7 w-24" aria-label="日历视图">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">月</SelectItem>
            <SelectItem value="week">周</SelectItem>
            <SelectItem value="day">日</SelectItem>
          </SelectContent>
        </Select>
        <Select items={teamItems(teams.data ?? [])} value={team} onValueChange={(v) => setParam("team", v as string)}>
          <SelectTrigger className="h-7 w-28" aria-label="团队筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部团队</SelectItem>
            {(teams.data ?? []).map((t) => (
              <SelectItem key={t.id} value={t.name}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-caption text-muted-foreground" aria-live="polite">
          {format(parseISO(selected), "M月d日 EEEE", { locale: zhCN })}
        </span>
      </Toolbar>

      <div className="min-h-0 flex-1 overflow-y-auto p-[var(--layout-page-gutter)]" role="region" aria-label="值班日历">
        {shifts.isLoading ? (
          <div aria-busy="true" className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : shifts.isError ? (
          <Alert variant="destructive" title="班次加载失败" action={
            <Button variant="outline" size="sm" onClick={() => shifts.refetch()}>重试</Button>
          }>
            模拟请求失败，可点击重试。
          </Alert>
        ) : view === "month" ? (
          <Calendar
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(iso) => {
              setSelected(iso);
              setParam("date", iso);
            }}
            dayMeta={badges}
          />
        ) : view === "week" ? (
          <div className="grid grid-cols-7 gap-2" role="grid" aria-label="周视图">
            {weekDays.map((iso) => (
              <DayCell key={iso} iso={iso} shifts={filtered.filter((s) => s.date === iso)} onSelect={() => { setSelected(iso); setParam("date", iso); }} onEdit={setEditing} onDelete={setDeleting} selected={selected === iso} />
            ))}
          </div>
        ) : (
          <DayCell
            iso={selected}
            wide
            shifts={filtered.filter((s) => s.date === selected)}
            onEdit={setEditing}
            onDelete={setDeleting}
            selected
          />
        )}
      </div>

      {(editing || creating) && (
      <ShiftEditor
        key={editing?.id ?? creating ?? "none"}
        date={editing?.date ?? creating ?? selected}
        shift={editing}
        teams={teams.data ?? []}
        members={members.data ?? []}
        onCancel={() => {
          setEditing(null);
          setCreating(null);
        }}
        onSubmit={(s) => upsert.mutate(s)}
        pending={upsert.isPending}
      />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="删除班次"
        description={deleting ? `确认删除 ${deleting.date} ${deleting.slot === "day" ? "白班" : "夜班"}（${memberName(deleting.member)}）？` : ""}
        confirmLabel="删除"
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}

function DayCell({
  iso,
  shifts,
  onEdit,
  onDelete,
  onSelect,
  selected,
  wide,
}: {
  iso: string;
  shifts: Shift[];
  onEdit: (s: Shift) => void;
  onDelete: (s: Shift) => void;
  onSelect?: () => void;
  selected?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      role="gridcell"
      aria-selected={selected}
      className={cn(
        "flex min-h-28 flex-col gap-1.5 rounded-md border border-surface-border bg-card p-2 outline-none",
        selected && "ring-2 ring-inset ring-brand",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-caption text-muted-foreground">{iso.slice(5)}</span>
        {onSelect && (
          <Button variant="ghost" size="icon-sm" aria-label={`查看 ${iso} 详情`} onClick={onSelect}>
            ›
          </Button>
        )}
      </div>
      {shifts.length === 0 ? (
        <p className="my-4 text-center text-micro text-faint-foreground">无班次</p>
      ) : (
        shifts.map((s) => (
          <Popover key={s.id}>
            <PopoverTrigger
              render={(props: React.ComponentProps<"button">) => (
                <button
                  {...props}
                  className={cn(
                    "flex items-center justify-between gap-1 rounded-xs px-1.5 py-1 text-micro outline-none focus-visible:outline-3 focus-visible:outline-ring/60",
                    s.slot === "day" ? "bg-brand/15 text-brand" : "bg-info/15 text-info",
                  )}
                >
                  <span className="truncate">{s.slot === "day" ? "白班" : "夜班"}</span>
                  <span className="font-mono">{s.id.slice(-4)}</span>
                </button>
              )}
            />
            <PopoverContent className="w-56 p-3">
              <p className="text-label font-medium">{s.slot === "day" ? "白班" : "夜班"} · {s.team}</p>
              <p className="mt-1 text-caption text-muted-foreground">成员：{s.member}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => onEdit(s)}>
                  编辑
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(s)}>
                  <Trash2 className="size-3.5" aria-hidden /> 删除
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ))
      )}
      {wide && <p className="text-micro text-faint-foreground">点击班次可编辑或删除。</p>}
    </div>
  );
}

function ShiftEditor({
  date,
  shift,
  teams,
  members,
  onCancel,
  onSubmit,
  pending,
}: {
  date: string;
  shift: Shift | null;
  teams: { id: string; name: string }[];
  members: { id: string; name: string }[];
  onCancel: () => void;
  onSubmit: (s: Omit<Shift, "id"> & { id?: string }) => void;
  pending: boolean;
}) {
  const [team, setTeam] = useState(shift?.team ?? teams[0]?.name ?? "");
  const [member, setMember] = useState(shift?.member ?? members[0]?.id ?? "");
  const [slot, setSlot] = useState<"day" | "night">(shift?.slot ?? "day");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");

  return (
    <Popover open onOpenChange={(o) => !o && onCancel()}>
      <PopoverTrigger nativeButton={false} render={(props: React.ComponentProps<"span">) => <span {...props} aria-hidden className="fixed" />} />
      <PopoverContent align="end" className="w-80 p-4">
        <p className="text-title-sm font-semibold">{shift ? "编辑班次" : "新建班次"}</p>
        <p className="mt-0.5 text-caption text-muted-foreground">{date}</p>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-label font-medium" id="sh-team">团队</span>
            <Select items={teamItems(teams)} value={team} onValueChange={(v) => setTeam(v as string)}>
              <SelectTrigger aria-labelledby="sh-team" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.name}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label font-medium" id="sh-member">成员</span>
            <Select items={memberItems(members)} value={member} onValueChange={(v) => setMember(v as string)}>
              <SelectTrigger aria-labelledby="sh-member" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label font-medium">时段</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label="时段">
              {(["day", "night"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={slot === s}
                  onClick={() => setSlot(s)}
                  className={cn(
                    "h-8 flex-1 rounded-md border border-input text-label outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring/60",
                    slot === s && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {s === "day" ? "白班" : "夜班"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TimeInput value={start} onChange={(e) => setStart(e.target.value)} aria-label="开始时间" />
            <span aria-hidden>—</span>
            <TimeInput value={end} onChange={(e) => setEnd(e.target.value)} aria-label="结束时间" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button
              onClick={() =>
                onSubmit({
                  id: shift?.id,
                  team,
                  member,
                  date,
                  slot,
                })
              }
              disabled={pending}
              aria-busy={pending}
            >
              保存
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const viewItems = [
  { value: "month", label: "月" },
  { value: "week", label: "周" },
  { value: "day", label: "日" },
];
function teamItems(teams: { id: string; name: string }[]) {
  return [{ value: "all", label: "全部团队" }, ...teams.map((t) => ({ value: t.name, label: t.name }))];
}
function memberItems(members: { id: string; name: string }[]) {
  return members.map((m) => ({ value: m.id, label: m.name }));
}
