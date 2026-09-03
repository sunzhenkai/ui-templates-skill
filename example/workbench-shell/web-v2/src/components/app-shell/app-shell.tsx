import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Sidebar } from './sidebar'
import { NavigationProgress } from './navigation-progress'
import { SearchPalette } from './search-palette'
import { CreateIncidentDialog } from './create-incident-dialog'
import { ShortcutsHelp } from './shortcuts-help'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { useAppStore } from '@/lib/stores/app-store'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'

export function AppShell() {
  const theme = useAppStore((s) => s.theme)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Sync html.dark class with theme
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    root.dataset.theme = theme
  }, [theme])

  // Global shortcuts
  useKeyboardShortcuts([
    { key: 'k', cmd: true, description: '打开搜索', handler: () => useAppStore.getState().setCommandPaletteOpen(true) },
    { key: '/', cmd: true, description: '打开搜索（备用）', handler: () => useAppStore.getState().setCommandPaletteOpen(true) },
    { key: 'c', description: '创建事件', handler: () => useAppStore.getState().setCreateIncidentOpen(true) },
    { key: '?', shift: true, cmd: false, description: '帮助', handler: () => useAppStore.getState().setHelpOpen(true) },
    { key: 'g', cmd: false, ignoreEditable: true, description: 'goto prefix', handler: () => {
      // store "g" pressed and wait for second key
      pendingGoto()
    } },
  ])

  function pendingGoto() {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        i: '/inbox', e: '/events', b: '/events/board',
        s: '/services', o: '/oncall', a: '/analytics', ',': '/settings',
      }
      const target = map[e.key.toLowerCase()]
      if (target) {
        e.preventDefault()
        navigate(target)
      }
      window.removeEventListener('keydown', handler, true)
    }
    window.addEventListener('keydown', handler, { capture: true })
    window.setTimeout(() => window.removeEventListener('keydown', handler, true), 1200)
  }

  // Prefetch common queries
  useEffect(() => {
    void queryClient.prefetchQuery({ queryKey: ['incidents'], queryFn: () => api.listIncidents() })
  }, [queryClient])

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-full w-full bg-app-shell text-foreground">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <NavigationProgress />
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            <Outlet />
          </main>
        </div>
      </div>

      <SearchPalette />
      <CreateIncidentDialog />
      <ShortcutsHelp />
      <Toaster
        position="bottom-right"
        theme={theme}
        toastOptions={{
          classNames: {
            toast: 'border border-border bg-popover text-popover-foreground shadow-floating',
            title: 'text-body font-medium',
            description: 'text-caption text-muted-foreground',
          },
        }}
      />
    </TooltipProvider>
  )
}
