// Period of a merchant page, in Casablanca time (not the browser's): today, this week…
import { tx } from './i18n'
import { maParts, maMidnight, maDay, maDayStart } from './tz'

export type PresetKey = 'today' | 'yesterday' | 'week' | '7d' | 'month' | '30d' | '90d' | 'custom'
export interface Period { key: PresetKey; from: Date; to: Date }

const startOfDay = (d: Date) => { const p = maParts(d); return maMidnight(p.y, p.m, p.d) }
const addDays = (d: Date, n: number) => { const p = maParts(d); return maMidnight(p.y, p.m, p.d + n) }

export function presetPeriod(key: PresetKey, now = new Date()): Period {
  const today = startOfDay(now), tomorrow = addDays(today, 1)
  switch (key) {
    case 'today': return { key, from: today, to: tomorrow }
    case 'yesterday': return { key, from: addDays(today, -1), to: today }
    case 'week': { const dow = (maParts(today).dow + 6) % 7; return { key, from: addDays(today, -dow), to: tomorrow } } // Monday
    case 'month': { const p = maParts(today); return { key, from: maMidnight(p.y, p.m, 1), to: tomorrow } }
    case '7d': return { key, from: addDays(today, -6), to: tomorrow }
    case '90d': return { key, from: addDays(today, -89), to: tomorrow }
    case '30d': default: return { key: key === 'custom' ? '30d' : key, from: addDays(today, -29), to: tomorrow }
  }
}

/** A custom range from two YYYY-MM-DD dates (end day included). */
export function customPeriod(fromDay: string, toDay: string): Period | null {
  const f = maDayStart(fromDay), t = maDayStart(toDay)
  if (!f || !t || t < f) return null
  return { key: 'custom', from: f, to: addDays(t, 1) }
}

/** "YYYY-MM-DD" of an instant, in Casablanca (value of an <input type="date">). */
export const dayInput = (d: Date) => maDay(d)
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
