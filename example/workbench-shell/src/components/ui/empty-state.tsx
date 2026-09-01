import { cn } from "@/lib/utils"

interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-6 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      {title && (
        <div className="text-sm font-medium text-foreground">{title}</div>
      )}
      {description && (
        <div className="mt-1 max-w-[260px] text-sm text-muted-foreground">
          {description}
        </div>
      )}
      {action && <div className="mt-4 flex items-center gap-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
