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
export interface FeedbackStats {
  reviews: number; averageRating: number | null
  products: { name: string; average: number; reviews: number; lowRatings: number }[]
  complaints: { key: string; label: string; count: number }[]
  cancelReasons: { key: string; label: string; count: number }[]
  quotes: { kind: 'review' | 'complaint' | 'cancel'; text: string; rating: number | null; product: string | null; at: string | null }[]
}
export interface FeedbackSummary {
  summary: string
  themes: { theme: string; count: number; tone: 'positive' | 'negative' }[]
  actions: string[]
}
export interface AnalyticsData {
  days: number; from?: string; to?: string
  feedback?: FeedbackStats | null
  funnel: Funnel; previous: Funnel
  changes: { received: number | null; confirmationRate: number | null; deliveryRate: number | null; revenue: number | null }
  cities: GroupRow[]; products: GroupRow[]; carriers: CarrierRow[]
  cancelReasons: { reason: string; count: number; share: number | null; examples?: string[] }[]
  upsell: { offered: number; accepted: number; acceptanceRate: number | null }
  cash: { amount: number; parcels: number; stuck: number; stuckAmount: number }
  offers: { title: string; status: string; shown: number; accepted: number; extraRevenue: number; acceptanceRate: number | null }[]
}

export async function fetchAnalytics(query: string): Promise<AnalyticsData> {
  const res = await authFetch(`${API_BASE}/api/analytics?${query}`, { credentials: 'include' })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || data?.success === false) throw new Error(data?.error?.message || data?.error || `Erreur (${res.status})`)
  return data as AnalyticsData
}

/** AI summary of what customers wrote (null when there is too little to summarise). */
export async function fetchFeedbackSummary(query: string): Promise<FeedbackSummary | null> {
  const res = await authFetch(`${API_BASE}/api/analytics/feedback-summary?${query}`, { credentials: 'include' })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || data?.success === false) throw new Error(data?.error?.message || data?.error || `Erreur (${res.status})`)
  return data.summary ?? null
}
