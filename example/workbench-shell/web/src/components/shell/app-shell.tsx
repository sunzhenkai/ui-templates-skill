import { useEffect, useRef } from "react"
import { Sidebar } from "./sidebar"
import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

function AppShell({ children }: { children: React.ReactNode }) {
  const store = useAppStore()
  const isCompact = useMediaQuery("(max-width: 1023px)")
  const prevCompact = useRef(isCompact)

  useEffect(() => {
    if (!isCompact && prevCompact.current) {
      store.setMobileDrawerOpen(false)
    }
    prevCompact.current = isCompact
  }, [isCompact, store])

  return (
    <div className="flex h-svh overflow-hidden bg-sidebar text-foreground">
      {!isCompact && <Sidebar onNavigate={() => store.setMobileDrawerOpen(false)} />}

      {isCompact && store.mobileDrawerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => store.setMobileDrawerOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-64 bg-sidebar shadow-float" onClick={(e) => e.stopPropagation()}>
            <Sidebar onNavigate={() => store.setMobileDrawerOpen(false)} />
          </div>
        </div>
      )}

      <main
        className={cn(
          "relative m-2 flex flex-1 flex-col overflow-hidden rounded-[14px] border border-border bg-background shadow-sm",
          isCompact && "m-0 rounded-none border-0"
        )}
      >
        {children}
      </main>
    </div>
  )
}

export { AppShell }
