import { CollectionSkeleton, EmptyState, ErrorState, PageHeader, Toolbar } from "@/components/shared/chrome"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { deleteShift, listIncidents, listMembers, listShifts, listTeams, shiftFormSchema, upsertShift } from "@/lib/api/client"
import { formatDate } from "@/lib/labels"
import { keys, queryClient } from "@/lib/query"
import { useShellMode } from "@/hooks/use-shell-mode"
import type { CalendarView, OncallShift } from "@/types/domain"
import { addDays, addMonths, addWeeks, format, startOfWeek } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"

export function OncallPage() {
  const { workspaceId = "ws-alpha" } = useParams()
  const [params, setParams] = useSearchParams()
  const view = (params.get("view") ?? "month") as CalendarView
  const cursor = new Date(params.get("date") ?? "2026-09-04")
  const mode = useShellMode()
  const shifts = useQuery({ queryKey: keys.shifts(workspaceId), queryFn: () => listShifts(workspaceId) })
  const teams = useQuery({ queryKey: keys.teams(workspaceId), queryFn: () => listTeams(workspaceId) })
  const members = useQuery({ queryKey: keys.members(workspaceId), queryFn: () => listMembers(workspaceId) })
  const incidents = useQuery({ queryKey: keys.incidents(workspaceId), queryFn: () => listIncidents(workspaceId) })
  const [editing, setEditing] = useState<Partial<OncallShift> | null>(null)
  const [force, setForce] = useState(false)
  const [error, setError] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const teamFilter = params.get("team") ?? ""

  const filtered = (shifts.data ?? []).filter((item) => !teamFilter || item.teamId === teamFilter)
  const selectedDay = format(cursor, "yyyy-MM-dd")
  const dayShifts = filtered.filter((item) => item.startAt.slice(0, 10) <= selectedDay && item.endAt.slice(0, 10) >= selectedDay)

  function move(delta: number) {
    const next = view === "month" ? addMonths(cursor, delta) : view === "week" ? addWeeks(cursor, delta) : addDays(cursor, delta)
    const copy = new URLSearchParams(params)
    copy.set("date", format(next, "yyyy-MM-dd"))
    setParams(copy)
  }

  const mutation = useMutation({
    mutationFn: async (input: typeof editing) => {
      const parsed = shiftFormSchema.parse({
        teamId: input?.teamId || teams.data?.[0]?.id || "",
        memberId: input?.memberId || members.data?.[0]?.id || "",
        startAt: input?.startAt || new Date().toISOString(),
        endAt: input?.endAt || addDays(new Date(), 1).toISOString(),
        handoffToId: input?.handoffToId ?? null,
        note: input?.note ?? "",
        force,
      })
      return upsertShift(workspaceId, { ...parsed, id: input?.id })
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: keys.shifts(workspaceId) }); toast.success("班次已保存"); setEditing(null); setError("") },
    onError: (err) => setError(err.message),
  })

  const monthLabel = format(cursor, "yyyy年M月", { locale: zhCN })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader title="值班日历" description={monthLabel} actions={<Button size="sm" onClick={() => setEditing({ startAt: cursor.toISOString(), endAt: addDays(cursor, 1).toISOString() })}>创建班次</Button>} />
      <Toolbar>
        <ToggleGroup value={[view]} onValueChange={(value) => { const next = value[0]; if (next) { const copy = new URLSearchParams(params); copy.set("view", next); setParams(copy) } }}>
          <ToggleGroupItem value="month">月</ToggleGroupItem>
          <ToggleGroupItem value="week">周</ToggleGroupItem>
          <ToggleGroupItem value="day">日</ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" variant="outline" onClick={() => move(-1)}>上一段</Button>
        <Button size="sm" variant="outline" onClick={() => { const copy = new URLSearchParams(params); copy.set("date", "2026-09-04"); setParams(copy) }}>今天</Button>
        <Button size="sm" variant="outline" onClick={() => move(1)}>下一段</Button>
        <Select value={teamFilter} onValueChange={(value) => typeof value === "string" && setParams((current) => { current.set("team", value); return current })}>
          <SelectTrigger aria-label="按团队过滤"><SelectValue placeholder="团队" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部团队</SelectItem>
            {(teams.data ?? []).map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Toolbar>
      <div className="min-h-0 flex-1 overflow-auto p-[var(--page-gutter)] pb-[var(--chat-fab-clearance)]">
        {shifts.isLoading ? <CollectionSkeleton /> : null}
        {shifts.isError ? <ErrorState message="值班数据加载失败" onRetry={() => void shifts.refetch()} /> : null}
        {shifts.isSuccess && filtered.length === 0 ? <EmptyState title="无排班" description="创建班次开始值班。" /> : null}
        {mode === "narrow" ? (
          <div className="grid gap-3">
            <div className="flex flex-col gap-2">
              {Array.from({ length: 7 }).map((_, index) => {
                const date = addDays(startOfWeek(cursor, { weekStartsOn: 1 }), index)
                return (
                  <Button key={index} variant="outline" onClick={() => { const copy = new URLSearchParams(params); copy.set("date", format(date, "yyyy-MM-dd")); copy.set("view", "day"); setParams(copy) }}>{format(date, "MM-dd")}</Button>
                )
              })}
            </div>
            <DayPanel shifts={dayShifts} incidents={incidents.data ?? []} members={members.data ?? []} onEdit={setEditing} onDelete={setDeleteId} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <Calendar mode="single" selected={cursor} onSelect={(date) => { if (!date) return; const copy = new URLSearchParams(params); copy.set("date", format(date, "yyyy-MM-dd")); setParams(copy) }} locale={zhCN} />
            <DayPanel shifts={dayShifts} incidents={incidents.data ?? []} members={members.data ?? []} onEdit={setEditing} onDelete={setDeleteId} />
          </div>
        )}
      </div>
      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "编辑班次" : "创建班次"}</DialogTitle></DialogHeader>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel>开始时间</FieldLabel>
              <Input type="datetime-local" value={editing?.startAt?.slice(0, 16) ?? ""} onChange={(event) => setEditing((current) => ({ ...current, startAt: new Date(event.target.value).toISOString() }))} />
            </Field>
            <Field>
              <FieldLabel>结束时间</FieldLabel>
              <Input type="datetime-local" value={editing?.endAt?.slice(0, 16) ?? ""} onChange={(event) => setEditing((current) => ({ ...current, endAt: new Date(event.target.value).toISOString() }))} />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={force} onCheckedChange={(value) => setForce(Boolean(value))} />
              强制保存重叠班次
            </label>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
            <Button onClick={() => mutation.mutate(editing)} disabled={mutation.isPending}>{mutation.isPending ? "保存中" : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除班次？</AlertDialogTitle>
            <AlertDialogDescription>删除后不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && void deleteShift(deleteId).then(() => queryClient.invalidateQueries())}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DayPanel({
  shifts,
  incidents,
  members,
  onEdit,
  onDelete,
}: {
  shifts: OncallShift[]
  incidents: { id: string; title: string; startedAt: string; number: string }[]
  members: { id: string; name: string }[]
  onEdit: (shift: Partial<OncallShift>) => void
  onDelete: (id: string) => void
}) {
  if (shifts.length === 0) return <EmptyState title="当日无排班" description="可以创建新的班次。" />
  return (
    <div className="space-y-3">
      {shifts.map((shift) => (
        <div key={shift.id} className="rounded-lg border bg-[var(--surface)] p-3">
          <p>{members.find((member) => member.id === shift.memberId)?.name} · {formatDate(shift.startAt)} - {formatDate(shift.endAt)}</p>
          <p className="text-sm text-muted-foreground">{shift.note || "无备注"}</p>
          <p className="text-sm">期间事件 {incidents.filter((item) => item.startedAt >= shift.startAt && item.startedAt <= shift.endAt).length} 个</p>
          <div className="mt-2 flex gap-2">
            <Button size="xs" variant="outline" onClick={() => onEdit(shift)}>编辑</Button>
            <Button size="xs" variant="outline" onClick={() => {
              const { id: _id, ...copy } = shift
              onEdit({ ...copy, note: `${shift.note} 副本` })
            }}>复制</Button>
            <Button size="xs" variant="destructive" onClick={() => onDelete(shift.id)}>删除</Button>
            <Button size="xs" variant="ghost" render={<Link to="../incidents" />} />查看事件
          </div>
        </div>
      ))}
    </div>
  )
}
