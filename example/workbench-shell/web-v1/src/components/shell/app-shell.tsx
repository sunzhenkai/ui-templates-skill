import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UnreadBadge } from "@/components/shared/chrome"
import { ShellChromeProvider } from "@/components/shell/shell-chrome-context"
import { isOverlayMode, useShellMode } from "@/hooks/use-shell-mode"
import { createIncident, incidentFormSchema, listChanges, listIncidents, listInbox, listMembers, listServices, listTeams, listWorkspaces, searchAll } from "@/lib/api/client"
import { keys, queryClient } from "@/lib/query"
import { applyThemeClass, usePrefsStore } from "@/stores/prefs-store"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  BarChart3Icon,
  BellIcon,
  CalendarIcon,
  CircleHelpIcon,
  InboxIcon,
  KanbanIcon,
  MoonIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  SunIcon,
  TableIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { z } from "zod"

const NAV: { section: string; items: { to: string; label: string; icon: typeof InboxIcon; badge?: "inbox" }[] }[] = [
  { section: "个人区", items: [{ to: "inbox", label: "收件箱", icon: InboxIcon, badge: "inbox" }] },
  {
    section: "运维区",
    items: [
      { to: "incidents", label: "事件列表", icon: TableIcon },
      { to: "board", label: "事件看板", icon: KanbanIcon },
      { to: "services", label: "服务目录", icon: ServerIcon },
      { to: "oncall", label: "值班日历", icon: CalendarIcon },
      { to: "analytics", label: "交付分析", icon: BarChart3Icon },
    ],
  },
  { section: "配置区", items: [{ to: "settings", label: "工作区设置", icon: SettingsIcon }] },
]

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
}

