'use client'
// Founder console → Rentabilité: is a delivered order worth it, how many deliveries pay the
// fixed costs, what a merchant is worth over their life, how low the price can go.
// Numbers come from /api/admin/overview (real messages, deliveries, expenses); the simulator
// on the right is local and changes nothing.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Calculator, Coins, Target, Users, Layers, SlidersHorizontal, Scale } from 'lucide-react'
import { adminApi, type Overview } from '@/lib/admin-api'
import { Card, Kpi, Bar, Badge, PeriodPicker, PageHead, Skeleton, ErrorBox, mad, int, pct, inputStyle } from '@/components/admin/ui'

// Until there are deliveries to measure: ~4.4 Meta messages per received order, 60 % delivered.
const EST = { msgsPerOrder: 4.4, deliveryRate: 60 }
const TIERS = [
  { from: 1, to: 1000, price: 5 },
  { from: 1001, to: 3000, price: 4 },
  { from: 3001, to: null as number | null, price: 3.5 },
]

/** Marginal tiers (like income tax): only the deliveries above a threshold get the lower price. */
function tieredRevenue(delivered: number) {
  let left = delivered, total = 0
  for (const t of TIERS) {
    const size = t.to === null ? Infinity : t.to - t.from + 1
    const n = Math.min(left, size)
    total += n * t.price; left -= n
    if (left <= 0) break
  }
  return total
}

export default function EconomicsPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null); setData(null)
    adminApi.overview(days).then(setData).catch((e) => setError(e.message))
  }, [days])
  useEffect(load, [load])

  return (
    <div className="admin-page" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1400 }}>
      <PageHead
        title="Rentabilité"
        subtitle="Ce que rapporte une commande livrée, combien il en faut, et ce que vaut un marchand"
        right={<PeriodPicker value={days} onChange={setDays} />}
      />
      {error && <ErrorBox message={error} onRetry={load} />}
      {!data && !error && (
        <>
          <div className="admin-grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={118} />)}</div>
          <div className="admin-grid-2"><Skeleton h={300} /><Skeleton h={300} /></div>
        </>
      )}
      {data && !data.unit && <ErrorBox message="L'API ne renvoie pas encore la rentabilité : déployez la dernière version de l'API." onRetry={load} />}
      {data?.unit && <Body data={data} />}
    </div>
  )
}

