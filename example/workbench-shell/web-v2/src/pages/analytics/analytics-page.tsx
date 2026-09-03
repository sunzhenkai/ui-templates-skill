import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/app-shell/page-header'
import { Toolbar, ToolbarSection, ToolbarSeparator } from '@/components/app-shell/toolbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/shared/skeletons'
import { ErrorState } from '@/components/shared/error-state'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const SEVERITY_PIE_COLORS = [
  'oklch(0.55 0.16 255)',
  'oklch(0.66 0.13 255)',
  'oklch(0.76 0.10 255)',
  'oklch(0.85 0.06 255)',
]

export function AnalyticsPage() {
  const metricsQ = useQuery({ queryKey: ['delivery-metrics'], queryFn: api.deliveryMetrics })
  const incidentsQ = useQuery({ queryKey: ['incidents'], queryFn: () => api.listIncidents() })
  const servicesQ = useQuery({ queryKey: ['services'], queryFn: api.services })
  const membersQ = useQuery({ queryKey: ['members'], queryFn: api.members })
  const [range, setRange] = useState('14')

  const trend = useMemo(() => {
    const all = metricsQ.data ?? []
    return all.slice(-Number(range))
  }, [metricsQ.data, range])

  const summary = useMemo(() => {
    if (!trend.length) return null
    const last = trend[trend.length - 1]
    const prev = trend[trend.length - 2] ?? last
    const sumDeploys = trend.reduce((s, d) => s + d.deploys, 0)
    const sumFailed = trend.reduce((s, d) => s + d.failedDeploys, 0)
    const avgLead = Math.round(trend.reduce((s, d) => s + d.leadTimeHours, 0) / trend.length)
    const avgMttr = Math.round(trend.reduce((s, d) => s + d.mttrMinutes, 0) / trend.length)
    const cfr = sumDeploys ? (sumFailed / sumDeploys) * 100 : 0
    const delta = (a: number, b: number) => (a - b) / Math.max(b, 1)
    return {
      sumDeploys, sumFailed, avgLead, avgMttr, cfr,
      deltaDeploys: delta(last.deploys, prev.deploys),
      deltaMttr: delta(last.mttrMinutes, prev.mttrMinutes),
      deltaCfr: delta(last.changeFailureRate, prev.changeFailureRate),
      deltaLead: delta(last.leadTimeHours, prev.leadTimeHours),
    }
  }, [trend])

  const severityData = useMemo(() => {
    const items = incidentsQ.data ?? []
    const counts: Record<string, number> = { SEV1: 0, SEV2: 0, SEV3: 0, SEV4: 0 }
    for (const i of items) counts[i.severity] = (counts[i.severity] ?? 0) + 1
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [incidentsQ.data])

  const leaderboard = useMemo(() => {
    const items = incidentsQ.data ?? []
    const map = new Map<string, number>()
    for (const i of items) {
      if (!i.assigneeId) continue
      map.set(i.assigneeId, (map.get(i.assigneeId) ?? 0) + 1)
    }
    const members = membersQ.data ?? []
    return [...map.entries()]
      .map(([id, count]) => ({ member: members.find((m) => m.id === id), count }))
      .filter((e) => e.member)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [incidentsQ.data, membersQ.data])

  const serviceLoad = useMemo(() => {
    const items = incidentsQ.data ?? []
    const services = servicesQ.data ?? []
    return services
      .map((s) => ({ service: s, count: items.filter((i) => i.serviceId === s.id).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [incidentsQ.data, servicesQ.data])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="交付分析"
        meta={summary ? `近 ${trend.length} 天` : '加载中…'}
        description="部署频率、变更前置时间、MTTR 与变更失败率；服务健康与人员负载。"
      />

      <Toolbar>
        <ToolbarSection>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">近 7 天</SelectItem>
              <SelectItem value="14">近 14 天</SelectItem>
              <SelectItem value="30">近 30 天</SelectItem>
            </SelectContent>
          </Select>
        </ToolbarSection>
        <ToolbarSeparator />
        <ToolbarSection>
          <Badge variant="ghost" className="text-caption">来源：交付平台 + 事件服务</Badge>
        </ToolbarSection>
      </Toolbar>

      <div className="flex-1 overflow-y-auto p-4">
        {metricsQ.isPending ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : metricsQ.isError ? (
          <ErrorState onRetry={() => metricsQ.refetch()} description={metricsQ.error instanceof Error ? metricsQ.error.message : undefined} />
        ) : summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="部署次数" value={summary.sumDeploys} delta={summary.deltaDeploys}
                helper={`近 ${trend.length} 天累计`} variant="success"
              />
              <MetricCard
                title="平均 MTTR" value={`${summary.avgMttr}m`} delta={summary.deltaMttr}
                helper="故障平均修复时间" variant={summary.deltaMttr > 0 ? 'destructive' : 'success'}
                invertTone
              />
              <MetricCard
                title="变更前置时间" value={`${summary.avgLead}h`} delta={summary.deltaLead}
                helper="提交到上线" variant={summary.deltaLead > 0 ? 'destructive' : 'success'}
                invertTone
              />
              <MetricCard
                title="变更失败率" value={`${summary.cfr.toFixed(1)}%`} delta={summary.deltaCfr}
                helper="失败 / 部署总数" variant={summary.deltaCfr > 0 ? 'destructive' : 'success'}
                invertTone
              />
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-body font-medium">部署与失败趋势</CardTitle>
                  <CardDescription>每日部署次数与失败次数</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="deploys" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.55 0.16 255 / 0.45)" />
                          <stop offset="100%" stopColor="oklch(0.55 0.16 255 / 0)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="deploys" stroke="oklch(0.55 0.16 255)" strokeWidth={2} fill="url(#deploys)" />
                      <Line type="monotone" dataKey="failedDeploys" stroke="oklch(0.577 0.245 27.325)" strokeWidth={2} dot={false} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-body font-medium">事件严重等级分布</CardTitle>
                  <CardDescription>全部事件按等级</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80}>
                        {severityData.map((_, i) => <Cell key={i} fill={SEVERITY_PIE_COLORS[i % SEVERITY_PIE_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-body font-medium">服务事件负载</CardTitle>
                  <CardDescription>累计事件数 Top 6</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceLoad} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                      <YAxis dataKey="service.name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={96} />
                      <RechartsTooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" fill="oklch(0.55 0.16 255)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-body font-medium">处理人排行</CardTitle>
                  <CardDescription>累计处理事件数 Top 5</CardDescription>
                </CardHeader>
                <CardContent>
                  {leaderboard.length === 0 ? (
                    <div className="py-8 text-center text-caption text-muted-foreground">暂无数据</div>
                  ) : (
                    <ol className="divide-y divide-border">
                      {leaderboard.map((row, i) => (
                        <li key={row.member?.id} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="tabular text-caption text-muted-foreground">{i + 1}</span>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex size-6 items-center justify-center rounded-full text-micro font-semibold"
                                style={{ background: `color-mix(in oklch, ${row.member?.color} 18%, transparent)`, color: row.member?.color }}
                              >
                                {row.member?.initials}
                              </span>
                              <span className="text-body">{row.member?.name}</span>
                            </div>
                          </div>
                          <span className="tabular text-caption text-muted-foreground">{row.count} 件</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-body font-medium">MTTR / 前置时间趋势</CardTitle>
                <CardDescription>故障修复时间（小时）与提交到上线（小时）</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <RechartsTooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="mttrMinutes" name="MTTR (m)" stroke="oklch(0.577 0.245 27.325)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="leadTimeHours" name="前置时间 (h)" stroke="oklch(0.55 0.18 250)" strokeWidth={2} dot={false} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MetricCard({ title, value, delta, helper, variant: _variant, invertTone }: {
  title: string
  value: string | number
  delta: number
  helper: string
  variant?: 'success' | 'destructive' | 'neutral'
  invertTone?: boolean
}) {
  const positive = delta >= 0
  const TrendIcon = positive ? TrendingUp : TrendingDown
  const toneColor = (invertTone ? !positive : positive) ? 'text-success' : 'text-destructive'
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-surface">
      <div className="flex items-center justify-between text-micro uppercase tracking-wide text-muted-foreground">
        <span>{title}</span>
        <span className={cn('inline-flex items-center gap-0.5 tabular text-caption font-medium', toneColor)}>
          <TrendIcon className="size-3" />
          {(delta * 100).toFixed(1)}%
        </span>
      </div>
      <p className="mt-2 text-display-sm font-semibold tabular leading-8 text-foreground">{value}</p>
      <p className="mt-1 text-micro text-muted-foreground">{helper}</p>
    </div>
  )
}
