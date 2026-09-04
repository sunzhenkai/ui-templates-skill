import { AppShell } from "@/components/shell/app-shell"
import { AnalyticsPage } from "@/pages/analytics-page"
import { BoardPage } from "@/pages/board-page"
import { InboxPage } from "@/pages/inbox-page"
import { IncidentDetailPage } from "@/pages/incident-detail-page"
import { IncidentsPage } from "@/pages/incidents-page"
import { OncallPage } from "@/pages/oncall-page"
import { ServiceDetailPage, ServicesPage } from "@/pages/services-page"
import { SettingsPage } from "@/pages/settings-page"
import { usePrefsStore } from "@/stores/prefs-store"
import { Navigate, RouterProvider, createBrowserRouter, type RouteObject } from "react-router"

function HomeRedirect() {
  const workspaceId = usePrefsStore((state) => state.lastWorkspaceId)
  const home = usePrefsStore((state) => state.defaultHome)
  return <Navigate to={`/${workspaceId}/${home}`} replace />
}

export const routes: RouteObject[] = [
  { path: "/", element: <HomeRedirect /> },
  {
    path: "/:workspaceId",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="inbox" replace /> },
      { path: "inbox", element: <InboxPage /> },
      { path: "incidents", element: <IncidentsPage /> },
      { path: "incidents/:incidentId", element: <IncidentDetailPage /> },
      { path: "board", element: <BoardPage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "services/:serviceId", element: <ServiceDetailPage /> },
      { path: "oncall", element: <OncallPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "settings/:tab", element: <SettingsPage /> },
    ],
  },
]

const router = createBrowserRouter(routes)

export default function App() {
  return <RouterProvider router={router} />
}
