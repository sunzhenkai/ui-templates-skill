import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  tone?: 'muted' | 'warning' | 'destructive'
  className?: string
}

const toneMap = {
  muted: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/12 text-destructive',
}

export function EmptyState({ icon, title, description, action, tone = 'muted', className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <div className={cn('inline-flex size-12 items-center justify-center rounded-full', toneMap[tone])}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-body font-medium text-foreground">{title}</p>
        {description ? <p className="max-w-md text-caption text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
