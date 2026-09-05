import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: React.ComponentProps<typeof BaseSlider.Root>) {
  return (
    <BaseSlider.Root
      className={cn("grid w-full touch-none select-none place-items-center outline-none", className)}
      {...props}
    >
      <BaseSlider.Control className="flex h-5 w-full items-center">
        <BaseSlider.Track className="h-1 w-full rounded-full bg-muted">
          <BaseSlider.Indicator className="rounded-full bg-brand" />
          <BaseSlider.Thumb className="size-4 rounded-full border border-input bg-surface shadow-sm outline-none focus-visible:outline-3 focus-visible:outline-ring/60" />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
