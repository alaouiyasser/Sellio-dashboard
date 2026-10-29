import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

async function req(path: string, init?: RequestInit) {
  const res = await authFetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error?.message || data?.error || `Request failed (${res.status})`)
  }
  return data
}

export interface IntegrationField {
  key: string
  label: string
  type: 'text' | 'password' | 'url' | 'select'
  required: boolean
  secret: boolean
  placeholder?: string
  help?: string
  options?: { value: string; label: string }[]
  default?: string
}

/** Initial form values: field defaults, then the saved non-secret config. Secrets stay blank. */
export function initialFormValues(item: IntegrationItem): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of item.fields) {
    const saved = f.secret ? undefined : item.connection?.config?.[f.key]
    out[f.key] = saved ?? f.default ?? (f.type === 'select' ? f.options?.[0]?.value ?? '' : '')
  }
  return out
}

/** Required fields still empty (a saved secret may stay blank when editing). */
export function missingFields(item: IntegrationItem, form: Record<string, string>): IntegrationField[] {
  return item.fields.filter((f) => f.required && !form[f.key]?.trim() && !(f.secret && item.connection))
}
export interface IntegrationConnection {
  status: 'connected' | 'error' | 'disabled'
  isDefault: boolean
  config: Record<string, string>
  lastTestAt: string | null
  lastTestOk: boolean | null
  lastError: string | null
  connectedAt: string
}
export interface SetupGuide {
  steps: { text: string; copy?: { label: string; value: string } }[]
  note?: string
}

export interface IntegrationItem {
  slug: string
  name: string
  category: 'ecommerce' | 'carrier' | 'lead_source'
  country: string
  logo: string
  status: 'available' | 'beta' | 'coming_soon'
  authType: string
  method: 'api' | 'manual' | 'sheets'
  fields: IntegrationField[]
  connection: IntegrationConnection | null
  /** The store approves Sellio itself: show a button instead of the form. */
  oneClick?: 'youcan-oauth' | 'wc-auth' | 'shopify-oauth'
  /** One extra step done in the store itself (e.g. add the Sellio COD form to Shopify). */
  action?: { label: string; url: string }
  /** Step-by-step setup with values to copy (webhook URLs…). */
  guide?: SetupGuide | null
}

export const fetchIntegrations = (tid: string) =>
  req(`/api/integrations/${tid}`).then((d) => d.integrations as IntegrationItem[])

export type StoreReturnTo = 'onboarding' | 'integrations'

/** YouCan approval page URL (the API also sets the state cookie for the callback). */
export const startYouCanConnect = (tid: string, returnTo: StoreReturnTo) =>
  req(`/api/integrations/${tid}/youcan/oauth/start`, { method: 'POST', body: JSON.stringify({ returnTo }) })
    .then((d) => d.url as string)

/** Shopify approval page for xxx.myshopify.com (the API sets the state cookie for the callback). */
export const startShopifyConnect = (tid: string, shop: string, returnTo: StoreReturnTo) =>
  req(`/api/integrations/${tid}/shopify/oauth/start`, { method: 'POST', body: JSON.stringify({ shop, returnTo }) })
    .then((d) => d.url as string)

/** The store's own WooCommerce "Approve Sellio" page. */
export const wooAuthorizeUrl = (tid: string, storeUrl: string, returnTo: StoreReturnTo) =>
  req(`/api/integrations/${tid}/woocommerce/authorize`, { method: 'POST', body: JSON.stringify({ storeUrl, returnTo }) })
    .then((d) => d.url as string)

/**
 * Back from YouCan (?store=youcan&status=connected|denied|error&message=…) or
 * WooCommerce (?store=woocommerce&success=1|0). Reads and clears the params.
 */
export function readStoreReturn(): { store: 'youcan' | 'woocommerce' | 'shopify'; ok: boolean; message?: string } | null {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  const store = q.get('store')
  if (store !== 'youcan' && store !== 'woocommerce' && store !== 'shopify') return null
  const ok = store === 'woocommerce' ? q.get('success') === '1' : q.get('status') === 'connected'
  const message = q.get('message') ?? (q.get('status') === 'denied' || q.get('success') === '0' ? 'Connexion annulée' : undefined)
  window.history.replaceState(null, '', window.location.pathname)
  return { store, ok, message: message ?? undefined }
}

export const connectIntegration = (tid: string, slug: string, credentials: Record<string, string>) =>
  req(`/api/integrations/${tid}/${slug}/connect`, { method: 'POST', body: JSON.stringify({ credentials }) })

export const testIntegration = (tid: string, slug: string) =>
  req(`/api/integrations/${tid}/${slug}/test`, { method: 'POST' })

export const updateIntegration = (tid: string, slug: string, patch: { enabled?: boolean; isDefault?: boolean }) =>
  req(`/api/integrations/${tid}/${slug}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const disconnectIntegration = (tid: string, slug: string) =>
  req(`/api/integrations/${tid}/${slug}`, { method: 'DELETE' })

// ─── Manual carrier bridge (Excel export / import) ───────────────────────────
export async function exportOrders(tid: string, slug: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/delivery/${tid}/export/${slug}`, { credentials: 'include' })
  if (!res.ok) {
    const e = await res.json().catch(() => ({} as any))
    throw new Error(e?.error?.message || `Export échoué (${res.status})`)
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') || ''
  const m = cd.match(/filename="?([^"]+)"?/)
  const filename = (m && m[1]) || `sellio_${slug}.xlsx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importTracking(
  tid: string, slug: string, file: File,
): Promise<{ total: number; updated: number; delivered: number; skipped: number }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await authFetch(`${API_BASE}/api/delivery/${tid}/import/${slug}`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error?.message || `Import échoué (${res.status})`)
  }
  return data as { total: number; updated: number; delivered: number; skipped: number }
}


// ─── WhatsApp instance management ──────────────────────────────────────────
const WA_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:3001'

export async function deleteWaInstance(tid: string, instanceKey: string): Promise<void> {
  const r = await authFetch(`${WA_BASE}/api/whatsapp/${tid}/instances/${encodeURIComponent(instanceKey)}`, {
    method: 'DELETE', credentials: 'include',
  })
  const d = await r.json()
  if (!d.ok) throw new Error(d.error || 'Erreur suppression')
}

export async function toggleWaInstance(tid: string, instanceKey: string, enabled: boolean): Promise<void> {
  const r = await authFetch(`${WA_BASE}/api/whatsapp/${tid}/instances/${encodeURIComponent(instanceKey)}/toggle`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ enabled }),
  })
  const d = await r.json()
  if (!d.ok) throw new Error(d.error || 'Erreur')
}

/**
 * Opened from Shopify (app install link / "Open app"): ?shop=xxx.myshopify.com&hmac=…
 * Returns the shop so the page can start the approval, and clears the params.
 */
export function readShopifyLaunch(): string | null {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  const shop = q.get('shop')
  if (!shop || !q.get('hmac') || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return null
  window.history.replaceState(null, '', window.location.pathname)
  return shop
}
