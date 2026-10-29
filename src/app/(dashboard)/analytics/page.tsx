'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Wallet, MapPin, Package, Truck, XCircle, Tag, Info } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { carrierName } from '@/lib/shipping-api'
import { fetchAnalytics, type AnalyticsData, type GroupRow } from '@/lib/analytics-api'

import { tx } from '@/lib/i18n'
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }
const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--text)' }
const sub: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }
const th: React.CSSProperties = { padding: '6px 8px', fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }
const td: React.CSSProperties = { padding: '9px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text)' }
const dh = (n: number) => `${Math.round(n).toLocaleString('fr-MA')} DH`
const pctTxt = (n: number | null) => (n === null ? '—' : `${n.toLocaleString('fr-MA')} %`)
/** Below this many finished parcels a rate says little: shown muted. */
const MIN_BASE = 5

/** Return rate colour: the number a merchant acts on (cut a city, a product, a carrier). */
const returnColor = (rate: number | null, base: number) =>
  rate === null || base < MIN_BASE ? 'var(--text-muted)' : rate >= 35 ? 'var(--destructive)' : rate >= 20 ? 'var(--warning)' : 'var(--success)'

function Delta({ value, unit, invert }: { value: number | null; unit: string; invert?: boolean }) {
  if (value === null || value === 0) return null
  const good = invert ? value < 0 : value > 0
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: good ? 'var(--success)' : 'var(--destructive)' }}>
      {value > 0 ? '↑' : '↓'} {Math.abs(value).toLocaleString('fr-MA')}{unit}
    </span>
  )
}

function Funnel({ d }: { d: AnalyticsData }) {
  const f = d.funnel
  const steps = [
    { label: tx("Reçues"), value: f.received, note: null as string | null },
    { label: tx("Confirmées"), value: f.confirmed, note: f.received ? `${pctTxt(f.confirmationRate)} des reçues` : null },
    { label: tx("Expédiées"), value: f.shipped, note: f.confirmed ? `${pctTxt(Math.round((f.shipped / f.confirmed) * 1000) / 10)} des confirmées` : null },
    { label: tx("Livrées"), value: f.delivered, note: f.delivered + f.returned ? `${pctTxt(f.deliveryRate)} des colis arrivés au bout` : null },
  ]
  const max = Math.max(1, f.received)
  return (
    <div style={card}>
      <div style={head}>{tx("Du clic à l’encaissement")}</div>
      <div style={sub}>
        {tx("Sur")} {f.received} {tx("commandes,")} {f.delivered} {tx("ont été payées (")}{pctTxt(f.netRate)}). {f.cancelled} {tx("annulées,")} {f.returned} {tx("retournées.")}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s) => (
          <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{tx(s.label)}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ height: 22, width: `${Math.max(2, (s.value / max) * 100)}%`, borderRadius: 6, background: 'color-mix(in srgb, var(--brand) 70%, transparent)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.value}</span>
              </div>
              {s.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.note}</div>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
        <span>{tx("Commandes")} <Delta value={d.changes.received} unit=" %" /></span>
        <span>{tx("Confirmation")} <Delta value={d.changes.confirmationRate} unit=" pt" /></span>
        <span>{tx("Livraison")} <Delta value={d.changes.deliveryRate} unit=" pt" /></span>
        <span>{tx("Encaissé")} {dh(f.revenue)} <Delta value={d.changes.revenue} unit=" %" /></span>
        <span style={{ marginLeft: 'auto' }}>{tx("vs les")} {d.days} {tx("jours d’avant")}</span>
      </div>
    </div>
  )
}

