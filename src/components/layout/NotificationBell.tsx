'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { authFetch } from '@/lib/api-fetch'
import { API_BASE } from '@/lib/auth-client'

import { tx, intlLocale } from '@/lib/i18n'
interface Notification { id: number; kind: string; title: string; body: string | null; link: string | null; urgent: boolean; read_at: string | null; created_at: string }

async function api(path: string, init?: RequestInit) {
  const res = await authFetch(`${API_BASE}/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.success === false) throw new Error('notifications')
  return data
}

function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (m < 1) return 'à l’instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `il y a ${h} h`
  return new Date(iso).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' })
}

/** Merchant alerts (delivery problems, returns, reports, offers, credits) — in the app, not on WhatsApp. */
export default function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState(true)
  const box = useRef<HTMLDivElement>(null)

  async function load() {
    try { const r = await api('/notifications'); setItems(r.notifications); setUnread(r.unread); setAvailable(true) }
    catch { setAvailable(false) }
  }
  useEffect(() => {
    load()
    const t = setInterval(() => { if (document.visibilityState === 'visible') load() }, 60_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  async function read(ids?: number[]) {
    const now = new Date().toISOString()
    setItems((l) => l.map((n) => (!ids || ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)))
    setUnread((u) => (ids ? Math.max(0, u - ids.filter((id) => items.find((n) => n.id === id && !n.read_at)).length) : 0))
    try { await api('/notifications/read', { method: 'POST', body: JSON.stringify(ids ? { ids } : {}) }) } catch { /* next poll fixes it */ }
  }

  if (!available) return null

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} aria-label={unread ? tx("Notifications, {0} non lues", [unread]) : tx("Notifications")} aria-expanded={open}
        style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
        <Bell size={16} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -3, insetInlineEnd: -3, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--destructive)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={tx("Notifications")} style={{
          position: 'absolute', top: 42, insetInlineEnd: 0, width: 'min(360px, calc(100vw - 32px))', maxHeight: 460, overflow: 'auto', zIndex: 50,
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{tx("Notifications")}</span>
            {unread > 0 && <button onClick={() => read()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 12, cursor: 'pointer' }}>{tx("Tout marquer comme lu")}</button>}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>{tx("Rien de nouveau.")}</div>
          ) : items.map((n) => (
            <button key={n.id} onClick={() => { if (!n.read_at) read([n.id]); if (n.link) { setOpen(false); router.push(n.link) } }}
              style={{ display: 'block', width: '100%', textAlign: 'start', padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--border)', cursor: n.link ? 'pointer' : 'default',
                background: n.read_at ? 'transparent' : 'color-mix(in srgb, var(--brand) 6%, transparent)' }}>
              <div dir="auto" style={{ fontSize: 13, fontWeight: n.read_at ? 500 : 650, color: n.urgent ? 'var(--destructive)' : 'var(--text)', lineHeight: 1.4 }}>{n.title}</div>
              {n.body && <div dir="auto" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{n.body}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{ago(n.created_at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
