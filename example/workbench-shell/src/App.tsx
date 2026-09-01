import { useEffect } from "react"
import { AppShell } from "@/components/shell/app-shell"
import { Toaster } from "@/components/ui/toaster"
import { SearchDialog } from "@/components/dialogs/search-dialog"
import { CreateIncidentDialog } from "@/components/dialogs/create-incident-dialog"
import { ShortcutsDialog } from "@/components/dialogs/shortcuts-dialog"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import { useAppStore, type Page } from "@/stores/app-store"

import InboxPage from "@/components/pages/inbox-page"
import EventsPage from "@/components/pages/events-page"
import BoardPage from "@/components/pages/board-page"
import ServicesPage from "@/components/pages/services-page"
import OnCallPage from "@/components/pages/oncall-page"
import AnalyticsPage from "@/components/pages/analytics-page"
import SettingsPage from "@/components/pages/settings-page"

const pages: Record<Page, React.FC> = {
  inbox: InboxPage,
  events: EventsPage,
  board: BoardPage,
  services: ServicesPage,
  oncall: OnCallPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
}

function App() {
  const store = useAppStore()
  const PageComponent = pages[store.page]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const editing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)

      if (e.key === "Escape") {
        store.setDialog(null)
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        store.setDialog("search")
        return
      }

      if (!editing && e.key.toLowerCase() === "c") {
        e.preventDefault()
        store.setDialog("create-incident")
        return
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [store])

  return (
    <AppShell>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <PageComponent />
      </div>
      <SearchDialog />
      <CreateIncidentDialog />
      <ShortcutsDialog />
      <ConfirmDialog />
      <Toaster />
    </AppShell>
  )
}

export default App
