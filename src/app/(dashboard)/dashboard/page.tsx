'use client'

import { useEffect, useState, useMemo } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import OrdersChart from '@/components/charts/OrdersChart'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Package, CheckCircle2, Truck, TrendingUp, TrendingDown, Wallet,
  Calendar, Target, MapPin, Crown, Clock, ArrowRight,
} from 'lucide-react'

const OLIVE = 'var(--brand)'
const COLORS = ['var(--success)', 'var(--destructive)', 'var(--warning)', 'var(--brand)']
type Period = '7' | '14' | '30' | '365'

const PERIODS: { label: string; value: Period }[] = [
  { label: '7j', value: '7' },
  { label: '14j', value: '14' },
  { label: '30j', value: '30' },
  { label: '1an', value: '365' },
]

export default function OverviewPage() {
  const supabase = createClient()
  const { t } = useLang()
  const isMobile = useIsMobile()

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    confirmed: { label: t('status.confirmed'), color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 15%, transparent)' },
    pending:   { label: t('status.pending'),   color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 15%, transparent)' },
    canceled:  { label: t('status.canceled'),  color: 'var(--destructive)', bg: 'color-mix(in srgb, var(--destructive) 15%, transparent)' },
    cancelled: { label: t('status.cancelled'), color: 'var(--destructive)', bg: 'color-mix(in srgb, var(--destructive) 15%, transparent)' },
    delivered: { label: t('status.delivered'), color: 'var(--brand)', bg: 'color-mix(in srgb, var(--brand) 15%, transparent)' },
  }
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('14')
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [kpis, setKpis] = useState({ total: 0, confirmed: 0, cancelled: 0, delivered: 0, revenue: 0 })
  const [topCities, setTopCities] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [topClients, setTopClients] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [companyName, setCompanyName] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: orders }, { data: tenant }] = await Promise.all([
      supabase.from('orders').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tenants').select('company_name').eq('id', user.id).single(),
    ])

    if (tenant?.company_name) setCompanyName(tenant.company_name)
    if (!orders) return

    setAllOrders(orders)

    const confirmed = orders.filter(o => o.status === 'confirmed').length
    const cancelled = orders.filter(o => o.status === 'canceled' || o.status === 'canceled' || o.status === 'cancelled').length
    const delivered = orders.filter(o => o.status === 'delivered').length
    const revenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_price ?? 0), 0)
    setKpis({ total: orders.length, confirmed, cancelled, delivered, revenue })

    const cities: Record<string, number> = {}
    orders.filter(o => o.city).forEach(o => { cities[o.shipping_address ?? o.city] = (cities[o.city] ?? 0) + 1 })
    setTopCities(Object.entries(cities).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5))

    const products: Record<string, number> = {}
    orders.filter(o => o.status === 'delivered').forEach(o => {
      ;(o.items ?? []).forEach((item: any) => {
        const name = item.title ?? item.name ?? 'Produit'
        products[name] = (products[name] ?? 0) + (item.quantity ?? 1)
      })
    })
    setTopProducts(Object.entries(products).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5))

    const clients: Record<string, { orders: number; revenue: number }> = {}
    orders.forEach(o => {
      const phone = o.customer_phone ?? 'Inconnu'
      if (!clients[phone]) clients[phone] = { orders: 0, revenue: 0 }
      clients[phone].orders++
      if (o.status === 'delivered') clients[phone].revenue += o.total_price ?? 0
    })
    setTopClients(Object.entries(clients).map(([phone, data]) => ({ phone, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 5))

    setPieData([
      { name: t('status.confirmed'), value: confirmed },
      { name: t('status.cancelled'), value: cancelled },
      { name: t('status.pending'),   value: orders.filter(o => o.status === 'pending').length },
      { name: t('status.delivered'), value: delivered },
    ])

    setRecentOrders(orders.slice(0, 5))
    setLoading(false)
  }

  const ordersByDay = useMemo(() => {
    const count = parseInt(period)
    const now = new Date()
    const days: Record<string, number> = {}

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = period === '365'
        ? d.toLocaleDateString('fr-MA', { month: 'short', year: '2-digit' })
        : d.toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit' })
      days[key] = 0
    }

    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - count)

    allOrders
      .filter(o => new Date(o.created_at) >= cutoff)
      .forEach(o => {
        const d = new Date(o.created_at)
        const key = period === '365'
          ? d.toLocaleDateString('fr-MA', { month: 'short', year: '2-digit' })
          : d.toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit' })
        if (key in days) days[key]++
      })

    return Object.entries(days).map(([date, count]) => ({ date, count }))
  }, [period, allOrders])

  const confirmRate = kpis.total > 0 ? Math.round(((kpis.confirmed + kpis.delivered) / kpis.total) * 100) : 0
  const cancelRate  = kpis.total > 0 ? Math.round((kpis.cancelled / kpis.total) * 100) : 0

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.dashboard')} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        {t('common.loading') || 'Chargement...'}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.dashboard')} subtitle={companyName || 'Business overview'} />
      <div style={{ flex: 1, overflow: 'auto', overflowX: 'hidden', padding: isMobile ? 12 : 24 }}>

        {/* KPIs */}
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 8 : 14, marginBottom: 20 }}>
          {[
            { label: t('kpi.total'),       value: kpis.total,        accent: 'var(--brand)',       valueColor: 'var(--text)',        icon: Package },
            { label: t('kpi.confirmed'),   value: kpis.confirmed,    accent: 'var(--success)',     valueColor: 'var(--success)',     icon: CheckCircle2 },
            { label: t('kpi.delivered'),   value: kpis.delivered,    accent: 'var(--brand)',       valueColor: 'var(--brand)',       icon: Truck },
            { label: t('kpi.confirmRate'), value: `${confirmRate}%`, accent: 'var(--success)',     valueColor: 'var(--success)',     icon: TrendingUp },
            { label: t('kpi.cancelRate'),  value: `${cancelRate}%`,  accent: 'var(--destructive)', valueColor: 'var(--destructive)', icon: TrendingDown },
          ].map((k, i) => {
            const Icon = k.icon
            return (
              <div key={i} style={{ background: `color-mix(in srgb, ${k.accent} 6%, var(--card))`, border: `1px solid color-mix(in srgb, ${k.accent} 22%, var(--border))`, borderRadius: 14, padding: isMobile ? '14px 14px' : '16px 18px' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${k.accent} 14%, transparent)`, color: k.accent, marginBottom: 12 }}>
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: k.valueColor, letterSpacing: '-0.5px' }}>{k.value}</div>
              </div>
            )
          })}
        </div>

        {/* Revenue */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand), #3A1FD0)',
          border: '1px solid color-mix(in srgb, var(--brand) 40%, transparent)',
          borderRadius: 14, padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, cursor: 'pointer',
        }} onClick={() => window.location.href = '/orders'}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--brand-accent)', marginBottom: 4, fontWeight: 700, letterSpacing: '0.3px' }}>
              {t('kpi.revenue')}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px' }}>
              {kpis.revenue.toLocaleString()} <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>MAD</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              {kpis.delivered} {t('kpi.deliveredOrders')} · {t('kpi.clickToView')}
            </div>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center', color: '#fff' }}>
            <Wallet size={30} strokeWidth={2} />
          </div>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 16, marginBottom: 16 }}>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}><Calendar size={16} strokeWidth={2.2} color="var(--brand)" /> {t('chart.orders')}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {PERIODS.map(p => (
                  <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                    padding: '5px 10px', borderRadius: 7,
                    border: '1px solid var(--border)',
                    background: period === p.value ? OLIVE : 'var(--bg)',
                    color: period === p.value ? '#fff' : 'var(--text-muted)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  }}>{p.label}</button>
                ))}
              </div>
            </div>
            <OrdersChart data={ordersByDay} period={period} />
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}><Target size={16} strokeWidth={2.2} color="var(--brand)" /> {t('chart.statuses')}</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], display: 'inline-block' }} />
                    {d.name}
                  </div>
                  <span style={{ color: COLORS[i], fontWeight: 600 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[
            { title: t('top.cities'),   icon: MapPin,  data: topCities,   color: OLIVE,            key: 'name', val: 'value', suffix: '' },
            { title: t('top.products'), icon: Package, data: topProducts, color: 'var(--chart-2)', key: 'name', val: 'value', suffix: ` ${t('top.sales')}` },
          ].map(({ title, icon: Icon, data, color, key, val, suffix }) => (
            <div key={title} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}><Icon size={16} strokeWidth={2.2} color={color} /> {title}</div>
              {data.length === 0
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</div>
                : data.map((r: any, i: number) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{r[key]}</span>
                      <span style={{ color, fontWeight: 700 }}>{r[val]}{suffix}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 4, background: 'var(--border)' }}>
                      <div style={{ width: `${(r[val] / (data[0]?.[val] ?? 1)) * 100}%`, height: '100%', borderRadius: 4, background: color }} />
                    </div>
                  </div>
                ))
              }
            </div>
          ))}

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}><Crown size={16} strokeWidth={2.2} color="var(--brand-accent)" /> {t('top.clients')}</div>
            {topClients.length === 0
              ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</div>
              : topClients.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: i === 0 ? 'color-mix(in srgb, var(--warning) 20%, transparent)' : 'color-mix(in srgb, var(--brand) 10%, transparent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                      color: i === 0 ? 'var(--warning)' : OLIVE,
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{c.phone}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.orders} {t('top.orders')}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>{c.revenue.toLocaleString()} MAD</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recent orders */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}><Clock size={16} strokeWidth={2.2} color="var(--brand)" /> {t('orders.recent')}</span>
            <a href="/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: OLIVE, textDecoration: 'none', fontWeight: 600 }}>{t('orders.seeAll')} <ArrowRight size={13} strokeWidth={2.4} /></a>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sidebar)' }}>
                {['ID', t('table.phone'), t('table.city'), t('table.amount'), t('table.status')].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o, i) => {
                const s = STATUS_CONFIG[o.status] ?? STATUS_CONFIG['pending']
                return (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => window.location.href = `/orders/${o.id}`}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: OLIVE, fontWeight: 600 }}>#{o.id?.slice(0, 8)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>{o.customer_phone}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{o.city ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{o.total_price ? `${o.total_price} MAD` : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 5, background: s.bg, color: s.color, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
