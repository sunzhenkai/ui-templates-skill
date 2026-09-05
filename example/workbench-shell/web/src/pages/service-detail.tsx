import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Server } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { getChanges, getIncidents, getMembers, getServices } from "@/mock/api";
import { formatRelative, incidentStatusLabel } from "@/lib/format";
import { HealthBadge } from "./services";
import { statusVariant } from "./incidents";
import { cn } from "@/lib/utils";

/** 服务详情（ROUTE-006-B）：master = 服务目录，detail = 健康/事件/变更。 */
export function ServiceDetailPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "health";

  const services = useQuery({ queryKey: ["services"], queryFn: getServices });
  const incidents = useQuery({ queryKey: ["incidents"], queryFn: getIncidents });
  const changes = useQuery({ queryKey: ["changes"], queryFn: getChanges });
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });

  const service = (services.data ?? []).find((s) => s.id === id);
  const memberName = (id_: string | null) => members.data?.find((m) => m.id === id_)?.name ?? "未指派";

  const serviceIncidents = useMemo(
    () => (incidents.data ?? []).filter((i) => i.service === service?.name),
    [incidents.data, service],
  );
  const serviceChanges = useMemo(
    () => (changes.data ?? []).filter((c) => c.service === service?.name),
    [changes.data, service],
  );

  if (services.isLoading) {
    return (
      <div aria-busy="true" className="flex h-full min-h-0 flex-col">
        <PageHeader title={<Skeleton className="h-4 w-40" />} />
        <div className="p-4">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader title="服务详情" />
        <EmptyState
          icon={<Server />}
          title="服务不存在"
          description="该服务可能已下线，或链接有误。"
          action={
            <Link to="/services" className="inline-flex h-8 items-center rounded-md border border-input px-3 text-label font-medium outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring/60">
              返回服务目录
            </Link>
          }
        />
      </div>
    );
  }

  const tabs = [
    { id: "health", label: "健康概览" },
    { id: "incidents", label: `事件（${serviceIncidents.length}）` },
    { id: "changes", label: `变更（${serviceChanges.length}）` },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono">{service.name}</span>
            <HealthBadge health={service.health} />
          </span>
        }
        actions={<Badge variant="outline">{service.env === "production" ? "生产" : "预发"}</Badge>}
      />
      <div className="flex items-center gap-2 border-b px-[var(--layout-page-gutter)] py-1.5">
        <Breadcrumb items={[{ label: "服务目录", to: "/services" }, { label: service.name }]} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-[var(--layout-page-gutter)]">
        <div role="tablist" aria-label="服务详情视图" className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                const next = new URLSearchParams(params);
                if (t.id === "health") next.delete("tab");
                else next.set("tab", t.id);
                setParams(next, { replace: true });
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-label font-medium outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring/60",
                tab === t.id && "bg-secondary text-secondary-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "health" && (
          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {[
              { label: "30 天可用率", value: `${service.uptime30d}%` },
              { label: "未解决事件", value: String(service.openIncidents) },
              { label: "负责团队", value: service.team },
              { label: "负责人", value: memberName(service.owner) },
            ].map((m) => (
              <Card key={m.label}>
                <CardHeader>
                  <p className="text-caption text-muted-foreground">{m.label}</p>
                  <CardTitle>{m.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>说明</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-body text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "incidents" && (
          <ul className="mt-3 flex flex-col gap-2" aria-label="服务相关事件">
            {serviceIncidents.length === 0 ? (
              <EmptyState title="暂无相关事件" description="该服务当前没有记录在案的事件。" />
            ) : (
              serviceIncidents.map((i) => (
                <li key={i.id} className="rounded-md border border-surface-border bg-card p-3">
                  <Link
                    to={`/incidents/${i.id}`}
                    className="flex items-center gap-2 rounded-xs outline-none focus-visible:outline-3 focus-visible:outline-ring/60"
                  >
                    <Badge variant={statusVariant(i.status)}>{incidentStatusLabel[i.status]}</Badge>
                    <span className="font-mono text-micro text-brand">{i.number}</span>
                    <span className="min-w-0 flex-1 truncate text-label font-medium">{i.title}</span>
                    <span className="text-micro text-faint-foreground">{formatRelative(i.updatedAt)}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}

        {tab === "changes" && (
          <ul className="mt-3 flex flex-col gap-2" aria-label="服务相关变更">
            {serviceChanges.length === 0 ? (
              <EmptyState title="暂无相关变更" />
            ) : (
              serviceChanges.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-md border border-surface-border bg-card p-3 text-label">
                  <span className="font-mono text-micro text-brand">{c.id}</span>
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  <Badge variant={c.state === "failed" ? "destructive" : c.state === "done" ? "success" : "secondary"}>
                    {changeStateLabel[c.state]}
                  </Badge>
                  <span className="text-micro text-faint-foreground">{formatRelative(c.createdAt)}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

const changeStateLabel: Record<string, string> = {
  pending: "待执行",
  "in-progress": "进行中",
  done: "已完成",
  failed: "失败",
};
