'use client'
// Cart (boutique / both) and the COD form shared by the cart and the landing pages.
// The cart lives in localStorage, one per store. Prices here are only shown to the buyer: the API
// prices the order again from the merchant's variants (priceStoreOrder) and answers the real total.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CircleCheck, Loader2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { API_BASE } from '@/lib/auth-client'
import {
  ORDER_LIMITS, checkOrder, fmtDh, lineTotal,
  type BundleOffer, type OrderForm as OrderFormValues, type OrderLine,
} from '@/lib/storefront'
import { Img, btnStyle, ghostBtnStyle, type Look } from './kit'

export interface CartLine {
  variantId: string; productSlug: string; name: string; variantLabel: string; unitPrice: number
  image: string | null; quantity: number; offers: BundleOffer[]
}

interface CartCtx {
  lines: CartLine[]; count: number; total: number
  add: (line: CartLine) => boolean; setQty: (variantId: string, q: number) => void; remove: (variantId: string) => void; clear: () => void
  open: boolean; setOpen: (v: boolean) => void
}
const Ctx = createContext<CartCtx | null>(null)
export const useCart = () => useContext(Ctx)

const keyOf = (slug: string) => `sellio-cart:${slug}`
const CHANGED = 'sellio-cart-change'
const isLine = (x: unknown): x is CartLine => {
  const o = x as Partial<CartLine> | null
  return !!o && typeof o.variantId === 'string' && typeof o.name === 'string' && Number.isFinite(Number(o.unitPrice)) && Number.isFinite(Number(o.quantity))
}
function parseCart(raw: string): CartLine[] {
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? v.filter(isLine).slice(0, ORDER_LIMITS.lines) : []
  } catch { return [] }
}
// The cart is read from localStorage (other tabs included) through useSyncExternalStore: the
// server and the first render see an empty cart, then the saved one.
const subscribe = (cb: () => void) => {
  window.addEventListener('storage', cb)
  window.addEventListener(CHANGED, cb)
  return () => { window.removeEventListener('storage', cb); window.removeEventListener(CHANGED, cb) }
}
const readRaw = (key: string) => { try { return localStorage.getItem(key) ?? '[]' } catch { return '[]' } }

export function CartProvider({ slug, enabled, children }: { slug: string; enabled: boolean; children: ReactNode }) {
  const key = keyOf(slug)
  const raw = useSyncExternalStore(subscribe, () => (enabled ? readRaw(key) : '[]'), () => '[]')
  const lines = useMemo(() => parseCart(raw), [raw])
  const [open, setOpen] = useState(false)
  const setLines = useCallback((next: (ls: CartLine[]) => CartLine[]) => {
    try { localStorage.setItem(key, JSON.stringify(next(parseCart(readRaw(key))))) } catch { /* private mode */ }
    window.dispatchEvent(new Event(CHANGED))
  }, [key])

  const add = useCallback((line: CartLine) => {
    const cur = lines.find((l) => l.variantId === line.variantId)
    if (!cur && lines.length >= ORDER_LIMITS.lines) return false
    if ((cur?.quantity ?? 0) + line.quantity > ORDER_LIMITS.quantity) return false
    setLines((ls) => ls.some((l) => l.variantId === line.variantId)
      ? ls.map((l) => (l.variantId === line.variantId ? { ...l, ...line, quantity: l.quantity + line.quantity } : l))
      : [...ls, line])
    return true
  }, [lines, setLines])
  const setQty = useCallback((variantId: string, q: number) =>
    setLines((ls) => ls.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(ORDER_LIMITS.quantity, Math.trunc(q))) } : l))), [setLines])
  const remove = useCallback((variantId: string) => setLines((ls) => ls.filter((l) => l.variantId !== variantId)), [setLines])
  const clear = useCallback(() => setLines(() => []), [setLines])

  const value = useMemo<CartCtx>(() => ({
    lines, open, setOpen, add, setQty, remove, clear,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    total: lines.reduce((s, l) => s + lineTotal(l.unitPrice, l.quantity, l.offers), 0),
  }), [lines, open, add, setQty, remove, clear])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function CartButton({ l }: { l: Look }) {
  const cart = useCart()
  if (!cart) return null
  return (
    <button type="button" onClick={() => cart.setOpen(true)} aria-label={`Panier (${cart.count})`}
      style={{ position: 'relative', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 8, display: 'grid', placeItems: 'center' }}>
      <ShoppingBag size={24} />
      {cart.count > 0 && (
        <span style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 999, background: l.c.button, color: l.c.background, fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', padding: '0 4px', border: `2px solid ${l.c.background}` }}>{cart.count}</span>
      )}
    </button>
  )
}

