'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import { profitApi, type ProfitData } from '@/lib/profit-api'

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
  const [days, setDays] = useState(30)
  const [data, setData] = useState<ProfitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [costs, setCosts] = useState<Record<string, string>>({})
  const [shipping, setShipping] = useState('')
  const [returns, setReturns] = useState('')
  const [ad, setAd] = useState({ spentOn: today(), amount: '', product: '', channel: 'facebook' })

  async function load(d = days) {
    setLoading(true)
    try {
      const res = await profitApi.get(d)
      setData(res)
      setCosts(Object.fromEntries(res.products.map((p) => [p, res.costs[p] !== undefined ? String(res.costs[p]) : ''])))
      setShipping(res.settings.shippingCost === null ? '' : String(res.settings.shippingCost))
      setReturns(res.settings.returnCost === null ? '' : String(res.settings.returnCost))
    } catch (e) { toast.error((e as Error).message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load(days) }, [days])

  async function saveCosts() {
    setSaving(true)
    try {
      await profitApi.saveCosts({
        products: Object.entries(costs).map(([name, unitCost]) => ({ name, unitCost: unitCost.replace(',', '.') })),
        shippingCost: shipping.replace(',', '.'), returnCost: returns.replace(',', '.'),
      })
      toast.success('Coûts enregistrés')
      await load()
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  async function addAd() {
    if (!(Number(ad.amount.replace(',', '.')) > 0)) { toast.error('Entrez le montant dépensé'); return }
    try {
      await profitApi.addAd({ ...ad, amount: ad.amount.replace(',', '.') })
      toast.success('Dépense ajoutée')
      setAd({ ...ad, amount: '' })
      await load()
    } catch (e) { toast.error((e as Error).message) }
  }

  async function removeAd(id: number) {
    try { await profitApi.deleteAd(id); toast.success('Dépense supprimée'); await load() }
    catch (e) { toast.error((e as Error).message) }
  }

  const r = data?.report
  const missing = r?.missing
  const needsSetup = !!missing && (missing.productCosts.length > 0 || missing.shippingCost || missing.returnCost)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.profit')} subtitle="Ce que chaque produit vous rapporte vraiment" />
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', gap: 6 }} role="group" aria-label="Période">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${days === d ? 'var(--brand)' : 'var(--border)'}`,
              background: days === d ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--card)',
              color: days === d ? 'var(--brand)' : 'var(--text)', fontWeight: days === d ? 600 : 400,
            }}>{d} jours</button>
          ))}
        </div>

        {loading && !data ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="h-5 w-5 animate-spin" style={{ display: 'inline' }} /></div>
        ) : r && (
          <>
            {needsSetup && (
              <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'flex-start', borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)', background: 'color-mix(in srgb, var(--warning) 7%, var(--card))' }}>
                <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                  Pour calculer votre bénéfice, renseignez plus bas
                  {missing!.productCosts.length > 0 && <> le prix d’achat de {missing!.productCosts.length === 1 ? `« ${missing!.productCosts[0]} »` : `${missing!.productCosts.length} produits`}</>}
                  {missing!.productCosts.length > 0 && (missing!.shippingCost || missing!.returnCost) && ' et'}
                  {(missing!.shippingCost || missing!.returnCost) && ' les frais de livraison de votre transporteur'}.
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Bénéfice net', value: dh(r.totals.profit), color: signColor(r.totals.profit) },
                { label: 'Marge', value: r.totals.margin === null ? '—' : `${r.totals.margin}%`, color: signColor(r.totals.margin) },
                { label: "Chiffre d'affaires livré", value: dh(r.totals.revenue), color: 'var(--text)' },
                { label: 'Publicité', value: dh(r.totals.ads), color: 'var(--text)', sub: r.totals.roas ? `ROAS ${r.totals.roas}` : undefined },
              ].map((k) => (
                <div key={k.label} style={{ ...card, padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
                  {k.sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{k.sub}</div>}
                </div>
              ))}
            </div>

            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Par produit</div>
              {r.products.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune commande sur cette période.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        <th style={{ ...th, textAlign: 'left' }}>Produit</th>
                        <th style={th}>Livrées</th><th style={th}>CA</th><th style={th}>Achat</th>
                        <th style={th}>Livraison</th><th style={th}>Pub</th><th style={th}>Bénéfice</th>
                        <th style={th}>Par livrée</th><th style={th}>Marge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.products.map((p) => (
                        <tr key={p.name} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal', fontWeight: 500, color: 'var(--text)' }}>
                            {p.name}
                            {p.missingCost && <div style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 400 }}>Prix d’achat manquant</div>}
                          </td>
                          <td style={td}>{p.delivered}<span style={{ color: 'var(--text-muted)' }}> / {p.orders}</span></td>
                          <td style={td}>{dh(p.revenue)}</td>
                          <td style={td}>{dh(p.goods)}</td>
                          <td style={td}>{dh(p.delivery + p.fees)}</td>
                          <td style={td}>{dh(p.ads)}</td>
                          <td style={{ ...td, fontWeight: 700, color: signColor(p.profit) }}>{dh(p.profit)}</td>
                          <td style={{ ...td, color: signColor(p.profitPerDelivered) }}>{dh(p.profitPerDelivered)}</td>
                          <td style={td}>{p.margin === null ? '—' : `${p.margin}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
                    Seules les commandes livrées comptent dans le CA (paiement à la livraison). « Livraison » inclut les frais des colis retournés et les frais Sellio.
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Vos coûts</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>À remplir une fois, modifiable à tout moment.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Frais par colis livré (DH)
                    <input inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder="ex. 35" style={{ ...input, marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Frais par colis retourné (DH)
                    <input inputMode="decimal" value={returns} onChange={(e) => setReturns(e.target.value)} placeholder="ex. 15" style={{ ...input, marginTop: 4 }} />
                  </label>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Prix d’achat par unité (DH)</div>
                {Object.keys(costs).length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Vos produits apparaîtront ici après les premières commandes.</div>}
                {Object.keys(costs).map((name) => (
                  <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }} title={name}>{name}</span>
                    <input aria-label={`Prix d’achat ${name}`} inputMode="decimal" value={costs[name]} placeholder="—"
                      onChange={(e) => setCosts({ ...costs, [name]: e.target.value })} style={{ ...input, textAlign: 'right' }} />
                  </div>
                ))}
                <button onClick={saveCosts} disabled={saving} style={{ ...btn, marginTop: 14, opacity: saving ? 0.7 : 1 }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer les coûts
                </button>
              </div>

              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Dépenses publicitaires</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Ajoutez ce que vous avez dépensé (par jour ou par semaine).</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date
                    <input type="date" value={ad.spentOn} max={today()} onChange={(e) => setAd({ ...ad, spentOn: e.target.value })} style={{ ...input, marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Montant (DH)
                    <input inputMode="decimal" value={ad.amount} onChange={(e) => setAd({ ...ad, amount: e.target.value })} placeholder="ex. 300" style={{ ...input, marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Produit
                    <select value={ad.product} onChange={(e) => setAd({ ...ad, product: e.target.value })} style={{ ...input, marginTop: 4 }}>
                      <option value="">Toute la boutique</option>
                      {(data?.products ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Plateforme
                    <select value={ad.channel} onChange={(e) => setAd({ ...ad, channel: e.target.value })} style={{ ...input, marginTop: 4 }}>
                      {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                </div>
                <button onClick={addAd} style={{ ...btn, marginTop: 14 }}>Ajouter la dépense</button>

                {(data?.ads ?? []).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    {data!.ads.map((a) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)', width: 82, flexShrink: 0 }}>{new Date(a.spent_on).toLocaleDateString('fr-MA')}</span>
                        <span style={{ flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.product_name ?? 'Toute la boutique'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{dh(a.amount_mad)}</span>
                        <button onClick={() => removeAd(a.id)} aria-label="Supprimer la dépense" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
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
