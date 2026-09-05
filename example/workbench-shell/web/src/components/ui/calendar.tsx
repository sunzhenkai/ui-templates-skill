import { useMemo } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface CalendarDayMeta {
  badges?: { label: string; tone: "success" | "warning" | "destructive" | "info" | "brand" }[];
}

export function Calendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  dayMeta,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selected?: string;
  onSelect?: (iso: string) => void;
  dayMeta?: Record<string, CalendarDayMeta>;
}) {
  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  }, [month]);

  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

  return (
    <div role="group" aria-label={format(month, "yyyy年M月", { locale: zhCN })} className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-title-sm font-semibold" aria-live="polite">
          {format(month, "yyyy年M月", { locale: zhCN })}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onMonthChange(addMonths(month, -1))} aria-label="上个月">
            上一月
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMonthChange(new Date())} aria-label="回到今天">
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="下个月">
            下一月
          </Button>
        </div>
      </div>
      <div role="grid" aria-label="日历网格" className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-surface-border bg-border">
        {weekdays.map((w) => (
          <div role="columnheader" key={w} className="bg-surface px-2 py-1.5 text-center text-micro font-medium text-muted-foreground">
            周{w}
          </div>
        ))}
        {weeks.flat().map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const meta = dayMeta?.[iso];
          const isCurrentMonth = isSameMonth(d, month);
          return (
            <div
              role="gridcell"
              key={iso}
              aria-selected={selected === iso}
              aria-current={isToday(d) ? "date" : undefined}
              className={cn(
                "min-h-24 bg-surface p-1.5 align-top",
                !isCurrentMonth && "bg-surface-hover/40 text-faint-foreground",
                isToday(d) && "ring-1 ring-inset ring-brand",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect?.(iso)}
                className={cn(
                  "mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-xs px-1 font-mono text-caption outline-none",
                  "hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/60",
                  selected === iso && "bg-primary text-primary-foreground",
                )}
              >
                {d.getDate()}
              </button>
              <div className="flex flex-col gap-0.5">
                {(meta?.badges ?? []).map((b, i) => (
                  <span
                    key={i}
                    className={cn(
                      "truncate rounded-xs px-1 text-micro",
                      b.tone === "success" && "bg-success/15 text-success",
                      b.tone === "warning" && "bg-warning/20 text-foreground",
                      b.tone === "destructive" && "bg-destructive/15 text-destructive",
                      b.tone === "info" && "bg-info/15 text-info",
                      b.tone === "brand" && "bg-brand/15 text-brand",
                    )}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { parseISO, isSameDay, format };
