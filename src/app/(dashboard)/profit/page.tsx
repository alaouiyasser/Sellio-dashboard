'use client'

// Rentabilité: one product at a time (or the whole store). The merchant fills the product sheet in
// order — price, purchase cost, delivery fees, ads — and sees two results side by side:
//   Réel   = parcels already delivered (COD: only those are paid),
//   Estimé = every order of the period, at the expected delivery rate.
// Everything is recomputed live while typing; "Enregistrer" stores the costs.
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Trash2, Info, Pencil } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import { profitApi, type ProfitData, type ProductProfit, type AdEntry } from '@/lib/profit-api'
import PeriodFilter from '@/components/common/PeriodFilter'
import { usePagePeriod } from '@/hooks/usePagePeriod'
import { presetPeriod, periodQuery, type Period } from '@/lib/period'
import { tx, intlLocale } from '@/lib/i18n'

const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }
const input: React.CSSProperties = {
  width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 14, minWidth: 0, boxSizing: 'border-box',
}
const btn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--brand)', color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
}
const label: React.CSSProperties = { fontSize: 12.5, color: 'var(--text-muted)', display: 'block', minWidth: 0 }
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6 }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--brand)', fontWeight: 600, fontSize: 'inherit' }
const th: React.CSSProperties = { padding: '6px 8px', fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }
const td: React.CSSProperties = { padding: '9px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13 }
const dh = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : `${Math.round(n).toLocaleString('fr-MA')} DH`)
const signColor = (n: number | null) => (n === null ? 'var(--text-muted)' : n < 0 ? 'var(--destructive)' : 'var(--success)')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1
const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(intlLocale(), { day: '2-digit', month: '2-digit' })
const parse = (s: string): number | null => { const n = Number(String(s).replace(',', '.').trim()); return s.trim() === '' || !Number.isFinite(n) || n < 0 ? null : n }
const same = (a?: string | null, b?: string | null) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()
const CHANNELS = [['facebook', 'Facebook / Instagram'], ['tiktok', 'TikTok'], ['google', 'Google'], ['snapchat', 'Snapchat'], ['autre', 'Autre']]
/** Under this many finished parcels (delivered + returned) the real delivery rate says little. */
const MIN_FINISHED = 5
const STORE = '__store'

interface Lines { revenue: number; goods: number | null; shipping: number; returns: number; fees: number; ads: number; delivered: number; orders: number }
const empty = (): Lines => ({ revenue: 0, goods: 0, shipping: 0, returns: 0, fees: 0, ads: 0, delivered: 0, orders: 0 })
const beforeAds = (l: Lines) => (l.goods === null ? null : l.revenue - l.goods - l.shipping - l.returns - l.fees)
const net = (l: Lines) => { const b = beforeAds(l); return b === null ? null : b - l.ads }
const add = (a: Lines, b: Lines): Lines => ({
  revenue: a.revenue + b.revenue, goods: a.goods === null || b.goods === null ? null : a.goods + b.goods,
  shipping: a.shipping + b.shipping, returns: a.returns + b.returns, fees: a.fees + b.fees, ads: a.ads + b.ads,
  delivered: a.delivered + b.delivered, orders: a.orders + b.orders,
})

/** Delivery rate used for the estimate: the real one once enough parcels are finished. */
function deliveryRateOf(p: Pick<ProductProfit, 'deliveredShare' | 'returnedShare'>, assumed: number) {
  const finished = p.deliveredShare + p.returnedShare
  return finished >= MIN_FINISHED ? { rate: p.deliveredShare / finished, real: true } : { rate: assumed, real: false }
}

function calc(p: ProductProfit, cost: number | null, ship: number, ret: number, fee: number, assumed: number) {
  const real: Lines = {
    revenue: p.revenue, goods: p.units === 0 ? 0 : cost === null ? null : p.units * cost,
    shipping: p.deliveredShare * ship, returns: p.returnedShare * ret, fees: p.deliveredShare * fee, ads: p.ads,
    delivered: p.delivered, orders: p.orderShare,
  }
  const { rate } = deliveryRateOf(p, assumed)
  const expDelivered = Math.max(p.deliveredShare, p.confirmedShare * rate)
  const expReturned = Math.max(0, p.confirmedShare - expDelivered)
  const perOrderValue = p.orderShare ? p.orderValue / p.orderShare : 0
  const perOrderUnits = p.orderShare ? p.orderUnits / p.orderShare : 0
  const estimate: Lines = {
    revenue: expDelivered * perOrderValue,
    goods: cost === null ? (expDelivered ? null : 0) : expDelivered * perOrderUnits * cost,
    shipping: expDelivered * ship, returns: expReturned * ret, fees: expDelivered * fee, ads: p.ads,
    delivered: expDelivered, orders: p.orderShare,
  }
  return { real, estimate }
}

