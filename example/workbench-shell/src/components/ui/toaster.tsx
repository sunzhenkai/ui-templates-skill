import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import { CheckCircle2, Info, X, XCircle } from "lucide-react"

function Toaster() {
  const toasts = useAppStore((s) => s.toasts)
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex w-80 items-start gap-3 rounded-lg border bg-background p-3 shadow-float",
            toast.type === "error" && "border-destructive"
          )}
          role="status"
          aria-live="polite"
        >
          {toast.type === "success" && <CheckCircle2 className="mt-0.5 size-4 text-green-600" />}
          {toast.type === "error" && <XCircle className="mt-0.5 size-4 text-destructive" />}
          {toast.type === "info" && <Info className="mt-0.5 size-4 text-primary" />}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{toast.title}</p>
            {toast.description && <p className="text-caption text-muted-foreground">{toast.description}</p>}
          </div>
          <button
            onClick={() => useAppStore.getState().removeToast(toast.id)}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="关闭通知"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export { Toaster }
