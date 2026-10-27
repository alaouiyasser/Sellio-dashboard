'use client'

import { authFetch } from '@/lib/api-fetch'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { toast } from 'sonner'
import WizardOnboarding from '@/components/onboarding/WizardOnboarding'
import DevicesTab from '@/components/settings/DevicesTab'
import {
  Building2, Plug, MessageCircle, RotateCcw, AlertTriangle,
  Smartphone, Check, X, Plus, ShieldCheck,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)',
  marginBottom: 6, fontWeight: 500, display: 'block',
}

const TABS_KEYS = [
  { key: 'general',  Icon: Building2, tk: 'settings.general' },
  { key: 'security', Icon: ShieldCheck, tk: 'Securite' },
]

// ─── WhatsApp Tab ─────────────────────────────────────────────────────────────
function WhatsAppTab({ tenantId }: { tenantId: string }) {
  const [status, setStatus]     = useState<'online' | 'offline' | 'connecting' | null>(null)
  const [qrCode, setQrCode]     = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [phone, setPhone]       = useState('')
  const pollRef                 = useRef<NodeJS.Timeout | null>(null)
  const [hasInstance, setHasInstance] = useState(false)

  useEffect(() => {
    fetchStatus()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [tenantId])

  async function fetchStatus() {
    try {
      const res  = await authFetch(`${API}/api/whatsapp/${tenantId}/instance/status`)
      const data = await res.json()
      if (data.ok) setStatus(data.db.status)
    } catch {}
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res  = await authFetch(`${API}/api/whatsapp/${tenantId}/instance/status`)
        const data = await res.json()
        if (data.ok && data.db.status === 'online') {
          setStatus('online')
          setQrCode(null)
          clearInterval(pollRef.current!)
          toast.success('WhatsApp connecté avec succès')
        }
      } catch {}
    }, 5000)
  }

  async function handleConnect() {
    if (!phone) { toast.error('Entrez votre numéro WhatsApp'); return }
    setLoading(true)
    try {
      const res  = await authFetch(`${API}/api/whatsapp/${tenantId}/instance/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone }),
      })
      const data = await res.json()
      if (data.ok && data.qrcode?.base64) {
        setQrCode(data.qrcode.base64)
        setStatus('connecting')
        startPolling()
        toast('Scannez le QR code avec WhatsApp')
      } else {
        toast.error(data.error ?? 'Erreur lors de la création')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    setLoading(true)
    try {
      const res  = await authFetch(`${API}/api/whatsapp/${tenantId}/instance/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purge_queue: false }),
      })
      const data = await res.json()
      if (data.ok) {
        setQrCode(data.qrcode?.base64 ?? null)
        setStatus('connecting')
        startPolling()
        toast('Session réinitialisée — scannez le nouveau QR code')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const statusColor = status === 'online' ? 'var(--success)' : status === 'connecting' ? 'var(--warning)' : 'var(--destructive)'
  const statusLabel = status === 'online' ? 'Connecté' : status === 'connecting' ? 'En attente de scan...' : 'Déconnecté'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{statusLabel}</span>
        {status === 'online' && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
            Votre WhatsApp est actif <Check size={13} color="var(--success)" strokeWidth={2.6} />
          </span>
        )}
      </div>

      {qrCode && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          padding: 24, borderRadius: 16,
          background: 'color-mix(in srgb, var(--brand) 5%, transparent)',
          border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
            Ouvrez WhatsApp → Appareils connectés → Connecter un appareil
          </p>
          <div style={{ padding: 12, background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <img src={qrCode} alt="QR Code WhatsApp" width={200} height={200} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>En attente du scan...</span>
          </div>
        </div>
      )}

      {status !== 'online' && !qrCode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={labelStyle}>Numéro WhatsApp à connecter</label>
          <input style={inputStyle} value={phone} placeholder="+212600000000" onChange={e => setPhone(e.target.value)} />
          <button onClick={handleConnect} disabled={loading} style={{
            padding: '11px 24px', borderRadius: 10, background: '#25D366', color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          }}>
            {loading ? 'Connexion...' : <><MessageCircle size={16} strokeWidth={2.2} /> Connecter WhatsApp</>}
          </button>
        </div>
      )}

      {(status === 'online' || qrCode) && (
        <button onClick={handleReset} disabled={loading} style={{
          padding: '10px 20px', borderRadius: 10, background: 'transparent', color: 'var(--destructive)',
          border: '1px solid var(--destructive)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          opacity: loading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'center',
        }}>
          <RotateCcw size={14} strokeWidth={2.2} /> Réinitialiser la session
        </button>
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: 14, borderRadius: 10,
        background: 'color-mix(in srgb, var(--brand) 5%, transparent)',
        border: '1px solid color-mix(in srgb, var(--brand) 15%, transparent)',
        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        <AlertTriangle size={15} strokeWidth={2.2} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>En cas de bannissement, votre queue sera automatiquement suspendue et vous recevrez une alerte Telegram.</span>
      </div>
    </div>
  )
}