function GroupTable({ rows, label, showRevenue }: { rows: GroupRow[]; label: string; showRevenue?: boolean }) {
  if (!rows.length) return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tx("Pas encore de commandes sur la période.")}</div>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ ...th, textAlign: 'left' }}>{label}</th>
            <th style={th}>{tx("Commandes")}</th>
            <th style={th}>{tx("Confirmées")}</th>
            <th style={th}>{tx("Livrées")}</th>
            <th style={th}>{tx("Retours")}</th>
            {showRevenue && <th style={th}>{tx("Encaissé")}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const base = r.delivered + r.returned
            return (
              <tr key={r.name} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...td, textAlign: 'left', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</td>
                <td style={td}>{r.orders}</td>
                <td style={td}>{pctTxt(r.confirmationRate)}</td>
                <td style={td}>{r.delivered}</td>
                <td style={{ ...td, fontWeight: 600, color: returnColor(r.returnRate, base) }} title={tx("{0} retour(s) sur {1} colis arrivés au bout", [r.returned, base])}>
                  {pctTxt(r.returnRate)}
                </td>
                {showRevenue && <td style={td}>{dh(r.revenue)}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function AnalyticsPage() {
  const isMobile = useIsMobile()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchAnalytics(days)
      .then((d) => { if (alive) setData(d) })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [days])

  const d = data
  const reasonsTotal = d?.cancelReasons.reduce((a, r) => a + r.count, 0) ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={tx("Analytiques")} subtitle={tx("Où vous gagnez, où vous perdez, et quoi changer")} />
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[7, 30, 90].map((n) => (
            <button key={n} onClick={() => setDays(n)} aria-pressed={days === n} style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${days === n ? 'var(--brand)' : 'var(--border)'}`,
              background: days === n ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--card)',
              color: days === n ? 'var(--brand)' : 'var(--text)', fontWeight: days === n ? 600 : 400,
            }}>{n} {tx("jours")}</button>
          ))}
          {loading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} />}
        </div>

        {!d ? (!loading && <div style={{ ...card, fontSize: 13, color: 'var(--text-muted)' }}>{tx("Impossible de charger les analytiques.")}</div>) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
              <Funnel d={d} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={card}>
                  <div style={head}><Wallet size={16} strokeWidth={2.2} color="var(--brand)" /> {tx("Argent en route")}</div>
                  <div style={sub}>{tx("Contre-remboursement des colis chez les transporteurs, pas encore livrés.")}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>{dh(d.cash.amount)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{d.cash.parcels} {tx("colis")}</div>
                  {d.cash.stuck > 0 && (
                    <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8, fontSize: 12, background: 'color-mix(in srgb, var(--destructive) 10%, transparent)', color: 'var(--destructive)' }}>
                      {d.cash.stuck} {tx("colis (")}{dh(d.cash.stuckAmount)}{tx(") en route depuis plus de 5 jours — relancez le transporteur.")}
                    </div>
                  )}
                </div>
                <div style={card}>
                  <div style={head}><XCircle size={16} strokeWidth={2.2} color="var(--destructive)" /> {tx("Pourquoi ils annulent")}</div>
                  <div style={sub}>{tx("Ce que les clients répondent sur WhatsApp (")}{reasonsTotal} {tx("annulation")}{reasonsTotal > 1 ? 's' : ''}).</div>
                  {d.cancelReasons.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tx("Aucune annulation sur la période.")}</div>
                    : d.cancelReasons.map((r) => (
                      <div key={r.reason} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, color: 'var(--text)' }}>
                          <span>{r.reason}</span><span style={{ fontWeight: 600 }}>{r.count}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 4, background: 'var(--border)' }}>
                          <div style={{ width: `${r.share ?? 0}%`, height: '100%', borderRadius: 4, background: 'var(--destructive)' }} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={head}><MapPin size={16} strokeWidth={2.2} color="var(--brand)" /> {tx("Villes")}</div>
              <div style={sub}>
                {tx("Une ville avec beaucoup de commandes mais beaucoup de retours vous coûte de la pub et des frais de retour. « Tanja », « طنجة » et « Tanger » comptent comme une seule ville.")}
              </div>
              <GroupTable rows={d.cities} label={tx("Ville")} />
            </div>

            <div style={card}>
              <div style={head}><Package size={16} strokeWidth={2.2} color="var(--chart-2)" /> {tx("Produits")}</div>
              <div style={sub}>{tx("Un produit qui se vend bien mais revient souvent n’est pas rentable — voir aussi Rentabilité.")}</div>
              <GroupTable rows={d.products} label={tx("Produit")} showRevenue />
            </div>

            <div style={card}>
              <div style={head}><Truck size={16} strokeWidth={2.2} color="var(--brand)" /> {tx("Transporteurs")}</div>
              <div style={sub}>{tx("Délai = de la confirmation à la livraison (médiane). Comparez avant de choisir où envoyer.")}</div>
              {d.carriers.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tx("Aucun colis expédié sur la période.")}</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ ...th, textAlign: 'left' }}>{tx("Transporteur")}</th>
                        <th style={th}>{tx("Expédiés")}</th><th style={th}>{tx("Livrés")}</th><th style={th}>{tx("Retours")}</th>
                        <th style={th}>{tx("Délai")}</th><th style={th}>{tx("En route")}</th><th style={th}>{tx("Bloqués +5 j")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.carriers.map((c) => (
                        <tr key={c.provider} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ ...td, textAlign: 'left' }}>{carrierName(c.provider)}</td>
                          <td style={td}>{c.shipped}</td>
                          <td style={td}>{c.delivered}</td>
                          <td style={{ ...td, fontWeight: 600, color: returnColor(c.returnRate, c.delivered + c.returned) }}>{pctTxt(c.returnRate)}</td>
                          <td style={td}>{c.medianDays === null ? '—' : `${c.medianDays.toLocaleString('fr-MA')} j`}</td>
                          <td style={td}>{c.inTransit}</td>
                          <td style={{ ...td, color: c.stuck ? 'var(--destructive)' : 'var(--text)', fontWeight: c.stuck ? 600 : 400 }}>{c.stuck}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={card}>
              <div style={head}><Tag size={16} strokeWidth={2.2} color="var(--brand)" /> {tx("Offres")}</div>
              <div style={sub}>
                {tx("Sur la période :")} {d.upsell.offered} {tx("offre")}{d.upsell.offered > 1 ? 's' : ''} {tx("proposée")}{d.upsell.offered > 1 ? 's' : ''}, {d.upsell.accepted} {tx("acceptée")}{d.upsell.accepted > 1 ? 's' : ''} ({pctTxt(d.upsell.acceptanceRate)}).
              </div>
              {d.offers.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tx("Aucune offre créée. Page Offres pour en ajouter une.")}</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ ...th, textAlign: 'left' }}>{tx("Offre (depuis sa création)")}</th>
                        <th style={th}>{tx("Proposée")}</th><th style={th}>{tx("Acceptée")}</th><th style={th}>{tx("Taux")}</th><th style={th}>{tx("Chiffre en plus")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.offers.map((o) => (
                        <tr key={o.title} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ ...td, textAlign: 'left' }}>{o.title}{o.status !== 'active' && <span style={{ color: 'var(--text-muted)' }}> {tx("· en pause")}</span>}</td>
                          <td style={td}>{o.shown}</td><td style={td}>{o.accepted}</td>
                          <td style={td}>{pctTxt(o.acceptanceRate)}</td><td style={td}>{dh(o.extraRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{tx("Retours = colis retournés sur les colis arrivés au bout (livrés + retournés). En gris : moins de")} {MIN_BASE} {tx("colis, trop peu pour conclure.")}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
