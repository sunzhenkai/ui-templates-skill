import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Plus, User } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAppStore } from "@/stores/app-store"
import * as api from "@/mocks/api"
import type { Member, OnCallShift } from "@/types"

export default function OnCallPage() {
  const store = useAppStore()
  const [shifts, setShifts] = useState<OnCallShift[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"month" | "week" | "day">("week")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ memberId: "", start: "", end: "", note: "" })

  const load = async () => {
    setLoading(true)
    const [s, m] = await Promise.all([api.fetchOnCallShifts(store.currentWorkspaceId), api.fetchMembers(store.currentWorkspaceId)])
    setShifts(s)
    setMembers(m)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [store.currentWorkspaceId])

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const now = new Date()
  const [cursor, setCursor] = useState(now)
  const startOfWeek = new Date(cursor)
  startOfWeek.setDate(cursor.getDate() - cursor.getDay())
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  }), [startOfWeek])

  const createShift = async () => {
    if (!form.memberId || !form.start || !form.end) return
    await api.createShift({
      workspaceId: store.currentWorkspaceId,
      memberId: form.memberId,
      startAt: new Date(form.start).toISOString(),
      endAt: new Date(form.end).toISOString(),
      status: "scheduled",
      note: form.note,
    })
    store.addToast({ type: "success", title: "值班班次已创建" })
    setOpen(false)
    load()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        icon={<CalendarDays className="size-4" />}
        title="值班日历"
        description="查看与安排值班班次"
        actions={
          <>
            <div className="inline-flex rounded-lg border p-1">
              {(["month", "week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-2 py-1 text-caption ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {v === "month" ? "月" : v === "week" ? "周" : "日"}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">新建班次</span>
            </Button>
          </>
        }
      />

      <div className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => setCursor((d) => new Date(d.getTime() - 7 * 86400000))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-body font-medium text-foreground">
            {days[0].toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} - {days[6].toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setCursor((d) => new Date(d.getTime() + 7 * 86400000))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-stable">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <EmptyState icon={<CalendarDays className="size-5" />} title="暂无值班" description="当前周期没有值班班次" action={<Button onClick={() => setOpen(true)}>新建班次</Button>} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-7">
            {days.map((day) => {
              const dayShifts = shifts.filter((s) => {
                const sd = new Date(s.startAt).toDateString()
                return sd === day.toDateString()
              })
              return (
                <div key={day.toISOString()} className="min-h-[120px] rounded-lg border bg-surface p-2">
                  <div className="mb-2 text-caption font-medium text-foreground">{day.toLocaleDateString("zh-CN", { weekday: "short", day: "numeric" })}</div>
                  <div className="space-y-1.5">
                    {dayShifts.map((s) => {
                      const m = memberMap.get(s.memberId)
                      return (
                        <div key={s.id} className="rounded-md border border-border bg-background p-1.5 text-caption">
                          <div className="flex items-center gap-1.5">
                            <User className="size-3 text-muted-foreground" />
                            <span className="truncate font-medium">{m?.name ?? s.memberId}</span>
                          </div>
                          <div className="mt-1 text-micro text-muted-foreground">{new Date(s.startAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} - {new Date(s.endAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</div>
                          <Badge variant="outline" className="mt-1 text-micro">
                            {s.status === "active" ? "值班中" : s.status === "completed" ? "已完成" : "待值班"}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建值班班次</DialogTitle>
            <DialogDescription>创建一个新的值班班次</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label className="text-caption text-muted-foreground">值班人</label>
              <Select value={form.memberId} onValueChange={(v) => setForm((f) => ({ ...f, memberId: v }))} placeholder="选择成员">
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-caption text-muted-foreground">开始</label>
                <Input type="datetime-local" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-caption text-muted-foreground">结束</label>
                <Input type="datetime-local" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="text-caption text-muted-foreground">备注</label>
              <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="可选" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={createShift}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
