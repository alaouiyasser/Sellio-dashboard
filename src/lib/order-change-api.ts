// The merchant's decision on a change asked by a customer (orders « awaiting_merchant_change »).
import { authFetch } from '@/lib/api-fetch'
import { API_BASE } from '@/lib/auth-client'

export const AWAITING_MERCHANT_CHANGE = 'awaiting_merchant_change'

/** Where an order comes from, as shown to the merchant. */
export const SOURCE_LABEL: Record<string, string> = {
  shopify: 'Shopify', youcan: 'YouCan', woocommerce: 'WooCommerce', sellio_store: 'Ma boutique',
}

export type ChangeDecision =
  | { action: 'reject' }
  | { action: 'apply'; line: number; productName: string; variantName: string; quantity: number; unitPrice?: number; total: number }

export async function decideOrderChange(tenantId: string, orderId: string, decision: ChangeDecision): Promise<{ messageQueued: boolean }> {
  const res = await authFetch(`${API_BASE}/api/orders/${tenantId}/${orderId}/change-request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(decision),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? `Erreur ${res.status}`)
  return json.data
}
