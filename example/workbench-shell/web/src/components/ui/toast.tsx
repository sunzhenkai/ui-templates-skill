import { create } from "zustand";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  variant: "success" | "error" | "info" | "loading";
  title: string;
  description?: string;
  action?: ToastAction;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { ...t, id }] }));
    if (t.variant !== "loading" && t.variant !== "error") {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5000);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function toastSuccess(title: string, description?: string, action?: ToastAction) {
  return useToasts.getState().push({ variant: "success", title, description, action });
}
export function toastError(title: string, description?: string, action?: ToastAction) {
  return useToasts.getState().push({ variant: "error", title, description, action });
}
export function toastLoading(title: string, description?: string) {
  return useToasts.getState().push({ variant: "loading", title, description });
}

const ICONS = {
  success: <CheckCircle2 className="size-4 text-success" aria-hidden />,
  error: <AlertTriangle className="size-4 text-destructive" aria-hidden />,
  info: <Info className="size-4 text-info" aria-hidden />,
  loading: <Loader2 className="size-4 animate-spin text-info" aria-hidden />,
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div
      role="region"
      aria-label="通知"
      className="pointer-events-none fixed bottom-[var(--layout-chat-fab-clearance)] right-3 z-[60] flex w-80 flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === "error" ? "alert" : "status"}
          aria-live={t.variant === "error" ? "assertive" : "polite"}
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-md border border-surface-border bg-popover p-3 text-popover-foreground shadow-floating",
            "data-[starting-style]:animate-in data-[starting-style]:slide-in-from-right",
          )}
        >
          {ICONS[t.variant]}
          <div className="min-w-0 flex-1">
            <p className="text-label font-medium">{t.title}</p>
            {t.description && <p className="mt-0.5 text-caption text-muted-foreground">{t.description}</p>}
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className="mt-1.5 text-caption font-medium text-brand underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-ring/60"
              >
                {t.action.label}
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="关闭通知"
            onClick={() => dismiss(t.id)}
            className="rounded-xs p-0.5 text-faint-foreground hover:bg-accent hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
