import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
    mutations: {
      retry: 0,
    },
  },
})

export const keys = {
  workspaces: ["workspaces"] as const,
  workspace: (id: string) => ["workspace", id] as const,
  members: (ws: string) => ["members", ws] as const,
  teams: (ws: string) => ["teams", ws] as const,
  services: (ws: string) => ["services", ws] as const,
  service: (id: string) => ["service", id] as const,
  incidents: (ws: string) => ["incidents", ws] as const,
  incident: (id: string) => ["incident", id] as const,
  timeline: (id: string) => ["timeline", id] as const,
  inbox: (ws: string) => ["inbox", ws] as const,
  changes: (ws: string) => ["changes", ws] as const,
  shifts: (ws: string) => ["shifts", ws] as const,
  rules: (ws: string) => ["rules", ws] as const,
  integrations: (ws: string) => ["integrations", ws] as const,
  search: (ws: string, q: string) => ["search", ws, q] as const,
  healthChecks: (id: string) => ["health-checks", id] as const,
}

export async function invalidateWorkspace(workspaceId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.incidents(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: keys.inbox(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: keys.services(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: keys.members(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: keys.teams(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: keys.shifts(workspaceId) }),
  ])
}
