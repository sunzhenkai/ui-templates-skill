import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutList, Plus, Server } from "lucide-react";
import { PageHeader, Toolbar } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from "@/components/ui/table";
import { getServices } from "@/mock/api";
import { healthLabel } from "@/lib/format";
import { useShell } from "@/components/shell/shell-context";
import { cn } from "@/lib/utils";

/** 服务目录（ROUTE-005-A）：卡片网格 / 表格双视图；列数由容器决定（RESP-005）。 */
export function ServicesPage() {
  const [params, setParams] = useSearchParams();
  const { openCreate } = useShell();
  const view = params.get("view") === "table" ? "table" : "cards";
  const q = params.get("q") ?? "";
  const env = params.get("env") ?? "all";
  const health = params.get("health") ?? "all";

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["services"], queryFn: getServices });

  const filtered = useMemo(() => {
    let items = data ?? [];
    if (q) items = items.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
    if (env !== "all") items = items.filter((s) => s.env === env);
    if (health !== "all") items = items.filter((s) => s.health === health);
    return items;
  }, [data, q, env, health]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="服务目录"
        icon={<Server />}
        actions={
          <Button variant="default" size="sm" onClick={openCreate}>
            <Plus aria-hidden /> 创建事件
          </Button>
        }
      />
      <Toolbar>
        <Select items={viewItems} value={view} onValueChange={(v) => setParam("view", (v as string) === "cards" ? "all" : (v as string))}>
          <SelectTrigger className="h-7 w-24" aria-label="视图切换">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cards">
              <span className="flex items-center gap-1.5">卡片</span>
            </SelectItem>
            <SelectItem value="table">
              <span className="flex items-center gap-1.5">
                <LayoutList className="size-3.5" aria-hidden /> 表格
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setParam("q", e.target.value)} placeholder="搜索服务…" aria-label="搜索服务" className="h-7 w-44" />
        <Select items={envItems} value={env} onValueChange={(v) => setParam("env", v as string)}>
          <SelectTrigger className="h-7 w-28" aria-label="环境筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部环境</SelectItem>
            <SelectItem value="production">生产</SelectItem>
            <SelectItem value="staging">预发</SelectItem>
          </SelectContent>
        </Select>
        <Select items={healthItems} value={health} onValueChange={(v) => setParam("health", v as string)}>
          <SelectTrigger className="h-7 w-28" aria-label="健康筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部健康度</SelectItem>
            <SelectItem value="healthy">健康</SelectItem>
            <SelectItem value="degraded">降级</SelectItem>
            <SelectItem value="down">故障</SelectItem>
          </SelectContent>
        </Select>
      </Toolbar>

      <div className="min-h-0 flex-1 overflow-y-auto p-[var(--layout-page-gutter)]" role="region" aria-label="服务集合">
        {isLoading ? (
          <div aria-busy="true" className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<Server />}
            title="服务加载失败"
            description="模拟请求失败。"
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                重试
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Server />}
            title={(data ?? []).length === 0 ? "还没有服务" : "没有匹配的服务"}
            description={(data ?? []).length === 0 ? "接入服务后可在此跟踪健康度。" : "调整筛选条件后再试。"}
            action={
              (data ?? []).length > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                  清除筛选
                </Button>
              ) : undefined
            }
          />
        ) : view === "cards" ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3" aria-label="服务卡片">
            {filtered.map((s) => (
              <li key={s.id}>
                <Link to={`/services/${s.id}`} className="block rounded-lg outline-none focus-visible:outline-3 focus-visible:outline-ring/60">
                  <Card interactive>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="font-mono">{s.name}</CardTitle>
                        <HealthBadge health={s.health} />
                      </div>
                      <p className="line-clamp-1 text-caption text-muted-foreground">{s.description}</p>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between text-caption text-muted-foreground">
                      <span>#{s.tier} 级</span>
                      <span>{s.team}</span>
                      <span className="font-mono">{s.uptime30d}%</span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <TableWrap className="rounded-lg border border-surface-border">
            <Table aria-label="服务表格">
              <TableHeader>
                <TableRow>
                  <TableHead>服务</TableHead>
                  <TableHead>健康</TableHead>
                  <TableHead>层级</TableHead>
                  <TableHead>团队</TableHead>
                  <TableHead className="text-right">30 天可用率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        to={`/services/${s.id}`}
                        className="font-mono text-caption font-medium text-brand outline-none hover:underline focus-visible:outline-3 focus-visible:outline-ring/60"
                      >
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <HealthBadge health={s.health} />
                    </TableCell>
                    <TableCell>#{s.tier}</TableCell>
                    <TableCell className="text-caption">{s.team}</TableCell>
                    <TableCell className="text-right font-mono text-caption">{s.uptime30d}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}

export function HealthBadge({ health }: { health: string }) {
  return (
    <Badge
      variant={health === "healthy" ? "success" : health === "degraded" ? "warning" : "destructive"}
      className={cn(health === "down" && "animate-pulse")}
    >
      {healthLabel[health]}
    </Badge>
  );
}

const viewItems = [
  { value: "cards", label: "卡片" },
  { value: "table", label: "表格" },
];
const envItems = [
  { value: "all", label: "全部环境" },
  { value: "production", label: "生产" },
  { value: "staging", label: "预发" },
];
const healthItems = [
  { value: "all", label: "全部健康度" },
  { value: "healthy", label: "健康" },
  { value: "degraded", label: "降级" },
  { value: "down", label: "故障" },
];
