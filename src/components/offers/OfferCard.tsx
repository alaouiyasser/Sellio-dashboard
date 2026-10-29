'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Trash2, Bot } from 'lucide-react'
import { offersApi, offerDeal, STATUS_LABEL, type Offer, type OfferStatus, STORE_LABEL } from '@/lib/offers-api'

import { tx, intlLocale } from '@/lib/i18n'
const small: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
const dateFr = (d: string | null) => (d ? new Date(d).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' }) : null)

/** One offer: what the customer gets, results, and the merchant's controls. */
export function OfferCard({ offer, onChange, compact = false }: { offer: Offer; onChange: (o: Offer | null) => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false)
  const st = STATUS_LABEL[offer.status]

  async function set(status: OfferStatus) {
    setBusy(true)
    try {
      const { offer: o } = await offersApi.setStatus(offer.id, status)
      onChange(o)
      toast.success(status === 'active' ? 'Offre activée : elle sera proposée à vos clients' : status === 'paused' ? 'Offre mise en pause' : 'Offre mise à jour')
    } catch (e) { toast.error((e as Error).message) }
    finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true)
    try { await offersApi.remove(offer.id); onChange(null); toast.success(tx("Offre supprimée")) }
    catch (e) { toast.error((e as Error).message) }
    finally { setBusy(false) }
  }

  const period = [dateFr(offer.starts_at) && `du ${dateFr(offer.starts_at)}`, dateFr(offer.ends_at) && `jusqu’au ${dateFr(offer.ends_at)}`].filter(Boolean).join(' ')
  const rate = offer.shown ? Math.round((offer.accepted / offer.shown) * 100) : null

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{offer.title}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {offer.product_name ?? tx("Tous les produits")}{offer.store ? ` (${STORE_LABEL[offer.store] ?? offer.store})` : ''} · {offerDeal(offer)}
          </div>
          {period && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{period}</div>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {offer.created_by === 'coach' && <Bot size={12} aria-label={tx("Proposée par le coach")} />}{tx(st.label)}
        </span>
      </div>
      {offer.message && <div style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }} dir="auto">« {offer.message} »</div>}
      {!compact && offer.shown > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {tx("Proposée")} {offer.shown} {tx("fois · acceptée")} {offer.accepted} {tx("fois")}{rate !== null ? ` (${rate} %)` : ''} · +{Math.round(offer.extra_revenue).toLocaleString('fr-MA')} {tx("DH")}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {offer.status !== 'active' && offer.status !== 'ended' && (
          <button disabled={busy} onClick={() => set('active')} style={{ ...small, border: 'none', background: 'var(--brand)', color: '#fff' }}>
            {busy && <Loader2 className="h-3 w-3 animate-spin" />} {tx("Activer")}
          </button>
        )}
        {offer.status === 'active' && (
          <button disabled={busy} onClick={() => set('paused')} style={{ ...small, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }}>{tx("Mettre en pause")}</button>
        )}
        {!compact && (
          <button disabled={busy} onClick={remove} aria-label={tx("Supprimer l’offre")} style={{ ...small, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