export default function ProfitPage() {
  const { t } = useLang()
  const isMobile = useIsMobile()
  const [period, setPeriod, periodReady] = usePagePeriod('profit')
  const [selected, setSelected] = useState<string>('')
  const [data, setData] = useState<ProfitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [costs, setCosts] = useState<Record<string, string>>({})
  const [shipping, setShipping] = useState('')
  const [returns, setReturns] = useState('')
  const [assumed, setAssumed] = useState('70')
  const [editing, setEditing] = useState<AdEntry | null>(null)
  const [lastChannel, setLastChannel] = useState('facebook')
  const [dirty, setDirty] = useState(false)

  async function load(p = period, keepInputs = false) {
    setLoading(true)
    try {
      const res = await profitApi.get(periodQuery(p))
      setData(res)
      if (!keepInputs || !dirty) {
        setCosts(Object.fromEntries(res.products.map((n) => [n, res.costs[n] !== undefined ? String(res.costs[n]) : ''])))
        setShipping(res.settings.shippingCost === null ? '' : String(res.settings.shippingCost))
        setReturns(res.settings.returnCost === null ? '' : String(res.settings.returnCost))
        setDirty(false)
      }
      setSelected((cur) => (cur === STORE || res.report.products.some((x) => x.name === cur) ? cur : res.report.products[0]?.name ?? STORE))
    } catch (e) { toast.error((e as Error).message) }
    finally { setLoading(false) }
  }
  useEffect(() => { if (periodReady) load(period, true) }, [period, periodReady])
  useEffect(() => { setEditing(null) }, [selected, period])

  async function saveCosts() {
    setSaving(true)
    try {
      await profitApi.saveCosts({
        products: Object.entries(costs).map(([name, unitCost]) => ({ name, unitCost: unitCost.replace(',', '.') })),
        shippingCost: shipping.replace(',', '.'), returnCost: returns.replace(',', '.'),
      })
      toast.success(tx('Coûts enregistrés'))
      setDirty(false)
      await load()
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  async function submitAd(f: AdFields) {
    const amount = f.amount.replace(',', '.').trim()
    if (!(Number(amount) > 0)) { toast.error(tx('Entrez le montant dépensé')); return false }
    try {
      if (editing) {
        await profitApi.updateAd(editing.id, { ...f, amount, product: editing.product_name ?? '' })
        toast.success(tx('Dépense modifiée'))
        setEditing(null)
      } else {
        await profitApi.addAd({ ...f, amount, product: selected === STORE ? '' : selected })
        toast.success(tx('Dépense ajoutée'))
      }
      setLastChannel(f.channel)
      await load(period, true)
      return true
    } catch (e) { toast.error((e as Error).message); return false }
  }

  async function removeAd(id: number) {
    if (editing?.id === id) setEditing(null)
    try { await profitApi.deleteAd(id); toast.success(tx('Dépense supprimée')); await load(period, true) }
    catch (e) { toast.error((e as Error).message) }
  }

  const r = data?.report
  const fee = r?.feePerDelivered ?? 5
  const ship = parse(shipping) ?? 0, ret = parse(returns) ?? 0
  const assumedRate = Math.min(100, Math.max(1, parse(assumed) ?? 70)) / 100
  const costOf = (name: string) => {
    const key = Object.keys(costs).find((k) => same(k, name))
    return key === undefined ? null : parse(costs[key] ?? '')
  }

  const rows = useMemo(() => (r?.products ?? []).map((p) => ({ p, ...calc(p, costOf(p.name), ship, ret, fee, assumedRate) })),
    [r, costs, shipping, returns, assumed])
  const product = rows.find((x) => x.p.name === selected) ?? null
  const isStore = selected === STORE || !product
  const view = isStore
    ? {
      real: rows.reduce((a, x) => add(a, x.real), { ...empty(), ads: r?.storeAds && !rows.length ? r.storeAds : 0 }),
      estimate: rows.reduce((a, x) => add(a, x.estimate), empty()),
    }
    : { real: product!.real, estimate: product!.estimate }
  const funnel = isStore
    ? r ? { orders: r.totals.orders, confirmed: r.totals.confirmed, delivered: r.totals.delivered, returned: r.totals.returned, cancelled: r.totals.cancelled } : null
    : { orders: product!.p.orders, confirmed: product!.p.confirmed, delivered: product!.p.delivered, returned: product!.p.returned, cancelled: product!.p.cancelled }
  const rateInfo = isStore
    ? (() => {
      const d = rows.reduce((s, x) => s + x.p.deliveredShare, 0), rt = rows.reduce((s, x) => s + x.p.returnedShare, 0)
      return deliveryRateOf({ deliveredShare: d, returnedShare: rt }, assumedRate)
    })()
    : deliveryRateOf(product!.p, assumedRate)
  const productAds = (data?.ads ?? []).filter((a) => (isStore ? true : same(a.product_name, product!.p.name)))
  const missingCost = isStore ? rows.some((x) => costOf(x.p.name) === null) : costOf(product!.p.name) === null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.profit')} subtitle={tx('Ce que chaque produit vous rapporte vraiment')} />
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PeriodFilter value={period} onChange={setPeriod} />

        {loading && !data ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="h-5 w-5 animate-spin" style={{ display: 'inline' }} /></div>
        ) : r && (
          <>
            {/* Which product */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }} role="group" aria-label={tx('Produit')}>
              {[...r.products.map((p) => ({ key: p.name, label: `${p.name} · ${p.orders}` })), { key: STORE, label: tx('Toute la boutique') }].map((c) => {
                const on = (isStore && c.key === STORE) || (!isStore && c.key === selected)
                return (
                  <button key={c.key} onClick={() => setSelected(c.key)} aria-pressed={on} style={{
                    padding: '8px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', fontWeight: on ? 700 : 500,
                    border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`,
                    background: on ? 'var(--brand)' : 'var(--card)', color: on ? '#fff' : 'var(--text)',
                  }}>{c.label}</button>
                )
              })}
              {loading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} />}
            </div>

            {r.products.length === 0 ? (
              <div style={{ ...card, fontSize: 13, color: 'var(--text-muted)' }}>{tx('Aucune commande sur cette période.')}</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
                {/* ── The sheet, filled in order ── */}
                <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {isStore ? tx('Réglages de la boutique') : tx('Fiche produit : {0}', [product!.p.name])}
                  </div>

                  <Step n={1} title={tx('Prix')}>
                    {isStore ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {rows.map(({ p }) => (
                          <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>
                              {p.name} <span style={{ color: 'var(--text-muted)' }}>· {tx('vendu {0}', [dh(p.price)])}</span>
                            </span>
                            <input aria-label={tx('Prix d’achat {0}', [p.name])} inputMode="decimal" placeholder={tx('achat')} value={costs[p.name] ?? ''}
                              onChange={(e) => { setCosts({ ...costs, [p.name]: e.target.value }); setDirty(true) }} style={{ ...input, textAlign: 'right' }} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <span style={label}>{tx('Prix de vente moyen')}</span>
                          <div style={{ ...input, background: 'transparent', fontWeight: 700, marginTop: 4 }}>{dh(product!.p.price)}</div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx('D’après vos commandes')}</span>
                        </div>
                        <label style={label}>{tx('Prix d’achat par unité (DH)')}
                          <input inputMode="decimal" value={costs[product!.p.name] ?? ''} placeholder={tx('ex. 60')}
                            onChange={(e) => { setCosts({ ...costs, [product!.p.name]: e.target.value }); setDirty(true) }}
                            style={{ ...input, marginTop: 4, borderColor: costOf(product!.p.name) === null ? 'var(--warning)' : 'var(--border)' }} />
                        </label>
                      </div>
                    )}
                  </Step>

                  <Step n={2} title={tx('Livraison')} hint={tx('Mêmes frais pour tous vos produits.')}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={label}>{tx('Frais par colis livré (DH)')}
                        <input inputMode="decimal" value={shipping} onChange={(e) => { setShipping(e.target.value); setDirty(true) }} placeholder={tx('ex. 35')}
                          style={{ ...input, marginTop: 4, borderColor: parse(shipping) === null ? 'var(--warning)' : 'var(--border)' }} />
                      </label>
                      <label style={label}>{tx('Frais par colis retourné (DH)')}
                        <input inputMode="decimal" value={returns} onChange={(e) => { setReturns(e.target.value); setDirty(true) }} placeholder={tx('ex. 15')}
                          style={{ ...input, marginTop: 4, borderColor: parse(returns) === null ? 'var(--warning)' : 'var(--border)' }} />
                      </label>
                    </div>
                    <button onClick={saveCosts} disabled={saving || !dirty} style={{ ...btn, marginTop: 12, opacity: saving || !dirty ? 0.55 : 1, cursor: dirty ? 'pointer' : 'default' }}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />} {dirty ? tx('Enregistrer les prix et frais') : tx('Enregistré')}
                    </button>
                  </Step>

                  <Step n={3} title={tx('Publicité')} hint={isStore
                    ? tx('Une dépense « toute la boutique » est répartie entre les produits selon leur nombre de commandes.')
                    : tx('Ce que vous avez dépensé pour ce produit. Une campagne de plusieurs jours : mettez le premier et le dernier jour.')}>
                    <AdForm key={editing?.id ?? 'new'} initial={editing ? {
                      spentOn: editing.spent_on, spentTo: editing.spent_to ?? editing.spent_on,
                      amount: String(editing.amount_total ?? editing.amount_mad), channel: editing.channel ?? 'facebook',
                    } : { ...adDefaults(period), amount: '', channel: lastChannel }}
                      editing={!!editing} onCancel={() => setEditing(null)} onSubmit={submitAd} />

                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {productAds.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{tx('Aucune dépense sur la période.')}</div>}
                      {productAds.map((a) => {
                        const partial = a.amount_total !== undefined && Math.round(a.amount_total) !== Math.round(a.amount_mad)
                        return (
                          <div key={a.id} style={{
                            display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 10,
                            border: `1px solid ${editing?.id === a.id ? 'var(--brand)' : 'var(--border)'}`, background: 'var(--bg)',
                          }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {a.product_name ?? tx('Toute la boutique')}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                                {shortDay(a.spent_on)}{a.spent_to ? ` → ${shortDay(a.spent_to)}` : ''} · {CHANNELS.find(([v]) => v === a.channel)?.[1] ?? a.channel ?? '—'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'end' }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{dh(a.amount_mad)}</div>
                              {partial && <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{tx('sur {0} au total', [dh(a.amount_total)])}</div>}
                            </div>
                            <div style={{ display: 'flex' }}>
                              <button onClick={() => setEditing(a)} aria-label={tx('Modifier la dépense')} title={tx('Modifier')} style={iconBtn}><Pencil size={14} /></button>
                              <button onClick={() => removeAd(a.id)} aria-label={tx('Supprimer la dépense')} title={tx('Supprimer')} style={iconBtn}><Trash2 size={14} /></button>
                            </div>
                          </div>
                        )
                      })}
                      {!isStore && product!.p.adsShared > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px dashed var(--border)', fontSize: 12.5, color: 'var(--text-muted)' }}>
                          <span>
                            {tx('Sa part de la pub « toute la boutique » ({0} des commandes)', [`${Math.round((product!.p.orderShare / Math.max(1, r.totals.orders)) * 100)} %`])}
                            {' · '}<button onClick={() => setSelected(STORE)} style={{ ...linkBtn }}>{tx('voir ou modifier')}</button>
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{dh(product!.p.adsShared)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 2px 0', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                        <span>{tx('Total publicité sur la période')}</span><span>{dh(view.real.ads)}</span>
                      </div>
                    </div>
                  </Step>

                  <Step n={4} title={tx('Taux de livraison')}>
                    {rateInfo.real ? (
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>
                        {tx('{0} des colis arrivés au bout sont livrés (vos vrais chiffres).', [`${Math.round(rateInfo.rate * 100)} %`])}
                      </div>
                    ) : (
                      <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{tx('Pas encore assez de colis livrés. Taux prévu pour l’estimation :')}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <input inputMode="numeric" value={assumed} onChange={(e) => setAssumed(e.target.value)} style={{ ...input, width: 64, textAlign: 'right' }} /> %
                        </span>
                      </label>
                    )}
                  </Step>
                </div>

                {/* ── The result ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {funnel && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 8 }}>
                      {[
                        { k: tx('Commandes'), v: funnel.orders },
                        { k: tx('Confirmées'), v: funnel.confirmed },
                        { k: tx('Livrées'), v: funnel.delivered },
                        { k: tx('Retournées'), v: funnel.returned },
                        { k: tx('Annulées'), v: funnel.cancelled },
                      ].map((s) => (
                        <div key={s.k} style={{ ...card, padding: '10px 12px' }}>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.k}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <ResultCard view={view} missingCost={missingCost} noShipping={parse(shipping) === null || parse(returns) === null}
                    rate={rateInfo} isMobile={isMobile} />
                </div>
              </div>
            )}

            {isStore && r.products.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{tx('Tous les produits (estimation)')}</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, textAlign: 'left' }}>{tx('Produit')}</th>
                        <th style={th}>{tx('Commandes')}</th><th style={th}>{tx('Livrées')}</th><th style={th}>{tx('Pub')}</th>
                        <th style={th}>{tx('Bénéfice estimé')}</th><th style={th}>{tx('Pub max par commande')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ p, estimate }) => {
                        const n = net(estimate), b = beforeAds(estimate)
                        return (
                          <tr key={p.name} onClick={() => setSelected(p.name)} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
                            <td style={{ ...td, textAlign: 'left', fontWeight: 600, color: 'var(--text)' }}>{p.name}</td>
                            <td style={td}>{p.orders}</td><td style={td}>{p.delivered}</td><td style={td}>{dh(p.ads)}</td>
                            <td style={{ ...td, fontWeight: 700, color: signColor(n) }}>{dh(n)}</td>
                            <td style={td}>{b === null || !estimate.orders ? '—' : dh(b / estimate.orders)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 700, background: 'color-mix(in srgb, var(--brand) 14%, transparent)', color: 'var(--brand)' }}>{n}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: hint ? 2 : 8 }}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{hint}</div>}
        {children}
      </div>
    </section>
  )
}

function ResultCard({ view, missingCost, noShipping, rate, isMobile }: {
  view: { real: Lines; estimate: Lines }; missingCost: boolean; noShipping: boolean; rate: { rate: number; real: boolean }; isMobile: boolean
}) {
  const { real, estimate } = view
  const rows: { k: string; real: number | null; est: number | null; minus?: boolean; strong?: boolean }[] = [
    { k: tx('Chiffre d’affaires'), real: real.revenue, est: estimate.revenue },
    { k: tx('Achat de la marchandise'), real: real.goods, est: estimate.goods, minus: true },
    { k: tx('Livraison'), real: real.shipping, est: estimate.shipping, minus: true },
    { k: tx('Retours'), real: real.returns, est: estimate.returns, minus: true },
    { k: tx('Frais Sellio'), real: real.fees, est: estimate.fees, minus: true },
    { k: tx('Bénéfice avant publicité'), real: beforeAds(real), est: beforeAds(estimate), strong: true },
    { k: tx('Publicité'), real: real.ads, est: estimate.ads, minus: true },
    { k: tx('Bénéfice net'), real: net(real), est: net(estimate), strong: true },
  ]
  const cell = (v: number | null, r: (typeof rows)[number]) => (
    <td style={{ ...td, fontWeight: r.strong ? 800 : 500, color: r.strong ? signColor(v) : 'var(--text)', fontSize: r.strong ? 14.5 : 13.5 }}>
      {v === null ? '—' : `${r.minus && v ? '− ' : ''}${dh(v)}`}
    </td>
  )
  const nEst = net(estimate), bEst = beforeAds(estimate)
  const perDelivered = nEst !== null && estimate.delivered ? nEst / estimate.delivered : null
  const margin = nEst !== null && estimate.revenue ? Math.round((nEst / estimate.revenue) * 1000) / 10 : null
  const maxCpa = bEst !== null && estimate.orders ? bEst / estimate.orders : null
  const cpa = estimate.orders && estimate.ads ? estimate.ads / estimate.orders : null

  let advice: string
  if (missingCost) advice = tx('Renseignez le prix d’achat (étape 1) pour voir le bénéfice.')
  else if (maxCpa === null) advice = tx('Pas encore de commande sur la période.')
  else if (maxCpa <= 0) advice = tx('Même sans publicité, ce produit perd de l’argent : revoyez le prix, le prix d’achat ou les retours.')
  else if (cpa !== null && cpa > maxCpa) advice = tx('Vous payez {0} de pub par commande, pour un maximum de {1} : réduisez la pub ou augmentez le prix.', [dh(cpa), dh(maxCpa)])
  else advice = tx('Vous pouvez dépenser jusqu’à {0} de publicité par commande reçue avant de perdre de l’argent.', [dh(maxCpa)])

  return (
    <div style={card}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{tx('Le calcul')}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
        {tx('« Réel » ne compte que les colis déjà livrés (paiement à la livraison). « Estimé » compte toutes les commandes de la période, avec un taux de livraison de {0}.', [`${Math.round(rate.rate * 100)} %`])}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }} />
              <th style={th}>{tx('Réel')}<div style={{ fontWeight: 400, fontSize: 11 }}>{tx('{0} livrées', [Math.round(real.delivered)])}</div></th>
              <th style={{ ...th, color: 'var(--brand)' }}>{tx('Estimé')}<div style={{ fontWeight: 400, fontSize: 11 }}>{tx('≈ {0} livrées', [Math.round(estimate.delivered)])}</div></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} style={{ borderTop: '1px solid var(--border)', background: r.strong ? 'color-mix(in srgb, var(--brand) 4%, transparent)' : undefined }}>
                <td style={{ ...td, textAlign: 'left', fontWeight: r.strong ? 700 : 500, color: r.strong ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'normal' }}>{r.k}</td>
                {cell(r.real, r)}{cell(r.est, r)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
        {[
          { k: tx('Par commande livrée'), v: dh(perDelivered), c: signColor(perDelivered) },
          { k: tx('Marge'), v: margin === null ? '—' : `${margin} %`, c: signColor(margin) },
          { k: tx('Pub payée par commande'), v: dh(cpa), c: 'var(--text)' },
          { k: tx('Pub max par commande'), v: dh(maxCpa), c: maxCpa !== null && maxCpa <= 0 ? 'var(--destructive)' : 'var(--text)' },
        ].map((x) => (
          <div key={x.k} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{x.k}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: x.c }}>{x.v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 10, display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.55, color: 'var(--text)',
        background: missingCost ? 'color-mix(in srgb, var(--warning) 10%, transparent)' : 'color-mix(in srgb, var(--brand) 7%, transparent)' }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{advice}{noShipping && !missingCost ? ` ${tx('Renseignez aussi les frais de livraison (étape 2).')}` : ''}</span>
      </div>
    </div>
  )
}

interface AdFields { spentOn: string; spentTo: string; amount: string; channel: string }

/** New spend defaults to the period on screen (never after today). */
function adDefaults(p: Period): Pick<AdFields, 'spentOn' | 'spentTo'> {
  const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const t = today()
  const from = day(p.from), to = day(new Date(p.to.getTime() - 1))
  const end = to > t ? t : to
  return { spentOn: from > end ? end : from, spentTo: end }
}

function AdForm({ initial, editing, onSubmit, onCancel }: {
  initial: AdFields; editing: boolean; onSubmit: (f: AdFields) => Promise<boolean>; onCancel: () => void
}) {
  const [f, setF] = useState<AdFields>(initial)
  const [busy, setBusy] = useState(false)
  // A new period on screen → the dates follow it (not while correcting a spend).
  useEffect(() => { if (!editing) setF((x) => ({ ...x, spentOn: initial.spentOn, spentTo: initial.spentTo })) }, [initial.spentOn, initial.spentTo, editing])
  const n = Number(f.amount.replace(',', '.'))
  const days = daysBetween(f.spentOn, f.spentTo)
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); const ok = await onSubmit(f); setBusy(false); if (ok && !editing) setF((x) => ({ ...x, amount: '' })) }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: editing ? 12 : 0, borderRadius: 12, background: editing ? 'color-mix(in srgb, var(--brand) 6%, transparent)' : undefined }}>
      {editing && <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand)' }}>{tx('Modifier la dépense')}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
        <label style={label}>{tx('Du')}
          <input type="date" value={f.spentOn} max={today()} required
            onChange={(e) => setF({ ...f, spentOn: e.target.value, spentTo: f.spentTo < e.target.value ? e.target.value : f.spentTo })} style={{ ...input, marginTop: 4 }} />
        </label>
        <label style={label}>{tx('Au')}
          <input type="date" value={f.spentTo} min={f.spentOn} max={today()} required onChange={(e) => setF({ ...f, spentTo: e.target.value })} style={{ ...input, marginTop: 4 }} />
        </label>
        <label style={label}>{days > 1 ? tx('Montant total sur ces {0} jours (DH)', [days]) : tx('Montant (DH)')}
          <input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder={tx('ex. 300')} required style={{ ...input, marginTop: 4 }} />
        </label>
        <label style={label}>{tx('Plateforme')}
          <select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} style={{ ...input, marginTop: 4 }}>
            {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      {days > 1 && n > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx('Soit {0} par jour.', [dh(n / days)])}</div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.7 : 1 }}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? tx('Enregistrer la modification') : tx('Ajouter la dépense')}
        </button>
        {editing && <button type="button" onClick={onCancel} style={{ ...btn, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}>{tx('Annuler')}</button>}
      </div>
    </form>
  )
}
