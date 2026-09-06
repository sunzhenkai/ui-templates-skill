import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      className={cn(
        "inline-flex h-4.5 w-8 shrink-0 items-center rounded-full border border-transparent p-0.5 outline-none transition-colors",
        "bg-input data-[checked]:bg-primary",
        "focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb className="size-3.5 rounded-full bg-surface shadow-sm transition-transform data-[checked]:translate-x-3.5" />
    </BaseSwitch.Root>
  );
}
