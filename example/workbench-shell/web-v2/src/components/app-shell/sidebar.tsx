import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Inbox, AlertCircle, LayoutGrid, Server, CalendarDays, BarChart3,
  Settings, Search, Plus, LifeBuoy, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/lib/stores/app-store'
import { WorkspaceSwitcher } from './workspace-switcher'
import { ThemeToggle } from './theme-toggle'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}

const groups: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: 'personal',
    label: '个人',
    items: [
      { to: '/inbox', label: '收件箱', icon: Inbox, count: 4 },
    ],
  },
  {
    id: 'ops',
    label: '运维',
    items: [
      { to: '/events', label: '事件', icon: AlertCircle, count: 5 },
      { to: '/events/board', label: '事件看板', icon: LayoutGrid },
      { to: '/services', label: '服务目录', icon: Server },
      { to: '/oncall', label: '值班', icon: CalendarDays },
      { to: '/analytics', label: '交付分析', icon: BarChart3 },
    ],
  },
  {
    id: 'config',
    label: '配置',
    items: [
      { to: '/settings', label: '工作区设置', icon: Settings },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const sidebarWidth = useAppStore((s) => s.sidebarWidth)
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth)
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const setPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const setCreateOpen = useAppStore((s) => s.setCreateIncidentOpen)
  const location = useLocation()
  const draggingRef = useRef<{ startX: number; startWidth: number } | null>(null)

  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth
    draggingRef.current = { startX, startWidth }
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    function onMove(ev: PointerEvent) {
      if (!draggingRef.current) return
      const delta = ev.clientX - draggingRef.current.startX
      setSidebarWidth(draggingRef.current.startWidth + delta)
    }
    function onUp() {
      draggingRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <>
      {/* Mobile drawer backdrop */}
      {mobileOpen ? (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          'group/sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:static md:z-auto',
          'transition-[transform,width] duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed && 'md:w-12',
        )}
        style={{ width: collapsed ? undefined : sidebarWidth }}
        data-testid="app-sidebar"
      >
        {/* Workspace switcher */}
        <div className={cn('flex h-12 items-center border-b border-sidebar-border px-2', collapsed && 'md:justify-center md:px-0')}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/" className="inline-flex size-9 items-center justify-center rounded-md text-title-sm font-semibold text-brand">
                  {useAppStore.getState().workspaces.find((w) => w.id === useAppStore.getState().currentWorkspaceId)?.name.charAt(0) ?? 'W'}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">工作区</TooltipContent>
            </Tooltip>
          ) : (
            <WorkspaceSwitcher />
          )}
        </div>

        {/* Quick actions */}
        <div className={cn('flex items-center gap-1.5 border-b border-sidebar-border p-2', collapsed && 'md:flex-col md:p-1.5')}>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            className="flex-1 justify-start md:flex-none md:w-full"
            onClick={() => setPaletteOpen(true)}
            aria-label="搜索（⌘K）"
          >
            <Search className="size-4" />
            {!collapsed ? <span className="ml-1.5 flex-1 text-left">搜索</span> : null}
            {!collapsed ? (
              <kbd className="ml-auto rounded bg-sidebar-accent px-1.5 text-micro text-muted-foreground">⌘K</kbd>
            ) : null}
          </Button>
          <Button
            variant="brand"
            size={collapsed ? 'icon' : 'default'}
            className="flex-1 md:flex-none md:w-full"
            onClick={() => setCreateOpen(true)}
            aria-label="创建事件（C）"
          >
            <Plus className="size-4" />
            {!collapsed ? <span>创建事件</span> : null}
          </Button>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto p-2" aria-label="主导航">
          <ul className="flex flex-col gap-3">
            {groups.map((group) => (
              <li key={group.id}>
                {!collapsed ? (
                  <p className="px-2 py-1 text-micro uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                ) : (
                  <div className="mx-auto my-1 h-px w-6 bg-sidebar-border" />
                )}
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to + '/'))
                    return (
                      <li key={item.to}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              to={item.to}
                              onClick={onMobileClose}
                              aria-current={isActive ? 'page' : undefined}
                              className={cn(
                                'flex h-8 items-center gap-2 rounded-md px-2 text-body font-medium',
                                'transition-colors',
                                isActive
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                                collapsed && 'md:justify-center md:px-0',
                              )}
                            >
                              <item.icon className="size-4 shrink-0" aria-hidden />
                              {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
                              {!collapsed && item.count ? (
                                <span className="rounded-full bg-brand/12 px-1.5 text-micro font-medium text-brand tabular">
                                  {item.count}
                                </span>
                              ) : null}
                            </Link>
                          </TooltipTrigger>
                          {collapsed ? <TooltipContent side="right">{item.label}</TooltipContent> : null}
                        </Tooltip>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}

            {/* Pinned incidents (collapsible) */}
            <li>
              <Collapsible defaultOpen>
                {!collapsed ? (
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1 text-micro uppercase tracking-wide text-muted-foreground">
                    <span>置顶事件</span>
                    <span className="rounded bg-sidebar-accent px-1 text-micro tabular">1</span>
                  </CollapsibleTrigger>
                ) : (
                  <div className="mx-auto my-1 h-px w-6 bg-sidebar-border" />
                )}
                <CollapsibleContent>
                  <ul className="flex flex-col gap-0.5">
                    <li>
                      <Link
                        to="/events/inc-001"
                        onClick={onMobileClose}
                        className="flex h-8 items-center gap-2 rounded-md px-2 text-body text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                      >
                        <span className="inline-block size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
                        {!collapsed ? <span className="truncate">INC-2031 checkout-api 错误率突增</span> : null}
                      </Link>
                    </li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </li>
          </ul>
        </nav>

        {/* Footer (help + theme + collapse) */}
        <div className="border-t border-sidebar-border p-2">
          <div className={cn('flex items-center gap-1.5', collapsed && 'md:flex-col')}>
            <Button
              variant="ghost"
              size="icon"
              aria-label="帮助与快捷键"
              onClick={() => useAppStore.getState().setHelpOpen(true)}
              className="md:flex-none"
            >
              <LifeBuoy className="size-4" />
            </Button>
            <div className="flex-1 md:hidden">
              <ThemeToggle />
            </div>
            <div className="md:flex">
              <ThemeToggle />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex"
                  aria-label={collapsed ? '展开侧栏' : '折叠侧栏'}
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{collapsed ? '展开' : '折叠'}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Resize handle (desktop only) */}
        {!collapsed ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="调整侧栏宽度"
            className="absolute inset-y-0 right-0 hidden w-1 cursor-col-resize hover:bg-brand/30 md:block"
            onPointerDown={onResizeStart}
          />
        ) : null}
      </aside>
    </>
  )
}
