import { create } from "zustand"
import type { Member, Toast } from "@/types"

export type Page =
  | "inbox"
  | "events"
  | "board"
  | "services"
  | "oncall"
  | "analytics"
  | "settings"

export type DialogType =
  | "search"
  | "create-incident"
  | "shortcuts"
  | "confirm"
  | null

interface ConfirmState {
  title: string
  description?: string
  onConfirm: () => void
  onCancel?: () => void
}

interface AppState {
  currentWorkspaceId: string
  setCurrentWorkspaceId: (id: string) => void

  page: Page
  setPage: (page: Page) => void

  // URL 状态（选中项、tab、视图）
  selectedId?: string
  setSelectedId: (id?: string) => void
  settingsTab: string
  setSettingsTab: (tab: string) => void
  eventView: "list" | "board" | "table"
  setEventView: (view: "list" | "board" | "table") => void

  // 侧栏
  sidebarWidth: number
  setSidebarWidth: (w: number) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  mobileDrawerOpen: boolean
  setMobileDrawerOpen: (v: boolean) => void

  // 弹层
  dialog: DialogType
  setDialog: (d: DialogType) => void
  confirm: ConfirmState | null
  setConfirm: (c: ConfirmState | null) => void

  // Toast
  toasts: Toast[]
  addToast: (t: Omit<Toast, "id">) => void
  removeToast: (id: string) => void

  // 当前用户（模拟）
  currentUserId: string
  currentUser?: Member

  // 失败模拟开关
  simulateFailure: boolean
  setSimulateFailure: (v: boolean) => void
}

const savedWorkspace = typeof localStorage !== "undefined" ? localStorage.getItem("ws-current-workspace") : null
const savedSidebarWidth = typeof localStorage !== "undefined" ? localStorage.getItem("ws-sidebar-width") : null
const savedCollapsed = typeof localStorage !== "undefined" ? localStorage.getItem("ws-sidebar-collapsed") : null

function parsePage(hash: string): Page {
  const m = hash.match(/^#\/?([a-z-]+)/)
  const p = (m?.[1] ?? "inbox") as Page
  const valid: Page[] = ["inbox", "events", "board", "services", "oncall", "analytics", "settings"]
  return valid.includes(p) ? p : "inbox"
}

function parseHashParams() {
  const hash = window.location.hash || "#inbox"
  const [base, query] = hash.split("?")
  const params = new URLSearchParams(query ?? "")
  return {
    page: parsePage(base),
    selectedId: params.get("id") || undefined,
    settingsTab: params.get("tab") || "basic",
    eventView: (params.get("view") as "list" | "board" | "table") || "list",
  }
}

export const useAppStore = create<AppState>((set, get) => {
  const initial = typeof window !== "undefined" ? parseHashParams() : { page: "inbox" as Page, selectedId: undefined, settingsTab: "basic", eventView: "list" as const }

  return {
    currentWorkspaceId: savedWorkspace ?? "ws-1",
    setCurrentWorkspaceId: (id) => {
      set({ currentWorkspaceId: id, selectedId: undefined })
      localStorage.setItem("ws-current-workspace", id)
    },

    page: initial.page,
    setPage: (page) => set({ page }),

    selectedId: initial.selectedId,
    setSelectedId: (id) => set({ selectedId: id }),

    settingsTab: initial.settingsTab,
    setSettingsTab: (tab) => set({ settingsTab: tab }),

    eventView: initial.eventView,
    setEventView: (view) => set({ eventView: view }),

    sidebarWidth: savedSidebarWidth ? Number(savedSidebarWidth) : 256,
    setSidebarWidth: (w) => {
      const clamped = Math.max(200, Math.min(360, w))
      set({ sidebarWidth: clamped })
      localStorage.setItem("ws-sidebar-width", String(clamped))
    },
    sidebarCollapsed: savedCollapsed ? savedCollapsed === "true" : false,
    setSidebarCollapsed: (v) => {
      set({ sidebarCollapsed: v })
      localStorage.setItem("ws-sidebar-collapsed", String(v))
    },
    mobileDrawerOpen: false,
    setMobileDrawerOpen: (v) => set({ mobileDrawerOpen: v }),

    dialog: null,
    setDialog: (d) => set({ dialog: d }),

    confirm: null,
    setConfirm: (c) => set({ confirm: c }),

    toasts: [],
    addToast: (t) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
      setTimeout(() => get().removeToast(id), 5000)
    },
    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

    currentUserId: "m-1",

    simulateFailure: false,
    setSimulateFailure: (v) => {
      import("@/mocks/api").then((api) => api.setFailureEnabled(v))
      set({ simulateFailure: v })
    },
  }
})

// 同步 URL 与 store
export function syncUrl(state: {
  page?: Page
  selectedId?: string | null
  settingsTab?: string
  eventView?: "list" | "board" | "table"
}) {
  const current = useAppStore.getState()
  const page = state.page ?? current.page
  const id = state.selectedId === undefined ? current.selectedId : state.selectedId
  const tab = state.settingsTab ?? current.settingsTab
  const view = state.eventView ?? current.eventView

  const params = new URLSearchParams()
  if (id) params.set("id", id)
  if (page === "settings" && tab) params.set("tab", tab)
  if ((page === "events" || page === "board") && view && view !== "list") params.set("view", view)

  const qs = params.toString()
  const hash = qs ? `#/${page}?${qs}` : `#/${page}`
  if (window.location.hash !== hash) {
    window.location.hash = hash
  }
}

// 监听 hash 变化
if (typeof window !== "undefined") {
  const applyHash = () => {
    const p = parseHashParams()
    useAppStore.setState({
      page: p.page,
      selectedId: p.selectedId,
      settingsTab: p.settingsTab,
      eventView: p.eventView,
    })
  }
  window.addEventListener("hashchange", applyHash)
}
