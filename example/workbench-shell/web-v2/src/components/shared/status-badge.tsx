import { Badge } from '@/components/ui/badge'
import type { IncidentStatus } from '@/lib/types'

const labels: Record<IncidentStatus, string> = {
  triggered: '已触发',
  acknowledged: '已确认',
  investigating: '排查中',
  mitigated: '已缓解',
  resolved: '已解决',
}

const variantMap: Record<IncidentStatus, 'destructive' | 'warning' | 'info' | 'success' | 'secondary'> = {
  triggered: 'destructive',
  acknowledged: 'warning',
  investigating: 'info',
  mitigated: 'success',
  resolved: 'secondary',
}

export function StatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  return (
    <Badge variant={variantMap[status]} className={className}>
      <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden />
      {labels[status]}
    </Badge>
  )
}
