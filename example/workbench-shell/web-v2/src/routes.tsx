import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/app-shell/app-shell'
import { InboxPage } from '@/pages/inbox/inbox-page'
import { EventsPage } from '@/pages/events/events-page'
import { EventsBoardPage } from '@/pages/events/events-board-page'
import { ServicesPage } from '@/pages/services/services-page'
import { OncallPage } from '@/pages/oncall/oncall-page'
import { AnalyticsPage } from '@/pages/analytics/analytics-page'
import { SettingsPage } from '@/pages/settings/settings-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/inbox" replace /> },
      { path: 'inbox', element: <InboxPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/board', element: <EventsBoardPage /> },
      { path: 'events/:id', element: <EventsPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'services/:id', element: <ServicesPage /> },
      { path: 'oncall', element: <OncallPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/inbox" replace /> },
    ],
  },
])
