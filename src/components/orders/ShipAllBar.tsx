'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Send, AlertTriangle, Loader2, Settings2 } from 'lucide-react'
import {
  fetchShipPending, fetchShipSettings, fetchShipCarriers, shipAll, ShipApiError, carrierName,
  type ShipSettings, type ShipCarrier,
} from '@/lib/shipping-api'
import { tx } from '@/lib/i18n'

const modeLabel = (s: ShipSettings | null) =>
  !s ? '' : s.mode === 'auto' ? tx("Envoi automatique")
    : s.mode === 'manual' ? tx("Envoi manuel")
    : tx("Envoi programmé à {0}", [s.scheduleTime ?? '--:--'])

/**
 * Top of the orders page: current shipping mode (link to Livraison), the « Envoyer tout (N) » button
 * and the « Erreur envoi » count (a link that filters the list). Errored orders are never sent in bulk.
 */
export default function ShipAllBar({ tenantId, refreshKey, errorFilterOn, onToggleErrorFilter, onSent }: {
  tenantId: string
  /** Changes when the orders reload (realtime), so the counters follow. */
  refreshKey: number
  errorFilterOn: boolean
  onToggleErrorFilter: () => void
  onSent: () => void | Promise<void>
}) {
  const [settings, setSettings] = useState<ShipSettings | null>(null)
  const [pending, setPending] = useState<{ ready: number; errored: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState<ShipCarrier[] | null>(null)
  const [provider, setProvider] = useState('')

  const loadPending = useCallback(() => fetchShipPending(tenantId).then(setPending).catch(() => {}), [tenantId])
  useEffect(() => { fetchShipSettings(tenantId).then(setSettings).catch(() => {}) }, [tenantId])
  useEffect(() => { loadPending() }, [loadPending, refreshKey])

  async function send(chosen?: string) {
    if (busy || !pending?.ready) return
    setBusy(true)
    try {
      const r = await shipAll(tenantId, chosen)
      setPick(null)
      toast.success(r.queued === 1 ? tx("1 commande mise en file d'envoi") : tx("{0} commandes mises en file d'envoi", [r.queued]))
    } catch (e) {
      if (e instanceof ShipApiError && e.code === 'CHOOSE_CARRIER') {
        // Several carriers, none by default: ask which one, then retry with { provider }.
        const list = await fetchShipCarriers(tenantId).catch(() => [] as ShipCarrier[])
        setPick(list); setProvider(list[0]?.provider ?? '')
      } else {
        toast.error(e instanceof Error && e.message ? e.message : tx("Échec de l'envoi"))
      }
    } finally {
      setBusy(false)
      await Promise.all([loadPending(), onSent()])
    }
  }

  if (!settings && !pending) return null
  const ready = pending?.ready ?? 0
  const errored = pending?.errored ?? 0

  return (
    <div style={{ marginBottom: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, fontSize: 13 }}>
          <Link href="/livraison" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none' }}>
            <Settings2 size={16} strokeWidth={1.8} />{modeLabel(settings)}
          </Link>
          <span style={{ color: 'var(--text)' }}>
            <b style={{ fontSize: 16 }}>{ready}</b>{' '}{ready === 1 ? tx("commande confirmée non envoyée") : tx("commandes confirmées non envoyées")}
          </span>
          {errored > 0 && (
            <button onClick={onToggleErrorFilter} aria-pressed={errorFilterOn} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--destructive)', fontSize: 13, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3,
            }}>
              <AlertTriangle size={16} strokeWidth={1.8} />
              {errorFilterOn ? tx("Afficher toutes les commandes") : errored === 1 ? tx("1 en erreur d'envoi") : tx("{0} en erreur d'envoi", [errored])}
            </button>
          )}
        </div>
        <button onClick={() => send()} disabled={busy || ready === 0} style={{
          height: 34, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: 'var(--brand-foreground)', fontSize: 13, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: busy ? 'wait' : 'pointer', opacity: busy || ready === 0 ? 0.5 : 1, transition: 'opacity 150ms ease',
        }}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={1.8} />}
          {tx("Envoyer tout ({0})", [ready])}
        </button>
      </div>

      {pick && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{tx("Plusieurs transporteurs connectés : choisissez celui de cet envoi.")}</span>
          {pick.length === 0 ? (
            <Link href="/livraison" style={{ color: 'var(--brand)', fontSize: 13, fontWeight: 600 }}>{tx("Connecter un transporteur")}</Link>
          ) : (
            <>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} disabled={busy}
                style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13 }}>
                {pick.map((c) => <option key={c.provider} value={c.provider}>{carrierName(c.provider)}</option>)}
              </select>
              <button onClick={() => send(provider)} disabled={busy || !provider} style={{
                height: 34, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: 'var(--brand-foreground)', fontSize: 13, fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.5 : 1,
              }}>{tx("Envoyer avec {0}", [carrierName(provider)])}</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
