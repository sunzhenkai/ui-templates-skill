import { CollectionSkeleton, ErrorState, PageHeader, Toolbar } from "@/components/shared/chrome"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { listIncidents, listServices } from "@/lib/api/client"
import { keys } from "@/lib/query"
import type { AnalyticsRange } from "@/types/domain"
import { useQuery } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { useMemo } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"

const chartConfig = {
  incidents: { label: "事件", color: "var(--chart-1)" },
  response: { label: "响应", color: "var(--chart-2)" },
} satisfies ChartConfig

export function AnalyticsPage() {
  const { workspaceId = "ws-alpha" } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const range = (params.get("range") ?? "30d") as AnalyticsRange
  const incidents = useQuery({ queryKey: keys.incidents(workspaceId), queryFn: () => listIncidents(workspaceId) })
  const services = useQuery({ queryKey: keys.services(workspaceId), queryFn: () => listServices(workspaceId) })

  const metrics = useMemo(() => {
    const rows = incidents.data ?? []
    const open = rows.filter((item) => item.status !== "resolved" && item.status !== "archived").length
    return {
      total: rows.length,
      open,
      response: 18,
      recover: 42,
      changeFail: 12,
      affected: new Set(rows.flatMap((item) => item.serviceIds)).size,
    }
  }, [incidents.data])

  const trend = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => ({
      day: `D${index + 1}`,
      incidents: (incidents.data ?? []).filter((_, itemIndex) => itemIndex % 7 === index).length,
      response: 10 + index * 3,
    }))
  }, [incidents.data])

  const ranking = [...(services.data ?? [])].sort((a, b) => b.recentIncidentCount - a.recentIncidentCount).slice(0, 5)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader title="交付分析" actions={<Button size="sm" variant="outline" onClick={() => {
        const blob = new Blob(["range,total\n" + `${range},${metrics.total}`], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "analytics.csv"
        link.click()
        toast.success("已导出分析结果")
      }}>导出</Button>} />
      <Toolbar>
        <ToggleGroup value={[range]} onValueChange={(value) => { const next = value[0]; if (next) { const copy = new URLSearchParams(params); copy.set("range", next); setParams(copy) } }}>
          <ToggleGroupItem value="7d">最近 7 天</ToggleGroupItem>
          <ToggleGroupItem value="30d">最近 30 天</ToggleGroupItem>
          <ToggleGroupItem value="quarter">本季度</ToggleGroupItem>
          <ToggleGroupItem value="custom">自定义</ToggleGroupItem>
        </ToggleGroup>
        <Select value={params.get("severity") ?? ""} onValueChange={(value) => typeof value === "string" && setParams((current) => { current.set("severity", value); return current })}>
          <SelectTrigger aria-label="严重等级"><SelectValue placeholder="等级" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部</SelectItem>
            <SelectItem value="critical">紧急</SelectItem>
            <SelectItem value="high">高</SelectItem>
          </SelectContent>
        </Select>
      </Toolbar>
      <div className="min-h-0 flex-1 overflow-auto p-[var(--page-gutter)] pb-[var(--chat-fab-clearance)]">
        {incidents.isLoading ? <CollectionSkeleton /> : null}
        {incidents.isError ? <ErrorState message="分析数据加载失败" onRetry={() => void incidents.refetch()} /> : null}
        {incidents.isSuccess ? (
          <div className="space-y-4">
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]">
              {[
                { label: "事件总数", value: metrics.total, delta: "+8%", to: "incidents" },
                { label: "未解决事件", value: metrics.open, delta: "-3%", to: "incidents?status=in-progress" },
                { label: "平均响应时间", value: `${metrics.response}m`, delta: "-2m", to: "incidents" },
                { label: "平均恢复时间", value: `${metrics.recover}m`, delta: "+4m", to: "incidents" },
                { label: "变更失败率", value: `${metrics.changeFail}%`, delta: "+1%", to: "incidents" },
                { label: "受影响服务数", value: metrics.affected, delta: "0", to: "services" },
              ].map((card) => (
                <button key={card.label} type="button" className="rounded-lg border bg-[var(--surface)] p-3 text-left shadow-[var(--shadow-surface)]" onClick={() => navigate(`/${workspaceId}/${card.to}`)}>
                  <p className="text-[length:var(--type-caption)] text-muted-foreground">{card.label}</p>
                  <p className="text-[length:var(--type-title)]">{card.value}</p>
                  <p className="text-[length:var(--type-caption)]">较上期 {card.delta}</p>
                </button>
              ))}
            </div>
            {trend.every((item) => item.incidents === 0) ? <p role="status">当前范围没有图表数据</p> : null}
            <div className="grid gap-4 overflow-x-auto lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>事件数量趋势</CardTitle></CardHeader>
                <CardContent className="min-w-[28rem]">
                  <ChartContainer config={chartConfig} className="h-56">
                    <LineChart data={trend}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line dataKey="incidents" stroke="var(--color-incidents)" />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>按服务分布</CardTitle></CardHeader>
                <CardContent className="min-w-[28rem]">
                  <ChartContainer config={chartConfig} className="h-56">
                    <BarChart data={ranking.map((item) => ({ name: item.name, incidents: item.recentIncidentCount }))}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="name" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="incidents" fill="var(--color-incidents)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle>事件最多的服务</CardTitle></CardHeader>
              <CardContent>
                <ol>
                  {ranking.map((item) => (
                    <li key={item.id}>
                      <button type="button" className="underline-offset-2 hover:underline" onClick={() => navigate(`/${workspaceId}/incidents?service=${item.id}`)}>{item.name} · {item.recentIncidentCount}</button>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
