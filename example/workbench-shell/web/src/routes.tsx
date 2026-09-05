import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import { InboxPage } from "@/pages/inbox";
import { IncidentsPage } from "@/pages/incidents";
import { IncidentDetailPage } from "@/pages/incident-detail";
import { ServicesPage } from "@/pages/services";
import { ServiceDetailPage } from "@/pages/service-detail";
import { OncallPage } from "@/pages/oncall";
import { AnalyticsPage } from "@/pages/analytics";
import { SettingsPage } from "@/pages/settings";
import { NotFoundPage } from "@/pages/not-found";

export const routes: RouteObject[] = [
  { index: true, element: <Navigate to="/inbox" replace /> },
  { path: "inbox", element: <InboxPage /> },
  { path: "incidents", element: <IncidentsPage /> },
  { path: "incidents/:id", element: <IncidentDetailPage /> },
  { path: "services", element: <ServicesPage /> },
  { path: "services/:id", element: <ServiceDetailPage /> },
  { path: "oncall", element: <OncallPage /> },
  { path: "analytics", element: <AnalyticsPage /> },
  { path: "settings", element: <SettingsPage /> },
  { path: "*", element: <NotFoundPage /> },
];