// ─── Integrations Management ──────────────────────────────────────────────────
function IntegrationsManagement({ tenantId, settings, setSettings }: {
  tenantId: string; settings: any; setSettings: (fn: (s: any) => any) => void
}) {
  const { t } = useLang()
  const supabase = createClient()
  const [instances, setInstances] = useState<any[]>([])
  const [activeQR, setActiveQR] = useState<string | null>(null)
  const [showAddPhone, setShowAddPhone] = useState(false)
  const [newPhone, setNewPhone] = useState("")

  useEffect(() => { fetchInstances() }, [tenantId])

  async function fetchInstances() {
    const { data } = await supabase.from("whatsapp_instances")
      .select("instance_key,phone_number,status,messages_today,daily_limit")
      .eq("tenant_id", tenantId)
    setInstances(data ?? [])
  }

  async function handleDisconnect(key: string) {
    await supabase.from("whatsapp_instances").update({ status: "offline" }).eq("instance_key", key)
    fetchInstances()
    toast.success("Déconnecté")
  }

  async function handleAddNumber() {
    if (!newPhone || !/^\+[1-9]\d{7,14}$/.test(newPhone)) {
      toast.error("Format invalide — ex: +212600000000"); return
    }
    try {
      const res = await authFetch(`${API}/api/whatsapp/${tenantId}/instance/create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: newPhone })
      })
      const data = await res.json()
      if (data.ok && data.qrcode?.base64) {
        setActiveQR(data.qrcode.base64)
        setShowAddPhone(false)
        setNewPhone("")
        await fetchInstances()
      } else { toast.error(data.error ?? "Erreur") }
    } catch { toast.error("Erreur connexion") }
  }


  const dot = (s: string) => s === "online" ? "var(--success)" : s === "connecting" ? "var(--warning)" : "var(--destructive)"
  const sec: React.CSSProperties = { padding: 16, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16 }
  const inp: React.CSSProperties = { flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, outline: "none" }

  return (
    <div>
      <div style={sec}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>{t("integrations.store")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "color-mix(in srgb, var(--brand) 10%, transparent)", color: "var(--brand)", border: "1px solid color-mix(in srgb, var(--brand) 30%, transparent)" }}>
            {settings.store_type === "youcan" ? "YouCan" : "Shopify"}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("integrations.store_connected")}</span>
        </div>
      </div>

      <div style={sec}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>{t("integrations.delivery")}</div>
        {/* Carriers are managed in one place only: the Integrations page (credentials, auto-shipping, default carrier). */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            {settings.delivery_provider ? `Actuel : ${settings.delivery_provider}` : "Aucun transporteur"}
          </span>
          <a href="/integrations" style={{ padding: "8px 14px", borderRadius: 8, background: "var(--brand)", color: "#fff", fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
            Gérer les transporteurs
          </a>
        </div>
      </div>

      <div style={sec}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>{t("integrations.whatsapp")}</div>
        {instances.map(inst => (
          <div key={inst.instance_key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot(inst.status), flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{inst.phone_number}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{inst.messages_today}/{inst.daily_limit} {t("integrations.msg_count")}</div>
            </div>
            <button onClick={() => handleDisconnect(inst.instance_key)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--destructive)", background: "transparent", color: "var(--destructive)", fontSize: 11, cursor: "pointer" }}>
              {t("integrations.disconnect")}
            </button>
          </div>
        ))}

        {activeQR && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 16 }}>
            <p style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text)", margin: 0 }}><Smartphone size={15} strokeWidth={2.2} /> Scannez avec WhatsApp</p>
            <div style={{ padding: 10, background: "#fff", borderRadius: 10 }}>
              <img src={activeQR} width={180} height={180} alt="QR" />
            </div>
            <button onClick={() => setActiveQR(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}><X size={13} strokeWidth={2.4} /> {t("integrations.close")}</button>
          </div>
        )}

        {showAddPhone ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+212600000000" style={inp} />
            <button onClick={handleAddNumber} style={{ padding: "9px 13px", borderRadius: 8, background: "#25D366", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", display: "grid", placeItems: "center" }}><Check size={15} strokeWidth={2.4} /></button>
            <button onClick={() => setShowAddPhone(false)} style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "grid", placeItems: "center" }}><X size={15} strokeWidth={2.4} /></button>
          </div>
        ) : (
          <button onClick={() => setShowAddPhone(true)} style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Plus size={15} strokeWidth={2.2} /> {t("integrations.add_number")}
          </button>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const supabase = createClient()
  const { t }    = useLang()
  const TABS     = TABS_KEYS.map(tab => ({
    key: tab.key,
    Icon: tab.Icon,
    label: tab.key === 'security' ? 'Sécurité' : t(tab.tk),
  }))

  const [loading,   setLoading]   = useState(true)
  const [hasInstance, setHasInstance] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [activeTab, setActiveTab] = useState(
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('tab') ?? 'general')
      : 'general'
  )
  const [tenantId,  setTenantId]  = useState<string | null>(null)
  const [settings,  setSettings]  = useState({
    company_name: '', owner_phone: '',
    delivery_provider: 'maystro', ai_coach_frequency: 'weekly',
  })

  useEffect(() => { fetchSettings() }, [])

  async function checkInstance(tid: string) {
    try {
      const res = await authFetch(`${API}/api/whatsapp/${tid}/instances`)
      const data = await res.json()
      if (data.ok && data.instances?.some((i: any) => i.status === 'online')) {
        setHasInstance(true)
      }
    } catch {}
  }

  async function fetchSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setTenantId(user.id)
    checkInstance(user.id)
    const { data } = await supabase
      .from('tenants').select('company_name, owner_phone, delivery_provider, ai_coach_frequency')
      .eq('id', user.id).single()
    if (data) setSettings(s => ({ ...s, ...data }))
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')
      const { error } = await supabase.from('tenants').update(settings).eq('id', user.id)
      if (error) throw error
      toast.success('Paramètres sauvegardés')
    } catch (err: any) {
      toast.error(err?.message ?? 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('settings.title')} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Chargement...
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('settings.title')} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const Ic = tab.Icon
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)',
                background: activeTab === tab.key ? 'var(--brand)' : 'var(--card)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                display: 'inline-flex', alignItems: 'center', gap: 7,
              }}><Ic size={15} strokeWidth={2.1} /> {tab.label}</button>
            )
          })}
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 640 }}>

          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>{t('settings.companyName')}</label>
                <input style={inputStyle} value={settings.company_name}
                  placeholder="Ex: Maroc Beauty Store"
                  onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))} />
              </div>
            </div>
          )}

          {activeTab === 'security' && tenantId && <DevicesTab />}

          {activeTab !== 'security' && (
            <button onClick={handleSave} disabled={saving} style={{
              marginTop: 24, padding: '11px 24px', borderRadius: 10,
              background: 'var(--brand)', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Sauvegarde...' : t('settings.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
