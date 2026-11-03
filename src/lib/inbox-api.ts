import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

export interface Conversation {
  key: string; phone: string; name: string | null
  lastMessage: string | null; lastType: string | null; lastDirection: string | null; lastAt: string
  messages: number; customerMessages: number; waitingReply: boolean
  order: { id: string; ref: string; status: string; total: number | null } | null
}
export interface InboxMessage { id: number | string; direction: 'inbound' | 'outbound' | 'event' | null; message_type: string | null; content: string | null; created_at: string; order_id: string | null }
export interface InboxOrder { id: string; external_id: string | null; customer_phone: string | null; customer_name: string | null; status: string; total_price: number | null; created_at: string; items?: unknown }

async function get(path: string) {
  const res = await authFetch(`${API_BASE}/api/inbox${path}`, { credentials: 'include' })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || data?.success === false) throw new Error(data?.error?.message || data?.error || `Erreur (${res.status})`)
  return data
}

export const inboxApi = {
  list: (q = ''): Promise<{ conversations: Conversation[] }> => get(q ? `?q=${encodeURIComponent(q)}` : ''),
  thread: (phone: string): Promise<{ messages: InboxMessage[]; orders: InboxOrder[] }> => get(`/${encodeURIComponent(phone.replace(/\D/g, ''))}`),
}
