'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowUpDown, ArrowDown, ArrowUp, Store, Rocket, AlertTriangle, CircleCheck, Users, Compass } from 'lucide-react'
import { adminApi, type MerchantLine } from '@/lib/admin-api'
import {
  Card, Kpi, Bar, Badge, PeriodPicker, PageHead, Skeleton, ErrorBox, mad, int, pct, ago, dateFr, th, td, inputStyle, FLAG_META,
} from '@/components/admin/ui'
import { SOURCE_LABEL, NICHE_LABEL, VOLUME_LABEL, nicheKey, cityKey } from '@/lib/merchant-profile'

type Filter = 'all' | 'alerts' | 'onboarding' | 'active'
type SortKey = 'name' | 'progress' | 'received' | 'deliveryRate' | 'revenue' | 'msgCostMad' | 'margin' | 'balance' | 'lastOrderAt'

const FILTERS: { k: Filter; label: string }[] = [
  { k: 'all', label: 'Tous' }, { k: 'active', label: 'Actifs' }, { k: 'onboarding', label: 'Onboarding incomplet' }, { k: 'alerts', label: 'Alertes' },
]

const sortVal = (m: MerchantLine, k: SortKey): number | string => {
  switch (k) {
    case 'name': return m.name.toLowerCase()
    case 'received': return m.funnel.received
    case 'deliveryRate': return m.funnel.deliveryRate ?? -1
    case 'lastOrderAt': return m.lastOrderAt ? Date.parse(m.lastOrderAt) : 0
    default: return m[k]
  }
}

type Profile = NonNullable<MerchantLine['profile']>
const DIMENSIONS: { title: string; pick: (p: Profile | undefined) => string | null; label: (k: string) => string; top?: number }[] = [
  { title: 'Nous ont connus par', pick: (p) => p?.source ?? null, label: (k) => SOURCE_LABEL[k] ?? k },
  { title: 'Type de produit', pick: (p) => nicheKey(p?.niche), label: (k) => NICHE_LABEL[k] ?? k },
  { title: 'Ville', pick: (p) => cityKey(p?.city), label: (k) => k, top: 6 },
  { title: 'Commandes / mois', pick: (p) => p?.volume ?? null, label: (k) => VOLUME_LABEL[k] ?? k },
]

/** One column of the profile card: answers ranked by number of merchants. */
function Breakdown({ rows, dim }: { rows: MerchantLine[]; dim: (typeof DIMENSIONS)[number] }) {
  const counts = new Map<string, number>()
  let missing = 0
  for (const m of rows) {
    const k = dim.pick(m.profile)
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1); else missing++
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const shown = ranked.slice(0, dim.top ?? ranked.length)
  const others = ranked.slice(shown.length).reduce((s, [, n]) => s + n, 0)
  const max = Math.max(1, ...ranked.map(([, n]) => n))
  return (
    <div style={{ minWidth: 0 }}>
      <h3 style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-muted)', margin: '0 0 12px' }}>{dim.title}</h3>
      {shown.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>Pas encore de réponse.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.map(([k, n]) => (
          <div key={k}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 4 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dim.label(k)}</span>
              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</b>
            </div>
            <Bar value={(n / max) * 100} />
          </div>
        ))}
      </div>
      {(others > 0 || missing > 0) && (
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '10px 0 0' }}>
          {[others > 0 && `${others} autres`, missing > 0 && `${missing} sans réponse`].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  )
}

