import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/shell'
import { EmptyState, Button } from './components/ui'
import { InboxPage } from './pages/InboxPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { IncidentDetailPage } from './pages/IncidentDetailPage'
import { BoardPage } from './pages/BoardPage'
import { ServicesPage } from './pages/ServicesPage'
import { OnCallPage } from './pages/OnCallPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useNavigate } from 'react-router-dom'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/incidents" replace />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />
        <Route path="board" element={<BoardPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="oncall" element={<OnCallPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return <div className="grid h-full place-items-center p-6"><EmptyState title="404 · 页面不存在" description="这个工作区页面不存在，或你没有访问权限。" action={<Button variant="primary" onClick={() => navigate('/incidents')}>返回事件列表</Button>} /></div>
}
