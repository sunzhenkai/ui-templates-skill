import { cn } from "@/lib/utils";

/** 简单时间输入（HH:mm），保持可键入（AX-082）。 */
export function TimeInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="time"
      className={cn(
        "h-8 rounded-md border border-input bg-transparent px-2.5 font-mono text-label",
        "focus-visible:border-ring focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/60",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
