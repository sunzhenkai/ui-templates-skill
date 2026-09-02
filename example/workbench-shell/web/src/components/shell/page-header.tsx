import { ChevronLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/stores/app-store"
import { useMediaQuery } from "@/hooks/use-media-query"

interface PageHeaderProps {
  icon?: React.ReactNode
  title: string
  count?: number
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: { label: string; onClick?: () => void }[]
  showBack?: boolean
  onBack?: () => void
}

function PageHeader({ icon, title, count, description, actions, breadcrumbs, showBack, onBack }: PageHeaderProps) {
  const store = useAppStore()
  const isCompact = useMediaQuery("(max-width: 1023px)")
  const isMobile = useMediaQuery("(max-width: 767px)")

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      {/* 左槽 */}
      {(isCompact || showBack) && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={showBack ? "返回" : "打开导航"}
          onClick={() => {
            if (showBack && onBack) {
              onBack()
            } else {
              store.setMobileDrawerOpen(true)
            }
          }}
        >
          {showBack ? <ChevronLeft className="size-4" /> : <Menu className="size-4" />}
        </Button>
      )}

      {breadcrumbs ? (
        <nav aria-label="面包屑" className="flex min-w-0 items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <span className="text-caption text-muted-foreground">›</span>}
                {isLast ? (
                  <span className="truncate font-medium text-foreground">{crumb.label}</span>
                ) : (
                  <button onClick={crumb.onClick} className="truncate text-muted-foreground hover:text-foreground">
                    {crumb.label}
                  </button>
                )}
              </span>
            )
          })}
        </nav>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h1 className="truncate text-body font-medium text-foreground">{title}</h1>
          {typeof count === "number" && <span className="text-caption tabular-nums text-muted-foreground">{count}</span>}
          {description && !isMobile && <span className="ml-1 truncate text-caption text-muted-foreground">{description}</span>}
        </div>
      )}

      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

export { PageHeader }
