export interface UserRead {
  id: string
  username: string
  telegram_chat_id: number | null
  created_at: string
  /** "HH:MM:SS" local wall-clock, or null when quiet hours are off. */
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface AuthCredentials {
  username: string
  password: string
}
