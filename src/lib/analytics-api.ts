import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

export interface Funnel {
  received: number; confirmed: number; cancelled: number; shipped: number; delivered: number; returned: number; revenue: number
  confirmationRate: number | null; deliveryRate: number | null; netRate: number | null
}
export interface GroupRow {
  name: string; orders: number; confirmed: number; delivered: number; returned: number; cancelled: number; revenue: number
  confirmationRate: number | null; deliveryRate: number | null; returnRate: number | null
}
export interface CarrierRow {
  provider: string; shipped: number; delivered: number; returned: number; inTransit: number; stuck: number
  medianDays: number | null; deliveryRate: number | null; returnRate: number | null
}
export interface AnalyticsData {
  days: number
  funnel: Funnel; previous: Funnel
  changes: { received: number | null; confirmationRate: number | null; deliveryRate: number | null; revenue: number | null }
  cities: GroupRow[]; products: GroupRow[]; carriers: CarrierRow[]
  cancelReasons: { reason: string; count: number; share: number | null }[]
  upsell: { offered: number; accepted: number; acceptanceRate: number | null }
  cash: { amount: number; parcels: number; stuck: number; stuckAmount: number }
  offers: { title: string; status: string; shown: number; accepted: number; extraRevenue: number; acceptanceRate: number | null }[]
}

export async function fetchAnalytics(days: number): Promise<AnalyticsData> {
  const res = await authFetch(`${API_BASE}/api/analytics?days=${days}`, { credentials: 'include' })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || data?.success === false) throw new Error(data?.error?.message || data?.error || `Erreur (${res.status})`)
  return data as AnalyticsData
}
