import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { NavigationTrigger } from '@/components/layout/app-shell'
import { PageHeader, Toolbar } from '@/components/layout/page-header'
import { Badge, Button, Field, Input, SegmentedControl, Select, Skeleton, StateView, Textarea } from '@/components/ui/primitives'
import { ConfirmDialog, Dialog } from '@/components/ui/overlay'
import { useSimulatedLoad } from '@/lib/page-load'
import { formatDateTime, uniqueId } from '@/lib/utils'
import type { Shift } from '@/types'

type View = 'month' | 'week' | 'day'
type FormState = Omit<Shift, 'id'> & { id?: string; force?: boolean }


function startOfDay(value: Date) { const next = new Date(value); next.setHours(0, 0, 0, 0); return next }
function addDays(value: Date, count: number) { const next = startOfDay(value); next.setDate(next.getDate() + count); return next }
function startOfWeek(value: Date) { const next = startOfDay(value); return addDays(next, -next.getDay()) }
function startOfMonth(value: Date) { const next = startOfDay(value); next.setDate(1); return next }
function sameDay(left: Date, right: Date) { return startOfDay(left).getTime() === startOfDay(right).getTime() }
function localInput(value: string) { return new Date(value).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16) }

export function OncallPage() {
  const { data, updateData, showToast } = useApp()
  const [params, setParams] = useSearchParams()
  const load = useSimulatedLoad('oncall')
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()))
  const [form, setForm] = useState<FormState>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string>()
  const [shiftDetail, setShiftDetail] = useState<string>()
  const [dragId, setDragId] = useState<string>()
  const get = (key: string) => params.get(key) ?? ''
  const view = (params.get('view') ?? 'month') as View
  const patch = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => { if (!value) next.delete(key); else next.set(key, value) })
    setParams(next)
  }
  const teamFilter = get('teamId')
  const memberFilter = get('memberId')
  const shifts = useMemo(() => (data?.shifts ?? []).filter(shift => (!teamFilter || shift.teamId === teamFilter) && (!memberFilter || shift.memberId === memberFilter)), [data, memberFilter, teamFilter])
  const rangeStart = view === 'month' ? startOfWeek(startOfMonth(cursor)) : view === 'week' ? startOfWeek(cursor) : startOfDay(cursor)
  const rangeDays = view === 'month' ? 42 : view === 'week' ? 7 : 1
  const days = useMemo(() => Array.from({ length: rangeDays }, (_, index) => addDays(rangeStart, index)), [rangeDays, rangeStart])
  const selectedShifts = shifts.filter(shift => sameDay(new Date(shift.start), selectedDay))
  const detailShift = data?.shifts.find(shift => shift.id === shiftDetail)

  if (load.loading) return <div className="min-h-0 flex-1 p-4"><Skeleton className="h-12" /><div className="mt-3 grid gap-2">{[0,1,2,3,4].map(index => <Skeleton key={index} className="h-16" />)}</div></div>
  if (load.error) return <StateView tone="danger" className="flex-1" icon="!" title="值班日历加载失败" description={load.error.message} action={<Button variant="primary" onClick={load.reload}>重试</Button>} />
  if (!data) return null

  const shiftEvents = (day: Date) => data.incidents.filter(incident => sameDay(new Date(incident.startedAt), day) && (!teamFilter || incident.teamIds.includes(teamFilter)))
  const shiftForm = (base?: Shift) => ({
    id: base?.id,
    teamId: base?.teamId ?? data.teams[0].id,
    memberId: base?.memberId ?? data.members[0].id,
    start: base?.start ?? new Date().toISOString(),
    end: base?.end ?? new Date(Date.now() + 8 * 3600_000).toISOString(),
    handoverId: base?.handoverId,
    note: base?.note ?? '',
    force: false,
  })
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => current ? { ...current, [key]: value } : current)

  const moveShift = (id: string, day: Date) => {
    const shift = data.shifts.find(item => item.id === id)
    if (!shift) return
    const duration = new Date(shift.end).getTime() - new Date(shift.start).getTime()
    const start = new Date(day); start.setHours(new Date(shift.start).getHours(), new Date(shift.start).getMinutes())
    const next = { ...shift, start: start.toISOString(), end: new Date(start.getTime() + duration).toISOString() }
    updateData(current => ({ ...current, shifts: current.shifts.map(item => item.id === id ? next : item) }))
    showToast({ tone: 'success', title: '班次已调整', description: `${formatDateTime(next.start)} → ${formatDateTime(next.end)}` })
  }

  const submit = async () => {
    if (!form) return
    const next: Record<string, string> = {}
    if (new Date(form.end).getTime() <= new Date(form.start).getTime()) next.end = '结束时间必须晚于开始时间'
    const conflict = data.shifts.find(shift => shift.id !== form.id && shift.teamId === form.teamId && new Date(form.start) < new Date(shift.end) && new Date(shift.end) > new Date(form.start))
    if (conflict && !form.force) next.conflict = `与 ${data.members.find(member => member.id === conflict.memberId)?.name} 的班次重叠。可强制保存。`
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 450))
    if (form.id) updateData(current => ({ ...current, shifts: current.shifts.map(item => item.id === form.id ? { ...form, id: item.id } : item) }))
    else updateData(current => ({ ...current, shifts: [...current.shifts, { ...form, id: uniqueId('shift') }] }))
    setSaving(false); setForm(undefined); setErrors({})
    showToast({ tone: 'success', title: form.id ? '班次已更新' : '班次已创建' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader icon="◷" title="值班日历" description={`${shifts.length} 个班次`} left={<NavigationTrigger />} actions={<Button size="sm" variant="primary" onClick={() => { setErrors({}); setForm(shiftForm()) }}>新建班次</Button>} />
      <Toolbar>
        <SegmentedControl label="日历视图" value={view} onChange={value => patch({ view: value })} options={[{ value: 'month', label: '月' }, { value: 'week', label: '周' }, { value: 'day', label: '日' }]} />
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={() => setCursor(value => view === 'month' ? new Date(value.getFullYear(), value.getMonth() - 1, 1) : addDays(value, view === 'week' ? -7 : -1))} aria-label="上一周期">←</Button>
          <Button size="sm" onClick={() => setCursor(startOfDay(new Date()))}>今天</Button>
          <Button size="sm" onClick={() => setCursor(value => view === 'month' ? new Date(value.getFullYear(), value.getMonth() + 1, 1) : addDays(value, view === 'week' ? 7 : 1))} aria-label="下一周期">→</Button>
          <span className="ml-2 numeric font-label">{cursor.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: view === 'month' ? undefined : 'numeric' })}</span>
        </div>
        <Select className="w-auto" aria-label="团队筛选" value={teamFilter} onChange={event => patch({ teamId: event.target.value })}><option value="">全部团队</option>{data.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</Select>
        <Select className="w-auto" aria-label="人员筛选" value={memberFilter} onChange={event => patch({ memberId: event.target.value })}><option value="">全部人员</option>{data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</Select>
      </Toolbar>
      <div className="scroll-stable min-h-0 flex-1 overflow-auto p-3">
        {shifts.length === 0 && <StateView icon="◷" title="无排班" description="当前筛选没有班次，可新建或调整筛选。" action={<Button variant="primary" onClick={() => setForm(shiftForm())}>新建班次</Button>} />}
        <div className={view === 'day' ? 'grid gap-4 xl:grid-cols-[1fr_320px]' : 'grid gap-4'}>
          <section aria-label="值班日历" className="min-w-0 rounded-card border border-border bg-surface p-2">
            {view !== 'day' && <div className="grid grid-cols-7 gap-1 pb-1"><>{['日','一','二','三','四','五','六'].map(label => <div key={label} className="p-1 text-center font-caption text-muted-foreground">{label}</div>)}</></div>}
            <div className={`grid gap-1 ${view === 'month' ? 'grid-cols-7' : view === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
              {days.map(day => {
                const dayShifts = shifts.filter(shift => sameDay(new Date(shift.start), day))
                const events = shiftEvents(day)
                const outside = view === 'month' && day.getMonth() !== cursor.getMonth()
                return (
                  <div
                    key={day.toISOString()}
                    onDragOver={event => event.preventDefault()}
                    onDrop={() => { if (dragId) moveShift(dragId, day); setDragId(undefined) }}
                    className={`min-h-24 rounded-card border p-1 ${outside ? 'border-surface-border bg-muted/50 opacity-60' : 'border-surface-border bg-surface'} ${sameDay(day, selectedDay) ? 'ring-2 ring-brand/50' : ''}`}
                  >
                    <button type="button" className="flex w-full items-center justify-between rounded-sm px-1 text-left" onClick={() => { setSelectedDay(startOfDay(day)); if (view !== 'day') patch({ view: 'day' }); setCursor(startOfDay(day)) }}>
                      <span className="numeric font-caption">{day.getDate()}</span>
                      {sameDay(day, new Date()) && <Badge tone="brand">今天</Badge>}
                    </button>
                    <div className="mt-1 grid gap-1">
                      {dayShifts.map(shift => {
                        const member = data.members.find(item => item.id === shift.memberId)
                        return (
                          <button
                            key={shift.id}
                            draggable
                            onDragStart={() => setDragId(shift.id)}
                            onClick={() => setShiftDetail(shift.id)}
                            className="flex items-center gap-1 rounded-sm border border-border bg-surface-selected px-1 py-0.5 text-left font-caption hover:bg-surface-hover"
                            aria-label={`${formatDateTime(shift.start)} ${member?.name} 的班次`}
                          >
                            <span aria-hidden className="size-1.5 rounded-full bg-brand" />
                            <span className="truncate">{member?.name}</span>
                            <span className="numeric ml-auto">{new Date(shift.start).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </button>
                        )
                      })}
                      {events.length > 0 && <p className="numeric px-1 font-micro text-warning">{events.length} 事件</p>}
                      {dayShifts.length === 0 && events.length === 0 && <p className="px-1 font-micro text-faint">无排班</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          <aside aria-label="当天详情" className="min-w-0 rounded-card border border-border bg-surface p-3">
            <h2 className="font-title-sm">{selectedDay.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</h2>
            <p className="mt-1 font-caption text-muted-foreground">{selectedShifts.length} 个班次，{shiftEvents(selectedDay).length} 个事件</p>
            <div className="mt-3 grid gap-2">
              {selectedShifts.map(shift => {
                const member = data.members.find(item => item.id === shift.memberId)
                return (
                  <article key={shift.id} className="rounded-card border border-border p-2">
                    <div className="flex items-center gap-2"><span className="font-label">{member?.name}</span><Badge>{data.teams.find(team => team.id === shift.teamId)?.name}</Badge></div>
                    <p className="numeric mt-1 font-caption text-muted-foreground">{formatDateTime(shift.start)} → {formatDateTime(shift.end)}</p>
                    <p className="mt-1 font-caption">{shift.note || '无备注'}</p>
                    <div className="mt-2 flex gap-1"><Button size="sm" onClick={() => { setErrors({}); setForm(shiftForm(shift)) }}>编辑</Button><Button size="sm" onClick={() => { setErrors({}); setForm({ ...shiftForm(shift), id: undefined }) }}>复制</Button><Button size="sm" variant="danger" onClick={() => setDeleteId(shift.id)}>删除</Button></div>
                  </article>
                )
              })}
              {selectedShifts.length === 0 && <StateView className="py-6" icon="◷" title="当日无排班" />}
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={!!form} onClose={() => setForm(undefined)} title={form?.id ? '编辑班次' : '新建班次'} description="同一团队班次重叠时需确认" footer={<><Button onClick={() => setForm(undefined)}>取消</Button><Button variant="primary" loading={saving} onClick={() => void submit()}>保存</Button></>}>
        {form && <form className="grid gap-3" onSubmit={event => { event.preventDefault(); void submit() }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="团队" required><Select value={form.teamId} onChange={event => set('teamId', event.target.value)} aria-label="值班团队">{data.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</Select></Field>
            <Field label="值班人员" required><Select value={form.memberId} onChange={event => set('memberId', event.target.value)} aria-label="值班人员">{data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</Select></Field>
            <Field label="开始时间" required><Input type="datetime-local" value={localInput(form.start)} onChange={event => set('start', new Date(event.target.value).toISOString())} /></Field>
            <Field label="结束时间" required error={errors.end}><Input type="datetime-local" value={localInput(form.end)} onChange={event => set('end', new Date(event.target.value).toISOString())} /></Field>
            <Field label="交接对象"><Select value={form.handoverId ?? ''} onChange={event => set('handoverId', event.target.value || undefined)} aria-label="交接对象"><option value="">暂无</option>{data.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</Select></Field>
            <Field label="备注"><Input value={form.note} onChange={event => set('note', event.target.value)} aria-label="班次备注" /></Field>
          </div>
          <Field label="备注详情"><Textarea value={form.note} onChange={event => set('note', event.target.value)} /></Field>
          {errors.conflict && <div role="alert" className="rounded-card border border-warning/40 bg-[var(--warning-tint)] p-3 font-caption text-warning">{errors.conflict}<label className="mt-2 flex items-center gap-2"><Input type="checkbox" checked={!!form.force} onChange={event => set('force', event.target.checked)} />明确强制保存</label></div>}
        </form>}
      </Dialog>
      <Dialog open={!!detailShift} onClose={() => setShiftDetail(undefined)} title="值班详情" size="sm">
        {detailShift && <div className="grid gap-3">
          <p className="font-body">{data.members.find(member => member.id === detailShift.memberId)?.name} · {data.teams.find(team => team.id === detailShift.teamId)?.name}</p>
          <p className="numeric font-caption text-muted-foreground">{formatDateTime(detailShift.start)} → {formatDateTime(detailShift.end)}</p>
          <div><h3 className="font-label">负责期间事件</h3>{data.incidents.filter(incident => new Date(incident.startedAt) >= new Date(detailShift.start) && new Date(incident.startedAt) <= new Date(detailShift.end)).map(incident => <Link key={incident.id} to={`/events/${incident.id}?ws=${params.get('ws') ?? ''}`} className="mt-1 block rounded-card border border-border p-2 font-caption hover:bg-surface-hover">{incident.key} · {incident.title}</Link>)}</div>
          <Button onClick={() => { setShiftDetail(undefined); patch({ view: 'day' }); setSelectedDay(startOfDay(new Date(detailShift.start))); setCursor(startOfDay(new Date(detailShift.start))) }}>查看当日事件列表</Button>
        </div>}
      </Dialog>
      <ConfirmDialog open={!!deleteId} title="删除班次" message="删除后不可恢复，确认继续？" confirmLabel="删除" onClose={() => setDeleteId(undefined)} onConfirm={() => { updateData(current => ({ ...current, shifts: current.shifts.filter(shift => shift.id !== deleteId) })); showToast({ tone: 'success', title: '班次已删除' }); setDeleteId(undefined) }} />
    </div>
  )
}
