export const API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
    : ''

export async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({} as any))
  return { res, data }
}

export const inputCls =
  'w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20'
export const primaryBtn =
  'flex items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-60'
