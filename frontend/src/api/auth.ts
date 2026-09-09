import { apiRequest } from './client'
import { authorizedRequest } from './authorizedRequest'
import type { AuthCredentials, TokenResponse, UserRead } from '../types/auth'

export function registerUser(credentials: AuthCredentials): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/v1/auth/register', { method: 'POST', body: credentials })
}

export function loginUser(credentials: AuthCredentials): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/v1/auth/login', { method: 'POST', body: credentials })
}

export function refreshAccessToken(): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/v1/auth/refresh', { method: 'POST' })
}

export function logoutUser(): Promise<void> {
  return apiRequest<void>('/v1/auth/logout', { method: 'POST' })
}

export function fetchCurrentUser(accessToken: string): Promise<UserRead> {
  return apiRequest<UserRead>('/v1/auth/me', { accessToken })
}

export interface TelegramLinkCode {
  code: string
  expires_at: string
}

export function requestTelegramLinkCode(): Promise<TelegramLinkCode> {
  return authorizedRequest<TelegramLinkCode>('/v1/auth/telegram/link-code', { method: 'POST' })
}

export function fetchCurrentUserAuthorized(): Promise<UserRead> {
  return authorizedRequest<UserRead>('/v1/auth/me')
}

export interface NotificationPreferences {
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export function updateNotificationPreferences(prefs: NotificationPreferences): Promise<UserRead> {
  return authorizedRequest<UserRead>('/v1/auth/me', { method: 'PATCH', body: prefs })
}
