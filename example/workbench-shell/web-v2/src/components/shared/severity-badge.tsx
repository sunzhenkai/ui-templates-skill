import { Badge } from '@/components/ui/badge'
import type { Severity } from '@/lib/types'
import { cn } from '@/lib/utils'

const labels: Record<Severity, string> = {
  SEV1: 'SEV1 紧急',
  SEV2: 'SEV2 高',
  SEV3: 'SEV3 中',
  SEV4: 'SEV4 低',
}

const variantMap: Record<Severity, 'destructive' | 'warning' | 'info' | 'secondary'> = {
  SEV1: 'destructive',
  SEV2: 'warning',
  SEV3: 'info',
  SEV4: 'secondary',
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge variant={variantMap[severity]} className={cn('tabular', className)}>
      {labels[severity]}
    </Badge>
  )
}
