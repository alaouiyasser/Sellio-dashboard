'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Wallet, Truck, MessageSquare, Coins, CheckCircle2, Circle, Plug, Receipt, Package, Gift, Phone, AlertTriangle, Filter,
} from 'lucide-react'
import { adminApi, type MerchantDetail } from '@/lib/admin-api'
import {
  Card, Kpi, Bar, Badge, PeriodPicker, PageHead, Skeleton, ErrorBox, mad, int, pct, dateFr, ago, th, td, inputStyle, btn,
  FLAG_META, PURPOSE_LABEL, ORDER_STATUS,
} from '@/components/admin/ui'

const TX_LABEL: Record<string, string> = { order_delivered: 'Livraison facturée', order_returned: 'Remboursement retour', topup: 'Recharge' }

export default function AdminMerchantPage() {
  const { id } = useParams<{ id: string }>()
  const [days, setDays] = useState(30)
  const [d, setD] = useState<MerchantDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    adminApi.merchant(id, days).then(setD).catch((e) => setError(e.message))
  }, [id, days])
  useEffect(load, [load])

  const m = d?.merchant

  return (
    <div className="admin-page" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1400 }}>
      <Link href="/admin/merchants" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', width: 'fit-content' }}>
        <ArrowLeft size={15} /> Marchands
      </Link>

      <PageHead
        title={m?.name ?? 'Marchand'}
        subtitle={m ? `Inscrit le ${dateFr(m.createdAt)} · dernière commande ${ago(m.lastOrderAt)}${m.active ? '' : ' · compte désactivé'}` : undefined}
        right={<PeriodPicker value={days} onChange={setDays} />}
      />

      {error && <ErrorBox message={error} onRetry={load} />}
      {!d && !error && <><div className="admin-grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={118} />)}</div><Skeleton h={300} /></>}

      {d && m && (
        <>
          <div className="admin-grid-4">
            <Kpi label="Revenu net" icon={Wallet} value={mad(m.revenue)} sub={`Encaissé ${mad(m.cashIn)}`} />
            <Kpi label="Marge" icon={Coins} tone={m.margin >= 0 ? 'success' : 'destructive'} value={mad(m.margin)}
              sub={`Coût WhatsApp ${mad(m.msgCostMad, true)}`} hint="Revenu net − coût des messages WhatsApp de ce marchand." />
            <Kpi label="Taux de livraison" icon={Truck} tone={(m.funnel.deliveryRate ?? 0) >= 50 ? 'success' : 'warning'} value={pct(m.funnel.deliveryRate)}
              sub={`${int(m.funnel.delivered)} livrées / ${int(m.funnel.received)} reçues`} />
            <Kpi label="Crédits" icon={Wallet} tone={m.balance <= 100 ? 'warning' : 'brand'} value={`${int(m.balance)} DH`}
              sub={`≈ ${int(Math.floor(m.balance / 5))} livraisons restantes`} />
          </div>

          <div className="admin-grid-main">
            <Card title="Onboarding" icon={CheckCircle2} right={<Badge tone={m.progress === 100 ? 'success' : 'warning'}>{m.progress} %</Badge>}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${m.steps.length}, minmax(0, 1fr))`, gap: 8 }}>
                {m.steps.map((s, i) => (
                  <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', position: 'relative' }}>
                    {i > 0 && <span style={{ position: 'absolute', top: 11, right: '50%', width: '100%', height: 2, background: s.done ? 'var(--success)' : 'var(--border)', zIndex: 0 }} />}
                    <span style={{ position: 'relative', zIndex: 1, background: 'var(--card)', borderRadius: '50%', display: 'grid' }}>
                      {s.done ? <CheckCircle2 size={24} color="var(--success)" fill="color-mix(in srgb, var(--success) 14%, var(--card))" /> : <Circle size={24} color="var(--border)" />}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: s.done ? 'var(--text)' : 'var(--text-muted)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
              {m.flags.length > 0 && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {m.flags.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <AlertTriangle size={15} color={`var(--${FLAG_META[f]?.tone === 'muted' ? 'text-muted' : FLAG_META[f]?.tone ?? 'warning'})`} style={{ marginTop: 1, flexShrink: 0 }} />
                      <div style={{ fontSize: 12.5 }}>
                        <b style={{ color: 'var(--text)' }}>{FLAG_META[f]?.label ?? f}</b>
                        <span style={{ color: 'var(--text-muted)' }}> — {FLAG_META[f]?.help}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {d.ownerPhone && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  <Phone size={14} /> <a href={`https://wa.me/${d.ownerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>{d.ownerPhone}</a>
                </div>
              )}
            </Card>

            <GrantCredits id={m.id} onDone={load} />
          </div>

          <div className="admin-grid-3">
            <Card title="Entonnoir" icon={Filter}>
              {[
                ['Reçues', m.funnel.received, 'muted'], ['Confirmées', m.funnel.confirmed, 'brand'],
                ['Expédiées', m.funnel.shipped, 'warning'], ['Livrées', m.funnel.delivered, 'success'], ['Retournées', m.funnel.returned, 'destructive'],
              ].map(([k, v, tone]) => (
                <div key={k as string} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <span>{k}</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{int(v as number)}</b>
                  </div>
                  <Bar value={m.funnel.received ? ((v as number) / m.funnel.received) * 100 : 0} tone={tone as 'brand'} />
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Confirmation {pct(m.funnel.confirmationRate)} · Succès transporteur {pct(m.funnel.successRate)} · GMV {mad(m.funnel.gmv)}</div>
            </Card>

            <Card title="Messages WhatsApp" icon={MessageSquare}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>
                <span><b style={{ color: 'var(--text)', fontSize: 18 }}>{int(d.messages.total)}</b> envoyés</span>
                <span><b style={{ color: 'var(--text)', fontSize: 18 }}>{m.msgPerOrder ?? '—'}</b> / commande</span>
                <span><b style={{ color: 'var(--text)', fontSize: 18 }}>{m.costPerDelivered === null ? '—' : mad(m.costPerDelivered, true)}</b> / livraison</span>
              </div>
              {Object.entries(d.messages.byPurpose).sort((a, b) => b[1].count - a[1].count).map(([k, p]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{PURPOSE_LABEL[k] ?? k}</span>
                  <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{int(p.count)} · {mad(p.costMad, true)}</span>
                </div>
              ))}
              {!Object.keys(d.messages.byPurpose).length && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun message enregistré.</div>}
            </Card>

            <Card title="Intégrations" icon={Plug}>
              {d.integrations.length ? d.integrations.map((it) => (
                <div key={it.provider} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{it.provider} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11.5 }}>· {it.category === 'carrier' ? 'transporteur' : 'boutique'}</span></span>
                    <Badge tone={it.status === 'error' ? 'destructive' : it.status === 'disabled' ? 'muted' : 'success'}>{it.status === 'error' ? 'Erreur' : it.status === 'disabled' ? 'Désactivé' : 'Connecté'}</Badge>
                  </div>
                  {it.last_error && it.status === 'error' && <div style={{ fontSize: 11.5, color: 'var(--destructive)', marginTop: 4, whiteSpace: 'normal' }}>{it.last_error}</div>}
                </div>
              )) : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune intégration.</div>}
            </Card>
          </div>

          <div className="admin-grid-2">
            <Card title="Dernières commandes" icon={Package} pad={false}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Date</th><th style={th}>Réf.</th><th style={th}>Statut</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Transporteur</th></tr></thead>
                  <tbody>
                    {d.recentOrders.map((o) => {
                      const s = ORDER_STATUS[o.status] ?? { label: o.status, tone: 'muted' as const }
                      return (
                        <tr key={o.id} className="admin-row">
                          <td style={{ ...td, color: 'var(--text-muted)' }}>{dateFr(o.created_at, true)}</td>
                          <td style={td}>{o.external_id ?? o.id.slice(0, 8)}</td>
                          <td style={td}><Badge tone={s.tone}>{s.label}</Badge></td>
                          <td style={{ ...td, textAlign: 'right' }}>{o.total_price === null ? '—' : mad(Number(o.total_price))}</td>
                          <td style={{ ...td, color: 'var(--text-muted)' }}>{o.delivery_provider ? `${o.delivery_provider}${o.delivery_tracking_code ? ` · ${o.delivery_tracking_code}` : ''}` : '—'}</td>
                        </tr>
                      )
                    })}
                    {!d.recentOrders.length && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>Aucune commande.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Mouvements de crédits" icon={Receipt} pad={false}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Date</th><th style={th}>Opération</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, textAlign: 'right' }}>Solde</th></tr></thead>
                  <tbody>
                    {d.creditTx.map((t, i) => {
                      const credit = t.type === 'recharge' || t.reason === 'topup' || t.reason === 'order_returned'
                      return (
                        <tr key={i} className="admin-row">
                          <td style={{ ...td, color: 'var(--text-muted)' }}>{dateFr(t.created_at, true)}</td>
                          <td style={td}>{TX_LABEL[t.reason ?? ''] ?? (t.type === 'recharge' ? 'Recharge' : t.reason ?? t.type ?? '—')}</td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 650, color: credit ? 'var(--success)' : 'var(--text)' }}>{credit ? '+' : '−'}{int(Math.abs(Number(t.amount)))}</td>
                          <td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)' }}>{t.balance_after === null ? '—' : int(Number(t.balance_after))}</td>
                        </tr>
                      )
                    })}
                    {!d.creditTx.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>Aucun mouvement.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function GrantCredits({ id, onDone }: { id: string; onDone: () => void }) {
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const n = Number(amount)
  const valid = Number.isFinite(n) && n > 0 && n <= 100_000

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true); setMsg(null)
    try {
      const r = await adminApi.grantCredits(id, Math.round(n))
      setMsg({ ok: true, text: `${int(Math.round(n))} crédits ajoutés. Nouveau solde : ${int(r.newBalance)} DH.` })
      setAmount('')
      onDone()
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    } finally { setBusy(false) }
  }

  return (
    <Card title="Ajouter des crédits" icon={Gift} hint="Pour un paiement reçu hors ligne (virement, espèces) ou un geste commercial. Compté comme recharge.">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[100, 250, 500, 1000].map((v) => (
            <button type="button" key={v} onClick={() => setAmount(String(v))} style={{ ...btn('ghost'), padding: '6px 10px', fontSize: 12, borderColor: amount === String(v) ? 'var(--brand)' : 'var(--border)' }}>{v} DH</button>
          ))}
        </div>
        <input type="number" min={1} max={100000} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant en DH (1 crédit = 1 DH)" style={inputStyle} />
        <button type="submit" disabled={!valid || busy} style={{ ...btn('primary'), justifyContent: 'center', opacity: !valid || busy ? 0.55 : 1, cursor: !valid || busy ? 'not-allowed' : 'pointer' }}>
          {busy ? 'Ajout…' : valid ? `Ajouter ${int(Math.round(n))} crédits` : 'Ajouter des crédits'}
        </button>
        {msg && <div style={{ fontSize: 12.5, color: msg.ok ? 'var(--success)' : 'var(--destructive)' }}>{msg.text}</div>}
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          ≈ {valid ? int(Math.floor(n / 5)) : 0} livraisons à 5 DH. L’alerte « crédits bas » du marchand est réinitialisée.
        </p>
      </form>
    </Card>
  )
}