export function AppShell() {
  const { workspaceId = "ws-alpha" } = useParams()
  const mode = useShellMode()
  const overlay = isOverlayMode(mode)
  const collapsed = mode === "collapsed"
  const location = useLocation()
  const navigate = useNavigate()
  const prefs = usePrefsStore()
  const [navOpen, setNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [createStatus, setCreateStatus] = useState<"pending-confirm" | "in-progress" | "waiting-external" | "resolved" | "archived">("pending-confirm")
  const [pinnedOpen, setPinnedOpen] = useState(true)
  const [progress, setProgress] = useState(false)
  const width = Math.min(360, Math.max(200, prefs.sidebarWidth))
  const dragging = useRef(false)

  const workspaces = useQuery({ queryKey: keys.workspaces, queryFn: listWorkspaces })
  const inbox = useQuery({ queryKey: keys.inbox(workspaceId), queryFn: () => listInbox(workspaceId) })
  const incidents = useQuery({ queryKey: keys.incidents(workspaceId), queryFn: () => listIncidents(workspaceId) })

  useEffect(() => {
    applyThemeClass(prefs.theme)
  }, [prefs.theme])

  useEffect(() => {
    if (usePrefsStore.getState().lastWorkspaceId !== workspaceId) {
      usePrefsStore.getState().setLastWorkspaceId(workspaceId)
    }
  }, [workspaceId])

  useEffect(() => {
    setProgress(true)
    const timer = window.setTimeout(() => setProgress(false), 400)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (overlay) setNavOpen(false)
  }, [location.pathname, overlay])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!prefs.shortcutsEnabled) return
      const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      if (metaK) {
        event.preventDefault()
        setSearchOpen(true)
        return
      }
      if (event.key === "?" && !isEditableTarget(event.target)) {
        event.preventDefault()
        setHelpOpen(true)
      }
      if (event.key.toLowerCase() === "c" && !event.metaKey && !event.ctrlKey && !isEditableTarget(event.target)) {
        event.preventDefault()
        setCreateOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [prefs.shortcutsEnabled])

  const unread = inbox.data?.filter((item) => item.status === "open").length ?? 0
  const pinned = incidents.data?.filter((item) => item.pinned) ?? []
  const currentWorkspace = workspaces.data?.find((item) => item.id === workspaceId)

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function onResize(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    const next = Math.min(360, Math.max(200, event.clientX))
    prefs.setSidebarWidth(next)
  }
  function endResize() {
    dragging.current = false
  }

  const sidebar = (
    <aside
      className="flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]"
      style={{ width: overlay ? "var(--sidebar-mobile-width)" : collapsed ? "var(--sidebar-icon-width)" : width }}
      data-slot="app-sidebar"
      data-mode={mode}
    >
      <div className="flex h-12 items-center px-2" data-slot="slot-workspace-switcher">
        <Select
          value={workspaceId}
          onValueChange={(value) => {
            if (typeof value !== "string") return
            const rest = location.pathname.split("/").slice(2).join("/") || prefs.defaultHome
            navigate(`/${value}/${rest}${location.search}`)
          }}
        >
          <SelectTrigger aria-label="工作区" className={collapsed ? "w-8 px-0" : "w-full"}>
            <SelectValue>{collapsed ? "工" : currentWorkspace?.name ?? "选择工作区"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(workspaces.data ?? []).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 px-2" data-slot="slot-search">
        <Button variant="outline" size={collapsed ? "icon-sm" : "sm"} className={collapsed ? undefined : "w-full justify-start"} onClick={() => setSearchOpen(true)} aria-label="全局搜索" title="⌘K / Ctrl+K">
          <SearchIcon />
          {collapsed ? null : "搜索"}
        </Button>
      </div>
      <div className="px-2 pb-1" data-slot="slot-compose">
        <Button variant="brand" size={collapsed ? "icon-sm" : "sm"} className={collapsed ? undefined : "w-full justify-start"} onClick={() => setCreateOpen(true)} aria-label="创建事件" title="C">
          <PlusIcon />
          {collapsed ? null : "创建"}
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-2 py-3">
        <nav aria-label="工作区导航" data-slot="slot-nav-group">
          {NAV.map((group) => (
            <div key={group.section} className="mb-3">
              {collapsed ? null : <p className="px-2 pb-1 text-[length:var(--type-micro)] text-muted-foreground">{group.section}</p>}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={`/${workspaceId}/${item.to}`}
                      aria-label={item.label}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-md px-2 py-1.5 text-[length:var(--type-label)] hover:bg-[var(--sidebar-accent)] ${isActive ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]" : ""}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className="size-4 shrink-0" />
                          {collapsed ? null : <span className="flex-1 truncate">{item.label}</span>}
                          {item.badge === "inbox" ? <UnreadBadge count={unread} /> : null}
                          {isActive ? <span className="sr-only">当前页</span> : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div data-slot="slot-pin-list">
          <button type="button" className="mb-1 flex w-full items-center justify-between px-2 text-[length:var(--type-micro)] text-muted-foreground" onClick={() => setPinnedOpen((value) => !value)} aria-expanded={pinnedOpen}>
            {collapsed ? <PinIcon className="size-4" /> : "置顶事件"}
          </button>
          {pinnedOpen ? (
            <ul className="flex flex-col gap-0.5">
              {pinned.map((item) => (
                <li key={item.id}>
                  <Link to={`/${workspaceId}/incidents/${item.id}`} title={item.number} className="flex items-center gap-2 truncate rounded-md px-2 py-1 text-[length:var(--type-caption)] hover:bg-[var(--sidebar-accent)]">
                    <PinIcon className="size-3" />
                    {collapsed ? null : item.number}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </ScrollArea>
      <div className="flex items-center justify-end gap-1 border-t border-[var(--sidebar-border)] p-2" data-slot="slot-footer-utility">
        <Button variant="ghost" size="icon-sm" aria-label="帮助与快捷键" onClick={() => setHelpOpen(true)}>
          <CircleHelpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={prefs.theme === "dark" ? "切换浅色主题" : "切换深色主题"}
          onClick={() => prefs.setTheme(prefs.theme === "dark" ? "light" : "dark")}
        >
          {prefs.theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </Button>
        <span className="text-[length:var(--type-micro)] text-muted-foreground">
          <BellIcon className="inline size-3.5" /> {unread}
        </span>
      </div>
    </aside>
  )

  const canvasInset = overlay
    ? "relative min-w-0 flex-1 overflow-hidden bg-[var(--page-canvas)]"
    : `relative min-w-0 flex-1 overflow-hidden bg-[var(--page-canvas)] my-[var(--shell-inset)] mr-[var(--shell-inset)] rounded-[var(--radius-xl)] shadow-[var(--shadow-surface)] ${collapsed ? "ml-[var(--shell-inset)]" : ""}`

  return (
    <ShellChromeProvider value={{ overlay, openNav: () => setNavOpen(true) }}>
      <div className="flex h-[100svh] overflow-hidden bg-[var(--app-shell)]" data-slot="app-shell" data-shell-variant="inset">
        {overlay ? (
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetContent side="left" className="w-[var(--sidebar-mobile-width)] p-0" aria-describedby={undefined}>
              <SheetHeader className="sr-only">
                <SheetTitle>导航</SheetTitle>
                <SheetDescription>工作区导航</SheetDescription>
              </SheetHeader>
              {sidebar}
            </SheetContent>
          </Sheet>
        ) : (
          <div className="relative shrink-0 py-[var(--shell-inset)] pl-[var(--shell-inset)]">
            {sidebar}
            {collapsed ? null : (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="调整侧栏宽度"
                data-slot="slot-rail"
                className="absolute inset-y-[var(--shell-inset)] right-0 z-10 w-1 cursor-col-resize bg-transparent hover:bg-[var(--brand)]"
                onPointerDown={startResize}
                onPointerMove={onResize}
                onPointerUp={endResize}
              />
            )}
          </div>
        )}
        <div className={canvasInset} data-slot="page-canvas">
          {progress ? <div className="absolute inset-x-0 top-0 z-20 bg-[var(--brand)]" style={{ height: "var(--navigation-progress-height)" }} role="progressbar" aria-label="路由加载" /> : null}
          <Outlet context={{ openCreate: (status?: typeof createStatus) => { if (status) setCreateStatus(status); setCreateOpen(true) }, openSearch: () => setSearchOpen(true) }} />
          <HelpFab onOpen={() => setHelpOpen(true)} />
        </div>
        <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} workspaceId={workspaceId} />
        <CreateIncidentDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} defaultStatus={createStatus} />
        <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
      </div>
    </ShellChromeProvider>
  )
}

function HelpFab({ onOpen }: { onOpen: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="brand"
            size="icon"
            aria-label="打开帮助"
            className="absolute z-20 rounded-full shadow-[var(--shadow-floating)]"
            style={{ width: "var(--chat-fab-size)", height: "var(--chat-fab-size)", right: "var(--chat-fab-inset)", bottom: "var(--chat-fab-inset)" }}
            onClick={onOpen}
          />
        }
      >
        <CircleHelpIcon />
      </TooltipTrigger>
      <TooltipContent>快捷键帮助（?）</TooltipContent>
    </Tooltip>
  )
}

function SearchDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "incidents" | "services" | "members" | "changes">("all")
  const navigate = useNavigate()
  const search = useQuery({
    queryKey: keys.search(workspaceId, query),
    queryFn: () => searchAll(workspaceId, query),
    enabled: open && query.trim().length > 0,
  })

  const groups = useMemo(() => {
    const data = search.data
    if (!data) return []
    return [
      { id: "incidents" as const, heading: "事件", items: data.incidents.map((item) => ({ id: item.id, label: `${item.number} ${item.title}`, to: `/${workspaceId}/incidents/${item.id}` })) },
      { id: "services" as const, heading: "服务", items: data.services.map((item) => ({ id: item.id, label: item.name, to: `/${workspaceId}/services/${item.id}` })) },
      { id: "members" as const, heading: "成员", items: data.members.map((item) => ({ id: item.id, label: item.name, to: `/${workspaceId}/settings/members` })) },
      { id: "changes" as const, heading: "变更", items: data.changes.map((item) => ({ id: item.id, label: item.title, to: `/${workspaceId}/incidents` })) },
    ].filter((group) => filter === "all" || group.id === filter)
  }, [filter, search.data, workspaceId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 sm:max-w-xl" aria-describedby={undefined}>
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>搜索</DialogTitle>
          <DialogDescription>搜索事件、服务、成员和变更记录</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="输入关键字" />
          <div className="flex gap-1 px-3 py-2">
            {(["all", "incidents", "services", "members", "changes"] as const).map((item) => (
              <Button key={item} size="xs" variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)}>
                {item === "all" ? "全部" : item}
              </Button>
            ))}
          </div>
          <CommandList>
            {search.isFetching ? <p className="p-3 text-sm text-muted-foreground">正在搜索…</p> : null}
            {search.isError ? (
              <div className="flex items-center justify-between p-3 text-sm">
                <span>搜索失败</span>
                <Button size="sm" onClick={() => void search.refetch()}>重试</Button>
              </div>
            ) : null}
            {query && !search.isFetching && groups.every((group) => group.items.length === 0) ? <CommandEmpty>无结果</CommandEmpty> : null}
            {groups.map((group) => (
              <CommandGroup key={group.id} heading={`${group.heading}（${group.items.length}）`}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    onSelect={() => {
                      onOpenChange(false)
                      navigate(item.to)
                    }}
                  >
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CreateIncidentDialog({
  open,
  onOpenChange,
  workspaceId,
  defaultStatus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  defaultStatus: z.infer<typeof incidentFormSchema>["status"]
}) {
  const services = useQuery({ queryKey: keys.services(workspaceId), queryFn: () => listServices(workspaceId), enabled: open })
  const members = useQuery({ queryKey: keys.members(workspaceId), queryFn: () => listMembers(workspaceId), enabled: open })
  const teams = useQuery({ queryKey: keys.teams(workspaceId), queryFn: () => listTeams(workspaceId), enabled: open })
  const changes = useQuery({ queryKey: keys.changes(workspaceId), queryFn: () => listChanges(workspaceId), enabled: open })
  const [title, setTitle] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [severity, setSeverity] = useState<"critical" | "high" | "medium" | "low">("high")
  const [status, setStatus] = useState(defaultStatus)
  const [ownerId, setOwnerId] = useState("")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState("")

  useEffect(() => {
    if (open) setStatus(defaultStatus)
  }, [defaultStatus, open])

  const mutation = useMutation({
    mutationFn: () =>
      createIncident(workspaceId, incidentFormSchema.parse({
        title,
        serviceIds: serviceId ? [serviceId] : [],
        severity,
        status,
        ownerId,
        teamIds: [],
        startedAt: new Date().toISOString(),
        description,
        tags: [],
        changeIds: [],
      })),
    onSuccess: async (incident) => {
      await queryClient.invalidateQueries()
      toast.success(`已创建 ${incident.number}`, { action: { label: "重试", onClick: () => undefined } })
      onOpenChange(false)
      setTitle("")
      setDescription("")
      setErrors({})
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "创建失败", { action: { label: "重试", onClick: () => mutation.mutate() } })
    },
  })

  function submit() {
    const parsed = incidentFormSchema.safeParse({
      title,
      serviceIds: serviceId ? [serviceId] : [],
      severity,
      status,
      ownerId,
      teamIds: [],
      startedAt: new Date().toISOString(),
      description,
      tags: [],
      changeIds: [],
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建事件</DialogTitle>
          <DialogDescription>标题、影响服务和严重等级为必填。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor="create-title">标题</FieldLabel>
            <Input id="create-title" value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={Boolean(errors.title)} />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
          <Field data-invalid={errors.serviceIds ? true : undefined}>
            <FieldLabel>影响服务</FieldLabel>
            <Select value={serviceId} onValueChange={(value) => typeof value === "string" && setServiceId(value)}>
              <SelectTrigger className="w-full" aria-label="影响服务">
                <SelectValue placeholder="选择服务" />
              </SelectTrigger>
              <SelectContent>
                {(services.data ?? []).filter((item) => item.status === "active").map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.serviceIds ? <FieldError>{errors.serviceIds}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel>严重等级</FieldLabel>
            <Select value={severity} onValueChange={(value) => typeof value === "string" && setSeverity(value as typeof severity)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">紧急</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>当前状态</FieldLabel>
            <Select value={status} onValueChange={(value) => typeof value === "string" && setStatus(value as typeof status)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending-confirm">待确认</SelectItem>
                <SelectItem value="in-progress">处理中</SelectItem>
                <SelectItem value="waiting-external">等待外部</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>负责人</FieldLabel>
            <Select value={ownerId} onValueChange={(value) => typeof value === "string" && setOwnerId(value)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="选择成员" /></SelectTrigger>
              <SelectContent>
                {(members.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ownerId ? <FieldError>{errors.ownerId}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel>描述</FieldLabel>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>附件</FieldLabel>
            <Input type="file" aria-label="上传附件" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
            {fileName ? <p className="text-[length:var(--type-caption)] text-muted-foreground">{fileName}</p> : null}
          </Field>
        </FieldGroup>
        <p className="text-[length:var(--type-caption)] text-muted-foreground">
          可选团队 {(teams.data ?? []).length} 个，可选变更 {(changes.data ?? []).length} 条。
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setTitle(""); setDescription(""); setErrors({}) }}>清空</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="brand" onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? "提交中" : "创建"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>快捷键</DialogTitle>
          <DialogDescription>当前可用快捷键</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          <li><kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> 打开搜索</li>
          <li><kbd>C</kbd> 创建事件（输入框内不触发）</li>
          <li><kbd>?</kbd> 打开本面板</li>
          <li><kbd>Esc</kbd> 关闭浮层</li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}

export function ShellOutletFallback({ children }: { children?: ReactNode }) {
  return <>{children}</>
}
