// Founder console → Sellio API (/api/admin/*). Founder account only: anyone else gets 403.
import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

export class AdminError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(`${API_BASE}/api/admin${path}`, {
    ...init,
    // Fastify rejects an empty body sent as JSON → only set the type when there is a body.
    headers: init?.body ? { 'Content-Type': 'application/json' } : {},
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new AdminError(res.status, body?.error || body?.message || `Erreur ${res.status}`)
  return body as T
}

// ─── types (mirror apps/api/src/modules/admin) ───────────────────────────────
export interface Funnel {
  received: number; confirmed: number; cancelled: number; shipped: number; delivered: number; returned: number; pending: number
  confirmationRate: number | null; deliveryRate: number | null; successRate: number | null; gmv: number
}
export interface MessageCosts { total: number; paid: number; free: number; costMad: number; byPurpose: Record<string, { count: number; costMad: number }> }
export interface Pnl {
  revenue: number; cashIn: number
  costs: { whatsapp: number; ads: number; infra: number; tools: number; other: number; total: number }
  profit: number; marginPct: number | null
  perDelivered: { revenue: number; whatsapp: number; allCosts: number; profit: number } | null
  cac: number | null
}
export interface Overview {
  period: { days: number; from: string; to: string }
  usdMad: number; waProvider: string
  merchants: { total: number; newInPeriod: number; active: number; paying: number; newPaying: number }
  funnel: Funnel
  reminder: { reminded: number; confirmedAfter: number; rate: number | null }
  messages: MessageCosts & { perOrder: number | null }
  pnl: Pnl
  series: { day: string; received: number; delivered: number; revenue: number; msgCost: number }[]
}
export interface Step { key: string; label: string; done: boolean }
export interface MerchantLine {
  id: string; name: string; createdAt: string | null; active: boolean; balance: number
  steps: Step[]; progress: number; funnel: Funnel
  revenue: number; cashIn: number; msgCostMad: number; messages: number; margin: number
  msgPerOrder: number | null; costPerDelivered: number | null; lastOrderAt: string | null; flags: string[]
  profile?: { ownerName: string | null; city: string | null; niche: string | null; source: string | null; volume: string | null }
}
export interface MerchantDetail {
  period: { days: number; from: string; to: string }
  merchant: MerchantLine; ownerPhone: string | null; messages: MessageCosts
  recentOrders: { id: string; external_id: string | null; status: string; created_at: string; total_price: number | null; delivery_provider: string | null; delivery_tracking_code: string | null; delivery_status: string | null }[]
  integrations: { provider: string; category: string; status: string; last_error: string | null; last_test_at: string | null }[]
  creditTx: { type: string | null; reason: string | null; amount: number; balance_after: number | null; created_at: string; order_id: string | null }[]
}
export type ExpenseCategory = 'ads' | 'infra' | 'tools' | 'other'
export interface Expense { id: number; spent_on: string; category: ExpenseCategory; label: string; amount_mad: number; created_at?: string }

export const adminApi = {
  me: () => call<{ founder: boolean }>('/me'),
  overview: (days: number) => call<Overview>(`/overview?days=${days}`),
  merchants: (days: number) => call<{ period: Overview['period']; merchants: MerchantLine[] }>(`/merchants?days=${days}`),
  merchant: (id: string, days: number) => call<MerchantDetail>(`/merchants/${encodeURIComponent(id)}?days=${days}`),
  grantCredits: (id: string, amount: number) =>
    call<{ ok: true; newBalance: number }>(`/merchants/${encodeURIComponent(id)}/credits`, { method: 'POST', body: JSON.stringify({ amount }) }),
  expenses: (days = 365) => call<{ expenses: Expense[] }>(`/expenses?days=${days}`),
  addExpense: (e: Omit<Expense, 'id' | 'created_at'>) => call<{ expense: Expense }>('/expenses', { method: 'POST', body: JSON.stringify(e) }),
  deleteExpense: (id: number) => call<{ ok: true }>(`/expenses/${id}`, { method: 'DELETE' }),
}
