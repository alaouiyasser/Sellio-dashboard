'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Target, XCircle, MapPin, Package } from 'lucide-react'

const OLIVE = 'var(--brand)'
const COLORS = ['var(--success)', 'var(--destructive)', 'var(--warning)', 'var(--brand)']
function parseItems(i: any): any[] { if (Array.isArray(i)) return i; if (typeof i === 'string') { try { return JSON.parse(i) } catch { return [] } } return [] }

const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text)' }

export default function AnalyticsPage() {
  const supabase = createClient()
  const { t } = useLang()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(0)
  const [cancelled, setCancelled] = useState(0)
  const [pending, setPending] = useState(0)
  const [delivered, setDelivered] = useState(0)
  const [cancelReasons, setCancelReasons] = useState<any[]>([])
  const [topCities, setTopCities] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  useEffect(() => { fetchData() }, [])
  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: orders, error } = await supabase.from('orders').select('*')
    if (error || !orders) { setLoading(false); return }
    let c = 0, x = 0, p = 0, d = 0
    const reasons: Record<string, number> = {}
    const cities: Record<string, number> = {}
    const products: Record<string, number> = {}
    orders.forEach(o => {
      if (o.status === 'confirmed') c++
      else if (o.status === 'canceled' || o.status === 'cancelled') { x++; if (o.cancellation_reason) reasons[o.cancellation_reason] = (reasons[o.cancellation_reason] ?? 0) + 1 }
      else if (o.status === 'pending') p++
      else if (o.status === 'delivered') d++
      const addr = o.shipping_address ? (typeof o.shipping_address === 'string' ? (() => { try { return JSON.parse(o.shipping_address) } catch { return null } })() : o.shipping_address) : null
      const city = addr?.city ?? o.city
      if (city) cities[city] = (cities[city] ?? 0) + 1
      // Top produits = commandes livrées uniquement (1 par commande)
      if (o.status === 'delivered') parseItems(o.items).forEach((item: any) => { const name = item.productName ?? item.title ?? item.name ?? 'Produit'; products[name] = (products[name] ?? 0) + 1 })
    })
    setConfirmed(c); setCancelled(x); setPending(p); setDelivered(d)
    setCancelReasons(Object.entries(reasons).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0,5))
    setTopCities(Object.entries(cities).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0,6))
    setTopProducts(Object.entries(products).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0,5))
    setLoading(false)
  }
  const total = confirmed + cancelled + pending + delivered
  const pieData = [
    { name: t('status.confirmed'), value: confirmed },
    { name: t('status.cancelled'), value: cancelled },
    { name: t('status.pending'), value: pending },
    { name: t('status.delivered'), value: delivered },
  ]
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <Topbar title='Analytiques' />
      <div style={{ padding:24, color:'var(--text-muted)' }}>{t('loading')}</div>
    </div>
  )
  if (total === 0) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <Topbar title='Analytiques' />
      <div style={{ padding:24 }}>
        <p style={{ color:'var(--destructive)' }}>0 orders found. Check RLS.</p>
        <button onClick={fetchData} style={{ marginTop:12, padding:'8px 16px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>Retry</button>
      </div>
    </div>
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <Topbar title="Analytiques" subtitle={total + ' commandes'} />
      <div style={{ flex:1, overflow:'auto', padding:24, display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20 }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <div style={head}><Target size={16} strokeWidth={2.2} color="var(--brand)" /> Statuts</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>{pieData.map((_,i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, color:'var(--text)' }} /></PieChart>
            </ResponsiveContainer>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:16 }}>
              {pieData.map((d,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'color-mix(in srgb, '+COLORS[i]+' 5%, transparent)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    <span style={{ width:9, height:9, borderRadius:3, background:COLORS[i], flexShrink:0 }} />
                    <span style={{ fontSize:12.5, fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.name}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6, flexShrink:0 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:COLORS[i], letterSpacing:'-0.3px' }}>{d.value}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{total > 0 ? Math.round((d.value/total)*100) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <div style={head}><XCircle size={16} strokeWidth={2.2} color="var(--destructive)" /> Raisons annulation</div>
            {cancelReasons.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>—</div> : cancelReasons.map((r,i) => (<div key={i} style={{ marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'75%', color:'var(--text)' }}>{r.name}</span><span style={{ color:'var(--destructive)', fontWeight:700 }}>{r.value}</span></div><div style={{ height:4, borderRadius:4, background:'var(--border)' }}><div style={{ width:(r.value/(cancelReasons[0]?.value??1))*100+'%', height:'100%', borderRadius:4, background:'var(--destructive)' }} /></div></div>))}
          </div>
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
          <div style={head}><MapPin size={16} strokeWidth={2.2} color="var(--brand)" /> Top villes</div>
          {topCities.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>—</div> : <ResponsiveContainer width="100%" height={180}><BarChart data={topCities} margin={{ top:5, right:10, left:0, bottom:5 }}><XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} width={25} /><Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, color:'var(--text)' }} /><Bar dataKey="value" fill={OLIVE} radius={[6,6,0,0]} /></BarChart></ResponsiveContainer>}
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
          <div style={head}><Package size={16} strokeWidth={2.2} color="var(--chart-2)" /> Top produits</div>
          {topProducts.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>—</div> : topProducts.map((p,i) => (<div key={i} style={{ marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%', color:'var(--text)' }}>{p.name}</span><span style={{ color:'var(--chart-2)', fontWeight:700 }}>{p.value} {t('top.orders')}</span></div><div style={{ height:4, borderRadius:4, background:'var(--border)' }}><div style={{ width:(p.value/(topProducts[0]?.value??1))*100+'%', height:'100%', borderRadius:4, background:'var(--chart-2)' }} /></div></div>))}
        </div>
      </div>
    </div>
  )
}
