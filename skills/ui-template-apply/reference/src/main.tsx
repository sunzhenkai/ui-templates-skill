import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router"
import { NotFound, RouteError } from "@/components/blocks/app-errors"
import { ConfirmProvider } from "@/components/blocks/confirm"
import { ThemeProvider } from "@/components/blocks/theme"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CollectionPage } from "./pages/collection"
import { DetailPage } from "./pages/detail"
import { EmptyPage } from "./pages/empty"
import { FormPage } from "./pages/form"
import { NewThread, ThreadPage, ThreadsLayout } from "./pages/list-detail"
import { SettingsDanger, SettingsGeneral, SettingsLayout, SettingsNotifications } from "./pages/settings"
import { Root } from "./root"
import "./index.css"

const router = createBrowserRouter([{
  element: <Root />, errorElement: <RouteError />, children: [
    { index: true, element: <Navigate to="/jobs" replace /> },
    { path: "jobs", element: <CollectionPage /> },
    { path: "jobs/new", element: <FormPage /> },
    { path: "jobs/:id", element: <DetailPage /> },
    { path: "empty", element: <EmptyPage /> },
    { path: "threads", element: <ThreadsLayout />, children: [{ index: true, element: <NewThread /> }, { path: ":id", element: <ThreadPage /> }] },
    { path: "settings", element: <SettingsLayout />, children: [
      { index: true, element: <Navigate to="general" replace /> },
      { path: "general", element: <SettingsGeneral /> }, { path: "notifications", element: <SettingsNotifications /> }, { path: "danger", element: <SettingsDanger /> },
    ] },
    { path: "*", element: <NotFound /> },
  ],
}])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider><ConfirmProvider><TooltipProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </TooltipProvider></ConfirmProvider></ThemeProvider>
  </StrictMode>,
)
