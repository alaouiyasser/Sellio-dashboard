'use client'

// Inbox: the merchant's WhatsApp conversations with HIS customers only (the API filters by tenant).
import { useEffect, useMemo, useRef, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ArrowLeft, Loader2, MessageCircle, RefreshCw, Search, Package } from 'lucide-react'
import { tx } from '@/lib/i18n'
import { inboxApi, type Conversation, type InboxMessage, type InboxOrder } from '@/lib/inbox-api'
import { statusLabel, productsLine } from '@/lib/order-view'

// Messages logged before the inbox existed have no text: show what kind of message it was.
const TYPE_LABEL: Record<string, string> = {
  sent: 'Message de confirmation envoyé', rappel: 'Rappel envoyé', reminder: 'Rappel envoyé', tracking: 'Lien de suivi envoyé',
  delivery_check: 'Vérification de livraison envoyée', reply: 'Réponse automatique', confirmation: 'Commande confirmée',
  annulation: 'Commande annulée', cancellation: 'Commande annulée', modification: 'Commande modifiée', inbound: 'Message du client',
}
const typeLabel = (t: string | null) => tx(TYPE_LABEL[t ?? ''] ?? 'Message')
const initials = (c: { name: string | null; phone: string }) =>
  (c.name ? c.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('') : c.phone.replace(/\D/g, '').slice(-2)).toUpperCase()
