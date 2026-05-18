'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
const OLIVE = '#8B9A35'
const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#8B9A35']
function parseItems(i: any): any[] { if (Array.isArray(i)) return i; if (typeof i === 'string') { try { return JSON.parse(i) } catch { return [] } } return [] }
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
      const city = o.shipping_address ?? o.city
      if (city) cities[city] = (cities[city] ?? 0) + 1
      parseItems(o.items).forEach((item: any) => { const name = item.title ?? item.name ?? 'Produit'; products[name] = (products[name] ?? 0) + (item.quantity ?? 1) })
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
        <p style={{ color:'var(--red)' }}>0 orders found. Check RLS.</p>
        <button onClick={fetchData} style={{ marginTop:12, padding:'8px 16px', background:'var(--olive)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>Retry</button>
      </div>
    </div>
  )
  if (false) return <div style={{ display:'flex', flexDirection:'column', height:'100%' }}><Topbar title="Analytiques" /><div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>{t('loading')}</div></div>
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <Topbar title="Analytiques" subtitle={total + ' commandes'} />
      <div style={{ flex:1, overflow:'auto', padding:24, display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20 }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:16, color:'var(--text)' }}>🎯 Statuts</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>{pieData.map((_,i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, color:'var(--text)' }} /></PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:12 }}>
              {pieData.map((d,i) => (<div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text)' }}><span style={{ width:8, height:8, borderRadius:'50%', background:COLORS[i], display:'inline-block' }} />{d.name}</div><div style={{ display:'flex', gap:8 }}><span style={{ color:COLORS[i], fontWeight:700 }}>{d.value}</span><span style={{ color:'var(--text-muted)' }}>{total > 0 ? Math.round((d.value/total)*100) : 0}%</span></div></div>))}
            </div>
          </div>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:16, color:'var(--text)' }}>❌ Raisons annulation</div>
            {cancelReasons.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>—</div> : cancelReasons.map((r,i) => (<div key={i} style={{ marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'75%', color:'var(--text)' }}>{r.name}</span><span style={{ color:'#EF4444', fontWeight:700 }}>{r.value}</span></div><div style={{ height:4, borderRadius:4, background:'var(--border)' }}><div style={{ width:(r.value/(cancelReasons[0]?.value??1))*100+'%', height:'100%', borderRadius:4, background:'#EF4444' }} /></div></div>))}
          </div>
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:16, color:'var(--text)' }}>��️ Top villes</div>
          {topCities.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>—</div> : <ResponsiveContainer width="100%" height={180}><BarChart data={topCities} margin={{ top:5, right:10, left:0, bottom:5 }}><XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} width={25} /><Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, color:'var(--text)' }} /><Bar dataKey="value" fill={OLIVE} radius={[6,6,0,0]} /></BarChart></ResponsiveContainer>}
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:16, color:'var(--text)' }}>📦 Top produits</div>
          {topProducts.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>—</div> : topProducts.map((p,i) => (<div key={i} style={{ marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'75%', color:'var(--text)' }}>{p.name}</span><span style={{ color:'#6366F1', fontWeight:700 }}>{p.value} ventes</span></div><div style={{ height:4, borderRadius:4, background:'var(--border)' }}><div style={{ width:(p.value/(topProducts[0]?.value??1))*100+'%', height:'100%', borderRadius:4, background:'#6366F1' }} /></div></div>))}
        </div>
      </div>
    </div>
  )
}