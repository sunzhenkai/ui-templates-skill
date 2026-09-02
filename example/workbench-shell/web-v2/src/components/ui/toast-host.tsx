import { createPortal } from 'react-dom'
import { useApp } from '@/app/app-context'
import { Button } from './primitives'

export function ToastHost() {
  const { toasts, dismissToast } = useApp()
  const host = document.getElementById('app-overlay') ?? document.body
  return createPortal(
    <div aria-live="polite" aria-label="操作反馈" className="pointer-events-none absolute bottom-6 left-1/2 z-60 w-full max-w-sm -translate-x-1/2 px-4">
      <div className="flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto rounded-card border border-border bg-surface p-3 shadow-[var(--shadow-overlay)]">
            <div className="flex items-start gap-2">
              <span aria-hidden className={toast.tone === 'success' ? 'text-success' : toast.tone === 'error' ? 'text-danger' : 'text-brand'}>●</span>
              <div className="min-w-0 flex-1">
                <p className="font-label">{toast.title}</p>
                {toast.description ? <p className="mt-0.5 font-caption text-muted-foreground">{toast.description}</p> : null}
              </div>
              {toast.action ? <Button size="sm" onClick={() => { toast.action?.onClick(); dismissToast(toast.id) }}>{toast.action.label}</Button> : null}
              <Button size="sm" variant="ghost" aria-label="关闭反馈" onClick={() => dismissToast(toast.id)}>✕</Button>
            </div>
          </div>
        ))}
      </div>
    </div>, host,
  )
}