/** Side drawer: lines, quantities, then the COD form for the whole cart. */
export function CartDrawer({ l, preview }: { l: Look; preview: boolean }) {
  const cart = useCart()
  useEffect(() => {
    if (!cart?.open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cart.setOpen(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [cart, cart?.open])
  if (!cart || !cart.open) return null
  const { c } = l
  return (
    <div role="dialog" aria-modal="true" aria-label="Votre panier" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={() => cart.setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} />
      <div style={{ position: 'relative', width: 'min(440px, 100%)', height: '100%', overflowY: 'auto', background: c.background, color: c.text, padding: 20, boxShadow: '-10px 0 30px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <strong style={{ fontSize: 20 }}>Votre panier</strong>
          <button type="button" onClick={() => cart.setOpen(false)} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 6 }}><X size={22} /></button>
        </div>
        {cart.lines.length === 0 ? (
          <p style={{ opacity: 0.7, textAlign: 'center', padding: '40px 0' }}>Votre panier est vide.</p>
        ) : (
          <>
            {cart.lines.map((line) => (
              <div key={line.variantId} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${c.text}1a` }}>
                <div style={{ width: 72, flexShrink: 0 }}><Img l={l} src={line.image} ratio="1 / 1" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{line.name}</div>
                  {line.variantLabel && <div style={{ fontSize: 13, opacity: 0.7 }}>{line.variantLabel}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <Qty l={l} value={line.quantity} onChange={(q) => cart.setQty(line.variantId, q)} />
                    <span style={{ fontWeight: 700 }}>{fmtDh(lineTotal(line.unitPrice, line.quantity, line.offers))}</span>
                  </div>
                </div>
                <button type="button" onClick={() => cart.remove(line.variantId)} aria-label={`Retirer ${line.name}`} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', padding: 4 }}><Trash2 size={17} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, margin: '16px 0 20px' }}>
              <span>Total</span><span>{fmtDh(cart.total)}</span>
            </div>
            <OrderForm l={l} preview={preview} lines={cart.lines.map((x) => ({ variantId: x.variantId, quantity: x.quantity }))}
              total={cart.total} onDone={() => cart.clear()} />
          </>
        )}
      </div>
    </div>
  )
}

export function Qty({ l, value, onChange, max = ORDER_LIMITS.quantity }: { l: Look; value: number; onChange: (q: number) => void; max?: number }) {
  const b = { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '6px 10px', display: 'grid', placeItems: 'center' } as const
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', border: `1.5px solid ${l.c.text}33`, borderRadius: Math.max(l.t.radius, 4) }}>
      <button type="button" style={b} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Moins"><Minus size={15} /></button>
      <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{value}</span>
      <button type="button" style={b} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Plus"><Plus size={15} /></button>
    </div>
  )
}

// ─── COD form ────────────────────────────────────────────────────────────────

/** Same address as GET /s/<slug>: the dashboard's /storefront-api rewrite (next.config.ts), or the local API. */
const ordersUrl = (slug: string) => `${API_BASE ? `${API_BASE}/s` : '/storefront-api'}/${encodeURIComponent(slug)}/orders`

type FieldKey = keyof OrderFormValues
const FIELDS: Array<{ key: FieldKey; label: string; type: string; autoComplete: string; placeholder: string; inputMode?: 'tel' | 'text' }> = [
  { key: 'name', label: 'Nom complet', type: 'text', autoComplete: 'name', placeholder: 'Votre nom' },
  { key: 'phone', label: 'Téléphone', type: 'tel', autoComplete: 'tel', placeholder: '06 12 34 56 78', inputMode: 'tel' },
  { key: 'city', label: 'Ville', type: 'text', autoComplete: 'address-level2', placeholder: 'Votre ville' },
  { key: 'address', label: 'Adresse', type: 'text', autoComplete: 'street-address', placeholder: 'Quartier, rue, numéro' },
]

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : null)

export function OrderForm({ l, preview, lines, total, onDone, slug }: {
  l: Look; preview: boolean; lines: OrderLine[]; total: number; onDone?: () => void; slug?: string
}) {
  const storeSlug = slug ?? l.store.slug
  const [v, setV] = useState<OrderFormValues>({ name: '', phone: '', city: l.store.city ?? '', address: '' })
  const [hp, setHp] = useState('')
  const [errors, setErrors] = useState<Partial<Record<FieldKey | 'items' | 'form', string>>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ total: number | null } | null>(null)
  // One id per filled form: a retry or a double click is the same order (API: clientOrderId).
  const clientOrderId = useRef<string | null>(null)

  if (done) {
    return (
      <div role="status" style={{ padding: 22, borderRadius: l.t.radius, background: l.c.secondary, textAlign: 'center', lineHeight: 1.6 }}>
        <CircleCheck size={36} style={{ color: l.c.primary, margin: '0 auto 8px', display: 'block' }} />
        <div style={{ fontWeight: 800, fontSize: 18 }}>Commande reçue, merci !</div>
        {done.total !== null && <div>Total à payer à la livraison : <strong>{fmtDh(done.total)}</strong></div>}
        <div style={{ opacity: 0.8, marginTop: 6 }}>Nous vous écrivons sur WhatsApp pour confirmer votre commande.</div>
        <button type="button" onClick={() => setDone(null)} style={ghostBtnStyle(l, { marginTop: 16 })}>Nouvelle commande</button>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || preview) return
    const check = checkOrder(v, lines)
    if (!check.ok) {
      setErrors({ [check.field === 'quantity' ? 'items' : check.field]: check.message })
      return
    }
    setErrors({})
    setBusy(true)
    clientOrderId.current ??= newId()
    try {
      const res = await fetch(ordersUrl(storeSlug), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...check.body, clientOrderId: clientOrderId.current, sellio_hp: hp }),
      })
      const data = await res.json().catch(() => ({})) as { ok?: boolean; total?: number; duplicate?: boolean; message?: string; field?: string }
      if (res.ok && data.ok) {
        clientOrderId.current = null
        setDone({ total: typeof data.total === 'number' ? data.total : null })
        setV((x) => ({ ...x, address: '' }))
        onDone?.()
        return
      }
      const field = data.field === 'quantity' ? 'items' : data.field
      const message = data.message || (res.status === 429 ? 'Trop de commandes en ce moment, réessayez dans une minute' : 'Commande non enregistrée, réessayez')
      if (field && ['name', 'phone', 'city', 'address', 'items'].includes(field)) setErrors({ [field]: message })
      else setErrors({ form: message })
    } catch {
      setErrors({ form: 'Connexion impossible. Vérifiez votre connexion et réessayez.' })
    } finally { setBusy(false) }
  }

  const err = (k: FieldKey) => errors[k]
  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 12 }}>
      {FIELDS.map((f) => (
        <label key={f.key} style={{ display: 'grid', gap: 5, fontSize: 14, fontWeight: 600 }}>
          {f.label}
          <input className="sf-input" name={f.key} type={f.type} inputMode={f.inputMode} autoComplete={f.autoComplete} placeholder={f.placeholder}
            value={v[f.key]} onChange={(e) => { setV((x) => ({ ...x, [f.key]: e.target.value })); if (errors[f.key]) setErrors((x) => ({ ...x, [f.key]: undefined })) }}
            aria-invalid={!!err(f.key)} aria-describedby={err(f.key) ? `sf-err-${f.key}` : undefined} maxLength={f.key === 'address' ? 200 : 80} required />
          {err(f.key) && <span id={`sf-err-${f.key}`} style={{ color: '#dc2626', fontWeight: 500, fontSize: 13 }}>{err(f.key)}</span>}
        </label>
      ))}
      {/* Honeypot (same name as the API checks): hidden from people, left empty by browsers. */}
      <input type="text" name="sellio_hp" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden
        style={{ position: 'absolute', left: -10000, width: 1, height: 1, opacity: 0 }} />
      {errors.items && <div role="alert" style={{ color: '#dc2626', fontSize: 14 }}>{errors.items}</div>}
      {errors.form && <div role="alert" style={{ color: '#dc2626', fontSize: 14 }}>{errors.form}</div>}
      <button type="submit" disabled={busy || preview || lines.length === 0} style={btnStyle(l, { width: '100%', marginTop: 4 })}>
        {busy && <Loader2 size={18} className="animate-spin" />}
        {preview ? 'Commandes désactivées (aperçu)' : `Commander — ${fmtDh(total)} à la livraison`}
      </button>
      <div style={{ fontSize: 12.5, opacity: 0.7, textAlign: 'center' }}>Paiement à la livraison. Confirmation sur WhatsApp.</div>
    </form>
  )
}

/** Toast after « Ajouter au panier ». */
export function addedToast(ok: boolean, name: string, openCart: () => void) {
  if (!ok) { toast.error(`${ORDER_LIMITS.quantity} articles maximum par produit et ${ORDER_LIMITS.lines} produits au maximum`); return }
  toast.success(`${name} ajouté au panier`, { action: { label: 'Voir le panier', onClick: openCart } })
}
