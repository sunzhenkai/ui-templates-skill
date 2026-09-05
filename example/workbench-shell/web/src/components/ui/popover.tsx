import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;
export const PopoverClose = BasePopover.Close;

export function PopoverContent({
  className,
  align = "start",
  ...props
}: React.ComponentProps<typeof BasePopover.Popup> & { align?: "start" | "center" | "end" }) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner align={align} sideOffset={6} className="z-50 outline-none">
        <BasePopover.Popup
          className={cn(
            "rounded-md border border-surface-border bg-popover text-popover-foreground shadow-menu outline-none",
            "data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95",
            "data-[ending-style]:animate-out data-[ending-style]:fade-out-0",
            className,
          )}
          {...props}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
