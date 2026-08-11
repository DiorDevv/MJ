import { create } from 'zustand'
import type { UserRead } from '../types/auth'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  accessToken: string | null
  user: UserRead | null
  status: AuthStatus
  setAuth: (accessToken: string, user: UserRead) => void
  clearAuth: () => void
  setStatus: (status: AuthStatus) => void
}

// Deliberately not persisted to localStorage: the access token only ever lives in
// memory, so it can't be lifted by an XSS payload reading storage. The refresh
// token (httpOnly cookie, set by the backend) is what survives a page reload —
// see useAuthBootstrap, which silently re-derives an access token from it on load.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'idle',
  setAuth: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  clearAuth: () => set({ accessToken: null, user: null, status: 'unauthenticated' }),
  setStatus: (status) => set({ status }),
}))
