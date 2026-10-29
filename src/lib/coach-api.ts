import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

/** Report text in the dashboard language (translated once server-side, then cached). */
export async function fetchCoachReport(id: string, lang: string): Promise<any | null> {
  try {
    const res = await authFetch(`${API_BASE}/api/ai-coach/reports/${id}?lang=${lang}`, { credentials: 'include' })
    const data = await res.json().catch(() => null)
    return res.ok && data?.success ? data.report : null
  } catch { return null }
}
