import { cn } from "@/lib/utils";

export function Progress({
  value,
  label,
  indeterminate = false,
  className,
}: {
  value?: number;
  label?: string;
  indeterminate?: boolean;
  className?: string;
}) {
  const clamped = typeof value === "number" ? Math.min(100, Math.max(0, value)) : undefined;
  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full bg-brand", indeterminate && "w-1/3 animate-progress-slide")}
        style={indeterminate ? undefined : { width: `${clamped ?? 0}%` }}
      />
    </div>
  );
}
