'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PencilLine, Loader2, Check, X } from 'lucide-react'
import { decideOrderChange, SOURCE_LABEL } from '@/lib/order-change-api'
import { tx } from '@/lib/i18n'

/**
 * A customer asked to change an order Sellio can't change alone: the merchant applies it
 * (after updating their own store) or refuses. Either way the customer then receives the
 * order on WhatsApp and confirms it — nothing is shipped before that.
 */
interface Item { productName?: string; title?: string; name?: string; variantName?: string; variant?: string; quantity?: number; unitPrice?: number; price?: number }
interface Pending { field?: string; text?: string; line?: number; quantity?: number; messages?: string[] }

const FIELD: Record<string, string> = { variant: 'Couleur / taille', quantity: 'Quantité', product: 'Produit' }
const nameOf = (i?: Item) => String(i?.productName ?? i?.title ?? i?.name ?? '')

export default function ChangeRequestPanel({ tenantId, order, items, onDecided }: {
  tenantId: string
  order: { id: string; source?: string | null; total_price?: number | string | null; pending_modification?: Pending | null }
  items: Item[]
  onDecided: () => void | Promise<void>
}) {
  const pending: Pending = order.pending_modification ?? {}
  const initialLine = typeof pending.line === 'number' && items[pending.line] ? pending.line : items.length === 1 ? 0 : null

  const formFor = (line: number | null) => {
    const item = line === null ? undefined : items[line]
    const current = Number(item?.quantity) || 1
    const quantity = line === initialLine && pending.quantity ? pending.quantity : current
    return {
      productName: nameOf(item),
      variantName: String(item?.variantName ?? item?.variant ?? ''),
      quantity: String(quantity),
      unitPrice: String(item?.unitPrice ?? item?.price ?? ''),
      // A new quantity means a new total: the merchant types it.
      total: quantity === current ? String(order.total_price ?? '') : '',
    }
  }
  const [line, setLine] = useState<number | null>(initialLine)
  const [form, setForm] = useState(() => formFor(initialLine))
  const [busy, setBusy] = useState<'apply' | 'reject' | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [k]: value, ...(k === 'quantity' && value !== f.quantity ? { total: '' } : {}) }))
  }

  const isStore = order.source === 'sellio_store'
  const platform = SOURCE_LABEL[order.source ?? ''] ?? tx('votre boutique')
  const ready = line !== null && Number(form.quantity) >= 1 && Number(form.total) > 0 && form.productName.trim() !== ''

  async function decide(action: 'apply' | 'reject') {
    if (busy) return
    const question = action === 'apply'
      ? tx('Appliquer la modification ? Le client recevra la commande à jour pour la confirmer.')
      : tx('Refuser la modification ? Le client recevra sa commande inchangée pour la confirmer.')
    if (!confirm(question)) return
    setBusy(action)
    try {
      const r = await decideOrderChange(tenantId, order.id, action === 'reject' ? { action } : {
        action, line: line!, productName: form.productName.trim(), variantName: form.variantName.trim(),
        quantity: Number(form.quantity), total: Number(form.total),
        ...(form.unitPrice.trim() !== '' && { unitPrice: Number(form.unitPrice) }),
      })
      if (r.messageQueued) toast.success(tx('Décision enregistrée : le client reçoit sa commande à confirmer.'))
      else toast.warning(tx("Décision enregistrée, mais le message au client n'a pas pu partir."))
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : tx('Erreur réseau'))
    } finally {
      setBusy(null)
      await onDecided()
    }
  }

  const input: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }
  const label = (text: string, field: React.ReactNode) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>{text}{field}</label>
  )

  return (
    <div style={{ background: 'var(--card)', border: '1px solid color-mix(in srgb, var(--warning) 45%, transparent)', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700, color: 'var(--warning)', marginBottom: 12 }}>
        <PencilLine size={16} strokeWidth={2.2} /> {tx('Modification demandée par le client')}
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{tx(FIELD[pending.field ?? ''] ?? 'Modification')}</div>
        <div dir="auto" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{pending.text ?? '—'}</div>
        {(pending.messages ?? []).map((m, i) => <div key={i} dir="auto" style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 6 }}>+ {m}</div>)}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
        {isStore
          ? tx("Vérifiez le stock dans « Ma boutique ». Si vous changez le produit ou la variante, le stock de cet article n'est pas décompté automatiquement : ajustez-le.")
          : tx("Mettez d'abord la commande à jour sur {0}, puis reportez ici les mêmes informations.", [platform])}
      </div>

      {items.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          {label(tx('Article à modifier'), (
            <select value={line ?? ''} disabled={busy !== null} style={input}
              onChange={(e) => { const n = e.target.value === '' ? null : Number(e.target.value); setLine(n); setForm(formFor(n)) }}>
              <option value="">{tx('Choisir…')}</option>
              {items.map((it, i) => <option key={i} value={i}>{nameOf(it)} {it.variantName ?? it.variant ?? ''} ×{it.quantity ?? 1}</option>)}
            </select>
          ))}
        </div>
      )}

      {line !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          {label(tx('Produit'), <input value={form.productName} onChange={set('productName')} style={input} />)}
          {label(tx('Couleur / taille'), <input value={form.variantName} onChange={set('variantName')} style={input} />)}
          {label(tx('Quantité'), <input type="number" min={1} max={100} value={form.quantity} onChange={set('quantity')} style={input} />)}
          {label(tx('Prix unitaire (DH)'), <input type="number" min={0} step="0.01" value={form.unitPrice} onChange={set('unitPrice')} style={input} />)}
          {label(tx('Total de la commande (DH)'), <input type="number" min={0} step="0.01" value={form.total} onChange={set('total')} style={input} />)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => decide('apply')} disabled={busy !== null || !ready}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 10, border: 'none', cursor: busy || !ready ? 'not-allowed' : 'pointer', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 700, opacity: busy || !ready ? 0.6 : 1 }}>
          {busy === 'apply' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.4} />} {tx('Appliquer')}
        </button>
        <button onClick={() => decide('reject')} disabled={busy !== null}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)', cursor: busy ? 'wait' : 'pointer', background: 'var(--card)', color: 'var(--destructive)', fontSize: 13, fontWeight: 700 }}>
          {busy === 'reject' ? <Loader2 size={15} className="animate-spin" /> : <X size={15} strokeWidth={2.4} />} {tx('Refuser')}
        </button>
      </div>
    </div>
  )
}
