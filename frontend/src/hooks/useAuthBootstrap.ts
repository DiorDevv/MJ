import { useEffect } from 'react'
import { fetchCurrentUser, refreshAccessToken } from '../api/auth'
import { useAuthStore } from '../store/authStore'

/**
 * On first mount, tries to silently turn the httpOnly refresh cookie (if any)
 * into a fresh access token + user, so a page reload doesn't force a re-login.
 * Safe to call from multiple mounted route guards — the store's `status` gate
 * makes sure the actual network round trip only happens once.
 */
export function useAuthBootstrap(): void {
  const status = useAuthStore((state) => state.status)
  const setStatus = useAuthStore((state) => state.setStatus)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  useEffect(() => {
    if (status !== 'idle') return
    setStatus('loading')

    void (async () => {
      try {
        const { access_token: accessToken } = await refreshAccessToken()
        const user = await fetchCurrentUser(accessToken)
        setAuth(accessToken, user)
      } catch {
        clearAuth()
      }
    })()
  }, [status, setStatus, setAuth, clearAuth])
}
