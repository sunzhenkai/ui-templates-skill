import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function PageHeader({ icon, title, description, actions, left, breadcrumb, compactDescription = true }: {
  icon?: ReactNode; title: string; description?: string; actions?: ReactNode; left?: ReactNode; breadcrumb?: { label: string; to?: string }[]; compactDescription?: boolean
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      {left}
      {breadcrumb ? (
        <nav aria-label="面包屑" className="flex min-w-0 items-center gap-1 font-caption text-muted-foreground">
          {breadcrumb.map((item, index) => (
            <span key={item.label} className="flex min-w-0 items-center gap-1">
              {index > 0 && <span aria-hidden>/</span>}
              {item.to ? <Link to={item.to} className="rounded-sm hover:bg-surface-hover hover:text-foreground">{item.label}</Link> : <span aria-current="page" className="truncate text-foreground">{item.label}</span>}
            </span>
          ))}
        </nav>
      ) : null}
      {!breadcrumb && icon ? <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted">{icon}</span> : null}
      {!breadcrumb && <h1 className="truncate font-body font-medium">{title}</h1>}
      {description && compactDescription ? <p className="hidden truncate font-caption text-muted-foreground xl:block">{description}</p> : null}
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </header>
  )
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-border px-4', className)}>{children}</div>
}

export function DetailHeader({ title, backTo, backLabel = '返回列表', actions, breadcrumb }: {
  title: string; backTo: string; backLabel?: string; actions?: ReactNode; breadcrumb?: { label: string; to?: string }[]
}) {
  return (
    <PageHeader
      title={title}
      actions={actions}
      breadcrumb={breadcrumb}
      left={
        <Link to={backTo} className="inline-flex h-8 items-center gap-1.5 rounded-control px-2 font-label hover:bg-surface-hover">
          <span aria-hidden>←</span><span className="hidden sm:inline">{backLabel}</span>
        </Link>
      }
    />
  )
}
