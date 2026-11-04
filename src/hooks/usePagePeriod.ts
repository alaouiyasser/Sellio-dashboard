'use client'
// The period a page shows, remembered per page: come back to Commandes and it is still on
// "Personnalisé 1 → 10 nov" (or "Aujourd'hui", recomputed for today). Default: 30 days.
import { useEffect, useState } from 'react'
import { presetPeriod, type Period, type PresetKey } from '@/lib/period'

const KEY = (page: string) => `sellio-period:${page}`

function restore(page: string): Period | null {
  try {
    const raw = localStorage.getItem(KEY(page))
    if (!raw) return null
    const v = JSON.parse(raw) as { key: PresetKey; from?: string; to?: string }
    if (v.key === 'custom') {
      const from = new Date(String(v.from)), to = new Date(String(v.to))
      return Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from ? null : { key: 'custom', from, to }
    }
    return presetPeriod(v.key)
  } catch { return null }
}

/** [period, setPeriod, ready]: fetch only once `ready` (the saved choice is read after mount). */
export function usePagePeriod(page: string, fallback: PresetKey = '30d') {
  const [period, setPeriodState] = useState<Period>(() => presetPeriod(fallback))
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const saved = restore(page)
    if (saved) setPeriodState(saved)
    setReady(true)
  }, [page])
  const setPeriod = (p: Period) => {
    setPeriodState(p)
    try { localStorage.setItem(KEY(page), JSON.stringify({ key: p.key, from: p.from.toISOString(), to: p.to.toISOString() })) } catch { /* private mode */ }
  }
  return [period, setPeriod, ready] as const
}
