import { authorizedRequest } from './authorizedRequest'

interface VapidPublicKeyResponse {
  public_key: string
}

export async function fetchVapidPublicKey(): Promise<string> {
  const { public_key: publicKey } = await authorizedRequest<VapidPublicKeyResponse>(
    '/v1/push/vapid-public-key',
  )
  return publicKey
}

export interface PushSubscriptionPayload {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export function subscribeToPush(payload: PushSubscriptionPayload): Promise<void> {
  return authorizedRequest<void>('/v1/push/subscribe', { method: 'POST', body: payload })
}

export function unsubscribeFromPush(endpoint: string): Promise<void> {
  return authorizedRequest<void>('/v1/push/unsubscribe', {
    method: 'POST',
    body: { endpoint },
  })
}
