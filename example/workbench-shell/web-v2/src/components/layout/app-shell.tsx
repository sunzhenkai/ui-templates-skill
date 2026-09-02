import { createContext, useContext, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { MobileSidebar, Sidebar } from './sidebar'
import { AssistantFab } from './fab'
import { ToastHost } from '@/components/ui/toast-host'
import { GlobalSystems } from '@/components/global/global-systems'
import { Button, Skeleton, StateView } from '@/components/ui/primitives'

const DrawerContext = createContext<{ open: () => void } | undefined>(undefined)

export function useDrawer() {
  const context = useContext(DrawerContext)
  if (!context) throw new Error('useDrawer must be used within AppShell')
  return context
}

export function NavigationTrigger() {
  const drawer = useDrawer()
  return (
    <Button variant="ghost" size="sm" className="lg:hidden" aria-label="打开导航抽屉" onClick={drawer.open}>
      <span aria-hidden>☰</span>
    </Button>
  )
}

export function AppShell() {
  const { data, loading, error, reload, sidebarWidth, setSidebarWidth } = useApp()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  return (
    <GlobalSystems>
      {actions => (
        <div className="relative flex h-[100svh] w-full overflow-hidden bg-sidebar">
          <Sidebar width={sidebarWidth} onWidthChange={setSidebarWidth} onOpenSearch={actions.openSearch} onOpenCreate={actions.openCreate} onOpenHelp={actions.openHelp} />
          <MobileSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpenSearch={() => { setDrawerOpen(false); actions.openSearch() }} onOpenCreate={() => { setDrawerOpen(false); actions.openCreate() }} onOpenHelp={() => { setDrawerOpen(false); actions.openHelp() }} />
          <main className="relative m-2 flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-canvas border border-border bg-background shadow-sm">
            <DrawerContext.Provider value={{ open: () => setDrawerOpen(true) }}>
              {loading ? (
                <div className="grid flex-1 place-items-center p-4">
                  <div className="grid w-full max-w-160 gap-3">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-8" />
                    {[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-16" />)}
                  </div>
                </div>
              ) : error ? (
                <StateView tone="danger" icon="!" title="工作区加载失败" description={error.message} action={<Button variant="primary" onClick={reload}>重试</Button>} />
              ) : !data ? (
                <StateView icon="◎" title="未选择工作区" description="请从侧栏选择一个可用工作区。" />
              ) : (
                <>
                  <Outlet />
                  <AssistantFab />
                </>
              )}
            </DrawerContext.Provider>
            <div id="app-overlay" className="pointer-events-none absolute inset-0 z-50" aria-live="off" />
            <ToastHost />
          </main>
        </div>
      )}
    </GlobalSystems>
  )
}

export function NotFoundPage() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center overflow-auto">
      <StateView
        icon="?"
        title="页面不存在"
        description="请检查地址，或返回事件列表继续工作。"
        action={<Link to="/events" className="rounded-control bg-brand px-3 py-1.5 font-label text-brand-foreground">返回事件列表</Link>}
      />
    </div>
  )
}
