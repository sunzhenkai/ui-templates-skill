import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from './empty-state'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({ title = '加载失败', description = '请检查网络或稍后重试。', onRetry }: ErrorStateProps) {
  return (
    <div role="alert">
      <EmptyState
        tone="destructive"
        icon={<AlertTriangle className="size-5" />}
        title={title}
        description={description}
        action={
          onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              重试
            </Button>
          ) : null
        }
      />
    </div>
  )
}
