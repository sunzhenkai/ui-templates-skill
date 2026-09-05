import { cn } from "@/lib/utils";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 text-caption" aria-label="步骤">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5",
              i < current && "text-success",
              i === current && "font-medium text-foreground",
              i > current && "text-faint-foreground",
            )}
          >
            <span
              className={cn(
                "inline-flex size-5 items-center justify-center rounded-full border text-micro font-mono",
                i < current && "border-success bg-success text-white",
                i === current && "border-brand text-brand",
                i > current && "border-border",
              )}
            >
              {i + 1}
            </span>
            {s}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-4 bg-border" />}
        </li>
      ))}
    </ol>
  );
}
