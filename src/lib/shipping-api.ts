import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

/** Mirrors the API: delivery_status prefix written when a hand-over to a carrier failed. */
export const SHIP_ERROR_PREFIX = 'Erreur envoi'
export const SHIPPABLE_STATUSES = ['confirmed', 'in_delivery']

export const CARRIER_NAMES: Record<string, string> = { ozon: 'Ozon Express', ameex: 'Ameex', sendit: 'Sendit', coliix: 'Coliix' }
/** Mirrors the API's POLLED_CARRIERS: Sellio reads the parcel status from these carriers itself. */
export const TRACKED_CARRIERS = ['ozon', 'ameex', 'sendit', 'coliix']
export const carrierName = (slug: string) => CARRIER_NAMES[slug] ?? slug

export interface ShipCarrier { provider: string; isDefault: boolean }

/** The parcel is at a carrier Sellio tracks: its status comes from the carrier, never typed by hand. */
export function carrierTracked(order: { delivery_provider?: string | null; delivery_tracking_code?: string | null }): boolean {
  return !!order.delivery_tracking_code && TRACKED_CARRIERS.includes(order.delivery_provider ?? '')
}

/** A confirmed order that is not at any carrier because the last hand-over failed. */
export function shipFailed(order: { status?: string; delivery_status?: string | null; delivery_tracking_code?: string | null }): boolean {
  return !!order.delivery_status?.startsWith(SHIP_ERROR_PREFIX) && !order.delivery_tracking_code
    && SHIPPABLE_STATUSES.includes(order.status ?? '')
}

async function call(path: string, init?: RequestInit) {
  const res = await authFetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  type Body = { success?: boolean; data?: unknown; error?: { message?: string } | string }
  const data: Body = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) {
    const msg = typeof data.error === 'string' ? data.error : data.error?.message
    throw new Error(msg || `Erreur (${res.status})`)
  }
  return data.data
}

export const fetchShipCarriers = (tid: string): Promise<ShipCarrier[]> =>
  call(`/api/orders/${tid}/ship-carriers`).then((d) => (d as { carriers?: ShipCarrier[] } | undefined)?.carriers ?? [])

export const shipOrder = (tid: string, orderId: string, provider?: string): Promise<{ provider: string; trackingCode: string }> =>
  call(`/api/orders/${tid}/${orderId}/ship`, { method: 'POST', body: JSON.stringify(provider ? { provider } : {}) })
    .then((d) => d as { provider: string; trackingCode: string })
