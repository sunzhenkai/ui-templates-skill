import { Navigate, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell, ChatWindow } from "./components/shell/AppShell";
import { OverlayHost } from "./components/shell/overlays";
import { Toaster } from "./components/ui/toast";
import { MemberContext } from "./components/ui";
import { api } from "./data/mock";
import { useQuery } from "@tanstack/react-query";
import { IncidentListPage } from "./features/incidents/IncidentListPage";
import { IncidentDetailPage } from "./features/incidents/IncidentDetailPage";
import { InboxPage } from "./features/inbox/InboxPage";
import { BoardPage } from "./features/board/BoardPage";
import { ServiceCatalogPage, ServiceDetailPage } from "./features/services/ServicePages";
import { OnCallPage } from "./features/oncall/OnCallPage";
import { AnalyticsPage } from "./features/analytics/AnalyticsPage";
import { SettingsPage } from "./features/settings/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 0, staleTime: 30_000, refetchOnWindowFocus: false } },
});

function MemberProvider({ children }: { children: React.ReactNode }) {
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: api.listMembers });
  return <MemberContext.Provider value={{ members: members ?? [] }}>{children}</MemberContext.Provider>;
}

/** 根布局：壳层 + 全局浮层（data router 的根路由元素） */
export function RootLayout() {
  return (
    <MemberProvider>
      <AppShell />
      <OverlayHost />
      <ChatWindow />
      <Toaster />
    </MemberProvider>
  );
}

/** data router 路由表（useBlocker 需要 data router 上下文） */
export const routes = [
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/inbox" replace /> },
      { path: "/inbox", element: <InboxPage /> },
      { path: "/incidents", element: <IncidentListPage /> },
      { path: "/incidents/board", element: <BoardPage /> },
      { path: "/incidents/:id", element: <IncidentDetailPage /> },
      { path: "/services", element: <ServiceCatalogPage /> },
      { path: "/services/:id", element: <ServiceDetailPage /> },
      { path: "/on-call", element: <OnCallPage /> },
      { path: "/analytics", element: <AnalyticsPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/inbox" replace /> },
    ],
  },
];

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Navigate to="/inbox" replace />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/incidents" element={<IncidentListPage />} />
          <Route path="/incidents/board" element={<BoardPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/services" element={<ServiceCatalogPage />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />
          <Route path="/on-call" element={<OnCallPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/inbox" replace />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}

export { queryClient };
