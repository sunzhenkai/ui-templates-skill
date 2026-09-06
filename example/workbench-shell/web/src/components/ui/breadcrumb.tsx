import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="面包屑" className={cn("flex min-w-0 items-center gap-1 text-caption text-muted-foreground", className)}>
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="size-3 shrink-0 text-faint-foreground" aria-hidden />}
          {item.to && i < items.length - 1 ? (
            <Link to={item.to} className="truncate rounded-xs outline-none hover:text-foreground hover:underline focus-visible:outline-3 focus-visible:outline-ring/60">
              {item.label}
            </Link>
          ) : (
            <span aria-current={i === items.length - 1 ? "page" : undefined} className="truncate font-medium text-foreground">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
