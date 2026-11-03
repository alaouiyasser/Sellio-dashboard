'use client'

import { useEffect, useState, useMemo } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import OrdersChart from '@/components/charts/OrdersChart'
import PeriodFilter from '@/components/common/PeriodFilter'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Package, CheckCircle2, Truck, TrendingUp, TrendingDown, Wallet,
  Calendar, Target, MapPin, Crown, Clock, ArrowRight,
} from 'lucide-react'
import { orderCity, orderItems, itemName, statusLabel, isConfirmed, groupOf, customerName, productsLine } from '@/lib/order-view'
import { presetPeriod, ordersInPeriod, spanDays, type Period } from '@/lib/period'
import { tx, intlLocale } from '@/lib/i18n'

const OLIVE = 'var(--brand)'
const COLORS = ['var(--success)', 'var(--destructive)', 'var(--warning)', 'var(--brand)']
const PERIOD_KEY = 'sellio-dashboard-period'

export default function OverviewPage() {
  const supabase = createClient()
  const { t, locale } = useLang()
  const isMobile = useIsMobile()

  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>(() => presetPeriod('30d'))
  useEffect(() => {
    try { const k = localStorage.getItem(PERIOD_KEY); if (k && k !== 'custom' && k !== '30d') setPeriod(presetPeriod(k as any)) } catch { /* default */ }
  }, [])
  const [orders, setOrders] = useState<any[]>([])
  const [companyName, setCompanyName] = useState('')

  useEffect(() => { fetchData(period) }, [period])

  async function fetchData(p: Period) {
    setLoading(true)
    try { localStorage.setItem(PERIOD_KEY, p.key) } catch { /* fine */ }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [rows, { data: tenant }] = await Promise.all([
      ordersInPeriod(supabase, user.id, p).catch(() => []),
      supabase.from('tenants').select('company_name').eq('id', user.id).single(),
    ])
    if (tenant?.company_name) setCompanyName(tenant.company_name)
    setOrders(rows)
    setLoading(false)
  }

  const s = useMemo(() => {
    const total = orders.length
    const confirmed = orders.filter(isConfirmed).length
    const cancelled = orders.filter((o) => groupOf(o.status) === 'cancelled').length
    const delivered = orders.filter((o) => o.status === 'delivered').length
    const pending = orders.filter((o) => groupOf(o.status) === 'pending').length
    const revenue = orders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + (Number(o.total_price) || 0), 0)

    const cities: Record<string, number> = {}
    orders.forEach((o) => { const c = orderCity(o); if (c) cities[c] = (cities[c] ?? 0) + 1 })
    const products: Record<string, number> = {}
    orders.filter((o) => o.status === 'delivered').forEach((o) => orderItems(o).forEach((it: any) => {
      const n = itemName(it); products[n] = (products[n] ?? 0) + (Number(it.quantity) || 1)
    }))
    const clients: Record<string, { name: string; phone: string; orders: number; revenue: number }> = {}
    orders.filter((o) => String(o.customer_phone ?? '').replace(/\D/g, '').length >= 9).forEach((o) => {
      const k = String(o.customer_phone).replace(/\D/g, '').slice(-9)
      const c = clients[k] ?? (clients[k] = { name: customerName(o), phone: o.customer_phone, orders: 0, revenue: 0 })
      if (!c.name) c.name = customerName(o)
      c.orders++
      if (o.status === 'delivered') c.revenue += Number(o.total_price) || 0
    })
    return {
      total, confirmed, cancelled, delivered, pending, revenue,
      confirmRate: total ? Math.round((confirmed / total) * 100) : 0,
      cancelRate: total ? Math.round((cancelled / total) * 100) : 0,
      deliveryRate: total ? Math.round((delivered / total) * 100) : 0,
      topCities: Object.entries(cities).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      topProducts: Object.entries(products).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      topClients: Object.values(clients).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders).slice(0, 5),
      pie: [
        { name: t('status.confirmed'), value: confirmed },
        { name: t('status.cancelled'), value: cancelled },
        { name: t('status.pending'), value: pending },
        { name: t('status.delivered'), value: delivered },
      ],
      recent: orders.slice(0, 6),
    }
  }, [orders, locale])

  // One point per hour for a single day, per day up to 3 months, per month beyond.
  const chart = useMemo(() => {
    const days = spanDays(period)
    const mode: 'hour' | 'day' | 'month' = days <= 1 ? 'hour' : days <= 92 ? 'day' : 'month'
    const keyOf = (d: Date) => mode === 'hour' ? `${String(d.getHours()).padStart(2, '0')}h`
      : mode === 'day' ? d.toLocaleDateString(intlLocale(), { day: '2-digit', month: '2-digit' })
      : d.toLocaleDateString(intlLocale(), { month: 'short', year: '2-digit' })
    const buckets = new Map<string, number>()
    const step = (d: Date) => mode === 'hour' ? new Date(d.getTime() + 3_600_000) : mode === 'day' ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) : new Date(d.getFullYear(), d.getMonth() + 1, 1)
    for (let d = new Date(period.from); d < period.to; d = step(d)) buckets.set(keyOf(d), 0)
    for (const o of orders) { const k = keyOf(new Date(o.created_at)); if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1) }
    return [...buckets.entries()].map(([date, count]) => ({ date, count }))
  }, [orders, period, locale])

  const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.dashboard')} subtitle={companyName || tx("Business overview")} />
      <div style={{ flex: 1, overflow: 'auto', overflowX: 'hidden', padding: isMobile ? 12 : 24 }}>

        <div style={{ marginBottom: 16 }}><PeriodFilter value={period} onChange={setPeriod} /></div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>{tx("Chargement...")}</div>
        ) : (<>
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 8 : 14, marginBottom: 20 }}>
          {[
            { label: t('kpi.total'), value: s.total, accent: 'var(--brand)', valueColor: 'var(--text)', icon: Package, sub: tx('{0} en attente', [s.pending]) },
            { label: t('kpi.confirmed'), value: s.confirmed, accent: 'var(--success)', valueColor: 'var(--success)', icon: CheckCircle2, sub: tx('{0} % des commandes', [s.confirmRate]) },
            { label: t('kpi.delivered'), value: s.delivered, accent: 'var(--brand)', valueColor: 'var(--brand)', icon: Truck, sub: tx('{0} % des commandes', [s.deliveryRate]) },
            { label: t('kpi.confirmRate'), value: `${s.confirmRate}%`, accent: 'var(--success)', valueColor: 'var(--success)', icon: TrendingUp },
            { label: t('kpi.cancelRate'), value: `${s.cancelRate}%`, accent: 'var(--destructive)', valueColor: 'var(--destructive)', icon: TrendingDown, sub: tx('{0} annulées', [s.cancelled]) },
          ].map((k, i) => {
            const Icon = k.icon
            return (
              <div key={i} style={{ background: `color-mix(in srgb, ${k.accent} 6%, var(--card))`, border: `1px solid color-mix(in srgb, ${k.accent} 22%, var(--border))`, borderRadius: 14, padding: isMobile ? '14px 14px' : '16px 18px' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${k.accent} 14%, transparent)`, color: k.accent, marginBottom: 12 }}>
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>{tx(k.label)}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: k.valueColor, letterSpacing: '-0.5px' }}>{k.value}</div>
                {k.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{k.sub}</div>}
              </div>
            )
          })}
        </div>

        <div style={{
          background: 'linear-gradient(135deg, var(--brand), #3A1FD0)', border: '1px solid color-mix(in srgb, var(--brand) 40%, transparent)',
          borderRadius: 14, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, cursor: 'pointer',
        }} onClick={() => window.location.href = '/orders'}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--brand-accent)', marginBottom: 4, fontWeight: 700, letterSpacing: '0.3px' }}>{t('kpi.revenue')}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px' }}>
              {s.revenue.toLocaleString(intlLocale())} <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>{tx("MAD")}</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{s.delivered} {t('kpi.deliveredOrders')} · {t('kpi.clickToView')}</div>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center', color: '#fff' }}><Wallet size={30} strokeWidth={2} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>
              <Calendar size={16} strokeWidth={2.2} color="var(--brand)" /> {t('chart.orders')}
            </div>
            <OrdersChart data={chart} period={String(spanDays(period))} />
          </div>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}><Target size={16} strokeWidth={2.2} color="var(--brand)" /> {t('chart.statuses')}</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={s.pie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {s.pie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {s.pie.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], display: 'inline-block' }} />{d.name}
                  </div>
                  <span style={{ color: COLORS[i], fontWeight: 600 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[
            { title: t('top.cities'), icon: MapPin, data: s.topCities, color: OLIVE, suffix: '' },
            { title: t('top.products'), icon: Package, data: s.topProducts, color: 'var(--chart-2)', suffix: ` ${t('top.sales')}` },
          ].map(({ title, icon: Icon, data, color, suffix }) => (
            <div key={title} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}><Icon size={16} strokeWidth={2.2} color={color} /> {title}</div>
              {data.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</div> : data.map((r, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{r.name}</span>
                    <span style={{ color, fontWeight: 700 }}>{r.value}{suffix}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: 'var(--border)' }}>
                    <div style={{ width: `${(r.value / (data[0]?.value ?? 1)) * 100}%`, height: '100%', borderRadius: 4, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}><Crown size={16} strokeWidth={2.2} color="var(--brand-accent)" /> {t('top.clients')}</div>
            {s.topClients.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</div> : s.topClients.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: i === 0 ? 'color-mix(in srgb, var(--warning) 20%, transparent)' : 'color-mix(in srgb, var(--brand) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--warning)' : OLIVE }}>{i + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || c.phone}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.name ? `${c.phone} · ` : ''}{c.orders} {t('top.orders')}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.revenue.toLocaleString(intlLocale())} {tx("MAD")}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}><Clock size={16} strokeWidth={2.2} color="var(--brand)" /> {t('orders.recent')}</span>
            <a href="/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: OLIVE, textDecoration: 'none', fontWeight: 600 }}>{t('orders.seeAll')} <ArrowRight size={13} strokeWidth={2.4} /></a>
          </div>
          <div className="table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sidebar)' }}>
                {[tx("Client"), tx("Produit"), t('table.city'), t('table.amount'), t('table.status')].map((h) => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'start', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.recent.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{tx("Aucune commande sur cette période.")}</td></tr>}
              {s.recent.map((o, i) => {
                const st = statusLabel(o.status, locale)
                return (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => window.location.href = `/orders/${o.id}`}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>
                      <div style={{ fontWeight: 600 }}>{customerName(o) || o.customer_phone}</div>
                      {customerName(o) && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.customer_phone}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{productsLine(o) || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{orderCity(o) || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{o.total_price ? tx("{0} MAD", [o.total_price]) : '—'}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 8px', borderRadius: 5, background: st.bg, color: st.color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{tx(st.label)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        </div>
        </>)}
      </div>
    </div>
  )
}
