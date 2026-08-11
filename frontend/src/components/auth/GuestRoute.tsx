import { Navigate, Outlet } from 'react-router-dom'
import { useAuthBootstrap } from '../../hooks/useAuthBootstrap'
import { useAuthStore } from '../../store/authStore'
import { LoadingScreen } from '../ui/LoadingScreen'

/** Keeps an already-authenticated user off /login and /register. */
export function GuestRoute() {
  useAuthBootstrap()
  const status = useAuthStore((state) => state.status)

  if (status === 'idle' || status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'authenticated') {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
