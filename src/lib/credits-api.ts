// Credits and delivery capacity → Sellio API (GET /api/credits/balance). Field names mirror
// describeCapacity() / getCapacityPayload() in sellio/apps/api/src/modules/credits/capacity.ts.
import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

export type CapacityStateName = 'not_activated' | 'ok' | 'low' | 'paused'

export interface CreditsBalance {
  balance: number
  plan?: string
  activated?: boolean
  freeDeliveries?: number
  /** Deliveries paid for: free ones + the ones the credits cover. */
  capacity?: number
  state?: CapacityStateName
  /** Plan Démarrage only. */
  heldOrders?: number
  minRecharge?: number
  /** Plan Démarrage only: capacity not already promised to orders in progress (can be negative). */
  availableCapacity?: number
}

export const creditsApi = {
  balance: async (): Promise<CreditsBalance> => {
    const res = await authFetch(`${API_BASE}/api/credits/balance`)
    if (!res.ok) throw new Error(`credits/balance ${res.status}`)
    return res.json() as Promise<CreditsBalance>
  },
}

const STATES: readonly string[] = ['not_activated', 'ok', 'low', 'paused']

/**
 * What the capacity banner shows, or null (nothing at all): no data, no `state`, or a plan other than
 * Démarrage (the API sends a `state` for every plan, the banner only concerns Démarrage).
 */
export function capacityBanner(b: CreditsBalance | null | undefined): { state: CapacityStateName; available: number } | null {
  if (!b || b.plan !== 'demarrage' || !b.state || !STATES.includes(b.state)) return null
  const n = b.availableCapacity ?? b.capacity
  // Without a number, "ok" and "low" would have nothing true to say.
  if (typeof n !== 'number' && (b.state === 'ok' || b.state === 'low')) return null
  return { state: b.state, available: Math.max(0, n ?? 0) }
}
