import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router"
import { NotFound, RouteError } from "@/components/blocks/app-errors"
import { ConfirmProvider } from "@/components/blocks/confirm"
import { ThemeProvider } from "@/components/blocks/theme"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SettingsRoute } from "./pages/settings"
import { Root } from "./root"
import "./index.css"

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

const router = createBrowserRouter([{
  element: <Root />, errorElement: <RouteError />, children: [
    { index: true, element: <Navigate to="/settings" replace /> },
    { path: "settings", element: <SettingsRoute /> },
    { path: "*", element: <NotFound /> },
  ],
}])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider><ConfirmProvider><TooltipProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </TooltipProvider></ConfirmProvider></ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
