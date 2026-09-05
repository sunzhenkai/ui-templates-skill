import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** 结构化骨架：复制 PageHeader + Toolbar + 集合行形状（NN-015）。 */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div aria-busy="true" className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex h-[var(--layout-page-header-height)] shrink-0 items-center gap-2 border-b px-[var(--layout-page-gutter)]">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex h-[var(--layout-toolbar-height)] shrink-0 items-center gap-2 border-b px-[var(--layout-page-gutter)]">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="ml-auto h-7 w-20" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden p-[var(--layout-page-gutter)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
