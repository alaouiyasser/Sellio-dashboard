'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import {
  CheckCircle2, Bell, Pencil, XCircle, Truck, Search, Check, X, ChevronLeft, ChevronRight,
} from 'lucide-react'

const TYPE_CONFIG: Record<string, { Icon: any; color: string; bg: string }> = {
  confirmation: { Icon: CheckCircle2, color: 'var(--success)',     bg: 'color-mix(in srgb, var(--success) 15%, transparent)' },
  reminder:     { Icon: Bell,         color: 'var(--warning)',     bg: 'color-mix(in srgb, var(--warning) 15%, transparent)' },
  modification: { Icon: Pencil,       color: 'var(--chart-2)',     bg: 'color-mix(in srgb, var(--chart-2) 15%, transparent)' },
  cancellation: { Icon: XCircle,      color: 'var(--destructive)', bg: 'color-mix(in srgb, var(--destructive) 15%, transparent)' },
  tracking:     { Icon: Truck,        color: 'var(--brand)',       bg: 'color-mix(in srgb, var(--brand) 15%, transparent)' },
}

export default function LogsPage() {
  const supabase = createClient()
  const { t } = useLang()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 15

  const TYPES = [
    { key: 'all',          label: t('status.all') },
    { key: 'sent', label: 'Envoyé' },
    { key: 'confirmation', label: t('msgTypes.confirmation') },
    { key: 'reminder',     label: t('msgTypes.reminder') },
    { key: 'modification', label: t('msgTypes.modification') },
    { key: 'cancellation', label: t('msgTypes.cancellation') },
    { key: 'tracking',     label: t('msgTypes.tracking') },
  ]

  const TypeIcon = ({ k, size = 14 }: { k: string; size?: number }) => {
    const cfg = TYPE_CONFIG[k]
    if (!cfg) return null
    const Ic = cfg.Icon
    return <Ic size={size} strokeWidth={2.2} />
  }

  useEffect(() => { fetchMessages() }, [typeFilter])

  async function fetchMessages() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let query = supabase.from('whatsapp_messages').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }).limit(200)
    if (typeFilter !== 'all') query = query.eq('message_type', typeFilter)
    const { data } = await query
    setMessages(data ?? [])
    setLoading(false)
  }

  const filtered = messages.filter(m => m.phone?.includes(search) || m.order_id?.includes(search))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.messages')} subtitle="WhatsApp" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              placeholder={`${t('table.phone')}...`}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ padding: '9px 14px 9px 36px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TYPES.map(ty => (
              <button key={ty.key} onClick={() => { setTypeFilter(ty.key); setPage(1) }} style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: typeFilter === ty.key ? 'var(--brand)' : 'var(--card)',
                color: typeFilter === ty.key ? '#fff' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {ty.key !== 'all' && <TypeIcon k={ty.key} />}
                {ty.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>—</div>
          ) : paginated.map((msg, i) => {
            const ty = TYPE_CONFIG[msg.message_type] ?? TYPE_CONFIG['confirmation']
            const RowIcon = ty.Icon
            return (
              <div key={i} style={{
                padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14,
                borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: ty.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ty.color }}>
                  <RowIcon size={17} strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className='msg-header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{msg.phone}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 5, background: ty.bg, color: ty.color, fontSize: 11, fontWeight: 600 }}>
                        {msg.message_type}
                      </span>
                    </div>
                    <span className='msg-date' style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {new Date(msg.created_at).toLocaleString('fr-MA')}
                    </span>
                  </div>
                  {msg.order_id && <div style={{ fontSize: 11, color: 'var(--brand)', marginBottom: 4 }}>#{msg.order_id.slice(0, 8)}</div>}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                    {msg.content ?? msg.template_name ?? '—'}
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {msg.status === 'sent'
                    ? <Check size={15} color="var(--success)" strokeWidth={2.6} />
                    : <X size={15} color="var(--destructive)" strokeWidth={2.6} />}
                </div>
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} / {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'grid', placeItems: 'center' }}><ChevronLeft size={15} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'grid', placeItems: 'center' }}><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
