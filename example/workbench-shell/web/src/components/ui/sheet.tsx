import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = BaseDialog.Root;
export const SheetTrigger = BaseDialog.Trigger;
export const SheetClose = BaseDialog.Close;

export function SheetContent({
  className,
  children,
  title,
  side = "right",
  ...props
}: React.ComponentProps<typeof BaseDialog.Popup> & {
  title: string;
  side?: "right" | "left";
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/25 data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0" />
      <BaseDialog.Popup
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(28rem,90vw)] flex-col border-surface-border bg-popover text-popover-foreground shadow-floating outline-none",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
          side === "right"
            ? "data-[starting-style]:animate-in data-[starting-style]:slide-in-from-right data-[ending-style]:animate-out data-[ending-style]:slide-out-to-right"
            : "data-[starting-style]:animate-in data-[starting-style]:slide-in-from-left data-[ending-style]:animate-out data-[ending-style]:slide-out-to-left",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <BaseDialog.Title className="text-title font-semibold">{title}</BaseDialog.Title>
          <BaseDialog.Close
            aria-label="关闭"
            className="rounded-md p-1 text-faint-foreground hover:bg-accent hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60"
          >
            <X className="size-4" aria-hidden />
          </BaseDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}
