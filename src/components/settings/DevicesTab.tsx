'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Smartphone, LogOut, Trash2, ShieldCheck, Loader2 } from 'lucide-react'
import { API_BASE } from '@/lib/auth-client'

type Device = {
  id: string
  label: string | null
  last_ip: string | null
  last_seen_at: string
  created_at: string
  expires_at: string
  current: boolean
}

export default function DevicesTab() {
  const supabase = createClient()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  async function load() {
    setLoading(true)
    try {
      const t = await getToken()
      if (!t) return
      const res = await fetch(`${API_BASE}/api/auth/devices`, {
        headers: { Authorization: `Bearer ${t}` },
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) setDevices(data.devices ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function revoke(id: string) {
    setBusy(id)
    try {
      const t = await getToken()
      const res = await fetch(`${API_BASE}/api/auth/devices/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        credentials: 'include',
        body: JSON.stringify({ deviceId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        toast.success('Appareil révoqué')
        setDevices((d) => d.filter((x) => x.id !== id))
      } else toast.error('Échec de la révocation')
    } finally {
      setBusy(null)
    }
  }

  async function revokeOthers() {
    setBusy('others')
    try {
      const t = await getToken()
      const res = await fetch(`${API_BASE}/api/auth/devices/revoke-others`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        toast.success(`${data.revoked} appareil(s) déconnecté(s)`)
        load()
      } else toast.error('Échec')
    } finally {
      setBusy(null)
    }
  }

  function fmt(iso: string) {
    try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }
    catch { return iso }
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Loader2 size={15} className="animate-spin" /> Chargement...
      </div>
    )
  }

  const others = devices.filter((d) => !d.current).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 14, borderRadius: 10, background: 'color-mix(in srgb, var(--brand) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 18%, transparent)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <ShieldCheck size={15} strokeWidth={2.2} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Les appareils où vous êtes resté connecté. Révoquez ceux que vous ne reconnaissez pas.</span>
      </div>

      {devices.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 8 }}>Aucun appareil mémorisé.</div>
      ) : (
        <div>
          {devices.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--brand) 10%, transparent)', color: 'var(--brand)', flexShrink: 0 }}>
                <Smartphone size={17} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {d.label ?? 'Appareil'}
                  {d.current && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'var(--success)', color: '#fff' }}>CET APPAREIL</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.last_ip ?? '—'} · vu le {fmt(d.last_seen_at)}</div>
              </div>
              {!d.current && (
                <button onClick={() => revoke(d.id)} disabled={busy === d.id} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--destructive)', background: 'transparent', color: 'var(--destructive)', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: busy === d.id ? 0.6 : 1 }}>
                  <Trash2 size={13} strokeWidth={2.2} /> Révoquer
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {others > 0 && (
        <button onClick={revokeOthers} disabled={busy === 'others'} style={{ alignSelf: 'flex-start', marginTop: 4, padding: '9px 16px', borderRadius: 9, border: '1px solid var(--destructive)', background: 'transparent', color: 'var(--destructive)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, opacity: busy === 'others' ? 0.6 : 1 }}>
          <LogOut size={14} strokeWidth={2.2} /> Déconnecter tous les autres appareils
        </button>
      )}
    </div>
  )
}