function Body({ data }: { data: Overview }) {
  const u = data.unit!
  const a = u.assumptions
  const costMsg = data.waCostPerMessageMad ?? 0.226
  const measured = !!u.perDelivered
  const estVariable = (EST.msgsPerOrder * costMsg + a.aiMadPerOrder) / (EST.deliveryRate / 100) + a.price * a.taxRate
  const variable = u.perDelivered?.variable ?? Math.round(estVariable * 100) / 100
  const margin = u.perDelivered?.margin ?? Math.round((a.price - estVariable) * 100) / 100
  const floor = u.floorPrice ?? Math.round((estVariable + a.minMargin) * 100) / 100
  const now = u.monthly.delivered
  const be = u.monthly.breakEvenDelivered
  const goal = u.monthly.targetDelivered

  return (
    <>
      <div className="admin-grid-4">
        <Kpi label="Marge par livraison" icon={Coins} tone={margin >= a.minMargin ? 'success' : 'warning'}
          value={mad(margin, true)}
          sub={measured ? `${pct(u.perDelivered!.marginPct)} du prix de ${mad(a.price, true)}` : 'Estimation : aucune livraison sur la période'}
          hint="Prix − coût WhatsApp − IA − impôt, par commande livrée. Les messages des commandes annulées ou retournées sont comptés." />
        <Kpi label="Point mort" icon={Scale} tone={be !== null && now >= be ? 'success' : 'warning'}
          value={be === null ? '—' : `${int(be)} livrées/mois`}
          sub={`Aujourd'hui ≈ ${int(Math.round(now))}/mois · coûts fixes ${mad(u.monthly.fixedCosts)}`}
          hint="Livraisons par mois qui couvrent les coûts fixes saisis (infra, outils, autre), hors pub." />
        <Kpi label={`Objectif ${mad(a.targetProfit)} / mois`} icon={Target} tone="brand"
          value={goal === null ? '—' : `${int(goal)} livrées/mois`}
          sub={goal === null ? 'Saisir les dépenses pour le calculer' : `≈ ${int(Math.ceil(goal / 30))} par jour`}
          hint="Livraisons par mois pour atteindre ce bénéfice après coûts fixes (variable TARGET_PROFIT_MAD)." />
        <Kpi label="LTV / CAC" icon={Users} tone={(u.merchant.ltvToCac ?? 0) >= 3 ? 'success' : 'warning'}
          value={u.merchant.ltvToCac === null ? '—' : `${u.merchant.ltvToCac.toLocaleString('fr-MA')} ×`}
          sub={u.merchant.cac === null ? 'CAC : pas de pub ou pas de nouveau payant' : `LTV ${mad(u.merchant.ltv)} · CAC ${mad(u.merchant.cac)}`}
          hint="Ce que rapporte un marchand sur sa durée de vie ÷ ce que coûte son acquisition en pub. Viser 3 × ou plus." />
      </div>

      <div className="admin-grid-2">
        <Card title="Une commande livrée" icon={Calculator}
          hint={measured ? 'Mesuré sur la période : grand livre des messages, commandes et dépenses.' : 'Estimation tant qu’aucune commande n’est livrée sur la période.'}>
          <Row k="Prix facturé" v={mad(a.price, true)} strong />
          <div style={{ margin: '8px 0', borderTop: '1px dashed var(--border)' }} />
          <Row k="Messages WhatsApp (Meta)" v={`− ${mad(u.perDelivered?.whatsapp ?? (EST.msgsPerOrder * costMsg) / (EST.deliveryRate / 100), true)}`} />
          <Row k="IA (réponses, vocaux)" v={`− ${mad(u.perDelivered?.ai ?? a.aiMadPerOrder / (EST.deliveryRate / 100), true)}`} />
          <Row k={`Impôt (${pct(a.taxRate * 100)})`} v={`− ${mad(a.price * a.taxRate, true)}`} />
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border)' }} />
          <Row k="Coût variable" v={mad(variable, true)} />
          <Row k="Marge" v={mad(margin, true)} strong tone={margin >= a.minMargin ? 'success' : 'destructive'} />
          <Note>
            {int(data.messages.total)} messages sur la période, {data.messages.perOrder ?? '—'} par commande reçue,
            {' '}{mad(costMsg, true)} le message (tarif Meta Maroc depuis le 1er octobre 2026). Chaque message en moins
            par commande économise environ {mad(costMsg / (EST.deliveryRate / 100), true)} par livraison.
          </Note>
        </Card>

        <Card title="Ce que vaut un marchand" icon={Users}
          hint="Marge mensuelle moyenne des marchands payants × durée de vie. Rétention = payants de la période précédente encore payants.">
          <Row k="Marchands payants sur la période" v={int(u.merchant.payers)} />
          <Row k="Marge par marchand et par mois" v={mad(u.merchant.marginPerMonth)} strong />
          <Row k="Rétention (période précédente)" v={data.retention?.keptRate === null || !data.retention ? '—' : `${pct(data.retention.keptRate)} (${data.retention.kept}/${data.retention.previousPayers})`} />
          <Row k="Départs par mois" v={pct(data.retention?.monthlyChurn ?? null)} />
          <Row k="Durée de vie" v={`${u.merchant.lifetimeMonths ?? a.fallbackLifetimeMonths} mois`}
            tone={u.merchant.lifetimeMeasured ? undefined : 'warning'} />
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border)' }} />
          <Row k="LTV (marge sur la durée de vie)" v={mad(u.merchant.ltv)} strong />
          <Row k="CAC (pub ÷ nouveaux payants)" v={mad(u.merchant.cac)} />
          <Note>
            {u.merchant.lifetimeMeasured
              ? 'Durée de vie mesurée sur vos marchands.'
              : `Durée de vie supposée (${a.fallbackLifetimeMonths} mois) : elle sera mesurée dès 3 marchands payants sur deux périodes.`}
            {' '}Saisir la pub dans <Link href="/admin/expenses" style={{ color: 'var(--brand)', fontWeight: 600 }}>Coûts & dépenses</Link> pour obtenir le CAC.
          </Note>
        </Card>
      </div>

      <div className="admin-grid-2">
        <Card title="Jusqu'où baisser le prix" icon={Layers}
          hint={`Prix plancher = coût variable + ${mad(a.minMargin, true)} de marge minimum (MIN_MARGIN_MAD).`}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 28, fontWeight: 750, color: 'var(--text)' }}>{mad(floor, true)}</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>prix plancher par livraison{measured ? '' : ' (estimation)'}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: 11.5, textAlign: 'left' }}>
                <th style={{ padding: '6px 4px', fontWeight: 600 }}>Livrées / mois</th>
                <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'right' }}>Prix</th>
                <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'right' }}>Marge</th>
                <th style={{ padding: '6px 4px' }} />
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t) => {
                const m = t.price - (variable - a.price * a.taxRate) - t.price * a.taxRate
                const ok = m >= a.minMargin
                return (
                  <tr key={t.from} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 4px' }}>{int(t.from)} {t.to === null ? 'et plus' : `→ ${int(t.to)}`}</td>
                    <td style={{ padding: '9px 4px', textAlign: 'right', fontWeight: 650 }}>{mad(t.price, true)}</td>
                    <td style={{ padding: '9px 4px', textAlign: 'right' }}>{mad(m, true)}</td>
                    <td style={{ padding: '9px 4px', textAlign: 'right' }}><Badge tone={ok ? 'success' : 'warning'}>{ok ? 'OK' : 'Trop bas'}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Note>
            Tranches marginales : seules les livraisons au-dessus d'un seuil passent au prix réduit, donc la facture du
            marchand ne baisse jamais quand il grandit. Réserver 3,5 DH aux marchands dont le taux de livraison dépasse 55 %.
          </Note>
        </Card>

        <Simulator costMsg={costMsg} a={a} msgsDefault={data.messages.perOrder ?? EST.msgsPerOrder} />
      </div>
    </>
  )
}

