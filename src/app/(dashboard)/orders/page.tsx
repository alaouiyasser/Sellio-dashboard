'use client'

import { useEffect, useState } from 'react'
import { shipFailed } from '@/lib/shipping-api'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import CarrierExportImport from '@/components/orders/CarrierExportImport'

const STATUS_CONFIG: Record<string, { label: Record<string, string>; bg: string; color: string }> = {
  confirmed: { label: { fr: 'Confirmé',   en: 'Confirmed', ar: 'مؤكد',         es: 'Confirmado'  }, bg: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' },
  pending:   { label: { fr: 'En attente', en: 'Pending',   ar: 'قيد الانتظار', es: 'Pendiente'   }, bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  cancelled: { label: { fr: 'Annulé',     en: 'Cancelled', ar: 'ملغي',         es: 'Cancelado'   }, bg: 'rgba(239,68,68,0.15)',  color: '#EF4444' },
  delivered: { label: { fr: 'Livré',      en: 'Delivered', ar: 'مسلم',         es: 'Entregado'   }, bg: 'color-mix(in srgb, var(--brand) 15%, transparent)', color: 'var(--brand)' },
 awaiting_delivery_check: { label: { fr: 'En attente confirmation', en: 'Awaiting confirmation', ar: 'في انتظار التأكيد', es: 'Esperando confirmación' }, bg: 'rgba(99,102,241,0.15)', color: '#6366F1' },
 delivery_issue: { label: { fr: 'Problème livraison', en: 'Delivery issue', ar: 'مشكل التوصيل', es: 'Problema entrega' }, bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
  needs_merchant_confirm: { label: { fr: 'À confirmer', en: 'To confirm', ar: 'خاص تأكيد', es: 'Por confirmar' }, bg: 'rgba(245,158,11,0.2)', color: '#F59E0B' },
  modified:  { label: { fr: 'Modifié',    en: 'Modified',  ar: 'معدل',         es: 'Modificado'  }, bg: 'rgba(99,102,241,0.15)', color: '#6366F1' },
  sent:      { label: { fr: 'En attente', en: 'Pending',   ar: 'قيد الانتظار', es: 'Pendiente'   }, bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  canceled:  { label: { fr: 'Annulé',     en: 'Cancelled', ar: 'ملغي',         es: 'Cancelado'   }, bg: 'rgba(239,68,68,0.15)',  color: '#EF4444' },
  returned:  { label: { fr: 'Retourné',   en: 'Returned',  ar: 'مرتجع',        es: 'Devuelto'    }, bg: 'rgba(249,115,22,0.15)', color: '#F97316' },
  in_delivery: { label: { fr: 'En livraison', en: 'In delivery', ar: 'جاري التوصيل', es: 'En reparto' }, bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
  delivery_unconfirmed: { label: { fr: 'Non confirmé', en: 'Unconfirmed', ar: 'غير مؤكد', es: 'Sin confirmar' }, bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
}

export default function OrdersPage() {
  const supabase = createClient()
  const { t, locale } = useLang()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const STATUSES = [
    { key: 'all',       label: t('status.all') },
    { key: 'confirmed', label: t('status.confirmed') },
    { key: 'pending',   label: t('status.pending') },
    { key: 'cancelled', label: t('status.cancelled') },
    { key: 'delivered', label: t('status.delivered') },
    { key: 'modified',  label: t('status.modified') },
  ]

  useEffect(() => {
    fetchOrders()
    
    // Realtime subscription
    let channel: any = null
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channel = supabase
        .channel('orders-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${user.id}`
        }, () => { fetchOrders() })
        .subscribe()
    })
    
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [statusFilter])

  async function fetchOrders() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let query = supabase.from('orders').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false })
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query
    setOrders(data ?? [])
    setLoading(false)
  }

  const filtered = orders.filter(o =>
    o.customer_phone?.includes(search) ||
    o.id?.includes(search) ||
    o.city?.toLowerCase().includes(search.toLowerCase())
  )

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('orders.title')} subtitle={`${orders.length} ${t('orders.total')}`} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            placeholder={`🔍 ${t('table.phone')}...`}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, outline: 'none', minWidth: 220 }}
          />
          <div className="filters-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => { setStatusFilter(s.key); setPage(1) }} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: statusFilter === s.key ? 'var(--brand)' : 'var(--card)',
                color: statusFilter === s.key ? '#fff' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {(() => {
          const notShipped = orders.filter(o => shipFailed(o))
          if (notShipped.length === 0) return null
          return (
            <div style={{ marginBottom: 20, background: 'color-mix(in srgb, var(--destructive) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--destructive)', marginBottom: 6 }}>
                ⚠️ {notShipped.length} {notShipped.length === 1 ? 'commande confirmée non envoyée au transporteur' : 'commandes confirmées non envoyées au transporteur'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                L'envoi automatique a échoué (ville, numéro…). Ouvrez la commande, corrigez puis « Renvoyer ».
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notShipped.map(o => (
                  <div key={o.id} onClick={() => window.location.href = `/orders/${o.id}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--card)', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>#{o.external_id ?? o.id?.slice(0, 8)}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>{String(o.delivery_status).replace(/^Erreur envoi\s*/, '')}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--destructive)', whiteSpace: 'nowrap' }}>Ouvrir →</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {(() => {
          const needsConfirm = orders.filter(o => o.status === 'needs_merchant_confirm')
          if (needsConfirm.length === 0) return null
          return (
            <div style={{ marginBottom: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>
                ⚠️ {needsConfirm.length} {needsConfirm.length === 1 ? 'commande à confirmer' : 'commandes à confirmer'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Le client n'a pas répondu. Confirmez le statut de livraison (Livré / Retourné / Refusé).
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {needsConfirm.map(o => (
                  <div key={o.id} onClick={() => window.location.href = `/orders/${o.id}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--card)', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>#{o.external_id ?? o.id?.slice(0,8)}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>{o.customer_phone}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>Confirmer →</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        <CarrierExportImport />

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div className="table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sidebar)' }}>
                {['ID', t('table.phone'), t('table.city'), t('table.amount'), t('table.status'), 'Date'].map((h, i) => (
                  <th key={h} className={i === 2 || i === 5 ? 'hide-on-mobile' : ''} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>—</td></tr>
              ) : paginated.map(order => {
                const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['pending']
                return (
                  <tr key={order.id} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => window.location.href = `/orders/${order.id}`}>
                    <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>#{order.id?.slice(0, 8)}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text)' }}>{order.customer_phone}</td>
                    <td className='hide-on-mobile' style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-muted)' }}>{(() => { try { const a = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address; return a?.city ?? '—' } catch { return order.city ?? '—' } })()}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{order.total_price ? `${order.total_price} MAD` : '—'}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
                        {s.label[locale] ?? s.label['fr']}
                      </span>
                    </td>
                    <td className="hide-on-mobile" style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleDateString('fr-MA')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>

          {totalPages > 1 && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} / {totalPages}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>←</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>→</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
