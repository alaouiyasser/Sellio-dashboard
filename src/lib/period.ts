// Period of a merchant page, in the merchant's own time (the browser): today, this week…
import { tx } from './i18n'

export type PresetKey = 'today' | 'yesterday' | 'week' | '7d' | 'month' | '30d' | '90d' | 'custom'
export interface Period { key: PresetKey; from: Date; to: Date }

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export function presetPeriod(key: PresetKey, now = new Date()): Period {
  const today = startOfDay(now), tomorrow = addDays(today, 1)
  switch (key) {
    case 'today': return { key, from: today, to: tomorrow }
    case 'yesterday': return { key, from: addDays(today, -1), to: today }
    case 'week': { const dow = (today.getDay() + 6) % 7; return { key, from: addDays(today, -dow), to: tomorrow } } // Monday
    case 'month': return { key, from: new Date(today.getFullYear(), today.getMonth(), 1), to: tomorrow }
    case '7d': return { key, from: addDays(today, -6), to: tomorrow }
    case '90d': return { key, from: addDays(today, -89), to: tomorrow }
    case '30d': default: return { key: key === 'custom' ? '30d' : key, from: addDays(today, -29), to: tomorrow }
  }
}

/** A custom range from two YYYY-MM-DD dates (end day included). */
export function customPeriod(fromDay: string, toDay: string): Period | null {
  const f = new Date(`${fromDay}T00:00:00`), t = new Date(`${toDay}T00:00:00`)
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime()) || t < f) return null
  return { key: 'custom', from: f, to: addDays(t, 1) }
}

export const dayInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const periodQuery = (p: Period) => `from=${encodeURIComponent(p.from.toISOString())}&to=${encodeURIComponent(p.to.toISOString())}`
export const spanDays = (p: Period) => Math.max(1, Math.round((p.to.getTime() - p.from.getTime()) / 86_400_000))

export const PRESETS: { key: PresetKey; label: () => string }[] = [
  { key: 'today', label: () => tx("Aujourd'hui") },
  { key: 'yesterday', label: () => tx('Hier') },
  { key: 'week', label: () => tx('Cette semaine') },
  { key: 'month', label: () => tx('Ce mois') },
  { key: '7d', label: () => tx('7 jours') },
  { key: '30d', label: () => tx('30 jours') },
  { key: '90d', label: () => tx('90 jours') },
  { key: 'custom', label: () => tx('Personnalisé') },
]

/** Orders of the tenant created in the period, all pages (Supabase returns 1 000 rows at most). */
export async function ordersInPeriod(supabase: any, tenantId: string, p: Period, cols = '*'): Promise<any[]> {
  const out: any[] = []
  for (let i = 0; i < 50_000; i += 1000) {
    const { data, error } = await supabase.from('orders').select(cols).eq('tenant_id', tenantId)
      .gte('created_at', p.from.toISOString()).lt('created_at', p.to.toISOString())
      .order('created_at', { ascending: false }).range(i, i + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}
