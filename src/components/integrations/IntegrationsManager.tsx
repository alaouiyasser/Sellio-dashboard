'use client'

import { authFetch } from '@/lib/api-fetch'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  fetchIntegrations, connectIntegration, disconnectIntegration, updateIntegration,
  deleteWaInstance, toggleWaInstance, initialFormValues, missingFields,
  type IntegrationItem,
} from '@/lib/integrations-api'
import IntegrationFields from './IntegrationFields'
import { toast } from 'sonner'
import { Plus, Check, X, Settings2, Power, Loader2, MessageCircle } from 'lucide-react'

const card: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18,
}
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }
const smallBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9,
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', whiteSpace: 'nowrap',
}
const addBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
  background: 'var(--brand)', color: '#fff', whiteSpace: 'nowrap',
}

export default function IntegrationsManager() {
  const [tid, setTid] = useState<string | null>(null)
  const [items, setItems] = useState<IntegrationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addCat, setAddCat] = useState<null | 'ecommerce' | 'carrier'>(null)
  const [modal, setModal] = useState<IntegrationItem | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [waInstances, setWaInstances] = useState<Array<{ instance_key: string; phone_number: string; status: string; messages_today?: number; daily_limit?: number }>>([])
  const [waModal, setWaModal] = useState(false)
  const [waPhone, setWaPhone] = useState('')
  const [waQr, setWaQr] = useState<string | null>(null)
  const [waBusy, setWaBusy] = useState(false)
  const waPoll = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (tenantId: string) => {
    try {
      const list = await fetchIntegrations(tenantId)
      setItems(list)
      try {
        const API = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:3001'
        // Sync real Evolution state first (webhook-independent), then load
        try { await authFetch(`${API}/api/whatsapp/${tenantId}/instances/sync`, { method: 'POST' }) } catch {}
        const r = await authFetch(`${API}/api/whatsapp/${tenantId}/instances`)
        const d = await r.json()
        if (d.ok) setWaInstances(d.instances ?? [])
      } catch {}
    } catch { toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: t } = await supabase.from('tenants').select('id').eq('email', data.user.email).single()
      if (t) { setTid(t.id); load(t.id) }
    })
  }, [load])

  const connected = (cat: 'ecommerce' | 'carrier') =>
    items.filter((i) => i.category === cat && i.connection)
  const available = (cat: 'ecommerce' | 'carrier') =>
    items.filter((i) => i.category === cat && !i.connection && i.status !== 'coming_soon')

  async function openConnect(item: IntegrationItem) {
    setModal(item); setForm(initialFormValues(item)); setAddCat(null)
  }
  async function submitConnect() {
    if (!tid || !modal) return
    const missing = missingFields(modal, form)
    if (missing.length) { toast.error(`Champs requis : ${missing.map((f) => f.label).join(', ')}`); return }
    setBusy(modal.slug)
    try {
      await connectIntegration(tid, modal.slug, form)
      toast.success(`${modal.name} connecté ✓`)
      setModal(null); await load(tid)
    } catch (e: any) { toast.error(e?.message || 'Erreur') }
    finally { setBusy(null) }
  }
  async function toggle(item: IntegrationItem) {
    if (!tid) return
    setBusy(item.slug)
    try {
      const isDisabled = item.connection?.status === 'disabled'
      await updateIntegration(tid, item.slug, { enabled: isDisabled })
      toast.success(isDisabled ? 'Activé' : 'Désactivé')
      await load(tid)
    } catch (e: any) { toast.error(e?.message || 'Erreur') }
    finally { setBusy(null) }
  }
  async function remove(item: IntegrationItem) {
    if (!tid) return
    if (!confirm(`Déconnecter ${item.name} ?`)) return
    setBusy(item.slug)
    try {
      await disconnectIntegration(tid, item.slug)
      toast.success('Déconnecté')
      await load(tid)
    } catch (e: any) { toast.error(e?.message || 'Erreur') }
    finally { setBusy(null) }
  }

  async function removeWa(instanceKey: string, phone: string) {
    if (!tid) return
    if (!confirm(`Supprimer le numéro ${phone} ?`)) return
    setWaBusy(true)
    try {
      await deleteWaInstance(tid, instanceKey)
      toast.success('Numéro supprimé')
      await refreshWa()
    } catch (e: any) { toast.error(e?.message || 'Erreur') }
    finally { setWaBusy(false) }
  }

  async function toggleWa(instanceKey: string, currentStatus: string) {
    if (!tid) return
    const enabling = currentStatus === 'disabled'
    setWaBusy(true)
    try {
      await toggleWaInstance(tid, instanceKey, enabling)
      toast.success(enabling ? 'Activé' : 'Désactivé')
      await refreshWa()
    } catch (e: any) { toast.error(e?.message || 'Erreur') }
    finally { setWaBusy(false) }
  }

  const WA_API = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:3001'

  async function refreshWa() {
    if (!tid) return
    try {
      const r = await authFetch(`${WA_API}/api/whatsapp/${tid}/instances`)
      const d = await r.json()
      if (d.ok) setWaInstances(d.instances ?? [])
    } catch {}
  }

  function startWaPoll() {
    if (waPoll.current) clearInterval(waPoll.current)
    waPoll.current = setInterval(async () => {
      await refreshWa()
      try {
        const r = await authFetch(`${WA_API}/api/whatsapp/${tid}/instances`)
        const d = await r.json()
        const online = (d.instances ?? []).some((i: any) => i.status === 'online' && i.phone_number === ('+212' + waPhone.replace(/^\+?212/, '')))
        if (online) {
          clearInterval(waPoll.current!)
          setWaQr(null); setWaModal(false); setWaPhone('')
          toast.success('Numéro WhatsApp connecté ✓')
          refreshWa()
        }
      } catch {}
    }, 5000)
  }

  async function handleAddNumber() {
    const full = '+212' + waPhone.replace(/^\+?212/, '').replace(/\s/g, '')
    if (waPhone.replace(/^\+?212/, '').length < 9) { toast.error('Numéro invalide'); return }
    setWaBusy(true)
    try {
      const res = await authFetch(`${WA_API}/api/whatsapp/${tid}/instance/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: full }),
      })
      const data = await res.json()
      if (data.ok && data.qrcode?.base64) {
        setWaQr(data.qrcode.base64); startWaPoll()
        toast('Scannez le QR code avec WhatsApp')
      } else {
        toast.error(data.error ?? 'Erreur lors de la création')
      }
    } catch (e: any) { toast.error(e.message) }
    finally { setWaBusy(false) }
  }

  if (loading) return <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px 24px 64px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Mes intégrations</h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, marginBottom: 28 }}>Gérez vos plateformes, transporteurs et numéros WhatsApp.</p>

      {/* ─── PLATEFORMES ─── */}
      <ConnectedSection
        title="Plateforme e-commerce"
        connected={connected('ecommerce')}
        available={available('ecommerce')}
        onAdd={() => setAddCat(addCat === 'ecommerce' ? null : 'ecommerce')}
        showAdd={addCat === 'ecommerce'}
        onPick={openConnect}
        onToggle={toggle}
        onRemove={remove}
        busy={busy}
      />

      {/* ─── LIVRAISON ─── */}
      <ConnectedSection
        title="Société de livraison"
        connected={connected('carrier')}
        available={available('carrier')}
        onAdd={() => setAddCat(addCat === 'carrier' ? null : 'carrier')}
        showAdd={addCat === 'carrier'}
        onPick={openConnect}
        onToggle={toggle}
        onRemove={remove}
        busy={busy}
      />

      {/* ─── WHATSAPP ─── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={sectionTitle}>WhatsApp</h2>
          <button onClick={() => { setWaModal(true); setWaPhone(''); setWaQr(null) }} style={addBtn}><Plus size={15} /> Ajouter un numéro</button>
        </div>
        {waInstances.length === 0 ? (
          <div style={{ ...card, color: 'var(--text-muted)', fontSize: 13.5, textAlign: 'center', padding: 24 }}>
            Aucun numéro WhatsApp. Cliquez sur « Ajouter un numéro ».
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {waInstances.map((wa) => {
              const online = wa.status === 'online'
              const isDisabled = wa.status === 'disabled'
              const statusLabel = isDisabled ? 'Désactivé ⛔' : online ? 'En ligne 🟢' : 'Hors ligne'
              const statusColor = isDisabled ? 'var(--text-muted)' : online ? '#16a34a' : 'var(--text-muted)'
              return (
                <div key={wa.instance_key} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: '#25D366', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <MessageCircle size={20} color="#fff" strokeWidth={2.2} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{wa.phone_number || 'Numéro WhatsApp'}</div>
                      <div style={{ fontSize: 12, color: statusColor, marginTop: 1 }}>
                        {statusLabel} · {wa.messages_today ?? 0}/{wa.daily_limit ?? 300} msg
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => toggleWa(wa.instance_key, wa.status)} disabled={waBusy} style={smallBtn}>
                      <Power size={14} /> {wa.status === 'disabled' ? 'Activer' : 'Désactiver'}
                    </button>
                    <button onClick={() => removeWa(wa.instance_key, wa.phone_number)} disabled={waBusy} style={{ ...smallBtn, color: 'var(--destructive)' }}>
                      <X size={14} /> Supprimer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* WhatsApp add-number modal */}
      {waModal && (
        <div onClick={() => !waBusy && !waQr && setWaModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Ajouter un numéro WhatsApp</div>
              <button onClick={() => { setWaModal(false); setWaQr(null); if (waPoll.current) clearInterval(waPoll.current) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            {!waQr ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', background: 'var(--bg)' }}>
                  <span style={{ padding: '11px 12px', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--card)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>🇲🇦 +212</span>
                  <input
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="6 00 00 00 00"
                    inputMode="numeric"
                    style={{ flex: 1, padding: '11px 12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                  />
                </div>
                <button onClick={handleAddNumber} disabled={waBusy} style={{ ...addBtn, width: '100%', justifyContent: 'center', padding: 11 }}>
                  {waBusy ? <Loader2 size={15} className="animate-spin" /> : <><MessageCircle size={15} /> Générer le QR code</>}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Ouvrez WhatsApp → Appareils connectés → Connecter un appareil → Scannez</p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <img src={waQr} alt="QR WhatsApp" width={220} height={220} style={{ borderRadius: 10, border: '1px solid var(--border)' }} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>En attente de connexion...</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connect modal */}
      {modal && (
        <div onClick={() => !busy && setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{modal.connection ? 'Modifier' : 'Connecter'} {modal.name}</div>
              <button onClick={() => !busy && setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <IntegrationFields item={modal} form={form} onChange={(k, v) => setForm((s) => ({ ...s, [k]: v }))} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setModal(null)} disabled={!!busy} style={{ ...smallBtn, flex: 1, justifyContent: 'center', padding: 10 }}>Annuler</button>
              <button onClick={submitConnect} disabled={!!busy} style={{ ...addBtn, flex: 2, justifyContent: 'center', padding: 10 }}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ConnectedSection({ title, connected, available, single, onAdd, showAdd, onPick, onToggle, onRemove, busy }: {
  title: string
  connected: IntegrationItem[]
  available: IntegrationItem[]
  single?: boolean
  onAdd: () => void
  showAdd: boolean
  onPick: (i: IntegrationItem) => void
  onToggle: (i: IntegrationItem) => void
  onRemove: (i: IntegrationItem) => void
  busy: string | null
}) {
  const canAdd = !single || connected.length === 0
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={sectionTitle}>{title}</h2>
        {canAdd && available.length > 0 && (
          <button onClick={onAdd} style={addBtn}><Plus size={15} /> Ajouter</button>
        )}
      </div>

      {connected.length === 0 && !showAdd && (
        <div style={{ ...card, color: 'var(--text-muted)', fontSize: 13.5, textAlign: 'center', padding: 24 }}>
          Aucune intégration. Cliquez sur « Ajouter ».
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {connected.map((item) => {
          const disabled = item.connection?.status === 'disabled'
          return (
            <div key={item.slug} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', opacity: disabled ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--bg)', display: 'grid', placeItems: 'center', fontWeight: 800, color: 'var(--brand)', fontSize: 16 }}>{item.name[0]}</div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: disabled ? 'var(--text-muted)' : '#16a34a', marginTop: 1 }}>
                    {disabled ? 'Désactivé' : item.method === 'api' ? 'Connecté · API' : 'Connecté · Manuel'}
                    {item.connection?.isDefault && ' · Par défaut'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onPick(item)} disabled={busy === item.slug} style={smallBtn}><Settings2 size={14} /> Modifier</button>
                <button onClick={() => onToggle(item)} disabled={busy === item.slug} style={smallBtn}><Power size={14} /> {disabled ? 'Activer' : 'Désactiver'}</button>
                <button onClick={() => onRemove(item)} disabled={busy === item.slug} style={{ ...smallBtn, color: 'var(--destructive)' }}><X size={14} /></button>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div style={{ ...card, marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>Choisir :</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {available.map((item) => (
              <button key={item.slug} onClick={() => onPick(item)} style={smallBtn}>{item.name}</button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
