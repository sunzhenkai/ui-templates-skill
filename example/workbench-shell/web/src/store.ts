import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  changes as seedChanges,
  incidents as seedIncidents,
  inbox as seedInbox,
  initialSettings,
  services as seedServices,
  shifts as seedShifts,
  team,
  type Incident,
  type IncidentStatus,
  type InboxItem,
  type Service,
  type Shift,
} from './data/mock'

export interface Toast { id: string; tone: 'success' | 'error' | 'info'; title: string; message?: string; retry?: () => void }

interface WorkbenchState {
  workspaceId: string
  setWorkspace: (id: string) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarWidth: number
  setSidebarWidth: (width: number) => void
  incidents: Incident[]
  services: Service[]
  inbox: InboxItem[]
  shifts: Shift[]
  settings: typeof initialSettings
  updateSettings: (patch: Partial<typeof initialSettings>) => void
  createOpen: boolean
  setCreateOpen: (open: boolean) => void
  commandOpen: boolean
  setCommandOpen: (open: boolean) => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
  toasts: Toast[]
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  addIncident: (incident: Omit<Incident, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'timeline'>) => Incident
  updateIncident: (id: string, patch: Partial<Incident>) => void
  addTimeline: (id: string, text: string) => void
  updateInbox: (id: string, patch: Partial<InboxItem>) => void
  bulkInbox: (ids: string[], patch: Partial<InboxItem>) => void
  updateService: (id: string, patch: Partial<Service>) => void
  addShift: (shift: Omit<Shift, 'id'>) => void
  requestConfirm: (options: { title: string; message: string; confirmLabel?: string; onConfirm: () => void }) => void
  confirmRequest: { title: string; message: string; confirmLabel?: string; onConfirm: () => void } | null
  clearConfirm: () => void
}

export const useWorkbench = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      workspaceId: 'ws-delivery',
      setWorkspace: (workspaceId) => set({ workspaceId }),
      theme: 'dark',
      toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme })
        document.documentElement.classList.toggle('dark', theme === 'dark')
      },
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      sidebarWidth: 256,
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth: Math.max(200, Math.min(360, sidebarWidth)) }),
      incidents: seedIncidents,
      services: seedServices,
      inbox: seedInbox,
      shifts: seedShifts,
      settings: initialSettings,
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      createOpen: false,
      setCreateOpen: (createOpen) => set({ createOpen }),
      commandOpen: false,
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      shortcutsOpen: false,
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
      toasts: [],
      pushToast: (toast) => {
        const id = crypto.randomUUID()
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
        window.setTimeout(() => get().dismissToast(id), 4200)
      },
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
      addIncident: (draft) => {
        const state = get()
        const incident: Incident = {
          ...draft,
          id: `inc-${1043 + state.incidents.length}`,
          number: `OPS-${1043 + state.incidents.length}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          timeline: [],
        }
        set({ incidents: [incident, ...state.incidents] })
        return incident
      },
      updateIncident: (id, patch) => set((state) => ({
        incidents: state.incidents.map((incident) => incident.id === id ? { ...incident, ...patch, updatedAt: new Date().toISOString() } : incident),
      })),
      addTimeline: (id, text) => set((state) => ({
        incidents: state.incidents.map((incident) => incident.id === id
          ? { ...incident, updatedAt: new Date().toISOString(), timeline: [...incident.timeline, { id: crypto.randomUUID(), author: '你', at: new Date().toISOString(), text, kind: 'comment' as const }] }
          : incident),
      })),
      updateInbox: (id, patch) => set((state) => ({ inbox: state.inbox.map((item) => item.id === id ? { ...item, ...patch } : item) })),
      bulkInbox: (ids, patch) => set((state) => ({ inbox: state.inbox.map((item) => ids.includes(item.id) ? { ...item, ...patch } : item) })),
      updateService: (id, patch) => set((state) => ({ services: state.services.map((service) => service.id === id ? { ...service, ...patch } : service) })),
      addShift: (shift) => set((state) => ({ shifts: [...state.shifts, { ...shift, id: crypto.randomUUID() }] })),
      confirmRequest: null,
      requestConfirm: (options) => set({ confirmRequest: options }),
      clearConfirm: () => set({ confirmRequest: null }),
    }),
    {
      name: 'workbench-shell-state',
      partialize: (state) => ({
        workspaceId: state.workspaceId,
        theme: state.theme,
        sidebarWidth: state.sidebarWidth,
        incidents: state.incidents,
        inbox: state.inbox,
        services: state.services,
        shifts: state.shifts,
        settings: state.settings,
      }),
    },
  ),
)

export const selectors = {
  workspace: (id: string) => id,
  currentIncident: (id: string) => useWorkbench.getState().incidents.find((incident) => incident.id === id || incident.number === id),
  members: () => team,
  changes: () => seedChanges,
}
