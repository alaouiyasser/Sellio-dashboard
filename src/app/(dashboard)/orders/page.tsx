'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { shipFailed } from '@/lib/shipping-api'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import CarrierExportImport from '@/components/orders/CarrierExportImport'
import PeriodFilter from '@/components/common/PeriodFilter'
import { orderCity, statusLabel, groupOf, customerName, productsLine, STATUS_GROUPS } from '@/lib/order-view'
import { presetPeriod, ordersInPeriod, type Period } from '@/lib/period'
import { tx, intlLocale } from '@/lib/i18n'

const PER_PAGE = 20
const GROUPS: { key: string; label: () => string }[] = [
  { key: 'all', label: () => tx('Toutes') },
  { key: 'pending', label: () => tx('En attente') },
  { key: 'confirmed', label: () => tx('Confirmées') },
  { key: 'shipping', label: () => tx('En livraison') },
  { key: 'delivered', label: () => tx('Livrées') },
  { key: 'returned', label: () => tx('Retournées') },
  { key: 'cancelled', label: () => tx('Annulées') },
]

export default function OrdersPage() {
  const supabase = createClient()
  const { t, locale } = useLang()
  const [orders, setOrders] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('all')
  const [period, setPeriod] = useState<Period>(() => presetPeriod('30d'))
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchOrders(period)
    let channel: any = null
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channel = supabase.channel('orders-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${user.id}` }, () => { fetchOrders(period, true) })
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [period])

  async function fetchOrders(p: Period, silent = false) {
    if (!silent) setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Orders to act on are shown whatever the period.
    const [rows, { data: todo }] = await Promise.all([
      ordersInPeriod(supabase, user.id, p).catch(() => []),
      supabase.from('orders').select('id, external_id, status, customer_name, customer_phone, delivery_status, delivery_tracking_code')
        .eq('tenant_id', user.id).in('status', ['needs_merchant_confirm', 'confirmed']).order('created_at', { ascending: false }).limit(200),
    ])
    setOrders(rows)
    setAlerts(todo ?? [])
    setLoading(false)
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const o of orders) { const g = groupOf(o.status); c[g] = (c[g] ?? 0) + 1 }
    return c
  }, [orders])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return orders.filter((o) => {
      if (group !== 'all' && !(STATUS_GROUPS[group] ?? []).includes(o.status)) return false
      if (!q) return true
      return customerName(o).toLowerCase().includes(q)
        || (digits.length >= 3 && String(o.customer_phone ?? '').replace(/\D/g, '').includes(digits))
        || productsLine(o).toLowerCase().includes(q)
        || orderCity(o).toLowerCase().includes(q)
        || String(o.external_id ?? o.id).toLowerCase().includes(q)
    })
  }, [orders, group, search])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const notShipped = alerts.filter((o) => shipFailed(o))
  const needsConfirm = alerts.filter((o) => o.status === 'needs_merchant_confirm')
  const th: React.CSSProperties = { padding: '11px 16px', textAlign: 'start', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: 'var(--text)' }

  const banner = (tone: string, title: string, sub: string, list: any[], cta: string, extra: (o: any) => string) => (
    <div style={{ marginBottom: 16, background: `color-mix(in srgb, ${tone} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${tone} 30%, transparent)`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: tone, marginBottom: 4 }}>⚠️ {title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{sub}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.slice(0, 8).map((o) => (
          <div key={o.id} onClick={() => window.location.href = `/orders/${o.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--card)', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)' }}>
            <div style={{ minWidth: 0, fontSize: 12.5 }}>
              <b style={{ color: 'var(--brand)' }}>#{o.external_id ?? o.id?.slice(0, 8)}</b>
              <span style={{ color: 'var(--text)', marginInlineStart: 8 }}>{customerName(o) || o.customer_phone}</span>
              <span style={{ color: 'var(--text-muted)', marginInlineStart: 8 }}>{extra(o)}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: tone, whiteSpace: 'nowrap' }}>{cta}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('orders.title')} subtitle={tx('{0} commandes sur la période', [orders.length])} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        {notShipped.length > 0 && banner('var(--destructive)',
          notShipped.length === 1 ? tx("1 commande confirmée non envoyée au transporteur") : tx("{0} commandes confirmées non envoyées au transporteur", [notShipped.length]),
          tx("L'envoi automatique a échoué (ville, numéro…). Ouvrez la commande, corrigez puis « Renvoyer »."),
          notShipped, tx("Ouvrir →"), (o) => String(o.delivery_status ?? '').replace(/^Erreur envoi\s*/, ''))}
        {needsConfirm.length > 0 && banner('var(--warning)',
          needsConfirm.length === 1 ? tx("1 commande à confirmer") : tx("{0} commandes à confirmer", [needsConfirm.length]),
          tx("Le client n'a pas répondu. Confirmez le statut de livraison (Livré / Retourné / Refusé)."),
          needsConfirm, tx("Confirmer →"), () => '')}

        <div style={{ marginBottom: 14 }}><PeriodFilter value={period} onChange={(p) => { setPeriod(p); setPage(1) }} /></div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: 260, flex: '0 1 340px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input placeholder={tx('Nom, téléphone, produit, ville, n° de commande')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              style={{ padding: '9px 14px', paddingInlineStart: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' }} />
          </div>
          <div className="filters-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GROUPS.map((g) => {
              const on = group === g.key
              return (
                <button key={g.key} onClick={() => { setGroup(g.key); setPage(1) }} aria-pressed={on} style={{
                  padding: '7px 12px', borderRadius: 8, border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`,
                  background: on ? 'var(--brand)' : 'var(--card)', color: on ? '#fff' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{g.label()} <span style={{ opacity: 0.75, fontWeight: 500 }}>{counts[g.key] ?? 0}</span></button>
              )
            })}
          </div>
        </div>

        <CarrierExportImport />

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div className="table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: 'var(--sidebar)' }}>
                <th style={th}>{tx('Commande')}</th><th style={th}>{tx('Client')}</th><th style={th}>{tx('Produit')}</th>
                <th style={th} className="hide-on-mobile">{t('table.city')}</th><th style={th}>{t('table.amount')}</th><th style={th}>{t('table.status')}</th>
                <th style={th} className="hide-on-mobile">{tx('Date')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{tx("Chargement...")}</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{tx("Aucune commande sur cette période.")}</td></tr>
              ) : paginated.map((o) => {
                const s = statusLabel(o.status, locale)
                const name = customerName(o)
                return (
                  <tr key={o.id} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => window.location.href = `/orders/${o.id}`}>
                    <td style={{ ...td, fontSize: 12, color: 'var(--brand)', fontWeight: 600, whiteSpace: 'nowrap' }}>#{o.external_id ?? o.id?.slice(0, 8)}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{name || o.customer_phone || '—'}</div>
                      {name && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{o.customer_phone}</div>}
                    </td>
                    <td style={{ ...td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={productsLine(o)}>{productsLine(o) || '—'}</td>
                    <td className="hide-on-mobile" style={{ ...td, color: 'var(--text-muted)' }}>{orderCity(o) || '—'}</td>
                    <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{o.total_price ? tx("{0} MAD", [o.total_price]) : '—'}</td>
                    <td style={td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />{tx(s.label)}
                      </span>
                    </td>
                    <td className="hide-on-mobile" style={{ ...td, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(o.created_at).toLocaleDateString(intlLocale(), { day: '2-digit', month: '2-digit' })} {new Date(o.created_at).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
          {totalPages > 1 && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx("Page")} {page} / {totalPages} · {tx('{0} commandes', [filtered.length])}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>←</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>→</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
