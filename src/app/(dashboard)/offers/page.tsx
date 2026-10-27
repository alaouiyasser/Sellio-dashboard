'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import { offersApi, type Offer, type OfferForm } from '@/lib/offers-api'
import { profitApi } from '@/lib/profit-api'
import { OfferCard } from '@/components/offers/OfferCard'

const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, marginTop: 4 }
const label: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' }
const EMPTY: OfferForm = { title: '', productName: '', extraQty: 1, pricing: 'unit_price', value: '', message: '', startsAt: '', endsAt: '' }

export default function OffersPage() {
  const { t } = useLang()
  const isMobile = useIsMobile()
  const [offers, setOffers] = useState<Offer[]>([])
  const [products, setProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<OfferForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    offersApi.list().then((r) => setOffers(r.offers)).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
    profitApi.get(30).then((r) => setProducts(r.products)).catch(() => {})
  }, [])

  const replace = (id: string) => (o: Offer | null) => setOffers((list) => (o ? list.map((x) => (x.id === id ? o : x)) : list.filter((x) => x.id !== id)))

  async function create(status: 'draft' | 'active') {
    if (!form.title.trim()) { toast.error('Donnez un nom à l’offre'); return }
    if (!(Number(form.value.replace(',', '.')) > 0)) { toast.error('Entrez le prix ou la remise'); return }
    setSaving(true)
    try {
      const { offer } = await offersApi.create(form, status)
      setOffers((l) => [offer, ...l]); setForm(EMPTY)
      toast.success(status === 'active' ? 'Offre activée' : 'Brouillon enregistré')
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const set = <K extends keyof OfferForm>(k: K, v: OfferForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.offers')} subtitle="Proposées au client juste après qu’il confirme sur WhatsApp" />
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 360px', gap: 20, alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ ...card, padding: 16, fontSize: 13, color: 'var(--text)', lineHeight: 1.6, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>Une offre n’est envoyée que si elle est <b>active</b>. Sans offre active, vos clients ne reçoivent rien de plus.</span>
            </div>
            {loading ? <div style={{ padding: 30, textAlign: 'center' }}><Loader2 className="h-5 w-5 animate-spin" style={{ display: 'inline' }} /></div>
              : offers.length === 0 ? <div style={{ ...card, fontSize: 13, color: 'var(--text-muted)' }}>Aucune offre pour l’instant. Créez-en une à droite.</div>
              : offers.map((o) => <OfferCard key={o.id} offer={o} onChange={replace(o.id)} />)}
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Nouvelle offre</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={label}>Nom (pour vous)
                <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="ex. 2e flacon à 150 DH" style={input} />
              </label>
              <label style={label}>Produit
                <select value={form.productName} onChange={(e) => set('productName', e.target.value)} style={input}>
                  <option value="">Tous les produits</option>
                  {products.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={label}>Unités ajoutées
                  <select value={form.extraQty} onChange={(e) => set('extraQty', Number(e.target.value))} style={input}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label style={label}>Prix
                  <select value={form.pricing} onChange={(e) => set('pricing', e.target.value as OfferForm['pricing'])} style={input}>
                    <option value="unit_price">DH par unité</option>
                    <option value="percent">% de remise</option>
                  </select>
                </label>
              </div>
              <label style={label}>{form.pricing === 'unit_price' ? 'Prix de chaque unité ajoutée (DH)' : 'Remise sur les unités ajoutées (%)'}
                <input inputMode="decimal" value={form.value} onChange={(e) => set('value', e.target.value)} placeholder={form.pricing === 'unit_price' ? 'ex. 150' : 'ex. 30'} style={input} />
              </label>
              <label style={label}>Phrase pour le client (optionnel)
                <input dir="auto" maxLength={200} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="ex. العرض صالح غير هاد السيمانة" style={input} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={label}>Début (optionnel)<input type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} style={input} /></label>
                <label style={label}>Fin (optionnel)<input type="date" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} style={input} /></label>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                L’offre n’est jamais proposée si elle n’est pas moins chère que le prix normal, ni sur les commandes de plusieurs produits.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button disabled={saving} onClick={() => create('active')} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Créer et activer</button>
                <button disabled={saving} onClick={() => create('draft')} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Brouillon</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
