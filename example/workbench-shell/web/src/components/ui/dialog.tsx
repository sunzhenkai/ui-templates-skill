import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof BaseDialog.Popup> & { title: string; description?: string }) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/25 data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0" />
      <BaseDialog.Popup
        aria-labelledby={props["aria-labelledby"]}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-surface-border bg-popover p-4 text-popover-foreground shadow-floating outline-none",
          "data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95",
          "data-[ending-style]:animate-out data-[ending-style]:fade-out-0",
          className,
        )}
        {...props}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <BaseDialog.Title className="text-title font-semibold">{title}</BaseDialog.Title>
            {description && (
              <BaseDialog.Description className="mt-0.5 text-caption text-muted-foreground">
                {description}
              </BaseDialog.Description>
            )}
          </div>
          {(
            <BaseDialog.Close
              aria-label="关闭"
              className="rounded-md p-1 text-faint-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60"
            >
              <X className="size-4" aria-hidden />
            </BaseDialog.Close>
          )}
        </div>
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}
