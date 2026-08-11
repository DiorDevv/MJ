export interface UserRead {
  id: string
  username: string
  telegram_chat_id: number | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface AuthCredentials {
  username: string
  password: string
}
