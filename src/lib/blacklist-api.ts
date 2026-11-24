import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

export interface BlacklistEntry {
  id: string
  phone: string
  note: string | null
  added_by: 'manual' | 'auto'
  reason: string | null
  created_at: string
}
export interface BlacklistSuggestion { phone: string; count: number; lastOrderDate: string | null }

/** API error with its code (e.g. INVALID_PHONE). */
export class BlacklistApiError extends Error {
  constructor(message: string, public code?: string) { super(message) }
}

async function call(path: string, init?: RequestInit) {
  const res = await authFetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  type Body = { success?: boolean; data?: unknown; error?: { message?: string; code?: string } | string }
  const data: Body = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) {
    const err = typeof data.error === 'string' ? { message: data.error } : (data.error ?? {})
    throw new BlacklistApiError(err.message || `Erreur (${res.status})`, (err as { code?: string }).code)
  }
  return data.data
}

export const fetchBlacklist = (tid: string): Promise<BlacklistEntry[]> =>
  call(`/api/tenants/${tid}/blacklist`).then((d) => (d as { entries?: BlacklistEntry[] } | undefined)?.entries ?? [])

/** created is false when the number was already blocked (idempotent add). */
export const addToBlacklist = (tid: string, phone: string, note?: string): Promise<{ entry: BlacklistEntry; created: boolean }> =>
  call(`/api/tenants/${tid}/blacklist`, { method: 'POST', body: JSON.stringify(note ? { phone, note } : { phone }) })
    .then((d) => d as { entry: BlacklistEntry; created: boolean })

export const removeFromBlacklist = (tid: string, phone: string): Promise<{ removed: boolean; releasedOrders: number; confirmationsQueued: number }> =>
  call(`/api/tenants/${tid}/blacklist/${encodeURIComponent(phone)}`, { method: 'DELETE' })
    .then((d) => d as { removed: boolean; releasedOrders: number; confirmationsQueued: number })

export const fetchBlacklistSuggestions = (tid: string): Promise<BlacklistSuggestion[]> =>
  call(`/api/tenants/${tid}/blacklist/suggestions`).then((d) => (d as { suggestions?: BlacklistSuggestion[] } | undefined)?.suggestions ?? [])
