import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button } from './primitives'

function OverlayPortal({ children, className, labelledBy, role = 'dialog' }: {
  children: ReactNode; className?: string; labelledBy?: string; role?: string
}) {
  const host = document.getElementById('app-overlay') ?? document.body
  return createPortal(
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation">
      <div role={role} aria-modal={role === 'dialog'} aria-labelledby={labelledBy} className={cn('max-h-full w-full overflow-auto rounded-card border border-border bg-surface shadow-[var(--shadow-overlay)]', className)}>
        {children}
      </div>
    </div>, host,
  )
}

export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const timer = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('[autoFocus],input,select,textarea,button')?.focus(), 30)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose() }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]; const last = focusable.at(-1)!
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', onKeyDown, true); previous?.focus?.() }
  }, [onClose, open])

  if (!open) return null
  const titleId = `dialog-${title.replaceAll(/\s+/g, '-')}`
  return (
    <OverlayPortal labelledBy={titleId} className={cn(size === 'sm' && 'max-w-100', size === 'md' && 'max-w-140', size === 'lg' && 'max-w-180', size === 'xl' && 'max-w-220')}>
      <div ref={panelRef}>
        <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div>
            <h2 id={titleId} className="font-title-sm">{title}</h2>
            {description ? <p className="mt-1 font-caption text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="关闭对话框">✕</Button>
        </header>
        <div className="px-4 py-4">{children}</div>
        {footer ? <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">{footer}</footer> : null}
      </div>
    </OverlayPortal>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = '确认', loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; loading?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm" footer={
      <>
        <Button onClick={onClose}>取消</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading} autoFocus>{confirmLabel}</Button>
      </>
    }>
      <p className="font-body text-muted-foreground">{message}</p>
    </Dialog>
  )
}

const MenuContext = createContext<{ close: () => void } | undefined>(undefined)

export function DropdownMenu({ trigger, children, align = 'right' }: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: ReactNode; align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen(value => !value) })}
      {open && (
        <div role="menu" className={cn('absolute top-full z-30 mt-1 min-w-44 rounded-card border border-border bg-surface p-1 shadow-[var(--shadow-overlay)]', align === 'right' ? 'right-0' : 'left-0')}>
          <MenuContext.Provider value={{ close: () => setOpen(false) }}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  )
}

export function MenuItem({ children, onSelect, danger }: { children: ReactNode; onSelect: () => void; danger?: boolean }) {
  const context = useContext(MenuContext)
  return (
    <button
      type="button"
      role="menuitem"
      className={cn('flex h-8 w-full items-center rounded-sm px-2 text-left font-label hover:bg-surface-hover', danger && 'text-danger')}
      onClick={() => { onSelect(); context?.close() }}
    >
      {children}
    </button>
  )
}
