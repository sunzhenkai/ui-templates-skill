import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarRange, Download, RefreshCw } from 'lucide-react'
import { PageHeader } from '../components/shell'
import { Badge, Button, Card, EmptyState, Select, Tabs } from '../components/ui'
import { useWorkbench } from '../store'

const usage = [62, 70, 66, 82, 76, 88, 91, 84, 95, 89, 96, 92]
const failures = [3, 5, 2, 6, 4, 8, 5, 7, 4, 9, 6, 8]

export function AnalyticsPage() {
  const { pushToast } = useWorkbench()
  const [tab, setTab] = useState('usage')
  const [range, setRange] = useState('30d')
  const [loading, setLoading] = useState(false)
  const refresh = () => { setLoading(true); window.setTimeout(() => { setLoading(false); pushToast({ tone: 'success', title: '指标已刷新' }) }, 500) }
  return <div className="flex h-full flex-col" data-testid="analytics-page">
    <PageHeader title="交付分析" description="事件、变更、容量和错误趋势。" actions={<><Button onClick={refresh}><RefreshCw className="size-4" />刷新</Button><Button variant="secondary" onClick={() => pushToast({ tone: 'success', title: '报告导出已加入队列' })}><Download className="size-4" />导出</Button></>} toolbar={<><Tabs items={[{ id: 'usage', label: '容量趋势' }, { id: 'errors', label: '错误与失败' }]} value={tab} onChange={setTab} /><Select aria-label="时间范围" className="ml-auto w-28" value={range} onChange={(event) => setRange(event.target.value)}><option value="7d">近 7 天</option><option value="30d">近 30 天</option><option value="90d">近 90 天</option></Select></>} />
    <div className="min-h-0 flex-1 overflow-auto p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[{ label: '事件总数', value: '128', delta: '+12%', up: true }, { label: '平均恢复时间', value: '42m', delta: '-18%', up: false }, { label: '变更成功率', value: '96.4%', delta: '+1.8%', up: true }, { label: '错误预算剩余', value: '71%', delta: '-6%', up: false }].map((metric) => <Card key={metric.label} className="p-4"><div className="text-[11px] text-[var(--text-faint)]">{metric.label}</div><div className="mt-2 flex items-end justify-between"><span className="text-[24px] font-semibold tracking-tight">{metric.value}</span><span className={`flex items-center gap-1 text-[11px] ${metric.up ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{metric.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{metric.delta}</span></div></Card>)}</div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-4"><div className="flex items-center justify-between"><div><h2 className="text-[14px] font-semibold">{tab === 'usage' ? '运行时利用率' : '错误趋势'}</h2><p className="mt-1 text-[11px] text-[var(--text-faint)]">按 {range} 聚合 · 数据为本地 mock</p></div><BarChart3 className="size-5 text-[var(--text-faint)]" /></div>{loading ? <div className="mt-8 h-64 animate-pulse rounded-lg bg-[var(--surface-hover)]" /> : <div className="mt-8 flex h-64 items-end gap-2 border-b border-[var(--border)] pb-2">{((tab === 'usage' ? usage : failures).map((value, index) => <div key={index} className="group flex h-full flex-1 items-end"><div className={`w-full rounded-t-sm transition-all ${tab === 'usage' ? 'bg-[var(--brand)]' : 'bg-[var(--danger)]'}`} style={{ height: `${value}%` }} title={`${value}%`} /></div>))}</div>}</Card>
        <Card className="p-4"><div className="flex items-center gap-2"><CalendarRange className="size-4 text-[var(--text-faint)]" /><h2 className="text-[14px] font-semibold">排行榜</h2></div><div className="mt-4 space-y-3">{[['Checkout API', 38, 'critical'], ['Search Index', 26, 'high'], ['Delivery Pipeline', 18, 'medium'], ['Payments Gateway', 12, 'high']].map(([name, count, severity]) => <div key={name as string} className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium">{name}</div><div className="mt-1 h-1.5 rounded-full bg-[var(--surface-hover)]"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Number(count) * 2}%` }} /></div></div><Badge tone={severity === 'critical' ? 'danger' : severity === 'high' ? 'warning' : 'info'}>{count}</Badge></div>)}</div><Button className="mt-5 w-full" variant="ghost" onClick={() => pushToast({ tone: 'info', title: '已打开排行详情' })}>查看完整排行</Button></Card>
      </div>
      <Card className="mt-3 p-4"><h2 className="text-[14px] font-semibold">变更记录</h2><div className="mt-3 divide-y divide-[var(--border)]">{[{ id: 'chg-1042', title: 'Roll out checkout retry policy', status: 'deployed', time: '今天 07:00' }, { id: 'chg-1039', title: 'Payments gateway database migration', status: 'rolled-back', time: '昨天 18:20' }, { id: 'chg-1035', title: 'Search index shard rebalance', status: 'scheduled', time: '明天 02:00' }].map((change) => <div key={change.id} className="flex items-center gap-3 py-3 text-[12px]"><span className="w-20 text-[var(--text-faint)]">{change.id}</span><span className="min-w-0 flex-1 truncate">{change.title}</span><Badge tone={change.status === 'rolled-back' ? 'danger' : change.status === 'deployed' ? 'success' : 'info'}>{change.status}</Badge><span className="w-24 text-right text-[var(--text-faint)]">{change.time}</span></div>)}</div></Card>
    </div>
  </div>
}
