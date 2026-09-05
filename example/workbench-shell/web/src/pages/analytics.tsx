import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Gauge } from "lucide-react";
import { PageHeader, Toolbar } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { getAnalytics } from "@/mock/api";
import { cn } from "@/lib/utils";

/** 交付分析（ROUTE-009-E）：指标卡 + 趋势/分布/排行聚合网格（RESP-005, NN-008, AX-098..101）。 */
export function AnalyticsPage() {
  const [range, setRange] = useState("14d");
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["analytics"], queryFn: getAnalytics });

  const kpis = [
    { label: "周期内创建", value: data?.kpis.created ?? "-", unit: "个" },
    { label: "周期内解决", value: data?.kpis.resolved ?? "-", unit: "个" },
    { label: "平均解决时长", value: data?.kpis.mttrHours ?? "-", unit: "小时" },
    { label: "可用率", value: data?.kpis.availability ?? "-", unit: "%" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="交付分析"
        icon={<Gauge />}
        actions={
          <Select items={rangeItems} value={range} onValueChange={(v) => setRange((v as string) ?? "14d")}>
            <SelectTrigger className="h-7 w-28" aria-label="时间范围">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">最近 7 天</SelectItem>
              <SelectItem value="14d">最近 14 天</SelectItem>
              <SelectItem value="30d">最近 30 天</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <Toolbar>
        <p className="text-caption text-muted-foreground">
          图表序列按主题 chart-1 → chart-5 表达主次；空态与失败态保持结构。
        </p>
      </Toolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-[var(--layout-page-gutter)]" role="region" aria-label="分析内容">
        {isLoading ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : isError || !data ? (
          <EmptyState
            icon={<Gauge />}
            title="分析数据加载失败"
            description="模拟请求失败。"
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                重试
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="sr-only">核心指标</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3" role="list" aria-label="核心指标">
              {kpis.map((k) => (
                <Card key={k.label} role="listitem">
                  <CardHeader>
                    <p className="text-caption text-muted-foreground">{k.label}</p>
                    <CardTitle className="font-mono text-display-sm">
                      {k.value}
                      <span className="ml-1 text-caption font-normal text-muted-foreground">{k.unit}</span>
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>事件创建与解决趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <figure aria-label="最近 14 天事件创建与解决趋势图">
                    <div className="h-56" role="img" aria-description="折线图：每日创建与解决的事件数，创建用 chart-1 色，解决用 chart-2 色。">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.trend}>
                          <defs>
                            <linearGradient id="g-created" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={28} />
                          <ReTooltip
                            contentStyle={{
                              background: "var(--popover)",
                              border: "1px solid var(--surface-border)",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Area type="monotone" dataKey="created" name="创建" stroke="var(--chart-1)" fill="url(#g-created)" strokeWidth={2} />
                          <Line type="monotone" dataKey="resolved" name="解决" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <figcaption className="mt-1 text-caption text-muted-foreground">
                      每日创建（chart-1）与解决（chart-2）事件数。
                    </figcaption>
                  </figure>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>严重等级分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <figure aria-label="事件严重等级分布图">
                    <div className="h-56" role="img" aria-description="柱状图：SEV-1 到 SEV-4 的事件数量，颜色依次为 chart-1 到 chart-4。">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.severityDist} layout="vertical">
                          <CartesianGrid stroke="var(--border)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={48} />
                          <ReTooltip
                            contentStyle={{
                              background: "var(--popover)",
                              border: "1px solid var(--surface-border)",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="value" name="事件数" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <figcaption className="mt-1 text-caption text-muted-foreground">按严重等级统计事件数量。</figcaption>
                  </figure>
                </CardContent>
              </Card>

              <Card className="xl:col-span-3">
                <CardHeader>
                  <CardTitle>平均解决时长排行（小时）</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="flex flex-col gap-2" aria-label="平均解决时长排行">
                    {data.mttr.map((m, i) => {
                      const max = data.mttr[0].hours;
                      return (
                        <li key={m.name} className="flex items-center gap-3 text-label">
                          <span className="w-4 text-right font-mono text-caption text-faint-foreground">{i + 1}</span>
                          <span className={cn("w-28 truncate font-mono text-caption")}>{m.name}</span>
                          <span
                            className="h-2 rounded-full bg-chart-1"
                            style={{ width: `${(m.hours / max) * 60}%`, backgroundColor: `var(--chart-${i + 1})` }}
                            aria-hidden
                          />
                          <span className="font-mono text-caption text-muted-foreground">{m.hours}h</span>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const rangeItems = [
  { value: "7d", label: "最近 7 天" },
  { value: "14d", label: "最近 14 天" },
  { value: "30d", label: "最近 30 天" },
];
