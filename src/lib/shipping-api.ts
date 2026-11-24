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

/** API error with its code (e.g. CHOOSE_CARRIER) and the carriers the API lists, when it does. */
export class ShipApiError extends Error {
  constructor(message: string, public code?: string, public carriers?: string[]) { super(message) }
}

async function call(path: string, init?: RequestInit) {
  const res = await authFetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  type Body = { success?: boolean; data?: unknown; error?: { message?: string; code?: string; carriers?: string[] } | string }
  const data: Body = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) {
    const err = typeof data.error === 'string' ? { message: data.error } : (data.error ?? {})
    throw new ShipApiError(err.message || `Erreur (${res.status})`, (err as { code?: string }).code, (err as { carriers?: string[] }).carriers)
  }
  return data.data
}

export const fetchShipCarriers = (tid: string): Promise<ShipCarrier[]> =>
  call(`/api/orders/${tid}/ship-carriers`).then((d) => (d as { carriers?: ShipCarrier[] } | undefined)?.carriers ?? [])

export const shipOrder = (tid: string, orderId: string, provider?: string): Promise<{ provider: string; trackingCode: string }> =>
  call(`/api/orders/${tid}/${orderId}/ship`, { method: 'POST', body: JSON.stringify(provider ? { provider } : {}) })
    .then((d) => d as { provider: string; trackingCode: string })

// ─── shipping mode (when confirmed orders go to the carrier) ────────────────
export type ShipMode = 'auto' | 'scheduled' | 'manual'
export interface ShipSettings {
  mode: ShipMode
  scheduleTime: string | null          // HH:MM, in `timezone`
  timezone: string                     // IANA
  lastScheduledPushDate: string | null // YYYY-MM-DD
}
export const SHIP_TIMEZONES = ['Africa/Casablanca', 'Africa/Algiers']
export const DEFAULT_SHIP_TIMEZONE = 'Africa/Casablanca'

export const fetchShipSettings = (tid: string): Promise<ShipSettings> =>
  call(`/api/tenants/${tid}/ship-settings`).then((d) => d as ShipSettings)

export const saveShipSettings = (tid: string, v: { mode: ShipMode; scheduleTime?: string | null; timezone: string }): Promise<ShipSettings> =>
  call(`/api/tenants/${tid}/ship-settings`, { method: 'PUT', body: JSON.stringify(v) }).then((d) => d as ShipSettings)

/** ready: confirmed, not shipped yet. errored: confirmed but the last hand-over failed (« Erreur envoi »). */
export const fetchShipPending = (tid: string): Promise<{ ready: number; errored: number }> =>
  call(`/api/orders/${tid}/ship-pending`).then((d) => d as { ready: number; errored: number })

/** Queues one push per confirmed, unshipped order. Throws ShipApiError (code CHOOSE_CARRIER when several carriers and no default). */
export const shipAll = (tid: string, provider?: string): Promise<{ queued: number; byCarrier: Record<string, number> }> =>
  call(`/api/orders/${tid}/ship-all`, { method: 'POST', body: JSON.stringify(provider ? { provider } : {}) })
    .then((d) => d as { queued: number; byCarrier: Record<string, number> })
