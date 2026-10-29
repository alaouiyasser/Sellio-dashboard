import { tx } from './i18n'
import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

export type OfferStatus = 'draft' | 'active' | 'paused' | 'ended'
export interface Offer {
  id: string; title: string; product_name: string | null; store?: string | null; extra_qty: number
  pricing: 'unit_price' | 'percent'; value: number; message: string | null
  status: OfferStatus; starts_at: string | null; ends_at: string | null; created_by: 'merchant' | 'coach'
  shown: number; accepted: number; extra_revenue: number; created_at: string
}
export interface OfferForm {
  title: string; productName: string; store: string; extraQty: number; pricing: 'unit_price' | 'percent'; value: string
  message: string; startsAt: string; endsAt: string
}

async function call(path: string, init?: RequestInit) {
  const res = await authFetch(`${API_BASE}/api${path}`, {
    credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init,
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || data?.success === false) throw new Error(data?.error?.message || data?.error || `Erreur (${res.status})`)
  return data
}

export const offersApi = {
  list: (): Promise<{ offers: Offer[] }> => call('/offers'),
  create: (f: OfferForm, status: 'draft' | 'active') => call('/offers', { method: 'POST', body: JSON.stringify({ ...f, value: f.value.replace(',', '.'), status }) }),
  setStatus: (id: string, status: OfferStatus): Promise<{ offer: Offer }> => call(`/offers/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id: string) => call(`/offers/${id}`, { method: 'DELETE' }),
}

/** "1 unité à 150 DH" / "2 unités à -30 %" */
export function offerDeal(o: Pick<Offer, 'extra_qty' | 'pricing' | 'value'>) {
  const u = o.extra_qty === 1 ? tx('1 unité en plus') : tx('{0} unités en plus', [o.extra_qty])
  return o.pricing === 'unit_price' ? tx('{0} à {1} DH l’unité', [u, Math.round(o.value)]) : tx('{0} à −{1} %', [u, o.value])
}
export const STATUS_LABEL: Record<OfferStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'var(--text-muted)' },
  active: { label: 'Active', color: 'var(--success)' },
  paused: { label: 'En pause', color: 'var(--warning)' },
  ended: { label: 'Terminée', color: 'var(--text-muted)' },
}

export const STORE_LABEL: Record<string, string> = { youcan: 'YouCan', shopify: 'Shopify', woocommerce: 'WooCommerce' }
