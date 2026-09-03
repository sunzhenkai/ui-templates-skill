import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Skeleton className="size-4" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-5 w-20" />
      <Skeleton className="size-6 rounded-full" />
    </div>
  )
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" role="status" aria-live="polite" className="divide-y divide-border">
      <Skeleton className="h-9 w-full rounded-none" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="size-5 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-1.5">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}

export function SkeletonBoardColumn() {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border border-border bg-card p-3" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}
