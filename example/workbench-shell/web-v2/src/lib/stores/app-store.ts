import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { workspaces } from '../mock/seed'
import type { Workspace } from '../types'

interface AppState {
  currentWorkspaceId: string
  setWorkspace: (id: string) => void
  workspaces: Workspace[]
  sidebarWidth: number
  setSidebarWidth: (w: number) => void
  resetSidebarWidth: () => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
  createIncidentOpen: boolean
  setCreateIncidentOpen: (v: boolean) => void
  helpOpen: boolean
  setHelpOpen: (v: boolean) => void
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  toggleTheme: () => void
}

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 360
const SIDEBAR_DEFAULT = 256

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentWorkspaceId: workspaces[0].id,
      setWorkspace: (id) => set({ currentWorkspaceId: id }),
      workspaces: structuredClone(workspaces),
      sidebarWidth: SIDEBAR_DEFAULT,
      setSidebarWidth: (w) => set({ sidebarWidth: Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w)) }),
      resetSidebarWidth: () => set({ sidebarWidth: SIDEBAR_DEFAULT }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
      createIncidentOpen: false,
      setCreateIncidentOpen: (v) => set({ createIncidentOpen: v }),
      helpOpen: false,
      setHelpOpen: (v) => set({ helpOpen: v }),
      theme: 'light',
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'workbench-app-state',
      partialize: (s) => ({
        currentWorkspaceId: s.currentWorkspaceId,
        sidebarWidth: s.sidebarWidth,
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
      }),
    },
  ),
)
