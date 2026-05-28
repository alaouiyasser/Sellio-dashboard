'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  confirmation: { icon: '✅', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  reminder:     { icon: '⏰', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  modification: { icon: '✏️', color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
  cancellation: { icon: '❌', color: '#EF4444', bg: 'rgba(239,68,68,0.15)'  },
  tracking:     { icon: '🚚', color: '#8B9A35', bg: 'rgba(139,154,53,0.15)' },
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
          <input
            placeholder={`🔍 ${t('table.phone')}...`}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, outline: 'none', minWidth: 240 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TYPES.map(ty => (
              <button key={ty.key} onClick={() => { setTypeFilter(ty.key); setPage(1) }} style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: typeFilter === ty.key ? '#8B9A35' : 'var(--card)',
                color: typeFilter === ty.key ? '#fff' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {ty.key !== 'all' && <span>{TYPE_CONFIG[ty.key]?.icon}</span>}
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
            return (
              <div key={i} style={{
                padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14,
                borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: ty.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {ty.icon}
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
                  {msg.order_id && <div style={{ fontSize: 11, color: '#8B9A35', marginBottom: 4 }}>#{msg.order_id.slice(0, 8)}</div>}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                    {msg.content ?? msg.template_name ?? '—'}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: msg.status === 'sent' ? '#10B981' : '#EF4444', flexShrink: 0 }}>
                  {msg.status === 'sent' ? '✓' : '✗'}
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
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>←</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
