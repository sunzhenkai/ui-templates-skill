import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { NavigationTrigger } from '@/components/layout/app-shell'
import { PageHeader, Toolbar } from '@/components/layout/page-header'
import { Badge, Button, Input, SegmentedControl, Select, Skeleton, StateView } from '@/components/ui/primitives'
import { useSimulatedLoad } from '@/lib/page-load'
import { createExport } from '@/mocks/api'

type Range = '7d' | '30d' | 'quarter' | 'custom'

export function AnalyticsPage() {
  const { data, showToast } = useApp()
  const [params, setParams] = useSearchParams()
  const load = useSimulatedLoad('analytics')
  const [legend, setLegend] = useState({ incidents: true, response: true, restore: true })
  const get = (key: string) => params.get(key) ?? ''
  const patch = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => { if (!value) next.delete(key); else next.set(key, value) })
    setParams(next)
  }
  const range = (params.get('range') ?? '30d') as Range
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const metrics = useMemo(() => {
    const incidents = data?.incidents ?? []
    const current = incidents.filter(item => {
      const age = (Date.now() - new Date(item.createdAt).getTime()) / 86_400_000
      if (age > days) return false
      if (get('teamId') && !item.teamIds.includes(get('teamId'))) return false
      if (get('serviceId') && item.serviceId !== get('serviceId')) return false
      if (get('severity') && item.severity !== get('severity')) return false
      if (get('environment') && data?.services.find(service => service.id === item.serviceId)?.environment !== get('environment')) return false
      return true
    })
    const previous = incidents.filter(item => {
      const age = (Date.now() - new Date(item.createdAt).getTime()) / 86_400_000
      return age > days && age <= days * 2
    })
    const average = (items: typeof incidents, field: 'responseMinutes' | 'restoreMinutes') => items.length ? Math.round(items.reduce((sum, item) => sum + item[field], 0) / items.length) : 0
    const failedChanges = data?.changes.filter(change => change.status === 'failed').length ?? 0
    return {
      current, previous,
      total: current.length, unresolved: current.filter(item => !['resolved', 'archived'].includes(item.status)).length,
      response: average(current, 'responseMinutes'), restore: average(current, 'restoreMinutes'),
      changeFailure: data?.changes.length ? Math.round(failedChanges / data.changes.length * 100) : 0,
      services: new Set(current.map(item => item.serviceId)).size,
      previousTotal: previous.length,
    }
  }, [data, days, params])

  if (load.loading) return <div className="min-h-0 flex-1 p-4"><Skeleton className="h-12" /><div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-24" />)}<Skeleton className="h-80 md:col-span-3 xl:col-span-4" /><Skeleton className="h-80 md:col-span-3 xl:col-span-2" /></div></div>
  if (load.error) return <StateView tone="danger" className="flex-1" icon="!" title="分析加载失败" description={load.error.message} action={<Button variant="primary" onClick={load.reload}>重试</Button>} />
  if (!data) return null
  if (metrics.total === 0) return <div className="flex min-h-0 flex-1 flex-col"><PageHeader icon="◔" title="交付分析" left={<NavigationTrigger />} /><StateView className="flex-1" icon="◔" title="暂无分析数据" description="调整时间或筛选条件。" action={<Button onClick={() => setParams(new URLSearchParams({ ws: params.get('ws') ?? '' }))}>重置筛选</Button>} /></div>
  const trend = Array.from({ length: Math.min(days, 14) }, (_, index) => metrics.current.filter(item => {
    const date = new Date(item.createdAt)
    const age = (Date.now() - date.getTime()) / 86_400_000
    return Math.floor(age) >= index * (days / Math.min(days, 14)) && Math.floor(age) < (index + 1) * (days / Math.min(days, 14))
  }).length)
  const severityCount = (severity: string) => metrics.current.filter(item => item.severity === severity).length
  const serviceRank = [...data.services].map(service => ({ service, count: metrics.current.filter(item => item.serviceId === service.id).length })).sort((a, b) => b.count - a.count).slice(0, 5)
  const points = trend.map((value, index) => `${20 + index * (420 / Math.max(1, trend.length - 1))},${120 - value * 12}`).join(' ')
  const metricCards = [
    { label: '事件总数', value: metrics.total, previous: metrics.previousTotal, to: '/events', filter: {} },
    { label: '未解决事件', value: metrics.unresolved, to: '/events', filter: { status: 'processing' } },
    { label: '平均响应', value: `${metrics.response} 分钟`, to: '/events', filter: {} },
    { label: '平均恢复', value: `${metrics.restore} 分钟`, to: '/events', filter: {} },
    { label: '变更失败率', value: `${metrics.changeFailure}%`, to: '/analytics', filter: {} },
    { label: '受影响服务', value: metrics.services, to: '/services', filter: {} },
  ]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader icon="◔" title="交付分析" description={`${metrics.total} 条事件`} left={<NavigationTrigger />} actions={<Button size="sm" onClick={() => { createExport(metrics.current.map(item => ({ key: item.key, title: item.title, status: item.status, severity: item.severity, response: item.responseMinutes, restore: item.restoreMinutes })), 'analytics.csv'); showToast({ tone: 'success', title: '导出已生成', description: 'Mock CSV 已开始下载。' }) }}>导出</Button>} />
      <Toolbar>
        <SegmentedControl label="时间范围" value={range} onChange={value => patch({ range: value === 'custom' ? 'custom' : value })} options={[{ value: '7d', label: '最近 7 天' }, { value: '30d', label: '最近 30 天' }, { value: 'quarter', label: '本季度' }, { value: 'custom', label: '自定义' }]} />
        {range === 'custom' && <Input type="date" className="w-auto" aria-label="自定义开始日期" onChange={() => showToast({ tone: 'info', title: '已应用自定义范围' })} />}
        <Select className="w-auto" aria-label="团队" value={get('teamId')} onChange={event => patch({ teamId: event.target.value })}><option value="">全部团队</option>{data.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</Select>
        <Select className="w-auto" aria-label="服务" value={get('serviceId')} onChange={event => patch({ serviceId: event.target.value })}><option value="">全部服务</option>{data.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</Select>
        <Select className="w-auto" aria-label="环境" value={get('environment')} onChange={event => patch({ environment: event.target.value })}><option value="">全部环境</option>{['production','staging','development'].map(value => <option key={value} value={value}>{value}</option>)}</Select>
        <Select className="w-auto" aria-label="严重等级" value={get('severity')} onChange={event => patch({ severity: event.target.value })}><option value="">全部等级</option>{['sev1','sev2','sev3','sev4'].map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}</Select>
      </Toolbar>
      <div className="scroll-stable min-h-0 flex-1 overflow-y-auto p-3">
        <section aria-label="核心指标" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          {metricCards.map(metric => (
            <Link key={metric.label} to={{ pathname: metric.to, search: new URLSearchParams({ ws: params.get('ws') ?? '', ...metric.filter } as Record<string,string>).toString() }} className="rounded-card border border-border bg-surface p-3 hover:bg-surface-hover">
              <p className="font-caption text-muted-foreground">{metric.label}</p>
              <p className="numeric font-display-sm">{metric.value}</p>
              {metric.previous !== undefined && <p className="font-caption text-muted-foreground">上期 {metric.previous}</p>}
            </Link>
          ))}
        </section>
        <section className="mt-3 grid gap-3 xl:grid-cols-[1fr_320px]">
          <div className="rounded-card border border-border bg-surface p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-title-sm">趋势图</h2>
              <div className="ml-auto flex gap-2">
                {Object.entries(legend).map(([key, value]) => <Button key={key} size="sm" aria-pressed={value} onClick={() => setLegend(current => ({ ...current, [key]: !current[key as keyof typeof legend] }))}>{key === 'incidents' ? '事件数' : key === 'response' ? '响应时间' : '恢复时间'}</Button>)}
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <svg viewBox="0 0 460 140" className="h-40 w-full min-w-100" role="img" aria-label="事件数量趋势图">
                <line x1="20" y1="10" x2="20" y2="120" stroke="var(--border)" /><line x1="20" y1="120" x2="440" y2="120" stroke="var(--border)" />
                {legend.incidents && <polyline points={points} fill="none" stroke="var(--brand)" strokeWidth="2" />}
                {legend.response && metrics.current[0] && <circle cx="60" cy={120 - metrics.response / 4} r="3" fill="var(--warning)" />}
                {legend.restore && metrics.current[0] && <circle cx="120" cy={120 - metrics.restore / 10} r="3" fill="var(--success)" />}
                {trend.map((value, index) => <circle key={index} cx={20 + index * (420 / Math.max(1, trend.length - 1))} cy={120 - value * 12} r="3" fill="var(--brand)"><title>{`第 ${index + 1} 段：${value} 件`}</title></circle>)}
              </svg>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><h3 className="font-label">严重等级分布</h3><div className="mt-2 grid gap-2">{['sev1','sev2','sev3','sev4'].map(severity => { const count = severityCount(severity); const percent = metrics.total ? Math.round(count / metrics.total * 100) : 0; return <div key={severity}><div className="flex justify-between font-caption"><span>{severity.toUpperCase()}</span><span className="numeric">{count} · {percent}%</span></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} /></div></div> })}</div></div>
              <div><h3 className="font-label">服务分布</h3><div className="mt-2 grid gap-1">{serviceRank.map(({ service, count }) => <div key={service.id} className="flex items-center justify-between rounded-card border border-border p-2 font-caption"><span className="truncate">{service.name}</span><span className="numeric">{count}</span></div>)}</div></div>
            </div>
          </div>
          <aside aria-label="排行列表" className="grid content-start gap-3 rounded-card border border-border bg-surface p-3">
            <h2 className="font-title-sm">排行与明细</h2>
            <div><h3 className="font-label">事件最多服务</h3><ol className="mt-1 grid gap-1">{serviceRank.map(({ service, count }, index) => <li key={service.id} className="flex items-center gap-2 font-caption"><span className="numeric w-4">{index + 1}.</span><Link className="min-w-0 flex-1 truncate hover:underline" to={{ pathname: '/events', search: new URLSearchParams({ ws: params.get('ws') ?? '', serviceId: service.id }).toString() }}>{service.name}</Link><Badge>{count}</Badge></li>)}</ol></div>
            <div><h3 className="font-label">响应最慢团队</h3><ol className="mt-1 grid gap-1">{data.teams.map(team => ({ team, value: Math.max(...metrics.current.filter(item => item.teamIds.includes(team.id)).map(item => item.responseMinutes), 0) })).sort((a,b)=>b.value-a.value).map(({ team, value }) => <li key={team.id} className="flex justify-between font-caption"><span>{team.name}</span><span className="numeric">{value} 分钟</span></li>)}</ol></div>
            <div><h3 className="font-label">变更失败服务</h3><ul className="mt-1 grid gap-1">{data.services.map(service => ({ service, count: data.changes.filter(change => change.serviceId === service.id && change.status === 'failed').length })).filter(item=>item.count>0).map(({ service, count }) => <li key={service.id} className="flex justify-between font-caption"><span>{service.name}</span><Badge tone="danger">{count}</Badge></li>)}</ul></div>
          </aside>
        </section>
      </div>
    </div>
  )
}
