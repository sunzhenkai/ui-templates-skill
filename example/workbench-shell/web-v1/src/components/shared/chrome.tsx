import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { healthLabel, severityLabel, statusLabel } from "@/lib/labels"
import type { HealthState, IncidentStatus, Severity } from "@/types/domain"
import { InboxIcon } from "lucide-react"
import type { ReactNode } from "react"

export function SeverityBadge({ value }: { value: Severity }) {
  return (
    <Badge variant={value === "critical" || value === "high" ? "destructive" : "secondary"} aria-label={`严重等级 ${severityLabel[value]}`}>
      {severityLabel[value]}
    </Badge>
  )
}

export function StatusBadge({ value }: { value: IncidentStatus }) {
  return <Badge variant="outline" aria-label={`状态 ${statusLabel[value]}`}>{statusLabel[value]}</Badge>
}

export function HealthBadge({ value }: { value: HealthState }) {
  return <Badge variant={value === "healthy" ? "secondary" : "destructive"}>{healthLabel[value]}</Badge>
}

export function PageHeader({
  title,
  description,
  actions,
  leading,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  leading?: ReactNode
}) {
  return (
    <header
      className="flex h-[var(--page-header-height)] shrink-0 items-center gap-3 border-b border-[var(--surface-border)] bg-[var(--page-canvas)] px-[var(--page-gutter)]"
      data-slot="page-header"
    >
      {leading}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[length:var(--type-title-sm)] leading-[var(--type-title-sm-lh)] font-medium">{title}</h1>
        {description ? <p className="truncate text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </header>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-[var(--toolbar-height)] shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--surface-border)] bg-[var(--page-canvas)] px-[var(--page-gutter)]"
      data-slot="toolbar"
    >
      {children}
    </div>
  )
}

export function CollectionSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-[var(--page-gutter)]" aria-busy="true" aria-live="polite">
      <span className="sr-only">正在加载</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-md" />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="m-[var(--page-gutter)]" role="alert">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <Button size="sm" variant="outline" onClick={onRetry}>重试</Button>
      </AlertDescription>
    </Alert>
  )
}

export function EmptyState({
  title,
  description,
  action,
  filtered,
  onClear,
}: {
  title: string
  description: string
  action?: ReactNode
  filtered?: boolean
  onClear?: () => void
}) {
  return (
    <Empty className="min-h-48" role="status">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {filtered && onClear ? <Button variant="outline" onClick={onClear}>清除筛选</Button> : action}
    </Empty>
  )
}

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="rounded-full bg-[var(--brand)] px-1.5 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[var(--brand-foreground)]">
      {count > 99 ? "99+" : count}
    </span>
  )
}
