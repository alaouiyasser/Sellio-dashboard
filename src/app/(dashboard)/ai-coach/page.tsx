'use client'

import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'

interface Report {
  id: string
  created_at: string
  period_type: 'weekly' | 'monthly'
  niche: string
  report_data: {
    executive_summary: string
    performance_score: number
    highlights: string[]
    warnings: string[]
    competitor_insights: { name: string; strategy: string; weakness: string }[]
    action_plan: { priority: 'HIGH' | 'MEDIUM' | 'LOW'; action: string; reason: string }[]
  }
}

const PRIORITY_CONFIG = {
  HIGH:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Urgent' },
  MEDIUM: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Important' },
  LOW:    { color: '#8B9A35', bg: 'rgba(139,154,53,0.12)', label: 'À faire' },
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
    const { data } = await supabase
      .from('ai_coach_reports').select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    const list = (data ?? []) as Report[]
    setReports(list)
    if (list.length > 0) setSelected(list[0])
    setLoading(false)
  }

  function scoreColor(score: number) {
    if (score >= 70) return '#10B981'
    if (score >= 40) return '#F59E0B'
    return '#EF4444'
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.aicoach')} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
    </div>
  )

  if (reports.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.aicoach')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🧠</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{t('aicoach.noReport')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('aicoach.noReportSub')}</div>
      </div>
    </div>
  )

  const r = selected!
  const score = r.report_data?.performance_score ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.aicoach')} subtitle={r.niche} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Reports list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Rapports</div>
            {reports.map(rep => (
              <div key={rep.id} onClick={() => setSelected(rep)} style={{
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${selected?.id === rep.id ? '#8B9A35' : 'var(--border)'}`,
                background: selected?.id === rep.id ? 'rgba(139,154,53,0.08)' : 'var(--card)',
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  {rep.period_type === 'weekly' ? '📅 Hebdo' : '📆 Mensuel'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(rep.created_at).toLocaleDateString('fr-MA')}</div>
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: scoreColor(rep.report_data?.performance_score ?? 0) }}>
                  Score: {rep.report_data?.performance_score ?? '—'}/100
                </div>
              </div>
            ))}
          </div>

          {/* Report detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Score + Summary */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 1fr', gap: 24, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
                  background: `conic-gradient(${scoreColor(score)} ${score * 3.6}deg, var(--border) 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 20px ${scoreColor(score)}30`,
                }}>
                  <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(score) }}>{score}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/100</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Score business</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#8B9A35', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Résumé exécutif</div>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>{r.report_data?.executive_summary}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              {[
                { title: '✅ Points forts', items: r.report_data?.highlights ?? [], color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)' },
                { title: '⚠️ Points faibles', items: r.report_data?.warnings ?? [], color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
              ].map(({ title, items, color, bg, border }) => (
                <div key={title} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 12 }}>{title}</div>
                  {items.map((h, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 8, background: bg, border: `1px solid ${border}`, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{h}</div>
                  ))}
                </div>
              ))}
            </div>

            {(r.report_data?.competitor_insights ?? []).length > 0 && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>🔍 Analyse concurrentielle</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {r.report_data.competitor_insights.map((c, i) => (
                    <div key={i} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#8B9A35', marginBottom: 6 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Stratégie:</span> {c.strategy}</div>
                      <div style={{ fontSize: 11, color: '#10B981' }}><span style={{ fontWeight: 600 }}>Faiblesse:</span> {c.weakness}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>🎯 Plan d'action</div>
              {(r.report_data?.action_plan ?? []).map((a, i) => {
                const p = PRIORITY_CONFIG[a.priority]
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: i < (r.report_data?.action_plan?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: p.bg, color: p.color, flexShrink: 0 }}>{p.label}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{a.action}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.reason}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
