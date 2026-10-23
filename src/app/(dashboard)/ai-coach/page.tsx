'use client'

import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { Bot, Calendar, CalendarDays, ThumbsUp, AlertTriangle, Search, Target, Package, MapPin, Sun, Globe } from 'lucide-react'

type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
type Decision = 'scale' | 'keep' | 'fix' | 'stop'
interface ProductMetric { name: string; orders: number; delivered: number; returned: number; revenue: number; returnRate: number | null; ordersChange: number | null }
interface Metrics {
  funnel?: { received: number; delivered: number; confirmationRate: number | null; gmv: number }
  vsPrevious?: { ordersChange: number | null; deliveredChange: number | null; revenueChange: number | null; confirmationRateDelta: number | null }
  averageOrderValue?: number | null
  products?: ProductMetric[]
}
interface Report { id: string; created_at: string; period_type: 'weekly' | 'monthly'; niche: string; report_data: any }

/** One view for both report formats: v2 (AI CEO) and the old coach reports. */
interface View {
  headline: string; score: number; summary: string; wins: string[]; problems: string[]
  decisions: { product: string; decision: Decision; reason: string }[]
  cities: { city: string; insight: string }[]
  season: { now: string; prepare: string[] }
  market: { text: string; source?: string }[]
  competitors: { name: string; strategy: string; weakness: string }[]
  actions: { priority: Priority; action: string; why: string }[]
  metrics?: Metrics
}
const arr = (v: any) => (Array.isArray(v) ? v : [])
function toView(d: any): View {
  if (d?.version === 2) return {
    headline: d.headline ?? '', score: d.score ?? 0, summary: d.summary ?? '', wins: arr(d.wins), problems: arr(d.problems),
    decisions: arr(d.product_decisions), cities: arr(d.city_insights), season: { now: d.season?.now ?? '', prepare: arr(d.season?.prepare) },
    market: arr(d.market), competitors: [], actions: arr(d.actions), metrics: d.metrics,
  }
  return {
    headline: '', score: d?.performance_score ?? 0, summary: d?.executive_summary ?? '', wins: arr(d?.highlights), problems: arr(d?.warnings),
    decisions: [], cities: [], season: { now: '', prepare: [] }, market: [], competitors: arr(d?.competitor_insights),
    actions: arr(d?.action_plan).map((a: any) => ({ priority: a.priority, action: a.action, why: a.reason })),
  }
}

