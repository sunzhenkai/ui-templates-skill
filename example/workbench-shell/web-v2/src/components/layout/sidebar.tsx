import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '@/app/app-context'
import { Badge } from '@/components/ui/primitives'
import { DropdownMenu, MenuItem } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

const navGroups = [
  { title: null, items: [{ to: '/inbox', label: '收件箱', icon: '◉' }] },
  { title: '运维', items: [
    { to: '/events', label: '事件列表', icon: '▤' },
    { to: '/board', label: '事件看板', icon: '▣' },
    { to: '/services', label: '服务目录', icon: '◈' },
    { to: '/on-call', label: '值班日历', icon: '◷' },
    { to: '/analytics', label: '交付分析', icon: '◔' },
  ] },
  { title: '配置', items: [{ to: '/settings', label: '工作区设置', icon: '⚙' }] },
]

type SidebarActions = { onNavigate?: () => void; onOpenSearch?: () => void; onOpenCreate?: () => void; onOpenHelp?: () => void }

export function SidebarContent({ onNavigate, onOpenSearch, onOpenCreate, onOpenHelp }: SidebarActions) {
  const { data, workspaces, workspaceId, switchWorkspace, updateData } = useApp()
  const location = useLocation()
  const [pinnedOpen, setPinnedOpen] = useState(true)
  const unread = data?.inbox.filter(item => item.status === 'unread').length ?? 0
  const pinned = data?.incidents.filter(incident => incident.pinned) ?? []

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-3 pb-0">
        <DropdownMenu align="left" trigger={({ toggle, open }) => (
          <button type="button" onClick={toggle} aria-expanded={open} className="flex h-9 w-full items-center gap-2 rounded-control px-2 hover:bg-sidebar-accent">
            <span aria-hidden className="flex size-5 items-center justify-center rounded-sm bg-brand text-brand-foreground font-micro">{data?.workspace.name.slice(0, 1) ?? 'W'}</span>
            <span className="min-w-0 flex-1 truncate text-left font-label">{data?.workspace.name ?? '加载中...'}</span>
            {workspaces.filter(workspace => workspace.id !== workspaceId).length > 0 && <span aria-hidden className="size-2 rounded-full bg-brand" />}
            <span aria-hidden>▾</span>
          </button>
        )}>
          {workspaces.map(workspace => (
            <MenuItem key={workspace.id} onSelect={() => switchWorkspace(workspace.id)}>
              <span className="flex w-full items-center justify-between gap-2">
                <span>{workspace.name}</span>
                {workspace.id === workspaceId && <Badge tone="brand">当前</Badge>}
              </span>
            </MenuItem>
          ))}
        </DropdownMenu>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { onNavigate?.(); onOpenSearch?.() }} className="flex h-8 items-center gap-2 rounded-control border border-border bg-surface px-2 font-label hover:bg-surface-hover">
            <span aria-hidden>⌕</span><span className="truncate">搜索</span><span className="ml-auto font-micro text-faint">⌘K</span>
          </button>
          <button type="button" onClick={() => { onNavigate?.(); onOpenCreate?.() }} className="flex h-8 items-center gap-2 rounded-control border border-transparent bg-brand px-2 font-label text-brand-foreground hover:brightness-110">
            <span aria-hidden>+</span><span className="truncate">创建事件</span><span className="ml-auto font-micro text-faint">C</span>
          </button>
        </div>
      </div>

      <nav aria-label="工作区导航" className="scroll-stable min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="relative">
          {navGroups.map(group => (
            <section key={group.title ?? 'personal'} className="mb-1">
              {group.title ? <h3 className="mt-3 px-2 font-micro uppercase tracking-wide text-sidebar-muted">{group.title}</h3> : null}
              {group.items.map(item => {
                const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                const count = item.to === '/inbox' ? unread : 0
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn('mb-0.5 flex h-8 min-w-0 items-center gap-2 rounded-sm px-2 font-body', active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/60')}
                  >
                    <span aria-hidden className="flex w-4 justify-center text-[14px]">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {count > 0 && <span className="ml-auto numeric font-caption">{count > 99 ? '99+' : count}</span>}
                  </Link>
                )
              })}
            </section>
          ))}

          <section className="mt-3">
            <button type="button" onClick={() => setPinnedOpen(value => !value)} aria-expanded={pinnedOpen} className="mb-0.5 flex h-8 w-full items-center gap-2 rounded-sm px-2 font-label hover:bg-sidebar-accent/60">
              <span aria-hidden>📌</span><span className="truncate">置顶事件</span>
              <span className="numeric font-caption text-sidebar-muted">{pinned.length}</span>
              <span aria-hidden className={cn('ml-auto transition-transform', pinnedOpen && 'rotate-90')}>›</span>
            </button>
            {pinnedOpen && pinned.map(incident => {
              const active = location.pathname === `/events/${incident.id}`
              return (
                <div key={incident.id} className="group mb-0.5 flex h-8 items-center rounded-sm px-2">
                  <Link to={`/events/${incident.id}`} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-sm', active ? 'text-sidebar-accent-foreground' : 'hover:text-sidebar-accent-foreground')}>
                    <span className="numeric truncate font-micro">{incident.key}</span>
                  </Link>
                  <button type="button" className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" aria-label={`取消置顶 ${incident.key}`} onClick={() => updateData(current => ({ ...current, incidents: current.incidents.map(item => item.id === incident.id ? { ...item, pinned: false } : item) }))}>×</button>
                </div>
              )
            })}
            {pinnedOpen && pinned.length === 0 && <p className="px-2 py-1 font-caption text-sidebar-muted">暂无置顶事件</p>}
          </section>
        </div>
      </nav>

      <footer className="flex h-10 shrink-0 items-center justify-end border-t border-border px-3">
        <button type="button" onClick={() => { onNavigate?.(); onOpenHelp?.() }} className="rounded-sm p-1 hover:bg-sidebar-accent" aria-label="帮助与快捷键"><span aria-hidden>?</span></button>
      </footer>
    </div>
  )
}

export function Sidebar({ width, onWidthChange, onOpenSearch, onOpenCreate, onOpenHelp }: SidebarActions & { width: number; onWidthChange: (width: number) => void }) {
  return (
    <aside className="relative m-2 hidden shrink-0 rounded-card border border-border lg:block" style={{ width }}>
      <div className="h-full overflow-hidden rounded-card">
        <SidebarContent onOpenSearch={onOpenSearch} onOpenCreate={onOpenCreate} onOpenHelp={onOpenHelp} />
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="调整侧栏宽度"
        aria-valuenow={width}
        aria-valuemin={200}
        aria-valuemax={360}
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') onWidthChange(Math.max(200, width - 12))
          if (event.key === 'ArrowRight') onWidthChange(Math.min(360, width + 12))
        }}
        onPointerDown={event => {
          event.preventDefault()
          const startX = event.clientX; const startWidth = width
          const move = (moveEvent: PointerEvent) => onWidthChange(Math.min(360, Math.max(200, startWidth + moveEvent.clientX - startX)))
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
        }}
        className="absolute inset-y-2 right-0 z-10 w-2 cursor-col-resize"
      />
    </aside>
  )
}

export function MobileSidebar({ open, onClose, onOpenSearch, onOpenCreate, onOpenHelp }: SidebarActions & { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="导航抽屉" className="absolute inset-y-0 left-0 w-72 border-r border-border shadow-[var(--shadow-overlay)]">
        <SidebarContent onNavigate={onClose} onOpenSearch={onOpenSearch} onOpenCreate={onOpenCreate} onOpenHelp={onOpenHelp} />
      </div>
    </div>
  )
}
