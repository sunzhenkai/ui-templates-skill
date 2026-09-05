import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof BaseCheckbox.Root>) {
  return (
    <BaseCheckbox.Root
      className={cn(
        "peer size-4 shrink-0 rounded-xs border border-input bg-transparent outline-none",
        "focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/60",
        "data-[checked]:border-primary data-[checked]:bg-primary data-[indeterminate]:border-primary data-[indeterminate]:bg-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator
        className="flex items-center justify-center text-primary-foreground data-[indeterminate]:hidden"
      >
        <Check className="size-3" aria-hidden />
      </BaseCheckbox.Indicator>
      <BaseCheckbox.Indicator
        className="flex items-center justify-center text-primary-foreground data-[checked]:hidden"
      >
        <Minus className="size-3" aria-hidden />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