function Simulator({ costMsg, a, msgsDefault }: { costMsg: number; a: NonNullable<Overview['unit']>['assumptions']; msgsDefault: number }) {
  const [orders, setOrders] = useState(30)
  const [rate, setRate] = useState(60)
  const [msgs, setMsgs] = useState(Math.round(msgsDefault * 10) / 10)
  const [tiered, setTiered] = useState(false)

  const r = useMemo(() => {
    const received = orders * 30
    const delivered = Math.round(received * (rate / 100))
    const revenue = tiered ? tieredRevenue(delivered) : delivered * a.price
    const whatsapp = received * msgs * costMsg
    const ai = received * a.aiMadPerOrder
    const tax = revenue * a.taxRate
    const margin = revenue - whatsapp - ai - tax
    return { received, delivered, revenue, whatsapp, ai, tax, margin, perDelivered: delivered ? margin / delivered : 0 }
  }, [orders, rate, msgs, tiered, costMsg, a])

  return (
    <Card title="Simuler un client" icon={SlidersHorizontal} hint="Calcul local : ne change rien dans Sellio.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Field label="Commandes / jour" value={orders} onChange={setOrders} min={1} max={2000} />
        <Field label="Taux de livraison %" value={rate} onChange={setRate} min={1} max={100} />
        <Field label="Messages / commande" value={msgs} onChange={setMsgs} min={0} max={30} step={0.1} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text)', marginBottom: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={tiered} onChange={(e) => setTiered(e.target.checked)} /> Prix dégressif (5 → 4 → 3,5 DH)
      </label>
      <Row k="Livrées par mois" v={int(r.delivered)} />
      <Row k="Ce que paie le marchand" v={mad(r.revenue)} strong />
      <Row k="WhatsApp (Meta)" v={`− ${mad(r.whatsapp)}`} />
      <Row k="IA + impôt" v={`− ${mad(r.ai + r.tax)}`} />
      <div style={{ margin: '8px 0', borderTop: '1px solid var(--border)' }} />
      <Row k="Ta marge par mois" v={mad(r.margin)} strong tone={r.margin >= 0 ? 'success' : 'destructive'} />
      <Row k="Par livraison" v={mad(r.perDelivered, true)} tone={r.perDelivered >= a.minMargin ? undefined : 'warning'} />
      <div style={{ marginTop: 10 }}><Bar value={r.revenue ? Math.max(0, (r.margin / r.revenue) * 100) : 0} tone={r.perDelivered >= a.minMargin ? 'success' : 'warning'} height={8} /></div>
    </Card>
  )
}

function Field({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
      {label}
      <input type="number" value={value} min={min} max={max} step={step} inputMode="decimal"
        onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n))) }}
        style={{ ...inputStyle, width: '100%' }} />
    </label>
  )
}

function Row({ k, v, strong, tone }: { k: string; v: string; strong?: boolean; tone?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: strong ? 14 : 13 }}>
      <span style={{ color: strong ? 'var(--text)' : 'var(--text-muted)', fontWeight: strong ? 650 : 500 }}>{k}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: strong ? 750 : 600, color: tone ? `var(--${tone})` : 'var(--text)' }}>{v}</span>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'color-mix(in srgb, var(--brand) 6%, transparent)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
      {children}
    </div>
  )
}
