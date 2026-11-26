'use client'
// Founder console → "Activations" (/admin/stores, the link of the API's phone notification). Plan
// Démarrage: the founder checks the Instagram screenshot received on WhatsApp, then activates by hand,
// or refuses with a reason the merchant will read.
import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { adminApi, type ActivationRequest } from '@/lib/admin-api'
import { waLink } from '@/lib/storefront'
import { Card, PageHead, Skeleton, ErrorBox, dateFr, th, td, btn, inputStyle } from '@/components/admin/ui'

export default function AdminActivationsPage() {
  const [rows, setRows] = useState<ActivationRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  /** The request being refused: its reason is asked under the row before anything is sent. */
  const [refusing, setRefusing] = useState<{ id: string; reason: string } | null>(null)

  const load = useCallback(() => {
    adminApi.activations().then((r) => { setRows(r.requests); setError(null) }).catch((e) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const nameOf = (r: ActivationRequest) => r.stores?.name ?? r.tenants?.name ?? r.tenant_id

  async function decide(r: ActivationRequest, send: () => Promise<unknown>, done: string) {
    setBusy(r.id)
    try {
      await send()
      setRows((x) => (x ?? []).filter((y) => y.id !== r.id))
      setRefusing((x) => (x?.id === r.id ? null : x))
      toast.success(done)
    } catch (e) {
      toast.error((e as Error).message)
      load() // e.g. already handled elsewhere: show the real list again
    } finally { setBusy(null) }
  }

  function approve(r: ActivationRequest) {
    if (!confirm(`Activer « ${nameOf(r)} » ? Vérifiez d’abord la capture du follow Instagram reçue sur WhatsApp.`)) return
    setRefusing(null)
    decide(r, () => adminApi.approveActivation(r.id), `« ${nameOf(r)} » est activé`)
  }

  function reject(e: React.FormEvent, r: ActivationRequest) {
    e.preventDefault()
    const reason = refusing?.reason.trim() ?? ''
    if (reason.length < 3 || busy !== null) return
    decide(r, () => adminApi.rejectActivation(r.id, reason), `Demande de « ${nameOf(r)} » refusée`)
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
                    <Fragment key={r.id}>
                    <tr>
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
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button type="button" onClick={() => approve(r)} disabled={busy !== null} style={{ ...btn('primary'), opacity: busy !== null ? 0.6 : 1 }}>
                            {busy === r.id && refusing?.id !== r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Activer
                          </button>
                          <button type="button" onClick={() => setRefusing({ id: r.id, reason: '' })} disabled={busy !== null || refusing?.id === r.id}
                            style={{ ...btn('danger'), opacity: busy !== null || refusing?.id === r.id ? 0.6 : 1 }}>
                            <XCircle size={14} /> Refuser
                          </button>
                        </div>
                      </td>
                    </tr>
                    {refusing?.id === r.id && (
                      <tr>
                        <td colSpan={6} style={{ ...td, whiteSpace: 'normal' }}>
                          <form onSubmit={(e) => reject(e, r)} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600 }}>
                              Refuser « {nameOf(r)} » ? Raison (le marchand la verra) :
                              <textarea autoFocus rows={2} maxLength={500} value={refusing.reason} disabled={busy !== null}
                                onChange={(e) => setRefusing({ id: r.id, reason: e.target.value })}
                                placeholder="Ex. : la capture ne montre pas l’abonnement" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontWeight: 400 }} />
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="submit" disabled={busy !== null || refusing.reason.trim().length < 3}
                                style={{ ...btn('danger'), opacity: busy !== null || refusing.reason.trim().length < 3 ? 0.6 : 1 }}>
                                {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirmer le refus
                              </button>
                              <button type="button" onClick={() => setRefusing(null)} disabled={busy !== null} style={btn('ghost')}>Annuler</button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                    </Fragment>
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
