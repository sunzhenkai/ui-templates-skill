import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  onPage,
  className,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  return (
    <nav aria-label="分页" className={cn("flex items-center justify-end gap-2", className)}>
      <span aria-live="polite" className="text-caption text-muted-foreground">
        第 {page} / {Math.max(pageCount, 1)} 页
      </span>
      <Button variant="outline" size="icon-sm" aria-label="上一页" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="size-3.5" aria-hidden />
      </Button>
      <Button variant="outline" size="icon-sm" aria-label="下一页" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        <ChevronRight className="size-3.5" aria-hidden />
      </Button>
    </nav>
  );
}
