import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppToaster, LoadingScreen } from './components/ui'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { GuestRoute } from './components/auth/GuestRoute'

// Route-level code splitting: each page (and its heavier deps, e.g. recharts in
// StatsPage) becomes its own chunk instead of inflating the initial bundle.
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const DailyPage = lazy(() => import('./pages/DailyPage').then((m) => ({ default: m.DailyPage })))
const WeeklyPage = lazy(() => import('./pages/WeeklyPage').then((m) => ({ default: m.WeeklyPage })))
const ListPage = lazy(() => import('./pages/ListPage').then((m) => ({ default: m.ListPage })))
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })))
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="today" replace />} />
                <Route path="today" element={<DailyPage />} />
                <Route path="week" element={<WeeklyPage />} />
                <Route path="list" element={<ListPage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <AppToaster />
    </QueryClientProvider>
  )
}
