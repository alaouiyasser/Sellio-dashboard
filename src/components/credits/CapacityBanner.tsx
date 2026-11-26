'use client'
// Plan Démarrage: what can still be delivered (GET /api/credits/balance), above every dashboard page.
// Renders nothing for other plans, without a state, or when the API cannot be reached.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock, PauseCircle } from 'lucide-react'
import { capacityBanner, creditsApi, type CapacityStateName, type CreditsBalance } from '@/lib/credits-api'
import { tx } from '@/lib/i18n'

const LOOK: Record<CapacityStateName, { icon: typeof Clock; color: string; href: string }> = {
  not_activated: { icon: Clock, color: 'var(--warning)', href: '/store' },
  ok: { icon: CheckCircle2, color: 'var(--success)', href: '/credits' },
  low: { icon: AlertTriangle, color: 'var(--warning)', href: '/credits' },
  paused: { icon: PauseCircle, color: 'var(--destructive)', href: '/credits' },
}

export default function CapacityBanner() {
  const pathname = usePathname()
  const [data, setData] = useState<CreditsBalance | null>(null)

  // Refreshed on each page, like the credits pill of the top bar.
  useEffect(() => {
    let alive = true
    creditsApi.balance().then((d) => { if (alive) setData(d) }).catch(() => { if (alive) setData(null) })
    return () => { alive = false }
  }, [pathname])

  const view = capacityBanner(data)
  if (!view) return null
  const { icon: Icon, color, href } = LOOK[view.state]
  const message = {
    not_activated: tx('Votre compte n’est pas encore activé.'),
    ok: tx('Capacité disponible : {0} livraison(s)', [view.available]),
    low: tx('Capacité presque épuisée : {0} livraison(s) disponible(s)', [view.available]),
    paused: tx('Capacité épuisée : les nouvelles commandes sont mises en attente jusqu’à la recharge.'),
  }[view.state]
  const action = view.state === 'not_activated' ? tx('Activer mon compte') : view.state === 'ok' ? tx('Voir mes crédits') : tx('Recharger')

  return (
    <div role="status" style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 24px', fontSize: 13,
      color: 'var(--text)', background: `color-mix(in srgb, ${color} 10%, var(--card))`,
      borderBottom: `1px solid color-mix(in srgb, ${color} 35%, var(--border))`,
    }}>
      <Icon size={16} strokeWidth={2} color={color} style={{ flexShrink: 0 }} aria-hidden />
      <span style={{ flex: 1, minWidth: 180, fontWeight: 600 }}>{message}</span>
      {pathname !== href && <Link href={href} style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>{action}</Link>}
    </div>
  )
}
