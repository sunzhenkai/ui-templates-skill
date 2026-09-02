import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from '@/app/app-context'
import { AppShell, NotFoundPage } from '@/components/layout/app-shell'
import { InboxPage } from '@/features/inbox/inbox-page'
import { EventsPage } from '@/features/incidents/events-page'
import { BoardPage } from '@/features/incidents/board-page'
import { IncidentDetailPage } from '@/features/incidents/incident-detail-page'
import { ServicesPage } from '@/features/services/services-page'
import { ServiceDetailPage } from '@/features/services/service-detail-page'
import { OncallPage } from '@/features/oncall/oncall-page'
import { AnalyticsPage } from '@/features/analytics/analytics-page'
import { SettingsPage } from '@/features/settings/settings-page'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/inbox" replace />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:incidentId" element={<IncidentDetailPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
          <Route path="/on-call" element={<OncallPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
