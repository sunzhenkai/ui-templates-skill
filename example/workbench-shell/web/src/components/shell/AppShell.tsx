/**
 * App Shell（route/dashboard-shell · fidelity scene.shell：variant=inset，12 槽位闭包）。
 * 槽序：workspace-switcher(1) search(2) compose(3) nav-group(4) pin-list(5) rail(6)
 *       header-trigger(7) page-header(8) page-toolbar(9) page-canvas(10) footer-utility(11) chat-fab(12)。
 * LAYOUT-102：canvas 独占滚动，壳根不滚；RESP-101：<lg 导航为 sheet。
 */
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, BadgeCheck, Briefcase, CalendarClock, ChevronDown, CircleAlert,
  GitBranch, GripVertical, Headset, HelpCircle, Inbox, LayoutDashboard, Menu as MenuIcon,
  MessageSquare, Pin, PinOff, Search, Settings, X,
} from "lucide-react";
import { cn } from "../../lib";
import { api } from "../../data/mock";
import { useUiStore, useOverlayStore } from "../../stores";
import { Badge, Button, IconButton, Menu, Tooltip } from "../ui";
import { toastInfo } from "../ui/toast";

const NAV_GROUPS = [
  {
    label: "个人",
    items: [{ to: "/inbox", label: "收件箱", icon: Inbox, badgeKey: "inbox" as const }],
  },
  {
    label: "运维",
    items: [
      { to: "/incidents", label: "事件", icon: CircleAlert, badgeKey: null },
      { to: "/incidents/board", label: "事件看板", icon: Briefcase, badgeKey: "board" as const },
      { to: "/services", label: "服务", icon: GitBranch, badgeKey: null },
      { to: "/on-call", label: "值班", icon: CalendarClock, badgeKey: null },
      { to: "/analytics", label: "分析", icon: LayoutDashboard, badgeKey: null },
    ],
  },
  {
    label: "配置",
    items: [{ to: "/settings", label: "设置", icon: Settings, badgeKey: null }],
  },
];

function useUnreadCounts() {
  const inbox = useQuery({ queryKey: ["inbox"], queryFn: api.listInbox, staleTime: 5_000 });
  const incidents = useQuery({ queryKey: ["incidents"], queryFn: api.listIncidents, staleTime: 5_000 });
  return {
    inbox: inbox.data?.filter((i) => i.status === "unread").length ?? 0,
    board: incidents.data?.filter((i) => i.status === "triage" || i.status === "processing").length ?? 0,
  };
}

function WorkspaceSwitcher() {
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: api.listWorkspaces });
  const current = workspaces?.[0];
  const [live, setLive] = useState("");
  return (
    <div className="px-2 pt-3" aria-live="polite">
      <Menu
        align="start"
        trigger={(props) => (
          <button
            {...props}
            onClick={() => {
              props.onClick();
              setLive("工作区菜单已打开");
            }}
            className="flex h-8 w-full items-center gap-2 rounded-md bg-surface-raised px-2 text-body font-medium shadow-surface hover:bg-surface-hover"
          >
            <span className="flex size-5 items-center justify-center rounded-sm bg-brand text-micro text-brand-foreground">运</span>
            <span className="flex-1 truncate text-left">{current?.name ?? "工作区"}</span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
        )}
        items={[
          ...(workspaces ?? []).map((w) => ({
            key: w.id,
            label: `${w.name}（切换后刷新数据上下文）`,
            onSelect: () => toastInfo(`已切换到工作区「${w.name}」，数据上下文已刷新`),
          })),
          { key: "new", label: "新建工作区", onSelect: () => toastInfo("新建工作区（mock）") },
        ]}
      />
      <span className="sr-only">{live}</span>
    </div>
  );
}

