/** 交付分析（route/analytics · dashboard 模式）：指标卡、趋势/分布图（recharts，chart-1..5）、排行、下钻、导出。 */
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, Legend, BarChart, Bar, CartesianGrid } from "recharts";
import { api } from "../../data/mock";
import { formatDate } from "../../lib";
import {
  Badge, Button, EmptyState, ErrorState, NativeSelect, SegmentedControl, Skeleton,
  severityLabel, statusLabel,
} from "../../components/ui";
import { toastSuccess } from "../../components/ui/toast";
import { PageCanvas, PageHeader, PageToolbar, Panel } from "../../components/shell/page";

const RANGES = [
  { key: "7d", label: "最近 7 天" },
  { key: "30d", label: "最近 30 天" },
  { key: "quarter", label: "本季度" },
];

export function AnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const range = params.get("range") ?? "7d";
  const team = params.get("team") ?? "";
  const service = params.get("service") ?? "";
  const severity = params.get("severity") ?? "";
  const { data: incidents, isPending, isError, error, refetch } = useQuery({ queryKey: ["incidents"], queryFn: api.listIncidents });
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: api.listServices });
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: api.listTeams });

  const patch = (kv: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(kv)) {
      if (v == null || v === "") next.delete(k); else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    let rows = incidents ?? [];
    if (team) rows = rows.filter((i) => i.teamId === team);
    if (service) rows = rows.filter((i) => i.serviceId === service);
    if (severity) rows = rows.filter((i) => i.severity === severity);
    return rows;
  }, [incidents, team, service, severity]);

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const stats = useMemo(() => {
    const total = filtered.length;
    const unresolved = filtered.filter((i) => i.status !== "resolved" && i.status !== "archived").length;
    const resolved = filtered.filter((i) => i.resolvedAt);
    const mttr = resolved.length
      ? resolved.reduce((acc, i) => acc + (new Date(i.resolvedAt!).getTime() - new Date(i.startedAt).getTime()) / 3600000, 0) / resolved.length
      : 0;
    const sev1 = filtered.filter((i) => i.severity === "sev1").length;
    const affected = new Set(filtered.map((i) => i.serviceId)).size;
    const changeFailed = 18; // mock：变更失败率
    const prevTotal = Math.max(total + 2, Math.round(total * 1.15));
    return [
      { key: "total", label: "事件总数", value: total, delta: total - prevTotal, unit: "起", to: `/incidents` },
      { key: "unresolved", label: "未解决事件", value: unresolved, delta: -1, unit: "起", to: `/incidents?status=processing` },
      { key: "mtta", label: "平均响应时间", value: 12, delta: -2, unit: "分钟", to: `/incidents?sort=startedAt` },
      { key: "mttr", label: "平均恢复时间", value: Number(mttr.toFixed(1)), delta: 1.4, unit: "小时", to: `/incidents?status=resolved` },
      { key: "changeFail", label: "变更失败率", value: changeFailed, delta: 3, unit: "%", to: `/incidents?tag=chg` },
      { key: "affected", label: "受影响服务数", value: affected, delta: 0, unit: "个", to: `/services` },
      { key: "sev1", label: "P1 事件", value: sev1, delta: -1, unit: "起", to: `/incidents?severity=sev1` },
    ];
  }, [filtered]);

  const trend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (let d = days - 1; d >= 0; d--) {
      const day = formatDate(new Date(Date.now() - d * 86400000).toISOString());
      buckets.set(day, 0);
    }
    for (const i of filtered) {
      const day = formatDate(i.startedAt);
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([date, count]) => ({ date: date.slice(5), count }));
  }, [filtered, days]);

  const bySeverity = useMemo(
    () => (["sev1", "sev2", "sev3", "sev4"] as const).map((s) => ({
      name: severityLabel[s],
      value: filtered.filter((i) => i.severity === s).length,
    })),
    [filtered],
  );

  const topServices = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of filtered) counts.set(i.serviceId, (counts.get(i.serviceId) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count, name: services?.find((s) => s.id === id)?.name ?? id }));
  }, [filtered, services]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ range, stats, trend, bySeverity }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics.json";
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess("分析结果已导出（mock 文件）");
  };

  return (
    <>
      <PageHeader
        title="交付分析"
        actions={<Button variant="outline" size="sm" onClick={exportJson}><Download className="size-3.5" aria-hidden /> 导出</Button>}
      />
      <PageToolbar>
        <SegmentedControl ariaLabel="时间范围" value={range} onChange={(k) => patch({ range: k })} options={RANGES} />
        <NativeSelect aria-label="团队筛选" value={team} onChange={(e) => patch({ team: e.target.value })} className="w-32">
          <option value="">全部团队</option>
          {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="服务筛选" value={service} onChange={(e) => patch({ service: e.target.value })} className="w-32">
          <option value="">全部服务</option>
          {(services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="等级筛选" value={severity} onChange={(e) => patch({ severity: e.target.value })} className="w-28">
          <option value="">全部等级</option>
          <option value="sev1">P1</option><option value="sev2">P2</option><option value="sev3">P3</option><option value="sev4">P4</option>
        </NativeSelect>
      </PageToolbar>
      <PageCanvas className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : isError ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <Panel><EmptyState title="所选范围内没有数据" hint="调整时间范围或筛选条件。" /></Panel>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 max-lg:grid-cols-2">
              {stats.map((s) => (
                <Link
                  key={s.key}
                  to={s.to}
                  className="rounded-lg border border-surface-border bg-surface p-3 no-underline shadow-surface transition-shadow hover:shadow-menu"
                  aria-label={`${s.label} ${s.value} ${s.unit}，查看过滤结果`}
                >
                  <p className="text-caption text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-title-lg font-semibold tabular-nums">
                    {s.value} <span className="text-caption font-normal text-muted-foreground">{s.unit}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-micro">
                    {s.delta > 0 ? (
                      <><TrendingUp className="size-3 text-destructive" aria-hidden /><Badge variant="critical">较上期 +{s.delta}</Badge></>
                    ) : s.delta < 0 ? (
                      <><TrendingDown className="size-3 text-success" aria-hidden /><Badge variant="success">较上期 {s.delta}</Badge></>
                    ) : (
                      <Badge>与上期持平</Badge>
                    )}
                  </p>
                </Link>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel className="p-4">
                <h2 className="text-label font-medium">事件数量趋势</h2>
                <div role="img" aria-label={`最近 ${days} 天事件数量趋势图，共 ${filtered.length} 起`} className="mt-2 h-56 overflow-x-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={11} stroke="var(--color-muted-foreground)" />
                      <YAxis fontSize={11} allowDecimals={false} stroke="var(--color-muted-foreground)" />
                      <RTooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-surface-border)", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="count" name="事件数" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel className="p-4">
                <h2 className="text-label font-medium">按严重等级分布</h2>
                <div role="img" aria-label={`按严重等级分布：P1 ${bySeverity[0].value} 起，P2 ${bySeverity[1].value} 起，P3 ${bySeverity[2].value} 起，P4 ${bySeverity[3].value} 起`} className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bySeverity}>
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} stroke="var(--color-muted-foreground)" />
                      <YAxis fontSize={11} allowDecimals={false} stroke="var(--color-muted-foreground)" />
                      <RTooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-surface-border)", fontSize: 12 }} />
                      <Bar dataKey="value" name="事件数" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <Panel className="p-4">
              <h2 className="text-label font-medium">事件最多的服务排行</h2>
              <ol className="mt-2 space-y-1.5">
                {topServices.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2 text-body">
                    <span className="w-5 text-caption text-faint-foreground tabular-nums">{i + 1}.</span>
                    <Link to={`/incidents?service=&tag=`} className="flex-1 no-underline hover:underline">{s.name}</Link>
                    <Badge variant="info" count={s.count} />
                    <Link to={`/incidents`} className="text-caption no-underline text-brand hover:underline">下钻</Link>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-caption text-faint-foreground">
                状态口径：{statusLabel.triage}/{statusLabel.processing}/{statusLabel.waiting} 计为未解决；导出为 mock 文件。
              </p>
            </Panel>
          </div>
        )}
      </PageCanvas>
    </>
  );
}
