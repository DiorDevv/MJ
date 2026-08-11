import { apiRequest, ApiError } from './client'
import { refreshAccessToken } from './auth'
import { useAuthStore } from '../store/authStore'

type ApiRequestOptions = Parameters<typeof apiRequest>[1]

/**
 * Wraps apiRequest with the current access token and, on a 401, one silent
 * refresh-and-retry using the httpOnly refresh cookie — so a token that expired
 * mid-session (30 min lifetime) doesn't surface as a broken request or force a
 * full re-login while a valid session still exists.
 */
export async function authorizedRequest<T>(
  path: string,
  options: Omit<ApiRequestOptions, 'accessToken'> = {},
): Promise<T> {
  const { accessToken, user, setAuth, clearAuth } = useAuthStore.getState()

  try {
    return await apiRequest<T>(path, { ...options, accessToken: accessToken ?? undefined })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      try {
        const refreshed = await refreshAccessToken()
        if (user) setAuth(refreshed.access_token, user)
        return await apiRequest<T>(path, { ...options, accessToken: refreshed.access_token })
      } catch {
        clearAuth()
        throw error
      }
    }
    throw error
  }
}
