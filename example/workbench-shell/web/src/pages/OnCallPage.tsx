import { useState } from 'react'
import { CalendarPlus, Clock, Plus, UserRound } from 'lucide-react'
import { PageHeader } from '../components/shell'
import { Avatar, Badge, Button, Card, Dialog, EmptyState, Input, Select } from '../components/ui'
import { formatDay } from '../lib'
import { team } from '../data/mock'
import { useWorkbench } from '../store'

export function OnCallPage() {
  const { shifts, addShift, pushToast } = useWorkbench()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ memberId: 'm1', date: '2026-09-15', start: '08:00', end: '16:00', team: 'Core' })
  const [error, setError] = useState('')
  const dates = ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21']
  const createShift = () => {
    const conflict = shifts.some((shift) => shift.memberId === form.memberId && shift.date === form.date && shift.start < form.end && form.start < shift.end)
    if (conflict) { setError('该成员在这个时间段已有值班，请调整时间。'); return }
    addShift(form); setOpen(false); setError(''); pushToast({ tone: 'success', title: '值班已创建' })
  }
  return <div className="flex h-full flex-col" data-testid="oncall-page">
    <PageHeader title="值班日历" description="月/周/日视图的默认周视图，支持班次编辑。" actions={<Button variant="primary" onClick={() => setOpen(true)}><CalendarPlus className="size-4" />新建班次</Button>} toolbar={<><Badge tone="brand">本周</Badge><span className="text-[11px] text-[var(--text-faint)]">{shifts.length} 个班次 · 时区 Asia/Shanghai</span><div className="ml-auto flex gap-2"><Button size="sm" variant="ghost">月</Button><Button size="sm" variant="secondary">周</Button><Button size="sm" variant="ghost">日</Button></div></>} />
    <div className="min-h-0 flex-1 overflow-auto p-3">
      <div className="grid min-w-[900px] grid-cols-7 gap-2">{dates.map((date) => <Card key={date} className="min-h-72 p-2"><div className="mb-2 border-b border-[var(--border)] pb-2"><div className="text-[11px] text-[var(--text-faint)]">{formatDay(date)}</div><div className="mt-1 text-[12px] font-medium">{shifts.filter((shift) => shift.date === date).length} 个班次</div></div><div className="space-y-2">{shifts.filter((shift) => shift.date === date).map((shift) => { const member = team.find((item) => item.id === shift.memberId); return <div key={shift.id} className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] p-2"><div className="flex items-center gap-2"><Avatar name={member?.name ?? '?'} size="sm" /><span className="min-w-0 flex-1 truncate text-[11px] font-medium">{member?.name}</span></div><div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-faint)]"><Clock className="size-3" />{shift.start}–{shift.end} · {shift.team}</div></div> })}</div></Card>)}</div>
    </div>
    <Dialog open={open} onClose={() => setOpen(false)} title="新建值班班次" description="创建时会检测同一成员的冲突。" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>取消</Button><Button variant="primary" onClick={createShift}>创建班次</Button></>}><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-[12px]"><span>成员</span><Select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })}>{team.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</Select></label><label className="grid gap-1.5 text-[12px]"><span>团队</span><Select value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })}>{['Core', 'Platform', 'Data', 'Support', 'Web', 'Release'].map((item) => <option key={item}>{item}</option>)}</Select></label><label className="grid gap-1.5 text-[12px]"><span>日期</span><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label className="grid gap-1.5 text-[12px]"><span>开始</span><Input type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} /></label><label className="grid gap-1.5 text-[12px]"><span>结束</span><Input type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} /></label>{error && <div className="sm:col-span-2 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-[12px] text-[var(--danger)]">{error}</div>}</div></Dialog>
  </div>
}
