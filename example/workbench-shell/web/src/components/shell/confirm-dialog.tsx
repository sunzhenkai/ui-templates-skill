import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

/** 危险操作确认（AX-046..050）：destructive 语义 + 焦点管理。 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "确认",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/25 data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0" />
        <BaseDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(24rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-surface-border bg-popover p-4 text-popover-foreground shadow-floating outline-none data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0">
          <BaseDialog.Title className="text-title font-semibold">{title}</BaseDialog.Title>
          <BaseDialog.Description className="mt-1 text-caption text-muted-foreground">{description}</BaseDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <BaseDialog.Close render={(props: React.ComponentProps<"button">) => <Button variant="outline" {...props}>取消</Button>} />
            <BaseDialog.Close
              render={(props: React.ComponentProps<"button">) => (
                <Button variant="destructive" {...props} onClick={onConfirm}>
                  {confirmLabel}
                </Button>
              )}
            />
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
