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
  type: 'text' | 'password' | 'url'
  required: boolean
  secret: boolean
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
}

export const fetchIntegrations = (tid: string) =>
  req(`/api/integrations/${tid}`).then((d) => d.integrations as IntegrationItem[])

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