const prettyPhone = (p: string) => {
  const d = p.replace(/\D/g, '').slice(-9)
  return d.length === 9 ? `0${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : p
}
function when(iso: string, locale: string) {
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return tx('Hier')
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
}
const dayLabel = (iso: string, locale: string) => new Date(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })

export default function InboxPage() {
  const { t, locale: lang } = useLang()
  const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR'
  const isMobile = useIsMobile()
  const [list, setList] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [onlyWaiting, setOnlyWaiting] = useState(false)
  const [active, setActive] = useState<Conversation | null>(null)
  const [thread, setThread] = useState<{ messages: InboxMessage[]; orders: InboxOrder[] } | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  async function loadList(query = q) {
    setLoading(true); setError('')
    try { setList((await inboxApi.list(query)).conversations) } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  async function open(c: Conversation) {
    setActive(c); setThread(null); setThreadLoading(true)
    try { setThread(await inboxApi.thread(c.phone)) } catch (e: any) { setError(e.message) } finally { setThreadLoading(false) }
  }

  useEffect(() => { const id = setTimeout(() => loadList(q), 350); return () => clearTimeout(id) }, [q])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [thread])

  const shown = useMemo(() => (onlyWaiting ? list.filter((c) => c.waitingReply) : list), [list, onlyWaiting])
  const waiting = list.filter((c) => c.waitingReply).length

  const listPane = (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderInlineEnd: isMobile ? 'none' : '1px solid var(--border)', background: 'var(--card)' }}>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Nom, téléphone ou n° de commande')}
            style={{ width: '100%', padding: '9px 12px', paddingInlineStart: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[{ k: false, l: tx('Toutes ({0})', [list.length]) }, { k: true, l: tx('À lire ({0})', [waiting]) }].map((f) => (
            <button key={String(f.k)} onClick={() => setOnlyWaiting(f.k)} style={{
              padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: '1px solid ' + (onlyWaiting === f.k ? 'var(--brand)' : 'var(--border)'),
              background: onlyWaiting === f.k ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'transparent',
              color: onlyWaiting === f.k ? 'var(--brand)' : 'var(--text-muted)',
            }}>{f.l}</button>
          ))}
          <button onClick={() => loadList()} aria-label={tx('Actualiser')} style={{ marginInlineStart: 'auto', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {error && <div style={{ padding: 16, fontSize: 13, color: 'var(--destructive)' }}>{error}</div>}
        {!loading && shown.length === 0 && !error && (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {q ? tx('Aucune conversation ne correspond à « {0} ».', [q]) : tx('Les conversations avec vos clients apparaîtront ici dès le premier message envoyé.')}
          </div>
        )}
        {shown.map((c) => {
          const sel = active?.key === c.key
          return (
            <button key={c.key} onClick={() => open(c)} style={{
              width: '100%', display: 'flex', gap: 10, padding: '12px 14px', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'start',
              background: sel ? 'color-mix(in srgb, var(--brand) 9%, transparent)' : 'transparent', color: 'var(--text)',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, background: 'color-mix(in srgb, var(--brand) 16%, transparent)', color: 'var(--brand)' }}>{initials(c)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || prettyPhone(c.phone)}</span>
                  <span style={{ fontSize: 11, color: c.waitingReply ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }}>{when(c.lastAt, locale)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastDirection === 'outbound' ? '✓ ' : ''}{c.lastMessage || typeLabel(c.lastType)}
                  </span>
                  {c.waitingReply && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0, marginTop: 4 }} aria-label={tx('Le client a écrit en dernier')} />}
                </div>
                {c.order && (
                  <div style={{ marginTop: 4, fontSize: 11, color: statusLabel(c.order.status).color }}>#{c.order.ref} · {statusLabel(c.order.status).label}</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  let lastDay = ''
  const threadPane = !active ? (
    <div style={{ display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
      <div><MessageCircle size={34} style={{ margin: '0 auto 10px', opacity: 0.5 }} />{tx('Choisissez une conversation pour la lire.')}<br />
        <span style={{ fontSize: 12 }}>{tx('Vous ne voyez que vos propres clients.')}</span></div>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        {isMobile && <button onClick={() => setActive(null)} aria-label={tx('Retour')} style={{ border: 'none', background: 'none', color: 'var(--text)', cursor: 'pointer', padding: 4 }}><ArrowLeft size={18} /></button>}
        <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: 'color-mix(in srgb, var(--brand) 16%, transparent)', color: 'var(--brand)' }}>{initials(active)}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{active.name || prettyPhone(active.phone)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }} dir="ltr">{prettyPhone(active.phone)}</div>
        </div>
      </div>

      {thread && thread.orders.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 14px', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          {thread.orders.map((o) => {
            const s = statusLabel(o.status)
            return (
              <div key={o.id} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>
                <Package size={13} color="var(--text-muted)" />
                <span style={{ fontWeight: 600 }}>#{o.external_id ?? o.id.slice(0, 8)}</span>
                <span style={{ color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{productsLine(o)}</span>
                {o.total_price != null && <span>{Math.round(o.total_price)} DH</span>}
                <span style={{ padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.color, fontWeight: 600 }}>{s.label}</span>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px 20px', background: 'color-mix(in srgb, var(--brand) 4%, var(--bg))', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {threadLoading && <div style={{ textAlign: 'center', padding: 30 }}><Loader2 className="h-5 w-5 animate-spin" style={{ display: 'inline', color: 'var(--text-muted)' }} /></div>}
        {thread?.messages.map((m) => {
          const day = new Date(m.created_at).toDateString()
          const sep = day !== lastDay ? (lastDay = day, <div key={'d' + m.id} style={{ alignSelf: 'center', margin: '10px 0 4px', fontSize: 11.5, color: 'var(--text-muted)', background: 'var(--card)', padding: '3px 10px', borderRadius: 8 }}>{dayLabel(m.created_at, locale)}</div>) : null
          const time = new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
          if (m.direction === 'event') return (
            <div key={m.id} style={{ display: 'contents' }}>{sep}
              <div style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--warning) 12%, var(--card))', padding: '4px 12px', borderRadius: 8 }}>
                {typeLabel(m.message_type)} · {time}
              </div>
            </div>
          )
          const mine = m.direction !== 'inbound'
          return (
            <div key={m.id} style={{ display: 'contents' }}>{sep}
              <div style={{
                alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: isMobile ? '86%' : '68%', padding: '8px 10px 5px', borderRadius: 12,
                borderEndEndRadius: mine ? 3 : 12, borderEndStartRadius: mine ? 12 : 3,
                background: mine ? 'color-mix(in srgb, var(--success) 18%, var(--card))' : 'var(--card)', border: '1px solid var(--border)',
                fontSize: 13.5, lineHeight: 1.5, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }} dir="auto">
                {m.content || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{typeLabel(m.message_type)}</span>}
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'end', marginTop: 2 }}>{mine ? tx('Sellio') + ' · ' : ''}{time}</div>
              </div>
            </div>
          )
        })}
        {thread && thread.messages.length === 0 && <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: 30 }}>{tx('Aucun message.')}</div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, color: 'var(--text-muted)' }}>
        {tx('Les réponses sont envoyées automatiquement par Sellio. Pour écrire vous-même au client, ouvrez WhatsApp :')}{' '}
        <a href={`https://wa.me/212${active.phone.replace(/\D/g, '').slice(-9)}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', fontWeight: 600 }}>{tx('Écrire sur WhatsApp')}</a>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.messages')} subtitle={tx('Conversations WhatsApp avec vos clients')} />
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 360px) 1fr', margin: isMobile ? 0 : 16, border: isMobile ? 'none' : '1px solid var(--border)', borderRadius: isMobile ? 0 : 16, overflow: 'hidden' }}>
        {isMobile ? (active ? threadPane : listPane) : <>{listPane}{threadPane}</>}
      </div>
    </div>
  )
}
