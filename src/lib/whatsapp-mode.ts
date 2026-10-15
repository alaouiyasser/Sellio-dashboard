// Which WhatsApp mode the platform runs in.
// cloud     → customers are messaged from Sellio's official number: nothing to connect.
// evolution → each merchant links their own number by QR code.
import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

export type WaMode = { provider: 'cloud' | 'evolution'; displayNumber: string | null }

let cached: Promise<WaMode> | null = null

export function fetchWaMode(): Promise<WaMode> {
  cached ??= authFetch(`${API_BASE}/api/whatsapp/mode`)
    .then((r) => (r.ok ? r.json() : { provider: 'evolution', displayNumber: null }))
    .catch(() => { cached = null; return { provider: 'evolution', displayNumber: null } as WaMode })
  return cached
}
