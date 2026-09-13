/** pattern/page-chrome：48px 页头 + 48px 工具栏同一前缘（rule/LAYOUT-106）；full-bleed 16px 页槽（NN-102）。 */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib";

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="面包屑" className="flex items-center gap-1 text-caption text-muted-foreground">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 text-faint-foreground" aria-hidden />}
          {item.to ? (
            <Link to={item.to} className="no-underline hover:text-foreground hover:underline">{item.label}</Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title, count, actions, breadcrumb,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-surface-border px-4">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-title-sm font-semibold">
          {title}
          {count != null && <span className="ml-2 text-caption font-normal text-muted-foreground tabular-nums">{count} 条</span>}
        </h1>
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}

export function PageToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-surface-border px-4 py-1.5">
      {children}
    </div>
  );
}

export function PageCanvas({ children, className }: { children: ReactNode; className?: string }) {
  // 单 scroll owner 页面在此滚动（scroll owner = region-content）
  return <div className={cn("min-h-0 flex-1 overflow-y-auto p-4", className)}>{children}</div>;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-surface-border bg-surface shadow-surface", className)}>
      {children}
    </section>
  );
}
