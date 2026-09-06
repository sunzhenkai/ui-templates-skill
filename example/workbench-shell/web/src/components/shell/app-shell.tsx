import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Gauge,
  LayoutList,
  type LucideIcon,
  Pin,
  Plus,
  Search,
  Settings,
  Siren,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { usePrefs } from "@/stores/prefs";
import { getIncidents, getInbox, getWorkspaces } from "@/mock/api";
import { ShellContext, useShell, type ShellMode } from "./shell-context";
import { FloatingChat } from "./floating-chat";
import { CommandPalette } from "./command-palette";
import { CreateIncidentDialog } from "./create-incident-dialog";
import { ShortcutsHelp } from "./shortcuts-help";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  end?: boolean;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ShellMode>("expanded");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setMode(w >= 1280 ? "expanded" : w >= 1024 ? "collapsed" : "overlay");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  useEffect(() => setDrawerOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const editable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (editable) return;
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setCreateOpen(true);
      }
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openNav = useCallback(() => setDrawerOpen(true), []);

  return (
    <ShellContext.Provider
      value={{
        mode,
        openSearch: () => setSearchOpen(true),
        openCreate: () => setCreateOpen(true),
        openHelp: () => setHelpOpen(true),
        openNav,
      }}
    >
      <TooltipProvider delay={300}>
        <div
          data-sidebar="root"
          className="flex h-[var(--layout-root-height)] w-full overflow-hidden bg-app-shell text-foreground"
        >
          {mode === "overlay" ? (
            <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
          ) : (
            <Sidebar mode={mode} />
          )}
          {/* page-canvas inset 面板（LAYOUT-017）：常驻导航路径内缩 + 圆角 + 描边 + surface 阴影；overlay 路径 flush */}
          <main
            id="page-canvas"
            className={cn(
              "relative flex min-w-0 flex-1 flex-col overflow-hidden bg-page-canvas",
              mode === "expanded" &&
                "mt-[var(--layout-canvas-inset)] mr-[var(--layout-canvas-inset)] mb-[var(--layout-canvas-inset)] rounded-xl ring-1 ring-surface-border shadow-[var(--surface-shadow)]",
              mode === "collapsed" &&
                "m-[var(--layout-canvas-inset)] rounded-xl ring-1 ring-surface-border shadow-[var(--surface-shadow)]",
            )}
          >
            {children}
          </main>
        </div>
        <FloatingChat />
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        <CreateIncidentDialog open={createOpen} onOpenChange={setCreateOpen} />
        <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
      </TooltipProvider>
    </ShellContext.Provider>
  );
}

/* ─── Sidebar（AX-007..012） ──────────────────────────────────────────────── */

function Sidebar({ mode }: { mode: Exclude<ShellMode, "overlay"> }) {
  const { sidebarWidth, setSidebarWidth, sidebarCollapsed, toggleSidebarCollapsed } = usePrefs();
  const collapsed = mode === "collapsed" || sidebarCollapsed;
  const width = collapsed ? 48 : sidebarWidth;
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setSidebarWidth(dragRef.current.startWidth + (e.clientX - dragRef.current.startX));
  };
  const onPointerUp = () => (dragRef.current = null);

  return (
    <aside
      data-sidebar="panel"
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-150"
    >
      <WorkspaceSwitcher collapsed={collapsed} />
      <SidebarActions collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="调整侧栏宽度"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setSidebarWidth(sidebarWidth - 16);
            if (e.key === "ArrowRight") setSidebarWidth(sidebarWidth + 16);
          }}
          className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize bg-transparent hover:bg-border focus-visible:outline-3 focus-visible:outline-ring/60"
        />
      )}
      {!collapsed && (
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          aria-label="折叠侧栏"
          className="absolute -right-3 top-4 z-20 hidden size-6 items-center justify-center rounded-full border border-surface-border bg-popover text-faint-foreground shadow-menu hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60 lg:flex"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
        </button>
      )}
    </aside>
  );
}

function SidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" data-sidebar="overlay">
      <div className="absolute inset-0 bg-foreground/25" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="导航"
        className="absolute inset-y-0 left-0 flex w-[var(--layout-sidebar-mobile-width)] flex-col bg-sidebar shadow-floating"
      >
        <div className="flex items-center justify-between pr-2">
          <WorkspaceSwitcher collapsed={false} />
          <Button variant="ghost" size="icon" aria-label="关闭导航" onClick={onClose} autoFocus>
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <SidebarActions collapsed={false} />
        <SidebarNav collapsed={false} onNavigate={onClose} />
        <SidebarFooter collapsed={false} />
      </div>
    </div>
  );
}

function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  const current = workspaces?.[0];
  return (
    <button
      type="button"
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 rounded-md outline-none hover:bg-sidebar-accent focus-visible:outline-3 focus-visible:outline-ring/60",
        collapsed ? "mx-auto w-10 justify-center" : "w-full px-3",
      )}
      aria-label={collapsed ? `切换工作区，当前 ${current?.name ?? ""}` : "切换工作区"}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-micro font-semibold text-brand-foreground"
        aria-hidden
      >
        {(current?.name ?? "O").slice(0, 1)}
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-left text-label font-semibold">{current?.name ?? "工作区"}</span>
          <ChevronDown className="size-3.5 text-faint-foreground" aria-hidden />
        </>
      )}
    </button>
  );
}

