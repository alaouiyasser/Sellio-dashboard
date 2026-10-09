'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchIntegrations, exportOrders, importTracking, type IntegrationItem } from '@/lib/integrations-api'

export default function CarrierExportImport() {
  const supabase = createClient()
  const [tid, setTid] = useState<string | null>(null)
  const [carriers, setCarriers] = useState<IntegrationItem[]>([])
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !alive) return
      setTid(user.id)
      try {
        const items = await fetchIntegrations(user.id)
        const manual = items.filter(
          (i) => i.category === 'carrier' && i.method === 'manual' && i.connection?.status === 'connected',
        )
        if (!alive) return
        setCarriers(manual)
        const def = manual.find((m) => m.connection?.isDefault) ?? manual[0]
        if (def) setSlug(def.slug)
      } catch { /* silent: stays hidden */ }
    })
    return () => { alive = false }
  }, [])

  if (!tid || carriers.length === 0) return null

  async function onExport() {
    if (!tid || !slug) return
    setBusy('export'); setMsg(null)
    try {
      await exportOrders(tid, slug)
      setMsg({ ok: true, text: 'Fichier exporté' })
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Erreur export' })
    } finally { setBusy(null) }
  }

  async function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !tid || !slug) return
    setBusy('import'); setMsg(null)
    try {
      const r = await importTracking(tid, slug, file)
      setMsg({ ok: true, text: `${r.updated} mis à jour · ${r.delivered} livrés · ${r.skipped} ignorés` })
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || 'Erreur import' })
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const btn: CSSProperties = {
    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--card)', color: 'var(--text)', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }
  const current = carriers.find((c) => c.slug === slug)

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      {carriers.length > 1 && (
        <select value={slug} onChange={(e) => setSlug(e.target.value)} style={{ ...btn }}>
          {carriers.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      )}

      <button onClick={onExport} disabled={busy !== null} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
        {busy === 'export' ? '…' : `Exporter ${current?.name ?? ''}`}
      </button>

      <button onClick={() => fileRef.current?.click()} disabled={busy !== null} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
        {busy === 'import' ? '…' : 'Importer tracking'}
      </button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onImportFile} style={{ display: 'none' }} />

      {msg && (
        <span style={{ fontSize: 12, fontWeight: 600, color: msg.ok ? 'var(--success)' : '#EF4444' }}>
          {msg.text}
        </span>
      )}
    </div>
  )
}
