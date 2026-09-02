import { useEffect, useRef, useState } from "react"
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderKanban,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  StickyNote,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore, type Page, syncUrl } from "@/stores/app-store"
import { useMediaQuery } from "@/hooks/use-media-query"
import { workspaces, incidents } from "@/mocks/data"

const navGroups: {
  title?: string
  items: { page: Page; label: string; icon: React.ReactNode; count?: (ws: string) => number }[]
}[] = [
  {
    items: [
      { page: "inbox", label: "收件箱", icon: <Inbox className="size-4" />, count: (ws) => incidents.filter((i) => i.workspaceId === ws && i.status === "open").length },
    ],
  },
  {
    title: "运维",
    items: [
      { page: "events", label: "事件列表", icon: <FileText className="size-4" /> },
      { page: "board", label: "事件看板", icon: <FolderKanban className="size-4" /> },
      { page: "services", label: "服务目录", icon: <LayoutDashboard className="size-4" /> },
      { page: "oncall", label: "值班日历", icon: <CalendarDays className="size-4" /> },
      { page: "analytics", label: "交付分析", icon: <BarChart3 className="size-4" /> },
    ],
  },
  {
    title: "配置",
    items: [{ page: "settings", label: "工作区设置", icon: <Settings className="size-4" /> }],
  },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const store = useAppStore()
  const isCompact = useMediaQuery("(max-width: 1023px)")
  const containerRef = useRef<HTMLDivElement>(null)
  const resizing = useRef(false)
  const [pinnedOpen, setPinnedOpen] = useState(true)

  const currentWorkspace = workspaces.find((w) => w.id === store.currentWorkspaceId) ?? workspaces[0]
  const page = store.page

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!resizing.current) return
      const w = e.clientX - 8
      store.setSidebarWidth(w)
    }
    const up = () => {
      resizing.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", handle)
    window.addEventListener("mouseup", up)
    return () => {
      window.removeEventListener("mousemove", handle)
      window.removeEventListener("mouseup", up)
    }
  }, [store])

  const navigate = (p: Page) => {
    store.setPage(p)
    store.setSelectedId(undefined)
    syncUrl({ page: p, selectedId: null })
    onNavigate?.()
  }

  const isActive = (p: Page) => {
    if (p === "events" && page === "board") return false
    return page === p || page.startsWith(`${p}/`)
  }

  const pinned = incidents.filter((i) => i.workspaceId === currentWorkspace.id && i.pinned)

  const sidebarBody = (
    <>
      {/* 工作区切换器 */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex size-5 items-center justify-center rounded bg-primary text-[10px] font-semibold text-primary-foreground">
          {currentWorkspace.name.slice(0, 1)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-label font-medium text-foreground">{currentWorkspace.name}</span>
          <span className="text-micro text-muted-foreground">{currentWorkspace.slug}</span>
        </div>
        <button className="rounded p-1 text-muted-foreground hover:bg-sidebar-accent" aria-label="切换工作区">
          <ChevronDown className="size-3.5" />
        </button>
      </div>

      {/* 搜索与创建 */}
      <div className="space-y-1 px-2">
        <button
          onClick={() => store.setDialog("search")}
          className="flex h-7 w-full items-center justify-between rounded-md px-2 text-caption text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Search className="size-3.5" />
            搜索
          </span>
          <kbd className="rounded border border-sidebar-border px-1 text-micro">⌘K</kbd>
        </button>
        <button
          onClick={() => store.setDialog("create-incident")}
          className="flex h-7 w-full items-center justify-between rounded-md px-2 text-caption text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Plus className="size-3.5" />
            创建事件
          </span>
          <kbd className="rounded border border-sidebar-border px-1 text-micro">C</kbd>
        </button>
      </div>

      <div className="my-2 h-px bg-sidebar-border" />

      {/* 滚动区 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 scrollbar-stable">
        <div className="pointer-events-none sticky top-0 z-10 h-6 bg-gradient-to-b from-sidebar to-transparent" />
        {navGroups[0].items.map((item) => (
          <NavRow key={item.page} item={item} active={isActive(item.page)} onClick={() => navigate(item.page)} count={item.count?.(currentWorkspace.id)} />
        ))}

        {/* 置顶事件 */}
        {pinned.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setPinnedOpen((v) => !v)}
              className="mb-1 flex h-6 w-full items-center justify-between rounded-md px-2 text-caption text-muted-foreground hover:bg-sidebar-accent"
            >
              <span className="flex items-center gap-2">
                <StickyNote className="size-3.5" />
                置顶
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-micro tabular-nums">{pinned.length}</span>
                {pinnedOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
              </span>
            </button>
            {pinnedOpen && (
              <div className="space-y-0.5 pl-2">
                {pinned.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => {
                      store.setSelectedId(i.id)
                      syncUrl({ page: "events", selectedId: i.id })
                      onNavigate?.()
                    }}
                    className={cn(
                      "group flex h-7 w-full items-center justify-between rounded-md px-2 text-caption text-foreground hover:bg-sidebar-accent",
                      store.selectedId === i.id && "bg-sidebar-accent font-medium"
                    )}
                  >
                    <span className="truncate pr-2">{i.number}</span>
                    <X
                      className="size-3 opacity-0 text-muted-foreground group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        // 取消置顶逻辑由 store 触发
                        store.setSelectedId(undefined)
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {navGroups.slice(1).map((group) => (
          <div key={group.title ?? "ungrouped"} className="mt-4">
            {group.title && <div className="px-2 pb-1 text-micro uppercase tracking-wide text-muted-foreground">{group.title}</div>}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow key={item.page} item={item} active={isActive(item.page)} onClick={() => navigate(item.page)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 底部帮助 */}
      <div className="border-t border-sidebar-border px-2 py-2">
        <button
          onClick={() => store.setDialog("shortcuts")}
          className="flex h-7 w-full items-center justify-end gap-2 rounded-md px-2 text-caption text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <HelpCircle className="size-3.5" />
          帮助
        </button>
      </div>
    </>
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex shrink-0 flex-col transition-all",
        isCompact ? (store.mobileDrawerOpen ? "w-64" : "w-0 opacity-0") : "opacity-100"
      )}
      style={isCompact ? undefined : { width: store.sidebarCollapsed ? 56 : store.sidebarWidth }}
    >
      <div
        className={cn(
          "flex h-full flex-col rounded-[14px] border border-sidebar-border bg-sidebar text-sidebar-foreground",
          isCompact ? "m-0 rounded-none border-0" : "m-2"
        )}
      >
        {store.sidebarCollapsed && !isCompact ? (
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs text-primary-foreground">W</div>
            <div className="flex flex-col gap-1 py-2">
              {navGroups.flatMap((g) => g.items).map((item) => (
                <button
                  key={item.page}
                  onClick={() => navigate(item.page)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent",
                    isActive(item.page) && "bg-sidebar-accent font-medium"
                  )}
                  title={item.label}
                  aria-label={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>
        ) : (
          sidebarBody
        )}
      </div>

      {!isCompact && !store.sidebarCollapsed && (
        <div
          className="absolute right-0 top-2 bottom-2 w-2 cursor-col-resize"
          onMouseDown={() => {
            resizing.current = true
            document.body.style.cursor = "col-resize"
            document.body.style.userSelect = "none"
          }}
          aria-hidden
        />
      )}
    </div>
  )
}

function NavRow({
  item,
  active,
  onClick,
  count,
}: {
  item: { label: string; icon: React.ReactNode }
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-7 w-full items-center gap-2 rounded-md px-2 text-body text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
        active && "bg-sidebar-accent font-medium text-sidebar-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      {item.icon}
      <span className="flex-1 truncate text-left">{item.label}</span>
      {count ? <span className="text-micro tabular-nums text-muted-foreground">{count > 99 ? "99+" : count}</span> : null}
    </button>
  )
}

export { Sidebar }
export { navGroups }
