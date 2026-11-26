'use client'
// Founder console → "Activations" (/admin/stores, the link of the API's phone notification). Plan
// Démarrage: the founder checks the Instagram screenshot received on WhatsApp, then activates by hand.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { adminApi, type ActivationRequest } from '@/lib/admin-api'
import { waLink } from '@/lib/storefront'
import { Card, PageHead, Skeleton, ErrorBox, dateFr, th, td, btn } from '@/components/admin/ui'

export default function AdminActivationsPage() {
  const [rows, setRows] = useState<ActivationRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    adminApi.activations().then((r) => { setRows(r.requests); setError(null) }).catch((e) => setError(e.message))
  }, [])
  useEffect(load, [load])

  async function approve(r: ActivationRequest) {
    const name = r.stores?.name ?? r.tenants?.name ?? r.tenant_id
    if (!confirm(`Activer « ${name} » ? Vérifiez d’abord la capture du follow Instagram reçue sur WhatsApp.`)) return
    setBusy(r.id)
    try {
      await adminApi.approveActivation(r.id)
      setRows((x) => (x ?? []).filter((y) => y.id !== r.id))
      toast.success(`« ${name} » est activé`)
    } catch (e) {
      toast.error((e as Error).message)
      load() // e.g. already handled elsewhere: show the real list again
    } finally { setBusy(null) }
  }

  return (
    <div className="admin-page" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1400 }}>
      <PageHead title="Activations" subtitle="Plan Démarrage : comptes qui ont demandé l’activation après le follow Instagram et la capture envoyée sur WhatsApp."
        right={<button type="button" onClick={load} style={btn('ghost')}><RefreshCw size={14} /> Actualiser</button>} />

      {error && <ErrorBox message={error} onRetry={load} />}

      {!rows ? (!error && <Skeleton h={180} />) : rows.length === 0 ? (
        <Card><p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Aucune demande d’activation en attente.</p></Card>
      ) : (
        <Card pad={false}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Marchand', 'Boutique', 'Ville', 'WhatsApp', 'Demande', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const phones = [...new Set([r.tenants?.owner_phone, r.stores?.whatsapp].filter((p): p is string => !!waLink(p)).map((p) => waLink(p)!))]
                  return (
                    <tr key={r.id}>
                      <td style={td}>
                        <Link href={`/admin/merchants/${r.tenant_id}`} style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>{r.tenants?.name || 'Sans nom'}</Link>
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{r.stores?.name ?? '—'}</div>
                        {r.stores && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.stores.slug}</div>}
                      </td>
                      <td style={td}>{r.stores?.city || '—'}</td>
                      <td style={td}>
                        {phones.length === 0 ? '—' : phones.map((href) => (
                          <a key={href} href={href} target="_blank" rel="noreferrer" style={{ display: 'block', color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>+{href.slice('https://wa.me/'.length)}</a>
                        ))}
                      </td>
                      <td style={td}>{dateFr(r.created_at, true)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <button type="button" onClick={() => approve(r)} disabled={busy !== null} style={{ ...btn('primary'), opacity: busy !== null ? 0.6 : 1 }}>
                          {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Activer
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
