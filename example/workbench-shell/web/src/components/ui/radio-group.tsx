import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { cn } from "@/lib/utils";

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof BaseRadioGroup>) {
  return <BaseRadioGroup className={cn("grid gap-2", className)} {...props} />;
}

export function Radio({ className, ...props }: React.ComponentProps<typeof BaseRadio.Root>) {
  return (
    <BaseRadio.Root
      className={cn(
        "size-4 shrink-0 rounded-full border border-input bg-transparent outline-none",
        "focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/60",
        "data-[checked]:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseRadio.Indicator className="flex items-center justify-center">
        <span className="size-2 rounded-full bg-primary" />
      </BaseRadio.Indicator>
    </BaseRadio.Root>
  );
}
