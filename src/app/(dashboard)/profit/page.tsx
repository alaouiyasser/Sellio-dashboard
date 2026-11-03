'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import { profitApi, type ProfitData, type ProductProfit } from '@/lib/profit-api'
import PeriodFilter from '@/components/common/PeriodFilter'
import { presetPeriod, periodQuery, type Period } from '@/lib/period'

import { tx, intlLocale } from '@/lib/i18n'
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }
const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
}
const btn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--brand)', color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
}
const th: React.CSSProperties = { padding: '6px 8px', fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }
const dh = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${Math.round(n).toLocaleString('fr-MA')} DH`)
const signColor = (n: number | null) => (n === null ? 'var(--text-muted)' : n < 0 ? 'var(--destructive)' : 'var(--success)')
const today = () => new Date().toISOString().slice(0, 10)
const CHANNELS = [['facebook', 'Facebook / Instagram'], ['tiktok', 'TikTok'], ['google', 'Google'], ['snapchat', 'Snapchat'], ['autre', 'Autre']]

export default function ProfitPage() {
  const { t } = useLang()
  const isMobile = useIsMobile()
  const [period, setPeriod] = useState<Period>(() => presetPeriod('30d'))
  const [selected, setSelected] = useState<string>('__store')
  const [data, setData] = useState<ProfitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [costs, setCosts] = useState<Record<string, string>>({})
  const [shipping, setShipping] = useState('')
  const [returns, setReturns] = useState('')
  const [ad, setAd] = useState({ spentOn: today(), amount: '', product: '', channel: 'facebook' })

  async function load(p = period) {
    setLoading(true)
    try {
      const res = await profitApi.get(periodQuery(p))
      setData(res)
      setCosts(Object.fromEntries(res.products.map((p) => [p, res.costs[p] !== undefined ? String(res.costs[p]) : ''])))
      setShipping(res.settings.shippingCost === null ? '' : String(res.settings.shippingCost))
      setReturns(res.settings.returnCost === null ? '' : String(res.settings.returnCost))
    } catch (e) { toast.error((e as Error).message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load(period) }, [period])

  async function saveCosts() {
    setSaving(true)
    try {
      await profitApi.saveCosts({
        products: Object.entries(costs).map(([name, unitCost]) => ({ name, unitCost: unitCost.replace(',', '.') })),
        shippingCost: shipping.replace(',', '.'), returnCost: returns.replace(',', '.'),
      })
      toast.success(tx("Coûts enregistrés"))
      await load()
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  async function addAd() {
    if (!(Number(ad.amount.replace(',', '.')) > 0)) { toast.error(tx("Entrez le montant dépensé")); return }
    try {
      await profitApi.addAd({ ...ad, amount: ad.amount.replace(',', '.') })
      toast.success(tx("Dépense ajoutée"))
      setAd({ ...ad, amount: '' })
      await load()
    } catch (e) { toast.error((e as Error).message) }
  }

  async function removeAd(id: number) {
    try { await profitApi.deleteAd(id); toast.success(tx("Dépense supprimée")); await load() }
    catch (e) { toast.error((e as Error).message) }
  }

  const r = data?.report
  const missing = r?.missing
  const needsSetup = !!missing && (missing.productCosts.length > 0 || missing.shippingCost || missing.returnCost)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.profit')} subtitle={tx("Ce que chaque produit vous rapporte vraiment")} />
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <PeriodFilter value={period} onChange={setPeriod} />
        {loading && !data ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="h-5 w-5 animate-spin" style={{ display: 'inline' }} /></div>
        ) : r && (
          <>
            {needsSetup && (
              <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'flex-start', borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)', background: 'color-mix(in srgb, var(--warning) 7%, var(--card))' }}>
                <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                  {tx("Pour calculer votre bénéfice, renseignez plus bas")}
                  {missing!.productCosts.length > 0 && <> {tx("le prix d’achat de")} {missing!.productCosts.length === 1 ? `« ${missing!.productCosts[0]} »` : tx("{0} produits", [missing!.productCosts.length])}</>}
                  {missing!.productCosts.length > 0 && (missing!.shippingCost || missing!.returnCost) && ' et'}
                  {(missing!.shippingCost || missing!.returnCost) && tx(" les frais de livraison de votre transporteur")}.
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: tx("Bénéfice net"), value: dh(r.totals.profit), color: signColor(r.totals.profit) },
                { label: tx("Marge"), value: r.totals.margin === null ? '—' : `${r.totals.margin}%`, color: signColor(r.totals.margin) },
                { label: tx("Chiffre d'affaires livré"), value: dh(r.totals.revenue), color: 'var(--text)' },
                { label: tx("Publicité"), value: dh(r.totals.ads), color: 'var(--text)', sub: r.totals.roas ? tx("ROAS {0}", [r.totals.roas]) : undefined },
              ].map((k) => (
                <div key={k.label} style={{ ...card, padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{tx(k.label)}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
                  {k.sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{k.sub}</div>}
                </div>
              ))}
            </div>

            <Breakdown report={r} selected={selected} onSelect={setSelected} isMobile={isMobile} />

            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{tx("Par produit")}</div>
              {r.products.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tx("Aucune commande sur cette période.")}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        <th style={{ ...th, textAlign: 'left' }}>{tx("Produit")}</th>
                        <th style={th}>{tx("Livrées")}</th><th style={th}>{tx("CA")}</th><th style={th}>{tx("Achat")}</th>
                        <th style={th}>{tx("Livraison + retours")}</th><th style={th}>{tx("Frais Sellio")}</th><th style={th}>{tx("Pub")}</th><th style={th}>{tx("Bénéfice")}</th>
                        <th style={th}>{tx("Par livrée")}</th><th style={th}>{tx("Marge")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.products.map((p) => (
                        <tr key={p.name} onClick={() => { setSelected(p.name); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          style={{ borderTop: '1px solid var(--border)', cursor: 'pointer', background: selected === p.name ? 'color-mix(in srgb, var(--brand) 6%, transparent)' : undefined }}>
                          <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal', fontWeight: 500, color: 'var(--text)' }}>
                            {p.name}
                            {p.missingCost && <div style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 400 }}>{tx("Prix d’achat manquant")}</div>}
                          </td>
                          <td style={td}>{p.delivered}<span style={{ color: 'var(--text-muted)' }}> / {p.orders}</span></td>
                          <td style={td}>{dh(p.revenue)}</td>
                          <td style={td}>{dh(p.goods)}</td>
                          <td style={td}>{dh(p.delivery)}</td>
                          <td style={td}>{dh(p.fees)}</td>
                          <td style={td}>{dh(p.ads)}</td>
                          <td style={{ ...td, fontWeight: 700, color: signColor(p.profit) }}>{dh(p.profit)}</td>
                          <td style={{ ...td, color: signColor(p.profitPerDelivered) }}>{dh(p.profitPerDelivered)}</td>
                          <td style={td}>{p.margin === null ? '—' : `${p.margin}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
                    {tx("Seules les commandes livrées comptent dans le CA (paiement à la livraison). Une commande de plusieurs produits est répartie selon le prix de chaque produit. Cliquez sur un produit pour voir le détail du calcul.")}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{tx("Vos coûts")}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{tx("À remplir une fois, modifiable à tout moment.")}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx("Frais par colis livré (DH)")}
                    <input inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder={tx("ex. 35")} style={{ ...input, marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx("Frais par colis retourné (DH)")}
                    <input inputMode="decimal" value={returns} onChange={(e) => setReturns(e.target.value)} placeholder={tx("ex. 15")} style={{ ...input, marginTop: 4 }} />
                  </label>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{tx("Prix d’achat par unité (DH)")}</div>
                {Object.keys(costs).length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tx("Vos produits apparaîtront ici après les premières commandes.")}</div>}
                {Object.keys(costs).map((name) => (
                  <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }} title={name}>{name}</span>
                    <input aria-label={tx("Prix d’achat {0}", [name])} inputMode="decimal" value={costs[name]} placeholder="—"
                      onChange={(e) => setCosts({ ...costs, [name]: e.target.value })} style={{ ...input, textAlign: 'right' }} />
                  </div>
                ))}
                <button onClick={saveCosts} disabled={saving} style={{ ...btn, marginTop: 14, opacity: saving ? 0.7 : 1 }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} {tx("Enregistrer les coûts")}
                </button>
              </div>

              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{tx("Dépenses publicitaires")}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{tx("Ajoutez ce que vous avez dépensé (par jour ou par semaine).")}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx("Date")}
                    <input type="date" value={ad.spentOn} max={today()} onChange={(e) => setAd({ ...ad, spentOn: e.target.value })} style={{ ...input, marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx("Montant (DH)")}
                    <input inputMode="decimal" value={ad.amount} onChange={(e) => setAd({ ...ad, amount: e.target.value })} placeholder={tx("ex. 300")} style={{ ...input, marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx("Produit")}
                    <select value={ad.product} onChange={(e) => setAd({ ...ad, product: e.target.value })} style={{ ...input, marginTop: 4 }}>
                      <option value="">{tx("Toute la boutique")}</option>
                      {(data?.products ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx("Plateforme")}
                    <select value={ad.channel} onChange={(e) => setAd({ ...ad, channel: e.target.value })} style={{ ...input, marginTop: 4 }}>
                      {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                </div>
                <button onClick={addAd} style={{ ...btn, marginTop: 14 }}>{tx("Ajouter la dépense")}</button>

                {(data?.ads ?? []).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    {data!.ads.map((a) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)', width: 82, flexShrink: 0 }}>{new Date(a.spent_on).toLocaleDateString(intlLocale())}</span>
                        <span style={{ flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.product_name ?? tx("Toute la boutique")}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{dh(a.amount_mad)}</span>
                        <button onClick={() => removeAd(a.id)} aria-label={tx("Supprimer la dépense")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

type Report = ProfitData['report']

/** The calculation for the whole store or one product, line by line. */
function Breakdown({ report, selected, onSelect, isMobile }: { report: Report; selected: string; onSelect: (v: string) => void; isMobile: boolean }) {
  const p: ProductProfit | null = selected === '__store' ? null : report.products.find((x) => x.name === selected) ?? null
  const t = report.totals
  const v = p ?? {
    name: tx('Toute la boutique'), orders: t.orders, confirmed: t.confirmed, cancelled: t.cancelled, delivered: t.delivered, returned: t.returned,
    units: t.units, avgPrice: t.units ? Math.round(t.revenue / t.units) : null, revenue: t.revenue, goods: t.goods, shipping: t.shipping, returns: t.returns,
    delivery: t.delivery, fees: t.fees, ads: t.ads, profitBeforeAds: t.profitBeforeAds, profit: t.profit, profitPerDelivered: t.profitPerDelivered,
    margin: t.margin, confirmationRate: t.orders ? Math.round((t.confirmed / t.orders) * 1000) / 10 : null, deliveryRate: t.deliveryRate, returnRate: t.returnRate,
    costPerOrder: t.orders && t.ads ? Math.round(t.ads / t.orders) : null, costPerDelivered: t.delivered && t.ads ? Math.round(t.ads / t.delivered) : null,
    breakEvenCpa: t.breakEvenCpa, roas: t.roas, missingCost: report.missing.productCosts.length > 0,
  }
  const line = (label: string, value: number | null, opts: { minus?: boolean; strong?: boolean; detail?: string; tone?: string } = {}) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: opts.strong ? '1px solid var(--border)' : undefined, fontSize: opts.strong ? 14.5 : 13.5 }}>
      <span style={{ color: opts.strong ? 'var(--text)' : 'var(--text-muted)', fontWeight: opts.strong ? 700 : 500 }}>
        {label}{opts.detail && <span style={{ display: 'block', fontSize: 11.5, fontWeight: 400, color: 'var(--text-muted)' }}>{opts.detail}</span>}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: opts.strong ? 800 : 600, color: opts.tone ?? 'var(--text)', whiteSpace: 'nowrap' }}>
        {value === null ? '—' : `${opts.minus && value ? '− ' : ''}${dh(value)}`}
      </span>
    </div>
  )
  const step = (label: string, n: number, rate?: number | null) => (
    <div style={{ flex: 1, minWidth: 90, padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{n}{rate !== undefined && rate !== null && <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}> · {rate}%</span>}</div>
    </div>
  )
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{tx('Détail du calcul')}</div>
        <select value={selected} onChange={(e) => onSelect(e.target.value)} aria-label={tx('Produit')} style={{ ...input, width: 'auto', minWidth: 220, fontWeight: 600 }}>
          <option value="__store">{tx('Toute la boutique')}</option>
          {report.products.map((x) => <option key={x.name} value={x.name}>{x.name} ({x.orders})</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {step(tx('Commandes'), v.orders)}
        {step(tx('Confirmées'), v.confirmed, v.confirmationRate)}
        {step(tx('Livrées'), v.delivered, v.deliveryRate)}
        {step(tx('Retournées'), v.returned, v.returnRate)}
        {step(tx('Annulées'), v.cancelled)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: 20 }}>
        <div>
          {line(tx("Chiffre d'affaires livré"), v.revenue, { detail: v.units ? tx('{0} unités livrées · {1} en moyenne', [v.units, dh(v.avgPrice)]) : undefined })}
          {line(tx('Achat de la marchandise'), v.missingCost ? null : v.goods, { minus: true, detail: v.missingCost ? tx('Prix d’achat manquant : renseignez-le plus bas') : tx('Prix d’achat × unités livrées') })}
          {line(tx('Livraison'), v.shipping, { minus: true, detail: tx('{0} colis livrés × frais du transporteur', [v.delivered]) })}
          {line(tx('Retours'), v.returns, { minus: true, detail: tx('{0} colis retournés × frais de retour', [v.returned]) })}
          {line(tx('Frais Sellio'), v.fees, { minus: true, detail: tx('Frais Sellio × commandes livrées') })}
          {line(tx('Bénéfice avant publicité'), v.profitBeforeAds, { strong: true, tone: signColor(v.profitBeforeAds) })}
          {line(tx('Publicité'), v.ads, { minus: true, detail: p ? tx('Dépenses de ce produit + sa part des dépenses de toute la boutique') : undefined })}
          {line(tx('Bénéfice net'), v.profit, { strong: true, tone: signColor(v.profit) })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start' }}>
          {[
            { k: tx('Par commande livrée'), val: dh(v.profitPerDelivered), tone: signColor(v.profitPerDelivered) },
            { k: tx('Marge'), val: v.margin === null ? '—' : `${v.margin}%`, tone: signColor(v.margin) },
            { k: tx('Coût pub par commande'), val: dh(v.costPerOrder) },
            { k: tx('ROAS'), val: v.roas === null ? '—' : `${v.roas}×` },
          ].map((x) => (
            <div key={x.k} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{x.k}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: x.tone ?? 'var(--text)' }}>{x.val}</div>
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1', padding: 12, borderRadius: 10, background: 'color-mix(in srgb, var(--brand) 7%, transparent)', fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55 }}>
            {v.breakEvenCpa === null
              ? tx('Renseignez les coûts pour savoir combien vous pouvez dépenser en publicité.')
              : v.breakEvenCpa > 0
                ? tx('Vous pouvez dépenser jusqu’à {0} de publicité par commande reçue avant de perdre de l’argent.', [dh(v.breakEvenCpa)])
                : tx('Même sans publicité, ce produit perd de l’argent : revoyez le prix, le prix d’achat ou les retours.')}
          </div>
        </div>
      </div>
    </div>
  )
}
