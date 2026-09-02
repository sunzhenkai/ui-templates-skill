import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'subtle'
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({ className, variant = 'outline', size = 'md', loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-control border font-label transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        size === 'sm' ? 'h-7 px-2' : 'h-8 px-3',
        variant === 'primary' && 'border-transparent bg-brand text-brand-foreground hover:brightness-110',
        variant === 'outline' && 'border-border bg-surface hover:bg-surface-hover',
        variant === 'ghost' && 'border-transparent bg-transparent hover:bg-surface-hover',
        variant === 'subtle' && 'border-transparent bg-muted hover:bg-surface-hover',
        variant === 'danger' && 'border-transparent bg-danger text-white hover:brightness-110',
        className,
      )}
    >
      {loading ? <span aria-hidden className="size-3 animate-pulse rounded-full bg-current" /> : null}
      {children}
    </button>
  )
}

const fieldBase = 'w-full rounded-control border border-border bg-surface px-3 py-2 font-body placeholder:text-faint disabled:opacity-60'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, 'h-9 py-0', className)} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, 'min-h-20 resize-y', className)} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldBase, 'h-9 py-0', className)}>{children}</select>
}

export function Field({ label, error, hint, children, required, htmlFor }: {
  label: string; error?: string; hint?: string; children: ReactNode; required?: boolean; htmlFor?: string
}) {
  return (
    <div className="grid gap-1.5">
      <label className="font-label text-muted-foreground" htmlFor={htmlFor}>
        {label}{required && <span aria-hidden className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {hint && !error ? <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="font-caption text-faint">{hint}</p> : null}
      {error ? <p role="alert" className="font-caption text-danger">{error}</p> : null}
    </div>
  )
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 font-body', className)}>
      <input {...props} type="checkbox" className="size-4 accent-[var(--brand)]" />
      <span>{label}</span>
    </label>
  )
}

export function Switch({ checked, onChange, label, className }: { checked: boolean; onChange: (checked: boolean) => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('inline-flex h-6 w-10 items-center rounded-full border border-border bg-muted px-0.5 transition-colors aria-checked:bg-brand', className)}
    >
      <span className={cn('size-4 rounded-full bg-surface transition-transform', checked && 'translate-x-4')} />
      <span className="sr-only">{label}</span>
    </button>
  )
}

export function Badge({ tone = 'muted', children, className }: {
  tone?: 'muted' | 'brand' | 'success' | 'warning' | 'danger'; children: ReactNode; className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-caption',
      tone === 'muted' && 'border-border bg-muted text-muted-foreground',
      tone === 'brand' && 'border-brand/30 bg-brand/10 text-brand',
      tone === 'success' && 'border-success/30 bg-[var(--success-tint)] text-success',
      tone === 'warning' && 'border-warning/30 bg-[var(--warning-tint)] text-warning',
      tone === 'danger' && 'border-danger/30 bg-[var(--danger-tint)] text-danger',
      className,
    )}>
      {children}
    </span>
  )
}

export function SegmentedControl<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-control border border-border bg-surface p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn('h-7 rounded-sm px-2.5 font-label text-muted-foreground hover:bg-surface-hover aria-checked:bg-sidebar-accent aria-checked:text-sidebar-accent-foreground')}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-sm bg-muted', className)} />
}

export function StateView({ tone = 'muted', icon, title, description, action, className }: {
  tone?: 'muted' | 'warning' | 'danger'; icon: ReactNode; title: string; description?: string; action?: ReactNode; className?: string
}) {
  return (
    <div className={cn('mx-auto flex max-w-112 flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <div className={cn(
        'flex size-12 items-center justify-center rounded-full',
        tone === 'muted' && 'bg-muted text-faint',
        tone === 'warning' && 'bg-[var(--warning-tint)] text-warning',
        tone === 'danger' && 'bg-[var(--danger-tint)] text-danger',
      )} aria-hidden>{icon}</div>
      <h2 className="font-title-lg">{title}</h2>
      {description ? <p className="font-body text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  )
}
