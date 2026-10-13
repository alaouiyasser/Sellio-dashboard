'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, ComposedChart, Bar as RBar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import {
  Wallet, Banknote, TrendingUp, TrendingDown, Store, ShoppingCart, Truck, MessageSquare, Filter, Calculator,
  BellRing, AlertTriangle, ChevronRight, PiggyBank, Activity,
} from 'lucide-react'
import { adminApi, type Overview, type MerchantLine } from '@/lib/admin-api'
import {
  Card, Kpi, Bar, Badge, PeriodPicker, PageHead, Skeleton, ErrorBox, mad, int, pct,
  PURPOSE_LABEL, FLAG_META, EXPENSE_LABEL,
} from '@/components/admin/ui'

const tooltipStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text)' }
const axisTick = { fontSize: 11, fill: 'var(--text-muted)' }

export default function AdminOverviewPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Overview | null>(null)
  const [merchants, setMerchants] = useState<MerchantLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chart, setChart] = useState<'orders' | 'money'>('orders')

  const load = useCallback(() => {
    setError(null); setData(null); setMerchants(null)
    Promise.all([adminApi.overview(days), adminApi.merchants(days)])
      .then(([o, m]) => { setData(o); setMerchants(m.merchants) })
      .catch((e) => setError(e.message))
  }, [days])
  useEffect(load, [load])

  const series = useMemo(() => (data?.series ?? []).map((r) => ({
    ...r, label: new Date(r.day + 'T00:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
  })), [data])

  return (
    <div className="admin-page" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1400 }}>
      <PageHead
        title="Vue d'ensemble"
        subtitle={data ? `Du ${new Date(data.period.from).toLocaleDateString('fr-FR')} au ${new Date(data.period.to).toLocaleDateString('fr-FR')} · WhatsApp : ${data.waProvider === 'cloud' ? 'Cloud API (payant)' : 'Evolution (gratuit)'}` : 'Santé financière et opérationnelle de Sellio'}
        right={<PeriodPicker value={days} onChange={setDays} />}
      />

      {error && <ErrorBox message={error} onRetry={load} />}

      {!data && !error && (
        <>
          <div className="admin-grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={118} />)}</div>
          <div className="admin-grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={118} />)}</div>
          <div className="admin-grid-main"><Skeleton h={340} /><Skeleton h={340} /></div>
        </>
      )}

      {data && <Body data={data} merchants={merchants ?? []} series={series} chart={chart} setChart={setChart} />}
    </div>
  )
}

