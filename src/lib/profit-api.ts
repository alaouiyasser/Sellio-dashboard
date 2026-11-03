import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

export interface ProductProfit {
  name: string; orders: number; confirmed: number; cancelled: number; delivered: number; returned: number
  units: number; avgPrice: number | null
  revenue: number; goods: number; shipping: number; returns: number; delivery: number; fees: number; ads: number
  profitBeforeAds: number | null; profit: number | null; profitPerDelivered: number | null; margin: number | null
  confirmationRate: number | null; deliveryRate: number | null; returnRate: number | null
  costPerOrder: number | null; costPerDelivered: number | null; breakEvenCpa: number | null; roas: number | null; missingCost: boolean
}
export interface AdEntry { id: number; spent_on: string; amount_mad: number; product_name: string | null; channel: string | null }
export interface ProfitData {
  days: number
  report: {
    products: ProductProfit[]
    totals: {
      orders: number; confirmed: number; cancelled: number; delivered: number; returned: number; units: number
      revenue: number; goods: number; shipping: number; returns: number; delivery: number; fees: number; ads: number
      profitBeforeAds: number | null; profit: number | null; profitPerDelivered: number | null; margin: number | null
      deliveryRate: number | null; returnRate: number | null; breakEvenCpa: number | null; roas: number | null
    }
    missing: { productCosts: string[]; shippingCost: boolean; returnCost: boolean }
  }
  costs: Record<string, number>
  settings: { shippingCost: number | null; returnCost: number | null }
  ads: AdEntry[]
  products: string[]
}

async function call(path: string, init?: RequestInit) {
  const res = await authFetch(`${API_BASE}/api/profit${path}`, {
    credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init,
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || data?.success === false) throw new Error(data?.error?.message || data?.error || `Erreur (${res.status})`)
  return data
}

export const profitApi = {
  get: (query: string): Promise<ProfitData> => call(`?${query}`),
  saveCosts: (body: { products: { name: string; unitCost: string }[]; shippingCost: string; returnCost: string }) =>
    call('/costs', { method: 'PUT', body: JSON.stringify(body) }),
  addAd: (body: { spentOn: string; amount: string; product: string; channel: string }) =>
    call('/ads', { method: 'POST', body: JSON.stringify(body) }),
  deleteAd: (id: number) => call(`/ads/${id}`, { method: 'DELETE' }),
}