export default function AdminMerchantsPage() {
  const router = useRouter()
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState<MerchantLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'revenue', dir: -1 })

  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get('filter')
    if (f && FILTERS.some((x) => x.k === f)) setFilter(f as Filter)
  }, [])

  const load = useCallback(() => {
    setError(null); setRows(null)
    adminApi.merchants(days).then((r) => setRows(r.merchants)).catch((e) => setError(e.message))
  }, [days])
  useEffect(load, [load])

  const hasAlert = (m: MerchantLine) => m.flags.some((f) => f !== 'inactive_7d')
  const list = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    return rows
      .filter((m) => !needle || m.name.toLowerCase().includes(needle) || m.id.startsWith(needle))
      .filter((m) => filter === 'all' ? true
        : filter === 'alerts' ? hasAlert(m)
        : filter === 'onboarding' ? m.progress < 100
        : m.funnel.received > 0)
      .sort((a, b) => {
        const x = sortVal(a, sort.k), y = sortVal(b, sort.k)
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
      })
  }, [rows, q, filter, sort])

  const stats = useMemo(() => {
    const r = rows ?? []
    return {
      total: r.length,
      active: r.filter((m) => m.funnel.received > 0).length,
      onboarded: r.filter((m) => m.progress === 100).length,
      alerts: r.filter(hasAlert).length,
      avgProgress: r.length ? Math.round(r.reduce((s, m) => s + m.progress, 0) / r.length) : 0,
    }
  }, [rows])

  const setSortKey = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'name' ? 1 : -1 }))
  const SortTh = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => {
    const on = sort.k === k
    const I = !on ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown
    return (
      <th style={{ ...th, textAlign: right ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', color: on ? 'var(--text)' : th.color }} onClick={() => setSortKey(k)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{children}<I size={11} style={{ opacity: on ? 1 : 0.45 }} /></span>
      </th>
    )
  }

  return (
    <div className="admin-page" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1400 }}>
      <PageHead title="Marchands" subtitle="Progression, santé et rentabilité de chaque compte" right={<PeriodPicker value={days} onChange={setDays} />} />

      {error && <ErrorBox message={error} onRetry={load} />}

      {rows ? (
        <div className="admin-grid-4">
          <Kpi label="Comptes" icon={Users} value={int(stats.total)} sub={`${int(stats.active)} actifs sur la période`} />
          <Kpi label="Onboarding complet" icon={CircleCheck} tone="success" value={int(stats.onboarded)} sub={`Progression moyenne ${stats.avgProgress} %`} />
          <Kpi label="En onboarding" icon={Rocket} tone="warning" value={int(stats.total - stats.onboarded)} sub="Étapes restantes à accompagner" />
          <Kpi label="Alertes" icon={AlertTriangle} tone="destructive" value={int(stats.alerts)} sub="Crédits, WhatsApp, transporteur, livraison" />
        </div>
      ) : !error && <div className="admin-grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={118} />)}</div>}

      {rows && rows.length > 0 && (
        <Card title="Profil des marchands" icon={Compass} hint="Réponses données à l'étape 1 de l'onboarding (tous les comptes, pas seulement la période).">
          <div className="admin-grid-4" style={{ gap: 24 }}>
            {DIMENSIONS.map((d) => <Breakdown key={d.title} rows={rows} dim={d} />)}
          </div>
        </Card>
      )}

      <Card pad={false}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 340 }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un marchand…" style={{ ...inputStyle, width: '100%', paddingLeft: 34 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => {
              const on = filter === f.k
              const n = f.k === 'alerts' ? stats.alerts : f.k === 'onboarding' ? stats.total - stats.onboarded : f.k === 'active' ? stats.active : stats.total
              return (
                <button key={f.k} onClick={() => setFilter(f.k)} style={{
                  border: '1px solid', borderColor: on ? 'var(--brand)' : 'var(--border)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, background: on ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'transparent',
                  color: on ? 'var(--brand)' : 'var(--text-muted)',
                }}>{f.label} <span style={{ opacity: 0.7 }}>{rows ? n : ''}</span></button>
              )
            })}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <SortTh k="name">Marchand</SortTh>
                <SortTh k="progress">Progression</SortTh>
                <SortTh k="received" right>Commandes</SortTh>
                <SortTh k="deliveryRate" right>Livraison</SortTh>
                <SortTh k="revenue" right>Revenu</SortTh>
                <SortTh k="msgCostMad" right>Coût WA</SortTh>
                <SortTh k="margin" right>Marge</SortTh>
                <SortTh k="balance" right>Crédits</SortTh>
                <SortTh k="lastOrderAt">Dernière cmd</SortTh>
                <th style={th}>Alertes</th>
              </tr>
            </thead>
            <tbody>
              {!rows && !error && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={10} style={{ ...td, padding: 10 }}><div className="admin-skel" style={{ height: 30, borderRadius: 8 }} /></td></tr>
              ))}
              {rows && list.length === 0 && (
                <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                  <Store size={22} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.6 }} />Aucun marchand ne correspond.
                </td></tr>
              )}
              {list.map((m) => {
                const dr = m.funnel.deliveryRate
                return (
                  <tr key={m.id} className="admin-row" style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/merchants/${m.id}`)}>
                    <td style={{ ...td, maxWidth: 220 }}>
                      <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {[cityKey(m.profile?.city), NICHE_LABEL[nicheKey(m.profile?.niche) ?? '']].filter(Boolean).join(', ') || `Inscrit le ${dateFr(m.createdAt)}`}
                      </div>
                    </td>
                    <td style={{ ...td, minWidth: 170 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}><Bar value={m.progress} tone={m.progress === 100 ? 'success' : m.progress >= 50 ? 'brand' : 'warning'} /></div>
                        <span style={{ fontSize: 12, fontWeight: 650, width: 34, textAlign: 'right' }}>{m.progress}%</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {m.progress === 100 ? 'Onboarding terminé' : `Prochaine étape : ${m.steps.find((s) => !s.done)?.label ?? '—'}`}
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <b>{int(m.funnel.received)}</b>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{int(m.funnel.delivered)} livrées</div>
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: dr === null ? 'var(--text-muted)' : dr < 30 ? 'var(--destructive)' : dr < 50 ? 'var(--warning)' : 'var(--success)', fontWeight: 650 }}>{pct(dr)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 650 }}>{mad(m.revenue)}</td>
                    <td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)' }}>{mad(m.msgCostMad, true)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 650, color: m.margin < 0 ? 'var(--destructive)' : 'var(--text)' }}>{mad(m.margin)}</td>
                    <td style={{ ...td, textAlign: 'right', color: m.balance <= 100 ? 'var(--warning)' : 'var(--text)', fontWeight: 650 }}>{int(m.balance)}</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{ago(m.lastOrderAt)}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 240 }}>
                        {m.flags.length ? m.flags.map((f) => (
                          <span key={f} title={FLAG_META[f]?.help}><Badge tone={FLAG_META[f]?.tone}>{FLAG_META[f]?.label ?? f}</Badge></span>
                        )) : <Badge tone="success">OK</Badge>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