const tint = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`
const PRIORITY: Record<Priority, { color: string; label: string }> = {
  HIGH: { color: 'var(--destructive)', label: 'Urgent' },
  MEDIUM: { color: 'var(--warning)', label: 'Important' },
  LOW: { color: 'var(--brand)', label: 'À faire' },
}
const DECISION: Record<Decision, { color: string; label: string }> = {
  scale: { color: 'var(--success)', label: 'Pousser' },
  keep: { color: 'var(--brand)', label: 'Garder' },
  fix: { color: 'var(--warning)', label: 'Corriger' },
  stop: { color: 'var(--destructive)', label: 'Arrêter' },
}
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }
const fmt = (n: number) => Math.round(n).toLocaleString('fr-MA')
const delta = (v: number | null | undefined, unit = '%') =>
  v === null || v === undefined ? null : <span style={{ fontSize: 11, fontWeight: 600, color: v >= 0 ? 'var(--success)' : 'var(--destructive)' }}>{v > 0 ? '+' : ''}{v}{unit}</span>

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
        <Icon size={15} strokeWidth={2.2} color="var(--brand)" /> {title}
      </div>
      {children}
    </div>
  )
}

export default function AICoachPage() {
  const supabase = createClient()
  const { t } = useLang()
  const isMobile = useIsMobile()
  const [reports, setReports] = useState<Report[]>([])
  const [selected, setSelected] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReports() }, [])

  async function fetchReports() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('ai_coach_reports').select('*')
      .eq('tenant_id', user.id).order('created_at', { ascending: false }).limit(12)
    const list = (data ?? []) as Report[]
    setReports(list)
    if (list.length > 0) setSelected(list[0])
    setLoading(false)
  }

  const scoreColor = (s: number) => (s >= 70 ? 'var(--success)' : s >= 40 ? 'var(--warning)' : 'var(--destructive)')

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.aicoach')} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
    </div>
  )

  if (reports.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.aicoach')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
        <Bot size={48} color="var(--text-muted)" strokeWidth={1.6} />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{t('aicoach.noReport')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Le premier rapport arrive dimanche matin, dès 5 commandes sur la semaine.</div>
      </div>
    </div>
  )

  const r = selected!
  const v = toView(r.report_data)
  const m = v.metrics
  const decisionOf = (name: string) => v.decisions.find((d) => d.product === name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.aicoach')} subtitle={r.niche} />
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 8, overflowX: isMobile ? 'auto' : undefined }}>
            {reports.map((rep) => {
              const s = toView(rep.report_data).score
              const on = selected?.id === rep.id
              return (
                <button key={rep.id} onClick={() => setSelected(rep)} style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', minWidth: isMobile ? 150 : undefined,
                  border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`, background: on ? tint('var(--brand)', 8) : 'var(--card)', color: 'inherit',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                    {rep.period_type === 'weekly' ? <><Calendar size={13} strokeWidth={2.2} /> Semaine</> : <><CalendarDays size={13} strokeWidth={2.2} /> Mois</>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(rep.created_at).toLocaleDateString('fr-MA')}</div>
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: scoreColor(s) }}>{s}/100</div>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

            <div style={{ ...card, padding: 24, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', gap: 24, alignItems: 'center' }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%', margin: '0 auto',
                background: `conic-gradient(${scoreColor(v.score)} ${v.score * 3.6}deg, var(--border) 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'var(--card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(v.score) }}>{v.score}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
              <div>
                {v.headline && <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8, lineHeight: 1.35 }}>{v.headline}</div>}
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, maxWidth: 720 }}>{v.summary}</div>
              </div>
            </div>

            {m?.funnel && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'Commandes', value: fmt(m.funnel.received), d: delta(m.vsPrevious?.ordersChange) },
                  { label: 'Livrées', value: fmt(m.funnel.delivered), d: delta(m.vsPrevious?.deliveredChange) },
                  { label: "Chiffre d'affaires", value: `${fmt(m.funnel.gmv)} DH`, d: delta(m.vsPrevious?.revenueChange) },
                  { label: 'Panier moyen', value: m.averageOrderValue ? `${fmt(m.averageOrderValue)} DH` : '—', d: null },
                ].map((k) => (
                  <div key={k.label} style={{ ...card, padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{k.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{k.value}</span>{k.d}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {v.actions.length > 0 && (
              <Section icon={Target} title="À faire cette semaine">
                {v.actions.map((a, i) => {
                  const p = PRIORITY[a.priority] ?? PRIORITY.MEDIUM
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: tint(p.color, 12), color: p.color, flexShrink: 0 }}>{p.label}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{a.action}</div>
                        {a.why && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.why}</div>}
                      </div>
                    </div>
                  )
                })}
              </Section>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              {[
                { title: 'Ce qui marche', icon: ThumbsUp, items: v.wins, color: 'var(--success)' },
                { title: 'À surveiller', icon: AlertTriangle, items: v.problems, color: 'var(--destructive)' },
              ].filter((b) => b.items.length).map(({ title, icon: Icon, items, color }) => (
                <div key={title} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color, marginBottom: 12 }}><Icon size={15} strokeWidth={2.2} /> {title}</div>
                  {items.map((h, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 8, background: tint(color, 8), fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{h}</div>
                  ))}
                </div>
              ))}
            </div>

            {(m?.products?.length || v.decisions.length) ? (
              <Section icon={Package} title="Produits">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px', fontWeight: 500 }}>Produit</th>
                        <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'right' }}>Commandes</th>
                        <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'right' }}>Livrées</th>
                        <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'right' }}>Retours</th>
                        <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'right' }}>CA</th>
                        <th style={{ padding: '6px 8px', fontWeight: 500 }}>Décision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(m?.products ?? v.decisions.map((d) => ({ name: d.product } as ProductMetric))).map((p) => {
                        const d = decisionOf(p.name)
                        const dc = d ? DECISION[d.decision] ?? DECISION.keep : null
                        return (
                          <tr key={p.name} style={{ borderTop: '1px solid var(--border)', verticalAlign: 'top' }}>
                            <td style={{ padding: '10px 8px', color: 'var(--text)', fontWeight: 500 }}>
                              {p.name}
                              {d?.reason && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginTop: 3, maxWidth: 320 }}>{d.reason}</div>}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{p.orders ?? '—'} {delta(p.ordersChange)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{p.delivered ?? '—'}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{p.returnRate === null || p.returnRate === undefined ? '—' : `${p.returnRate}%`}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{p.revenue !== undefined ? `${fmt(p.revenue)} DH` : '—'}</td>
                            <td style={{ padding: '10px 8px' }}>
                              {dc && <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: tint(dc.color, 12), color: dc.color }}>{dc.label}</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              {v.cities.length > 0 && (
                <Section icon={MapPin} title="Villes">
                  {v.cities.map((c, i) => (
                    <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--border)' : 'none', fontSize: 13, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.city}</span> <span style={{ color: 'var(--text-muted)' }}>{c.insight}</span>
                    </div>
                  ))}
                </Section>
              )}
              {(v.season.now || v.season.prepare.length > 0) && (
                <Section icon={Sun} title="Saison">
                  {v.season.now && <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>{v.season.now}</div>}
                  {v.season.prepare.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, padding: '4px 0' }}>• {s}</div>
                  ))}
                </Section>
              )}
            </div>

            {v.market.length > 0 && (
              <Section icon={Globe} title="Marché">
                {v.market.map((x, i) => (
                  <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--border)' : 'none', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                    {x.text}{' '}
                    {x.source && <a href={x.source} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--brand)' }}>Source</a>}
                  </div>
                ))}
              </Section>
            )}

            {v.competitors.length > 0 && (
              <Section icon={Search} title="Concurrence">
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {v.competitors.map((c, i) => (
                    <div key={i} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)', marginBottom: 6 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{c.strategy}</div>
                      <div style={{ fontSize: 12, color: 'var(--success)' }}>{c.weakness}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
