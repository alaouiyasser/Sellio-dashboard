'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, UserX, Plus, ShieldOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import PageHeader from '@/components/layout/PageHeader'
import {
  fetchBlacklist, fetchBlacklistSuggestions, addToBlacklist, removeFromBlacklist, BlacklistApiError,
  type BlacklistEntry, type BlacklistSuggestion,
} from '@/lib/blacklist-api'
import { tx, intlLocale } from '@/lib/i18n'

const th: React.CSSProperties = { padding: '11px 16px', textAlign: 'start', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: 'var(--text)' }
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }
const input: React.CSSProperties = { height: 36, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(intlLocale(), { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

export default function BlacklistPage() {
  const [tid, setTid] = useState<string | null>(null)
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [suggestions, setSuggestions] = useState<BlacklistSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirmPhone, setConfirmPhone] = useState<string | null>(null)
  const [busyPhone, setBusyPhone] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    const [e, s] = await Promise.all([
      fetchBlacklist(id).catch((err) => { toast.error(err instanceof Error ? err.message : tx('Échec du chargement')); return [] as BlacklistEntry[] }),
      fetchBlacklistSuggestions(id).catch(() => [] as BlacklistSuggestion[]),
    ])
    setEntries(e); setSuggestions(s); setLoading(false)
  }, [])

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setTid(user.id); load(user.id)
    })
  }, [load])

  useEffect(() => {
    if (!confirmPhone) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmPhone(null) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [confirmPhone])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!tid || adding || !phone.trim()) return
    setAdding(true); setFormError('')
    try {
      const r = await addToBlacklist(tid, phone.trim(), note.trim() || undefined)
      if (r.created) toast.success(tx('Numéro bloqué'))
      else toast(tx('Déjà bloqué'))
      setPhone(''); setNote('')
      await load(tid)
    } catch (err) {
      if (err instanceof BlacklistApiError && err.code === 'INVALID_PHONE') setFormError(err.message)
      else toast.error(err instanceof Error && err.message ? err.message : tx('Échec du blocage'))
    } finally { setAdding(false) }
  }

  async function unblock(p: string) {
    if (!tid) return
    setBusyPhone(p); setConfirmPhone(null)
    try {
      const r = await removeFromBlacklist(tid, p)
      toast.success(tx('Numéro débloqué : {0} commande(s) remise(s) en attente, {1} confirmation(s) WhatsApp relancée(s)', [r.releasedOrders, r.confirmationsQueued]))
      await load(tid)
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : tx('Échec du déblocage'))
    } finally { setBusyPhone(null) }
  }

  async function blockSuggestion(p: string) {
    if (!tid) return
    setBusyPhone(p)
    try {
      const r = await addToBlacklist(tid, p)
      if (r.created) toast.success(tx('Numéro bloqué')); else toast(tx('Déjà bloqué'))
      setSuggestions((list) => list.filter((s) => s.phone !== p))
      fetchBlacklist(tid).then(setEntries).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : tx('Échec du blocage'))
    } finally { setBusyPhone(null) }
  }

  const badge = (by: 'manual' | 'auto') => (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: by === 'auto' ? 'color-mix(in srgb, var(--warning) 15%, transparent)' : 'color-mix(in srgb, var(--brand) 15%, transparent)',
      color: by === 'auto' ? 'var(--warning)' : 'var(--brand)',
    }}>{by === 'auto' ? tx('Auto') : tx('Manuel')}</span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title={tx('Clients bloqués')} subtitle={tx('Les commandes de ces numéros ne sont pas confirmées automatiquement.')} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        <form onSubmit={add} style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{tx('Ajouter un numéro')}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input value={phone} onChange={(e) => { setPhone(e.target.value); setFormError('') }} inputMode="tel" dir="ltr"
                placeholder={tx('Numéro de téléphone')} aria-label={tx('Numéro de téléphone')} aria-invalid={!!formError}
                style={{ ...input, width: 220, borderColor: formError ? 'var(--destructive)' : 'var(--border)' }} />
              {formError && <span role="alert" style={{ fontSize: 12, color: 'var(--destructive)' }}>{formError}</span>}
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
              placeholder={tx('Note (optionnel)')} aria-label={tx('Note (optionnel)')} style={{ ...input, width: 260 }} />
            <button type="submit" disabled={adding || !phone.trim()} style={{ ...btn, background: 'var(--brand)', borderColor: 'var(--brand)', color: '#fff', opacity: adding || !phone.trim() ? 0.6 : 1 }}>
              {adding ? <Loader2 size={15} strokeWidth={1.8} className="animate-spin" /> : <Plus size={15} strokeWidth={1.8} />}
              {tx('Bloquer')}
            </button>
          </div>
        </form>

        <section>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserX size={16} strokeWidth={1.8} />{tx('Numéros bloqués')}
          </div>
          <div style={{ ...card, overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 size={18} className="animate-spin" /></div>
            ) : entries.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>{tx('Aucun numéro bloqué.')}</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={th}>{tx('Téléphone')}</th><th style={th}>{tx('Note')}</th><th style={th}>{tx('Ajouté')}</th>
                  <th style={th}>{tx('Motif')}</th><th style={th}>{tx('Date')}</th><th style={th} />
                </tr></thead>
                <tbody>
                  {entries.map((en) => (
                    <tr key={en.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...td, fontWeight: 600 }} dir="ltr">{en.phone}</td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{en.note || '-'}</td>
                      <td style={td}>{badge(en.added_by)}</td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{en.reason || '-'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(en.created_at)}</td>
                      <td style={{ ...td, textAlign: 'end' }}>
                        <button type="button" onClick={() => setConfirmPhone(en.phone)} disabled={busyPhone === en.phone} style={{ ...btn, opacity: busyPhone === en.phone ? 0.6 : 1 }}>
                          {busyPhone === en.phone ? <Loader2 size={14} strokeWidth={1.8} className="animate-spin" /> : <ShieldOff size={14} strokeWidth={1.8} />}
                          {tx('Débloquer')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{tx('Suggestions')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{tx('Numéros avec plusieurs retours ou annulations.')}</div>
          <div style={{ ...card, overflowX: 'auto' }}>
            {suggestions.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>{tx('Aucune suggestion pour le moment.')}</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={th}>{tx('Téléphone')}</th><th style={th}>{tx('Retours / annulations')}</th><th style={th}>{tx('Dernière commande')}</th><th style={th} />
                </tr></thead>
                <tbody>
                  {suggestions.map((s) => (
                    <tr key={s.phone} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...td, fontWeight: 600 }} dir="ltr">{s.phone}</td>
                      <td style={td}>{s.count}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(s.lastOrderDate)}</td>
                      <td style={{ ...td, textAlign: 'end' }}>
                        <button type="button" onClick={() => blockSuggestion(s.phone)} disabled={busyPhone === s.phone} style={{ ...btn, opacity: busyPhone === s.phone ? 0.6 : 1 }}>
                          {busyPhone === s.phone ? <Loader2 size={14} strokeWidth={1.8} className="animate-spin" /> : <UserX size={14} strokeWidth={1.8} />}
                          {tx('Bloquer')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {confirmPhone && (
        <div role="dialog" aria-modal="true" aria-label={tx('Débloquer')} onClick={() => setConfirmPhone(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 420, width: '100%', padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{tx('Débloquer')} <span dir="ltr">{confirmPhone}</span></div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {tx('Les commandes bloquées de ce numéro seront remises en attente et la confirmation WhatsApp repartira.')}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" autoFocus onClick={() => setConfirmPhone(null)} style={btn}>{tx('Annuler')}</button>
              <button type="button" onClick={() => unblock(confirmPhone)} style={{ ...btn, background: 'var(--brand)', borderColor: 'var(--brand)', color: '#fff' }}>{tx('Débloquer')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