function SidebarActions({ collapsed }: { collapsed: boolean }) {
  const { openSearch, openCreate } = useShell();
  return (
    <div className={cn("flex flex-col gap-0.5 px-2 pb-1", collapsed && "px-1")}>
      {collapsed ? (
        <>
          <Tooltip content="搜索">
            <Button variant="ghost" size="icon" aria-label="搜索" onClick={openSearch} className="mx-auto">
              <Search className="size-4" aria-hidden />
            </Button>
          </Tooltip>
          <Tooltip content="创建事件 (C)">
            <Button variant="ghost" size="icon" aria-label="创建事件" onClick={openCreate} className="mx-auto">
              <Plus className="size-4" aria-hidden />
            </Button>
          </Tooltip>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={openSearch}
            className="flex h-[var(--layout-sidebar-item-height)] items-center gap-2 rounded-md px-2 text-body text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60"
            aria-label="搜索"
          >
            <Search className="size-3.5" aria-hidden />
            <span className="flex-1 text-left">搜索…</span>
            <Kbd>Ctrl K</Kbd>
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex h-[var(--layout-sidebar-item-height)] items-center gap-2 rounded-md px-2 text-body text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60"
            aria-label="创建事件"
          >
            <Plus className="size-3.5" aria-hidden />
            <span className="flex-1 text-left">创建事件</span>
            <Kbd>C</Kbd>
          </button>
        </>
      )}
    </div>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { data: inbox } = useQuery({ queryKey: ["inbox"], queryFn: getInbox });
  const { data: incidents } = useQuery({ queryKey: ["incidents"], queryFn: getIncidents });
  const unread = inbox?.filter((n) => n.status === "open").length ?? 0;
  const activeIncidents = incidents?.filter((i) => !["resolved", "cancelled"].includes(i.status)).length ?? 0;
  const pinned = (incidents ?? []).filter((i) => i.pinned);

  const personal: NavItem[] = [
    { to: "/inbox", label: "收件箱", icon: Bell, badge: unread, end: true },
    { to: "/oncall", label: "值班日历", icon: CalendarClock },
  ];
  const workspace: NavItem[] = [
    { to: "/incidents", label: "事件", icon: Siren, badge: activeIncidents },
    { to: "/services", label: "服务目录", icon: LayoutList },
    { to: "/analytics", label: "交付分析", icon: Gauge },
  ];
  const config: NavItem[] = [{ to: "/settings", label: "设置", icon: Settings }];

  const renderGroup = (label: string | null, items: NavItem[], key: string) => (
    <div role="group" aria-label={label ?? key} className="flex flex-col gap-0.5">
      {label && !collapsed && <p className="px-3 pt-4 pb-1 text-caption font-medium text-muted-foreground">{label}</p>}
      {items.map((item) => (
        <Tooltip key={item.to} content={collapsed ? item.label : undefined}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative h-[var(--layout-sidebar-item-height)] flex items-center gap-2 rounded-md text-body outline-none focus-visible:outline-3 focus-visible:outline-ring/60",
                collapsed ? "mx-auto w-8 justify-center" : "px-2",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )
            }
          >
            {() => (
              <>
                <item.icon className="size-4 shrink-0" aria-hidden />
                {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
                {!collapsed && item.badge ? (
                  <Badge variant="brand" className="h-4 min-w-4 justify-center px-1 text-micro" aria-label={`${item.badge} 条待处理`}>
                    {item.badge}
                  </Badge>
                ) : null}
                {collapsed && item.badge ? (
                  <span className="absolute right-1 top-1 size-1.5 rounded-full bg-brand" aria-hidden />
                ) : null}
              </>
            )}
          </NavLink>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <nav aria-label="主导航" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
      {renderGroup(null, personal, "个人区")}
      {renderGroup("运维区", workspace, "workspace")}
      {!collapsed && pinned.length > 0 && (
        <div role="group" aria-label="置顶事件" className="mt-2 flex flex-col gap-0.5">
          <p className="px-3 pt-4 pb-1 text-caption font-medium text-muted-foreground">置顶事件</p>
          {pinned.map((p) => (
            <NavLink
              key={p.id}
              to={`/incidents/${p.id}`}
              className={({ isActive }) =>
                cn(
                  "flex h-[var(--layout-sidebar-item-height)] items-center gap-2 rounded-md px-2 text-body outline-none focus-visible:outline-3 focus-visible:outline-ring/60",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )
              }
            >
              <Pin className="size-3.5 shrink-0 text-faint-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {p.number} {p.title}
              </span>
            </NavLink>
          ))}
        </div>
      )}
      {renderGroup("配置区", config, "config")}
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { openHelp } = useShell();
  return (
    <div className={cn("flex h-12 shrink-0 items-center gap-2 border-t border-sidebar-border px-3", collapsed && "justify-center px-0")}>
      <Avatar name="值班同事" size="sm" />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-body text-muted-foreground">帮助与支持</span>
          <Tooltip content="快捷键列表 (?)">
            <Button variant="ghost" size="icon-sm" aria-label="快捷键列表" onClick={openHelp}>
              <CircleHelp className="size-4" aria-hidden />
            </Button>
          </Tooltip>
        </>
      )}
    </div>
  );
}
