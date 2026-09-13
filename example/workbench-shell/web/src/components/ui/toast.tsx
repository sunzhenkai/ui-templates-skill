/** Toast 系统（pattern/toast）：aria-live、可关闭、失败可重试；右下栈避开 chat-fab。 */
import { create } from "zustand";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "../../lib";

export interface ToastItem {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
  retry?: () => void;
}

interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: number) => void;
}

let seq = 1;
export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (t) =>
    set((s) => ({
      items: [...s.items.slice(-4), { ...t, id: seq++ }],
    })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export function toastSuccess(message: string) {
  useToastStore.getState().push({ kind: "success", message });
}
export function toastError(message: string, retry?: () => void) {
  useToastStore.getState().push({ kind: "error", message, retry });
}
export function toastInfo(message: string) {
  useToastStore.getState().push({ kind: "info", message });
}

const icons = {
  success: <CheckCircle2 className="size-4 text-success" aria-hidden />,
  error: <AlertTriangle className="size-4 text-destructive" aria-hidden />,
  info: <Info className="size-4 text-info" aria-hidden />,
};

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      aria-label="通知"
      className="pointer-events-none fixed bottom-[calc(var(--spacing-chat-inset)+var(--spacing-chat-launcher)+12px)] right-[var(--spacing-chat-inset)] z-50 flex w-80 flex-col gap-2"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "animate-overlay-in pointer-events-auto flex items-start gap-2 rounded-md border border-surface-border bg-popover p-3 text-body text-popover-foreground shadow-floating",
          )}
        >
          {icons[item.kind]}
          <div className="min-w-0 flex-1">
            <p className="break-words">{item.message}</p>
            {item.retry && (
              <button
                onClick={() => {
                  dismiss(item.id);
                  item.retry?.();
                }}
                className="mt-1 text-caption font-medium text-brand underline-offset-2 hover:underline"
              >
                重试
              </button>
            )}
          </div>
          <button aria-label="关闭通知" onClick={() => dismiss(item.id)} className="rounded-sm p-0.5 text-muted-foreground hover:bg-surface-hover">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
