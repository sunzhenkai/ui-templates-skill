import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Check, ChevronDown, LoaderCircle, X } from 'lucide-react'
import { cn } from '../lib'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'icon' }>(function Button({ className, variant = 'secondary', size = 'md', children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-45',
        'h-8 px-3',
        size === 'sm' && 'h-7 px-2 text-[12px]',
        size === 'icon' && 'size-8 px-0',
        variant === 'primary' && 'bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]',
        variant === 'secondary' && 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]',
        variant === 'ghost' && 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
        variant === 'danger' && 'bg-[var(--danger)] text-white hover:brightness-110',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(function IconButton({ label, className, children, ...props }, ref) {
  return <Button ref={ref} aria-label={label} size="icon" variant="ghost" className={className} {...props}>{children}</Button>
})

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('h-8 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('min-h-24 w-full resize-y rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn('h-8 w-full appearance-none rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 pr-7 text-[13px] text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]', className)} {...props}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-2 top-2 size-4 text-[var(--text-faint)]" />
    </div>
  )
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'; className?: string }) {
  const tones = {
    neutral: 'bg-[var(--surface-hover)] text-[var(--text-muted)]',
    success: 'bg-[var(--success-soft)] text-[var(--success)]',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    info: 'bg-[var(--info-soft)] text-[var(--info)]',
    brand: 'bg-[var(--brand-soft)] text-[var(--brand)]',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', tones[tone], className)}>{children}</span>
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const text = name.slice(0, 1)
  return <span className={cn('inline-grid shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] font-semibold text-[var(--brand)]', size === 'sm' && 'size-5 text-[10px]', size === 'md' && 'size-7 text-[11px]', size === 'lg' && 'size-9 text-[13px]')}>{text}</span>
}

export function Card({ children, className, onClick, onDragOver, onDrop }: { children: ReactNode; className?: string; onClick?: () => void; onDragOver?: React.DragEventHandler<HTMLDivElement>; onDrop?: React.DragEventHandler<HTMLDivElement> }) {
  return <div className={cn('rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]', onClick && 'cursor-pointer transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]', className)} onClick={onClick} onDragOver={onDragOver} onDrop={onDrop}>{children}</div>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="grid min-h-48 place-items-center rounded-[var(--radius-surface)] border border-dashed border-[var(--border)] p-8 text-center"><div><div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-[var(--surface-hover)] text-[var(--text-faint)]">∅</div><h3 className="text-[15px] font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--text-muted)]">{description}</p>{action && <div className="mt-4">{action}</div>}</div></div>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-[var(--surface-hover)]', className)} />
}

export function Tabs({ items, value, onChange }: { items: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return <div className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-[var(--surface-hover)] p-1" role="tablist">{items.map((item) => <button key={item.id} role="tab" aria-selected={value === item.id} className={cn('rounded-md px-3 py-1 text-[12px] text-[var(--text-muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]', value === item.id && 'bg-[var(--surface)] text-[var(--text)] shadow-sm')} onClick={() => onChange(item.id)}>{item.label}</button>)}</div>
}

export function Dialog({ open, title, description, onClose, children, footer, size = 'md' }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label={title} className={cn('max-h-[calc(100vh-2rem)] w-full overflow-auto rounded-[var(--radius-dialog)] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-floating)]', size === 'sm' && 'max-w-sm', size === 'md' && 'max-w-xl', size === 'lg' && 'max-w-3xl')}>
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-[18px] font-semibold">{title}</h2>{description && <p className="mt-1 text-[13px] text-[var(--text-muted)]">{description}</p>}</div><IconButton label="关闭" onClick={onClose}><X className="size-4" /></IconButton></div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border)] pt-4">{footer}</div>}
      </section>
    </div>
  )
}

export function Spinner() { return <LoaderCircle className="size-4 animate-spin" /> }
export function Checkmark() { return <Check className="size-4" /> }
