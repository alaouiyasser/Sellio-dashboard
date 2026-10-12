'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Truck, AlertTriangle, Loader2 } from 'lucide-react'
import { fetchShipCarriers, shipOrder, shipFailed, carrierName, SHIP_ERROR_PREFIX, type ShipCarrier } from '@/lib/shipping-api'

/**
 * "Envoyer au transporteur" — shown on a confirmed order that is not at a carrier yet.
 * The API guarantees one parcel per order (lock + already-shipped check), so the
 * button can't create duplicates even on double click.
 */
interface ShipOrder {
  id: string
  status?: string
  delivery_status?: string | null
  delivery_tracking_code?: string | null
}

export default function ShipPanel({ tenantId, order, onShipped }: {
  tenantId: string
  order: ShipOrder
  onShipped: () => void | Promise<void>
}) {
  const [carriers, setCarriers] = useState<ShipCarrier[] | null>(null)
  const [provider, setProvider] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchShipCarriers(tenantId)
      .then((list) => {
        setCarriers(list)
        setProvider((list.find((c) => c.isDefault) ?? list[0])?.provider ?? '')
      })
      .catch(() => setCarriers([]))
  }, [tenantId])

  const failed = shipFailed(order)
  const failure = failed ? String(order.delivery_status).slice(SHIP_ERROR_PREFIX.length).trim() : ''

  async function send() {
    if (!provider || busy) return
    if (!confirm(`Créer le colis chez ${carrierName(provider)} pour cette commande ?`)) return
    setBusy(true)
    try {
      const r = await shipOrder(tenantId, order.id, provider)
      toast.success(`Colis créé chez ${carrierName(r.provider)} — suivi ${r.trackingCode}`)
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Échec de l'envoi")
    } finally {
      setBusy(false)
      await onShipped()          // refresh: shows the tracking number or the recorded error
    }
  }

  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
        <Truck size={14} strokeWidth={2.2} color="var(--brand)" /> Transporteur
      </div>

      {failed && (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'color-mix(in srgb, var(--destructive) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--destructive)', marginBottom: 4 }}>
            <AlertTriangle size={14} strokeWidth={2.4} /> Pas encore chez le transporteur
          </div>
          <div style={{ fontSize: 12, color: 'var(--destructive)', lineHeight: 1.45 }}>{failure}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>Corrigez l&apos;information puis renvoyez.</div>
        </div>
      )}

      {carriers === null ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : carriers.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Aucun transporteur avec API connecté.{' '}
          <a href="/integrations" style={{ color: 'var(--brand)', fontWeight: 600 }}>Connecter Ozon ou Ameex</a>
          {' '}— ou utilisez l&apos;export Excel.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {carriers.length > 1 && (
            <select value={provider} onChange={(e) => setProvider(e.target.value)} disabled={busy}
              style={{ padding: '9px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
              {carriers.map((c) => (
                <option key={c.provider} value={c.provider}>{carrierName(c.provider)}{c.isDefault ? ' (par défaut)' : ''}</option>
              ))}
            </select>
          )}
          <button onClick={send} disabled={busy || !provider}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, border: 'none', cursor: busy ? 'wait' : 'pointer', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} strokeWidth={2.4} />}
            {busy ? 'Envoi…' : failed ? `Renvoyer à ${carrierName(provider)}` : `Envoyer à ${carrierName(provider)}`}
          </button>
        </div>
      )}
    </div>
  )
}
