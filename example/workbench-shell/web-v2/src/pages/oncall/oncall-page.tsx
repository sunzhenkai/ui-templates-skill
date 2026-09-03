import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/app-shell/page-header'
import { Toolbar, ToolbarSection, ToolbarSeparator } from '@/components/app-shell/toolbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarStack } from '@/components/ui/avatar'
import { SkeletonList } from '@/components/shared/skeletons'
import { ErrorState } from '@/components/shared/error-state'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { OncallShift } from '@/lib/types'

type ViewMode = 'month' | 'week'

export function OncallPage() {
  const queryClient = useQueryClient()
  const [cursor, setCursor] = useState(new Date('2026-09-03T00:00:00+08:00'))
  const [view, setView] = useState<ViewMode>('month')
  const [editing, setEditing] = useState<{ start: Date; existing?: OncallShift } | null>(null)

  const shiftsQ = useQuery({ queryKey: ['shifts'], queryFn: api.shifts })
  const membersQ = useQuery({ queryKey: ['members'], queryFn: api.members })

  const days = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(cursor)
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
      return Array.from({ length: 42 }).map((_, i) => addDays(gridStart, i))
    }
    const weekStart = startOfWeek(cursor, { weekStartsOn: 1 })
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  }, [cursor, view])

  const upsert = useMutation({
    mutationFn: (shift: OncallShift) => api.upsertShift(shift),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('班次已保存')
      setEditing(null)
    },
    onError: (e) => {
      toast.error('保存失败', { description: e instanceof Error ? e.message : undefined })
    },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="值班日历"
        meta={format(cursor, view === 'month' ? 'yyyy 年 MM 月' : "'第' II '周 ('MM/dd')'")}
        description="点击空白格创建班次；点击已有班次编辑；同成员时间段重叠会触发冲突提示。"
        actions={
          <div className="flex h-8 rounded-md border border-input p-0.5">
            <button onClick={() => setView('month')} aria-pressed={view === 'month'} className={cn('inline-flex h-7 items-center gap-1 rounded-sm px-2 text-label font-medium', view === 'month' ? 'bg-surface text-foreground shadow-surface' : 'text-muted-foreground hover:text-foreground')}>月</button>
            <button onClick={() => setView('week')} aria-pressed={view === 'week'} className={cn('inline-flex h-7 items-center gap-1 rounded-sm px-2 text-label font-medium', view === 'week' ? 'bg-surface text-foreground shadow-surface' : 'text-muted-foreground hover:text-foreground')}>周</button>
          </div>
        }
      />

      <Toolbar>
        <ToolbarSection>
          <Button variant="outline" size="icon" aria-label="上一周期" onClick={() => setCursor(addDays(cursor, view === 'month' ? -30 : -7))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date('2026-09-03T00:00:00+08:00'))}>今天</Button>
          <Button variant="outline" size="icon" aria-label="下一周期" onClick={() => setCursor(addDays(cursor, view === 'month' ? 30 : 7))}>
            <ChevronRight className="size-4" />
          </Button>
        </ToolbarSection>
        <ToolbarSeparator />
        <ToolbarSection className="flex-1">
          <Badge variant="ghost" className="text-caption">
            <Users className="size-3" /> {(membersQ.data ?? []).filter((m) => m.active).length} 位活跃成员
          </Badge>
        </ToolbarSection>
        <ToolbarSection>
          <Button variant="brand" size="sm" onClick={() => setEditing({ start: new Date(cursor) })}>
            <Plus className="size-4" /> 新建班次
          </Button>
        </ToolbarSection>
      </Toolbar>

      <div className="flex-1 overflow-y-auto p-4">
        {shiftsQ.isPending ? (
          <SkeletonList rows={5} />
        ) : shiftsQ.isError ? (
          <ErrorState onRetry={() => shiftsQ.refetch()} description={shiftsQ.error instanceof Error ? shiftsQ.error.message : undefined} />
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <div className="grid grid-cols-7 border-b border-border text-micro uppercase tracking-wide text-muted-foreground">
              {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((d) => (
                <div key={d} className="px-3 py-2 text-center">{d}</div>
              ))}
            </div>
            <div className={cn('grid grid-cols-7', view === 'week' && 'min-h-[420px]')}>
              {days.map((day) => {
                const dayShifts = (shiftsQ.data ?? []).filter((s) => {
                  const start = new Date(s.start)
                  return isSameDay(start, day)
                })
                const isToday = isSameDay(day, new Date('2026-09-03T10:32:00+08:00'))
                const inMonth = day.getMonth() === cursor.getMonth()
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setEditing({ start: day })}
                    className={cn(
                      'group flex min-h-[88px] flex-col items-start gap-1 border-b border-r border-border p-2 text-left transition-colors hover:bg-accent/30',
                      view === 'month' && !inMonth && 'bg-muted/40 text-muted-foreground',
                      isToday && 'bg-brand/8',
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={cn('tabular text-micro font-medium', isToday && 'text-brand')}>{format(day, 'd')}</span>
                      {dayShifts.length > 0 ? <span className="size-1.5 rounded-full bg-brand" aria-hidden /> : null}
                    </div>
                    <div className="flex w-full flex-wrap gap-1">
                      {dayShifts.slice(0, 3).map((s) => {
                        const member = membersQ.data?.find((m) => m.id === s.memberId)
                        if (!member) return null
                        return (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1 rounded-md bg-brand/12 px-1 py-0.5 text-micro font-medium text-brand"
                            onClick={(e) => { e.stopPropagation(); setEditing({ start: day, existing: s }) }}
                          >
                            <Avatar initials={member.initials} color={member.color} className="size-3 text-[8px]" />
                            {s.level === 'primary' ? '主' : '副'}
                          </span>
                        )
                      })}
                      {dayShifts.length > 3 ? <span className="text-micro text-muted-foreground">+{dayShifts.length - 3}</span> : null}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-3 border-t border-border px-4 py-3 text-caption text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>共 {(shiftsQ.data ?? []).length} 个班次</span>
              <AvatarStack items={(membersQ.data ?? []).slice(0, 6).map((m) => ({ id: m.id, initials: m.initials, color: m.color }))} max={6} />
            </div>
          </div>
        )}
      </div>

      {editing ? (
        <ShiftEditor
          start={editing.start}
          existing={editing.existing}
          members={membersQ.data ?? []}
          onCancel={() => setEditing(null)}
          onSave={(shift) => upsert.mutate(shift)}
        />
      ) : null}
    </div>
  )
}

function ShiftEditor({ start, existing, members, onCancel, onSave }: {
  start: Date
  existing?: OncallShift
  members: { id: string; name: string; initials: string; color: string }[]
  onCancel: () => void
  onSave: (shift: OncallShift) => void
}) {
  const [memberId, setMemberId] = useState(existing?.memberId ?? members[0]?.id ?? '')
  const [level, setLevel] = useState<'primary' | 'secondary'>(existing?.level ?? 'primary')
  const [slot, setSlot] = useState<'day' | 'night'>(existing?.start.endsWith('T21:00:00+08:00') ? 'night' : 'day')

  function handle() {
    const startISO = format(start, 'yyyy-MM-dd') + (slot === 'day' ? 'T09:00:00+08:00' : 'T21:00:00+08:00')
    const endISO = format(slot === 'day' ? start : addDays(start, 1), 'yyyy-MM-dd') + (slot === 'day' ? 'T21:00:00+08:00' : 'T09:00:00+08:00')
    onSave({
      id: existing?.id ?? `shift-${start.toISOString()}-${memberId}`,
      memberId,
      level,
      start: startISO,
      end: endISO,
    })
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? '编辑班次' : '新建班次'} · {format(start, 'MM/dd')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>成员</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {members.filter((m) => m.id).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>班次</Label>
            <Select value={slot} onValueChange={(v) => setSlot(v as typeof slot)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">白班 09:00–21:00</SelectItem>
                <SelectItem value="night">夜班 21:00–次日 09:00</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>级别</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">主值班</SelectItem>
                <SelectItem value="secondary">副值班</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button variant="brand" onClick={handle}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
