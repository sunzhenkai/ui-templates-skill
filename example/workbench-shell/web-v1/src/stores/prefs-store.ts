import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ThemeMode = "light" | "dark"

type PrefsState = {
  theme: ThemeMode
  sidebarWidth: number
  lastWorkspaceId: string
  forceFail: boolean
  delayMs: number
  shortcutsEnabled: boolean
  defaultHome: string
  timezone: string
  notificationsEnabled: boolean
  columnVisibility: Record<string, boolean>
  columnWidths: Record<string, number>
  setTheme: (theme: ThemeMode) => void
  setSidebarWidth: (width: number) => void
  setLastWorkspaceId: (id: string) => void
  setForceFail: (value: boolean) => void
  setDelayMs: (value: number) => void
  setShortcutsEnabled: (value: boolean) => void
  setDefaultHome: (value: string) => void
  setTimezone: (value: string) => void
  setNotificationsEnabled: (value: boolean) => void
  setColumnVisibility: (value: Record<string, boolean>) => void
  setColumnWidths: (value: Record<string, number>) => void
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarWidth: 256,
      lastWorkspaceId: "ws-alpha",
      forceFail: false,
      delayMs: 380,
      shortcutsEnabled: true,
      defaultHome: "inbox",
      timezone: "Asia/Shanghai",
      notificationsEnabled: true,
      columnVisibility: {
        number: true,
        title: true,
        status: true,
        severity: true,
        services: true,
        owner: true,
        startedAt: true,
        resolvedAt: true,
        updatedAt: true,
      },
      columnWidths: {},
      setTheme: (theme) => set({ theme }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setLastWorkspaceId: (lastWorkspaceId) => set({ lastWorkspaceId }),
      setForceFail: (forceFail) => set({ forceFail }),
      setDelayMs: (delayMs) => set({ delayMs }),
      setShortcutsEnabled: (shortcutsEnabled) => set({ shortcutsEnabled }),
      setDefaultHome: (defaultHome) => set({ defaultHome }),
      setTimezone: (timezone) => set({ timezone }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setColumnVisibility: (columnVisibility) => set({ columnVisibility }),
      setColumnWidths: (columnWidths) => set({ columnWidths }),
    }),
    { name: "wb-prefs" },
  ),
)

export function applyThemeClass(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}
