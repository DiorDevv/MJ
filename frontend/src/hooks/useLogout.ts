import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export function useLogout(): () => Promise<void> {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return async () => {
    try {
      await logoutUser()
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }
}
