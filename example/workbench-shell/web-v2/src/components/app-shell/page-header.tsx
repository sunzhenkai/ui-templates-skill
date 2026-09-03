import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  leading?: React.ReactNode
  actions?: React.ReactNode
  meta?: React.ReactNode
}

// 48px 高，底部 1px 边框，左侧 16px gutter。
export function PageHeader({ title, description, leading, actions, meta, className, children, ...props }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4',
        className,
      )}
      {...props}
    >
      {leading ? <div className="-ml-1 flex h-8 items-center">{leading}</div> : null}
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="truncate text-body font-medium leading-5 text-foreground">{title}</h1>
        {meta ? <div className="shrink-0 text-caption text-muted-foreground tabular">{meta}</div> : null}
        {description ? (
          <p className="hidden truncate text-caption text-muted-foreground md:block">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      {children}
    </header>
  )
}
