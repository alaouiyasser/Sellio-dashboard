'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Send, Bot } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { offersApi, type ChatMessage, type Offer } from '@/lib/offers-api'
import { OfferCard } from '@/components/offers/OfferCard'

const IDEAS = [
  'Quel produit me rapporte le plus cette semaine ?',
  'Propose-moi une offre pour augmenter le panier moyen',
  'Qu’est-ce que je dois préparer pour Black Friday ?',
  'Pourquoi j’ai des retours à certaines villes ?',
]

export default function CoachChatPage() {
  const isMobile = useIsMobile()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [offers, setOffers] = useState<Record<string, Offer>>({})
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    offersApi.history()
      .then((r) => { setMessages(r.messages); setOffers(Object.fromEntries(r.offers.map((o) => [o.id, o]))) })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, sending])

  async function send(msg = text) {
    const m = msg.trim()
    if (!m || sending) return
    setText('')
    setMessages((l) => [...l, { role: 'user', content: m }])
    setSending(true)
    try {
      const r = await offersApi.send(m)
      setOffers((o) => ({ ...o, ...Object.fromEntries(r.offers.map((x) => [x.id, x])) }))
      setMessages((l) => [...l, { role: 'assistant', content: r.reply, offer_id: r.offers[0]?.id ?? null }])
    } catch (e) {
      toast.error((e as Error).message)
      setMessages((l) => l.slice(0, -1)); setText(m)
    } finally { setSending(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Coach" subtitle="Posez vos questions sur votre boutique" />
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Link href="/ai-coach" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Rapports
          </Link>

          {loading ? <div style={{ textAlign: 'center', padding: 30 }}><Loader2 className="h-5 w-5 animate-spin" style={{ display: 'inline' }} /></div>
            : messages.length === 0 && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}><Bot size={18} color="var(--brand)" /> Votre coach connaît vos chiffres</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                  Demandez-lui ce qui marche, ce qui coûte, ou une idée d’offre. Il peut préparer une offre, mais c’est vous qui l’activez. Écrivez en darija ou en français.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {IDEAS.map((i) => (
                    <button key={i} onClick={() => send(i)} style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>{i}</button>
                  ))}
                </div>
              </div>
            )}

          {messages.map((m, i) => (
            <div key={m.id ?? `l${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
              <div dir="auto" style={{
                maxWidth: '88%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                background: m.role === 'user' ? 'var(--brand)' : 'var(--card)', color: m.role === 'user' ? '#fff' : 'var(--text)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              }}>{m.content}</div>
              {m.offer_id && offers[m.offer_id] && (
                <div style={{ width: '100%', maxWidth: 420 }}>
                  <OfferCard compact offer={offers[m.offer_id]} onChange={(o) => setOffers((x) => { const n = { ...x }; if (o) n[o.id] = o; else delete n[m.offer_id!]; return n })} />
                </div>
              )}
            </div>
          ))}
          {sending && <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 className="h-4 w-4 animate-spin" /> Le coach regarde vos chiffres…</div>}
          <div ref={end} />
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send() }} style={{ borderTop: '1px solid var(--border)', padding: isMobile ? 12 : 16, background: 'var(--card)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 8 }}>
          <textarea dir="auto" rows={1} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Écrivez votre question…" aria-label="Message au coach"
            style={{ flex: 1, resize: 'none', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }} />
          <button type="submit" disabled={sending || !text.trim()} aria-label="Envoyer"
            style={{ padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', opacity: sending || !text.trim() ? 0.6 : 1 }}>
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