function Body({ data, merchants, series, chart, setChart }: {
  data: Overview; merchants: MerchantLine[]; series: (Overview['series'][number] & { label: string })[]
  chart: 'orders' | 'money'; setChart: (c: 'orders' | 'money') => void
}) {
  const { pnl, funnel: f, messages: msg, reminder, merchants: mc } = data
  const profitTone = pnl.profit >= 0 ? 'success' : 'destructive'

  const costRows = [
    { k: 'WhatsApp', v: pnl.costs.whatsapp },
    { k: EXPENSE_LABEL.ads, v: pnl.costs.ads },
    { k: EXPENSE_LABEL.infra, v: pnl.costs.infra },
    { k: EXPENSE_LABEL.tools, v: pnl.costs.tools },
    { k: EXPENSE_LABEL.other, v: pnl.costs.other },
  ]

  const funnelSteps = [
    { k: 'Reçues', v: f.received, tone: 'muted' as const },
    { k: 'Confirmées', v: f.confirmed, tone: 'brand' as const },
    { k: 'Expédiées', v: f.shipped, tone: 'warning' as const },
    { k: 'Livrées', v: f.delivered, tone: 'success' as const },
  ]

  const purposes = Object.entries(msg.byPurpose).sort((a, b) => b[1].count - a[1].count)
  const maxPurpose = Math.max(1, ...purposes.map(([, p]) => p.count))

  const top = [...merchants].sort((a, b) => b.revenue - a.revenue).filter((m) => m.funnel.received > 0).slice(0, 6)
  const alerts = merchants.filter((m) => m.flags.some((fl) => fl !== 'inactive_7d') && (m.funnel.received > 0 || m.lastOrderAt))
    .sort((a, b) => b.flags.length - a.flags.length).slice(0, 6)

  return (
    <>
      {/* Money */}
      <div className="admin-grid-4">
        <Kpi label="Revenu net" icon={Wallet} value={mad(pnl.revenue)}
          sub={`${int(f.delivered)} livraisons facturées`}
          hint="Crédits consommés par les commandes livrées, moins les remboursements (retours)." />
        <Kpi label="Encaissé" icon={Banknote} tone="brand" value={mad(pnl.cashIn)}
          sub="Recharges des marchands" hint="Argent réellement payé par les marchands (recharges) sur la période." />
        <Kpi label="Coûts totaux" icon={TrendingDown} tone="warning" value={mad(pnl.costs.total)}
          sub={`WhatsApp ${mad(pnl.costs.whatsapp)} · Pub ${mad(pnl.costs.ads)}`} />
        <Kpi label="Bénéfice net" icon={pnl.profit >= 0 ? TrendingUp : TrendingDown} tone={profitTone}
          value={<span style={{ color: `var(--${profitTone})` }}>{mad(pnl.profit)}</span>}
          sub={pnl.marginPct === null ? 'Aucun revenu sur la période' : `Marge ${pct(pnl.marginPct)}`} />
      </div>

      {/* Business */}
      <div className="admin-grid-4">
        <Kpi label="Marchands actifs" icon={Store} value={`${int(mc.active)} / ${int(mc.total)}`}
          sub={`+${int(mc.newInPeriod)} inscrits · ${int(mc.paying)} payants (+${int(mc.newPaying)})`}
          hint="Actifs = au moins une commande sur la période. Payants = au moins une livraison facturée depuis toujours." />
        <Kpi label="Commandes reçues" icon={ShoppingCart} value={int(f.received)}
          sub={`GMV livrée ${mad(f.gmv)}`} hint="GMV = valeur des commandes livrées des marchands." />
        <Kpi label="Taux de livraison" icon={Truck} tone={(f.deliveryRate ?? 0) >= 50 ? 'success' : 'warning'} value={pct(f.deliveryRate)}
          sub={`Confirmation ${pct(f.confirmationRate)} · Succès transporteur ${pct(f.successRate)}`}
          hint="Livrées / reçues. Succès transporteur = livrées / (livrées + retournées)." />
        <Kpi label="Coût WhatsApp" icon={MessageSquare} tone="warning"
          value={pnl.perDelivered ? mad(pnl.perDelivered.whatsapp, true) : '—'}
          sub={`par livraison · ${msg.perOrder ?? '—'} msg / commande`} />
      </div>

      {/* Chart + P&L */}
      <div className="admin-grid-main">
        <Card title="Activité quotidienne" icon={Activity}
          right={
            <div style={{ display: 'inline-flex', gap: 4 }}>
              {(['orders', 'money'] as const).map((c) => (
                <button key={c} onClick={() => setChart(c)} style={{
                  border: '1px solid var(--border)', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: chart === c ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'transparent',
                  color: chart === c ? 'var(--brand)' : 'var(--text-muted)',
                }}>{c === 'orders' ? 'Commandes' : 'Revenu & coût'}</button>
              ))}
            </div>
          }>
          <div style={{ height: 290 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'color-mix(in srgb, var(--brand) 6%, transparent)' }}
                  formatter={(v, n) => (chart === 'money' ? [mad(Number(v), true), n] : [int(Number(v)), n])} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                {chart === 'orders' ? (
                  <>
                    <RBar dataKey="received" name="Reçues" fill="color-mix(in srgb, var(--brand) 28%, transparent)" radius={[4, 4, 0, 0]} />
                    <Line dataKey="delivered" name="Livrées" stroke="var(--success)" strokeWidth={2.2} dot={false} type="monotone" />
                  </>
                ) : (
                  <>
                    <RBar dataKey="revenue" name="Revenu" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                    <Line dataKey="msgCost" name="Coût WhatsApp" stroke="var(--warning)" strokeWidth={2.2} dot={false} type="monotone" />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Compte de résultat" icon={PiggyBank} hint="Revenu net − coûts WhatsApp − dépenses saisies (pub, infra, outils…).">
          <Line2 k="Revenu net" v={mad(pnl.revenue)} strong />
          <div style={{ margin: '10px 0', borderTop: '1px dashed var(--border)' }} />
          {costRows.map((r) => <Line2 key={r.k} k={r.k} v={r.v ? `− ${mad(r.v)}` : '—'} muted={!r.v} />)}
          <div style={{ margin: '10px 0', borderTop: '1px solid var(--border)' }} />
          <Line2 k="Bénéfice net" v={mad(pnl.profit)} strong tone={profitTone} />
          <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: 'color-mix(in srgb, var(--brand) 6%, transparent)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Encaissé : <b style={{ color: 'var(--text)' }}>{mad(pnl.cashIn)}</b>. Le reste des recharges est un crédit
            prépayé (dette envers les marchands) tant qu’il n’est pas consommé.
            <div style={{ marginTop: 8 }}>
              <Link href="/admin/expenses" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Saisir les dépenses →</Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Funnel · unit economics · messages */}
      <div className="admin-grid-3">
        <Card title="Entonnoir des commandes" icon={Filter}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {funnelSteps.map((s) => (
              <div key={s.k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text)' }}>{s.k}</span>
                  <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    <b style={{ color: 'var(--text)' }}>{int(s.v)}</b> · {pct(f.received ? Math.round((s.v / f.received) * 1000) / 10 : null)}
                  </span>
                </div>
                <Bar value={f.received ? (s.v / f.received) * 100 : 0} tone={s.tone} height={8} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <Badge tone="destructive">{int(f.cancelled)} annulées</Badge>
              <Badge tone="destructive">{int(f.returned)} retournées</Badge>
              <Badge>{int(f.pending)} en cours</Badge>
            </div>
          </div>
        </Card>

        <Card title="Unit economics" icon={Calculator} hint="Moyennes par commande livrée sur la période.">
          {pnl.perDelivered ? (
            <>
              <Line2 k="Revenu / livraison" v={mad(pnl.perDelivered.revenue, true)} />
              <Line2 k="Coût WhatsApp / livraison" v={`− ${mad(pnl.perDelivered.whatsapp, true)}`} />
              <Line2 k="Tous coûts / livraison" v={`− ${mad(pnl.perDelivered.allCosts, true)}`} />
              <div style={{ margin: '10px 0', borderTop: '1px solid var(--border)' }} />
              <Line2 k="Profit / livraison" v={mad(pnl.perDelivered.profit, true)} strong tone={pnl.perDelivered.profit >= 0 ? 'success' : 'destructive'} />
            </>
          ) : <Empty>Aucune livraison sur la période.</Empty>}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Mini label="CAC" value={pnl.cac === null ? '—' : mad(pnl.cac)} hint="Pub ÷ nouveaux marchands payants" />
            <Mini label="Taux USD/MAD" value={data.usdMad.toLocaleString('fr-MA')} hint="Pour convertir le coût Meta" />
          </div>
        </Card>

        <Card title="Messages WhatsApp" icon={MessageSquare} hint="Grand livre de chaque message envoyé. Evolution = gratuit, Cloud API = payant (Meta).">
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <Mini label="Envoyés" value={int(msg.total)} />
            <Mini label="Payants" value={int(msg.paid)} />
            <Mini label="Coût" value={mad(msg.costMad, true)} />
          </div>
          {purposes.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {purposes.map(([k, p]) => (
                <div key={k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text)' }}>{PURPOSE_LABEL[k] ?? k}</span>
                    <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{int(p.count)} · {mad(p.costMad, true)}</span>
                  </div>
                  <Bar value={(p.count / maxPurpose) * 100} />
                </div>
              ))}
            </div>
          ) : <Empty>Aucun message enregistré sur la période.</Empty>}
        </Card>
      </div>

      {/* Reminder · top merchants · alerts */}
      <div className="admin-grid-3">
        <Card title="Efficacité de la relance" icon={BellRing} hint="Commandes confirmées après la relance T+2h, parmi celles relancées.">
          <div style={{ fontSize: 30, fontWeight: 750, color: 'var(--text)', letterSpacing: '-0.02em' }}>{pct(reminder.rate)}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 14px' }}>
            {int(reminder.confirmedAfter)} confirmées sur {int(reminder.reminded)} relancées
          </div>
          <Bar value={reminder.rate ?? 0} tone={(reminder.rate ?? 0) >= 15 ? 'success' : 'warning'} height={8} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: '14px 0 0' }}>
            {reminder.reminded === 0 ? 'Pas encore de relance sur la période.'
              : (reminder.rate ?? 0) >= 15 ? 'La relance rapporte des confirmations : elle vaut son coût.'
              : 'Peu de confirmations après relance : à surveiller si WhatsApp devient payant.'}
          </p>
        </Card>

        <Card title="Top marchands" icon={TrendingUp} pad={false} right={<Link href="/admin/merchants" style={linkSm}>Tous <ChevronRight size={14} /></Link>}>
          <div style={{ padding: '0 8px 8px' }}>
            {top.length ? top.map((m) => (
              <Link key={m.id} href={`/admin/merchants/${m.id}`} className="admin-nav-item" style={rowLink}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)', fontWeight: 600 }}>{m.name}</span>
                <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 650 }}>{mad(m.revenue)}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{int(m.funnel.delivered)} livrées · {pct(m.funnel.deliveryRate)}</span>
                </span>
              </Link>
            )) : <div style={{ padding: 12 }}><Empty>Aucune commande sur la période.</Empty></div>}
          </div>
        </Card>

        <Card title="À surveiller" icon={AlertTriangle} pad={false} right={<Link href="/admin/merchants?filter=alerts" style={linkSm}>Voir <ChevronRight size={14} /></Link>}>
          <div style={{ padding: '0 8px 8px' }}>
            {alerts.length ? alerts.map((m) => (
              <Link key={m.id} href={`/admin/merchants/${m.id}`} className="admin-nav-item" style={{ ...rowLink, alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{m.name}</span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {m.flags.map((fl) => <Badge key={fl} tone={FLAG_META[fl]?.tone}>{FLAG_META[fl]?.label ?? fl}</Badge>)}
                </span>
              </Link>
            )) : <div style={{ padding: 12 }}><Empty>Rien à signaler.</Empty></div>}
          </div>
        </Card>
      </div>
    </>
  )
}

const linkSm: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none' }
const rowLink: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 13 }

function Line2({ k, v, strong, muted, tone }: { k: string; v: string; strong?: boolean; muted?: boolean; tone?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: strong ? 14 : 13 }}>
      <span style={{ color: strong ? 'var(--text)' : 'var(--text-muted)', fontWeight: strong ? 650 : 500 }}>{k}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: strong ? 750 : 600, color: tone ? `var(--${tone})` : muted ? 'var(--text-muted)' : 'var(--text)' }}>{v}</span>
    </div>
  )
}

function Mini({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>{children}</div>
}
