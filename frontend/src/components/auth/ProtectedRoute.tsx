import { Navigate, Outlet } from 'react-router-dom'
import { useAuthBootstrap } from '../../hooks/useAuthBootstrap'
import { useAuthStore } from '../../store/authStore'
import { LoadingScreen } from '../ui/LoadingScreen'

export function ProtectedRoute() {
  useAuthBootstrap()
  const status = useAuthStore((state) => state.status)

  if (status === 'idle' || status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