function GlobalNav({ onNavigate }: { onNavigate?: () => void }) {
  const counts = useUnreadCounts();
  return (
    <nav aria-label="应用导航" className="flex-1 overflow-y-auto px-2 py-2" data-nav-scroll>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="px-2 py-1 text-micro font-medium uppercase tracking-wide text-faint-foreground">{group.label}</p>
          <ul>
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex h-8 items-center gap-2 rounded-md px-2 text-body no-underline transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground",
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badgeKey && (
                    <Badge count={counts[item.badgeKey]} aria-label={`${item.label}待处理 ${counts[item.badgeKey]} 条`} />
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function PinList() {
  const collapsed = useUiStore((s) => s.pinsCollapsed);
  const toggle = useUiStore((s) => s.togglePins);
  const { data: incidents } = useQuery({ queryKey: ["incidents"], queryFn: api.listIncidents });
  const pins = (incidents ?? []).filter((i) => i.severity === "sev1").slice(0, 3);
  return (
    <div className="border-t border-sidebar-border px-2 py-1">
      <button
        onClick={toggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-micro font-medium text-faint-foreground hover:bg-sidebar-accent"
      >
        {collapsed ? <PinOff className="size-3" /> : <Pin className="size-3" />}
        置顶事件
        {!collapsed && <Badge count={pins.length} />}
      </button>
      {!collapsed && (
        <ul>
          {pins.map((p) => (
            <li key={p.id}>
              <Link to={`/incidents/${p.id}`} className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-caption no-underline text-sidebar-foreground hover:bg-sidebar-accent">
                <GripVertical className="size-3 text-faint-foreground" aria-hidden />
                <span className="truncate">{p.title}</span>
                <PinOff className="ml-auto size-3 text-faint-foreground" aria-label={`取消置顶 ${p.key}`} />
              </Link>
            </li>
          ))}
          {pins.length === 0 && <li className="px-2 py-1 text-caption text-faint-foreground">暂无置顶</li>}
        </ul>
      )}
    </div>
  );
}

export function AppShell() {
  const width = useUiStore((s) => s.sidebarWidth);
  const setWidth = useUiStore((s) => s.setSidebarWidth);
  const { openSearch, openCreate, setShortcutsOpen, setChatOpen } = useOverlayStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setSheetOpen(false), [location.pathname]);

  // 全局快捷键：⌘K/Ctrl+K 搜索；C 创建（输入焦点内不触发）；? 帮助
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const editing = target.matches("input,textarea,select") || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch(searchTriggerRef.current);
      } else if (!editing && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        openCreate();
      } else if (!editing && e.key === "?") {
        setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch, openCreate, setShortcutsOpen]);

  const sidebarContent = (onNavigate?: () => void) => (
    <>
      <WorkspaceSwitcher />
      <div className="px-2 pt-2">
        <button
          ref={searchTriggerRef}
          onClick={() => openSearch(searchTriggerRef.current)}
          className="flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border bg-surface px-2 text-caption text-faint-foreground hover:bg-surface-hover"
          aria-label="全局搜索（⌘K）"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="flex-1 text-left">搜索事件、服务、成员、变更…</span>
          <kbd className="rounded-sm bg-muted px-1 text-micro">⌘K</kbd>
        </button>
      </div>
      <div className="px-2 pt-2">
        <Tooltip content={<span>创建事件 <kbd className="rounded-sm bg-app-shell px-1">C</kbd></span>}>
          <Button variant="brand" className="w-full" onClick={() => openCreate()} aria-keyshortcuts="c">
            创建事件
          </Button>
        </Tooltip>
      </div>
      <GlobalNav onNavigate={onNavigate} />
      <PinList />
      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setShortcutsOpen(true)}>
            <HelpCircle className="size-3.5" aria-hidden /> 帮助与快捷键
          </Button>
          <Tooltip content="联系支持">
            <Button variant="ghost" size="icon-sm" aria-label="联系支持" onClick={() => toastInfo("支持渠道（mock）")}>
              <Headset className="size-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-full overflow-hidden bg-app-shell" style={{ ["--sidebar-w" as string]: `${width}px` }}>
      {/* lg+ inset 侧栏 */}
      <aside
        aria-label="侧栏"
        className="relative hidden w-[var(--sidebar-w)] min-w-[200px] max-w-[360px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
      >
        {sidebarContent()}
        <div
          role="separator"
          aria-label="调整侧栏宽度"
          aria-orientation="vertical"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setWidth(Math.max(200, width - 16));
            if (e.key === "ArrowRight") setWidth(Math.min(360, width + 16));
          }}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startW = width;
            const onMove = (ev: MouseEvent) => setWidth(Math.min(360, Math.max(200, startW + ev.clientX - startX)));
            const onUp = () => {
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          }}
          className="absolute inset-y-0 right-0 w-1 cursor-col-resize hover:bg-sidebar-ring/40"
        />
      </aside>

      {/* <lg sheet 抽屉 */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setSheetOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="导航抽屉" className="animate-overlay-in absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-floating">
            <div className="flex justify-end p-1">
              <IconButton label="关闭抽屉" onClick={() => setSheetOpen(false)}><X className="size-4" /></IconButton>
            </div>
            {sidebarContent(() => setSheetOpen(false))}
          </div>
        </div>
      )}

      {/* canvas 区 */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* header-trigger 槽：<lg 打开抽屉 */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-surface-border bg-surface px-3 lg:hidden">
          <IconButton label="打开导航" onClick={() => setSheetOpen(true)}><MenuIcon className="size-4" /></IconButton>
          <span className="text-body font-medium">Workbench</span>
        </div>
        {/* page-canvas 槽位：页面路由填充（页面自带 page-header/toolbar） */}
        <main id="main" data-canvas className="min-h-0 flex-1 overflow-y-auto bg-page-canvas">
          <Outlet />
        </main>
        <span className="sr-only">内容区域结束</span>
      </div>

      {/* chat-fab 槽位（viewport overlay，右下角 token 定位） */}
      <button
        onClick={() => setChatOpen(true)}
        aria-label="打开聊天"
        className="absolute bottom-[var(--spacing-chat-inset)] right-[var(--spacing-chat-inset)] z-40 flex size-[var(--spacing-chat-launcher)] items-center justify-center rounded-full bg-surface-raised text-muted-foreground shadow-floating ring-1 ring-surface-border transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <MessageSquare className="size-5" aria-hidden />
      </button>
    </div>
  );
}

export function ChatWindow() {
  const chatOpen = useOverlayStore((s) => s.chatOpen);
  const setChatOpen = useOverlayStore((s) => s.setChatOpen);
  if (!chatOpen) return null;
  return (
    <div role="dialog" aria-label="聊天" className="animate-overlay-in fixed bottom-[calc(var(--spacing-chat-inset)+var(--spacing-chat-launcher)+8px)] right-[var(--spacing-chat-inset)] z-40 flex h-80 w-80 flex-col overflow-hidden rounded-lg border border-surface-border bg-popover shadow-floating">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-surface-border px-3">
        <span className="text-label font-medium">值班协作聊天</span>
        <IconButton label="关闭聊天" onClick={() => setChatOpen(false)}><X className="size-4" /></IconButton>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-caption text-muted-foreground">
        <p><BadgeCheck className="mr-1 inline size-3.5 text-success" aria-hidden />李慕白：网关已回滚，观察中。</p>
        <p><AlertTriangle className="mr-1 inline size-3.5 text-warning" aria-hidden />陈曦：边缘 ap-2 还在恢复。</p>
      </div>
      <footer className="border-t border-surface-border p-2">
        <input className="h-7 w-full rounded-sm border border-input bg-surface px-2 text-caption" placeholder="发送消息…" aria-label="聊天输入" />
      </footer>
    </div>
  );
}
