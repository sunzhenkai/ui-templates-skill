import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials: string
  color?: string
}

export function Avatar({ initials, color = 'oklch(0.65 0.16 255)', className, style, ...props }: AvatarProps) {
  return (
    <div
      role="img"
      aria-label={initials}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-micro font-semibold leading-3',
        className,
      )}
      style={{ background: `color-mix(in oklch, ${color} 18%, transparent)`, color, ...style }}
      {...props}
    >
      {initials}
    </div>
  )
}

export function AvatarStack({ items, max = 4 }: { items: { id: string; initials: string; color: string }[]; max?: number }) {
  const shown = items.slice(0, max)
  const remaining = items.length - shown.length
  return (
    <div className="flex -space-x-1.5">
      {shown.map((m) => (
        <Avatar key={m.id} initials={m.initials} color={m.color} className="ring-2 ring-surface" />
      ))}
      {remaining > 0 ? (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-micro text-muted-foreground ring-2 ring-surface">
          +{remaining}
        </span>
      ) : null}
    </div>
  )
}
