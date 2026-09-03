import * as React from 'react'
import { cn } from '@/lib/utils'

interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 分组之间插入分隔条 */
  divided?: boolean
}

// 48px 高，与 PageHeader 共享左线和 gutter。
export function Toolbar({ children, className, ...props }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      className={cn(
        'flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ToolbarSection({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-1.5', className)} {...props} />
}

export function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px bg-border" aria-hidden />
}
