import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppStore } from "@/stores/app-store"
import * as api from "@/mocks/api"
import { severityLabel } from "@/lib/format"
import type { Incident } from "@/types"

export default function AnalyticsPage() {
  const store = useAppStore()
  const [data, setData] = useState<{
    total: number
    open: number
    resolved: number
    mttrMinutes: number
    bySeverity: Record<string, number>
    byStatus: Record<string, Incident[]>
    weeklyTrend: { day: number; count: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const d = await api.fetchAnalytics(store.currentWorkspaceId)
    setData(d)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [store.currentWorkspaceId])

  const severityRows = useMemo(() => {
    if (!data) return []
    return Object.entries(data.bySeverity).sort(([a], [b]) => a.localeCompare(b))
  }, [data])

  const statusRows = useMemo(() => {
    if (!data) return []
    return Object.entries(data.byStatus).map(([status, list]) => ({ status, count: list.length }))
  }, [data])

  const maxTrend = useMemo(() => Math.max(1, ...(data?.weeklyTrend.map((d) => d.count) ?? [1])), [data])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader icon={<BarChart3 className="size-4" />} title="交付分析" description="事件统计、趋势与服务健康" />

      <div className="flex-1 overflow-y-auto p-4 scrollbar-stable">
        {loading || !data ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-48" />
            <div className="grid gap-3 lg:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 指标卡 */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={<AlertTriangle className="size-4" />} label="事件总数" value={data.total} tone="muted" />
              <MetricCard icon={<TrendingUp className="size-4" />} label="待处理" value={data.open} tone="warning" />
              <MetricCard icon={<CheckCircle2 className="size-4" />} label="已解决" value={data.resolved} tone="success" />
              <MetricCard icon={<Clock className="size-4" />} label="平均修复时长" value={`${data.mttrMinutes}m`} tone="muted" />
            </div>

            {/* 趋势图 */}
            <div className="rounded-lg border bg-surface p-3">
              <h3 className="text-title-sm font-medium text-foreground">近 7 天事件趋势</h3>
              <div className="mt-3 flex h-32 items-end gap-2">
                {data.weeklyTrend.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary/80"
                      style={{ height: `${(d.count / maxTrend) * 100}%` }}
                      aria-label={`${d.count} 个事件`}
                    />
                    <span className="text-micro text-muted-foreground">D{d.day + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* 按严重等级 */}
              <div className="rounded-lg border bg-surface p-3">
                <h3 className="text-title-sm font-medium text-foreground">按严重等级</h3>
                <div className="mt-2 divide-y">
                  {severityRows.map(([sev, count]) => (
                    <div key={sev} className="flex items-center justify-between py-1.5">
                      <span className="text-body text-foreground">{severityLabel(sev)}</span>
                      <Badge variant="outline" className="tabular-nums">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* 按状态 */}
              <div className="rounded-lg border bg-surface p-3">
                <h3 className="text-title-sm font-medium text-foreground">按状态</h3>
                <div className="mt-2 divide-y">
                  {statusRows.map(({ status, count }) => (
                    <div key={status} className="flex items-center justify-between py-1.5">
                      <span className="text-body text-foreground">{status}</span>
                      <Badge variant="outline" className="tabular-nums">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: "muted" | "warning" | "success" }) {
  const toneCls = { muted: "text-foreground", warning: "text-yellow-600", success: "text-green-600" }[tone]
  return (
    <div className="rounded-lg border bg-surface p-3">
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-2 text-display-sm font-semibold tabular-nums", toneCls)}>{value}</div>
    </div>
  )
}

import { cn } from "@/lib/utils"
