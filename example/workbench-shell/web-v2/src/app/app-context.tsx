import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchWorkspace, listWorkspaces, saveWorkspace } from '@/mocks/api'
import { usePersistentState } from '@/lib/storage'
import { useAsync } from '@/lib/async'
import type { Theme, Workspace, WorkspaceData, WorkspaceId } from '@/types'

export type Toast = { id: string; title: string; description?: string; tone: 'success' | 'error' | 'info'; action?: { label: string; onClick: () => void } }

type AppContextValue = {
  workspaces: Workspace[]
  workspaceId: WorkspaceId
  data?: WorkspaceData
  loading: boolean
  error?: Error
  reload: () => void
  updateData: (mutator: (data: WorkspaceData) => WorkspaceData) => void
  switchWorkspace: (id: WorkspaceId) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  sidebarWidth: number
  setSidebarWidth: (width: number) => void
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [theme, setTheme] = usePersistentState<Theme>('workbench.theme', 'light')
  const [sidebarWidth, setSidebarWidth] = usePersistentState('workbench.sidebar-width', 240)
  const [toasts, setToasts] = useState<Toast[]>([])
  const workspaceQuery = searchParams.get('ws') ?? 'apollo'
  const workspaceList = useAsync(listWorkspaces, [])
  const workspaces = workspaceList.data?.data ?? []
  const validWorkspace = workspaces.find(workspace => workspace.id === workspaceQuery)?.id ?? workspaces[0]?.id
  const activeId = validWorkspace ?? workspaceQuery

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (workspaceList.data && !validWorkspace) {
      const next = new URLSearchParams(searchParams)
      next.set('ws', workspaces[0]?.id ?? 'apollo')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, validWorkspace, workspaceList.data, workspaces])

  const workspace = useAsync(async () => {
    const result = await fetchWorkspace(activeId)
    if (result.data.workspace.id !== activeId) throw new Error('工作区不存在')
    return result.data
  }, [activeId])

  const updateData = useCallback((mutator: (input: WorkspaceData) => WorkspaceData) => {
    workspace.setData(current => {
      if (!current) return current
      const next = mutator(current)
      saveWorkspace(current.workspace.id, next)
      return next
    })
  }, [workspace])

  const switchWorkspace = useCallback((id: WorkspaceId) => {
    const next = new URLSearchParams(searchParams)
    next.set('ws', id)
    navigate({ search: next.toString() }, { replace: false })
  }, [navigate, searchParams])

  const dismissToast = useCallback((id: string) => setToasts(items => items.filter(item => item.id !== id)), [])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts(items => [...items.slice(-2), { ...toast, id }])
    window.setTimeout(() => dismissToast(id), 5000)
  }, [dismissToast])

  const value = useMemo<AppContextValue>(() => ({
    workspaces,
    workspaceId: activeId,
    data: workspace.data,
    loading: workspaceList.loading || workspace.loading,
    error: workspace.error ?? workspaceList.error,
    reload: () => { workspaceList.reload(); workspace.reload() },
    updateData,
    switchWorkspace,
    theme,
    setTheme,
    sidebarWidth,
    setSidebarWidth,
    toasts,
    showToast,
    dismissToast,
  }), [activeId, dismissToast, setSidebarWidth, setTheme, sidebarWidth, showToast, switchWorkspace, theme, toasts, updateData, workspace, workspaceList, workspaces])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
