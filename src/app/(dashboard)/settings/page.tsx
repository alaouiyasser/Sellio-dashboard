'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { toast } from 'sonner'
import WizardOnboarding from '@/components/onboarding/WizardOnboarding'


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
  { key: 'general',      icon: '🏢', tk: 'settings.general' },
  { key: 'whatsapp',     icon: '📱', tk: 'WhatsApp' },
  { key: 'ai',           icon: '🧠', tk: 'settings.aicoach' },
]

// ─── WhatsApp Tab ─────────────────────────────────────────────────────────────
function WhatsAppTab({ tenantId }: { tenantId: string }) {
  const [status, setStatus]     = useState<'online' | 'offline' | 'connecting' | null>(null)
  const [qrCode, setQrCode]     = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [phone, setPhone]       = useState('')
  const pollRef                 = useRef<NodeJS.Timeout | null>(null)
  const [hasInstance, setHasInstance] = useState(false)

  // ── Fetch current status on mount ──
  useEffect(() => {
    fetchStatus()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [tenantId])

  async function fetchStatus() {
    try {
      const res  = await fetch(`${API}/api/whatsapp/${tenantId}/instance/status`)
      const data = await res.json()
      if (data.ok) setStatus(data.db.status)
    } catch {}
  }

  // ── Poll every 5s while QR is shown ──
  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/api/whatsapp/${tenantId}/instance/status`)
        const data = await res.json()
        if (data.ok && data.db.status === 'online') {
          setStatus('online')
          setQrCode(null)
          clearInterval(pollRef.current!)
          toast.success('✅ WhatsApp connecté avec succès!')
        }
      } catch {}
    }, 5000)
  }

  async function handleConnect() {
    if (!phone) { toast.error('Entrez votre numéro WhatsApp'); return }
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/whatsapp/${tenantId}/instance/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone }),
      })
      const data = await res.json()
      if (data.ok && data.qrcode?.base64) {
        setQrCode(data.qrcode.base64)
        setStatus('connecting')
        startPolling()
        toast('📱 Scannez le QR code avec WhatsApp')
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
      const res  = await fetch(`${API}/api/whatsapp/${tenantId}/instance/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purge_queue: false }),
      })
      const data = await res.json()
      if (data.ok) {
        setQrCode(data.qrcode?.base64 ?? null)
        setStatus('connecting')
        startPolling()
        toast('🔄 Session réinitialisée — scannez le nouveau QR code')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const statusColor = status === 'online' ? '#22c55e' : status === 'connecting' ? '#f59e0b' : '#ef4444'
  const statusLabel = status === 'online' ? 'Connecté' : status === 'connecting' ? 'En attente de scan...' : 'Déconnecté'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Status Badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)',
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: statusColor,
          boxShadow: `0 0 8px ${statusColor}`,
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {statusLabel}
        </span>
        {status === 'online' && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            Votre WhatsApp est actif ✓
          </span>
        )}
      </div>

      {/* QR Code Display */}
      {qrCode && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          padding: 24, borderRadius: 16,
          background: 'rgba(139,154,53,0.05)',
          border: '1px solid rgba(139,154,53,0.2)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
            Ouvrez WhatsApp → Appareils connectés → Connecter un appareil
          </p>
          <div style={{
            padding: 12, background: '#fff', borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          }}>
            <img src={qrCode} alt="QR Code WhatsApp" width={200} height={200} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#f59e0b',
              animation: 'pulse 1.5s infinite',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              En attente du scan...
            </span>
          </div>
        </div>
      )}

      {/* Connect Form */}
      {status !== 'online' && !qrCode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={labelStyle}>Numéro WhatsApp à connecter</label>
          <input
            style={inputStyle}
            value={phone}
            placeholder="+212600000000"
            onChange={e => setPhone(e.target.value)}
          />
          <button
            onClick={handleConnect}
            disabled={loading}
            style={{
              padding: '11px 24px', borderRadius: 10,
              background: '#25D366', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: loading ? 0.7 : 1, display: 'flex',
              alignItems: 'center', gap: 8, justifyContent: 'center',
            }}
          >
            {loading ? 'Connexion...' : '📱 Connecter WhatsApp'}
          </button>
        </div>
      )}

      {/* Reset Button */}
      {(status === 'online' || qrCode) && (
        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            padding: '10px 20px', borderRadius: 10,
            background: 'transparent', color: '#ef4444',
            border: '1px solid #ef4444',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          🔄 Réinitialiser la session
        </button>
      )}

      <div style={{
        padding: 14, borderRadius: 10,
        background: 'rgba(139,154,53,0.05)',
        border: '1px solid rgba(139,154,53,0.15)',
        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        ⚠️ En cas de bannissement, votre queue sera automatiquement suspendue et vous recevrez une alerte Telegram.
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Integrations Management ──────────────────────────────────────────────────
function IntegrationsManagement({ tenantId, settings, setSettings }: {
  tenantId: string; settings: any; setSettings: (fn: (s: any) => any) => void
}) {
  const { t } = useLang()
  const supabase = createClient()
  const [instances, setInstances] = useState<any[]>([])
  const [activeQR, setActiveQR] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
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
    toast.success("✅ Déconnecté")
  }

  async function handleAddNumber() {
    if (!newPhone || !/^\+[1-9]\d{7,14}$/.test(newPhone)) {
      toast.error("Format invalide — ex: +212600000000"); return
    }
    try {
      const res = await fetch(`${API}/api/whatsapp/${tenantId}/instance/create`, {
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

  async function saveDelivery() {
    setSaving(true)
    try {
      await supabase.from("tenants").update({ delivery_provider: settings.delivery_provider }).eq("id", tenantId)
      toast.success("✅ Livraison sauvegardée")
    } catch { toast.error("Erreur") } finally { setSaving(false) }
  }

  const dot = (s: string) => s === "online" ? "#22c55e" : s === "connecting" ? "#f59e0b" : "#ef4444"
  const sec: React.CSSProperties = { padding: 16, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16 }
  const inp: React.CSSProperties = { flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, outline: "none" }

  return (
    <div>
      {/* Store */}
      <div style={sec}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🛍️ {t("integrations.store")}</div>
        <div style={{ display: "flex", gap: 10 }}>
          {(["shopify", "youcan"] as const).map(p => (
            <button key={p} onClick={() => setSettings((s: any) => ({ ...s, store_type: p }))} style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: `2px solid ${settings.store_type === p ? "#8B9A35" : "var(--border)"}`,
              background: settings.store_type === p ? "rgba(139,154,53,0.1)" : "transparent",
              color: settings.store_type === p ? "#8B9A35" : "var(--text-muted)"
            }}>{p === "shopify" ? "🛒 Shopify" : "🏪 YouCan"}</button>
          ))}
        </div>
        {settings.store_type && (
          <div style={{ fontSize: 11, color: "#8B9A35", marginTop: 10 }}>
            ✅ {t("integrations.store_connected")}
          </div>
        )}
      </div>

      {/* Delivery */}
      <div style={sec}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🚚 {t("integrations.delivery")}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {(["maystro", "yalidin"] as const).map(p => (
            <button key={p} onClick={() => setSettings((s: any) => ({ ...s, delivery_provider: p }))} style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: `2px solid ${settings.delivery_provider === p ? "#8B9A35" : "var(--border)"}`,
              background: settings.delivery_provider === p ? "rgba(139,154,53,0.1)" : "transparent",
              color: settings.delivery_provider === p ? "#8B9A35" : "var(--text-muted)"
            }}>{p === "maystro" ? "📦 Maystro" : "🚀 Yalidin"}</button>
          ))}
          <button onClick={saveDelivery} disabled={saving} style={{ padding: "7px 14px", borderRadius: 8, background: "#8B9A35", color: "#fff", border: "none", fontSize: 12, cursor: "pointer" }}>
            {saving ? "..." : "💾"}
          </button>
        </div>
      </div>

      {/* WhatsApp */}
      <div style={sec}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📱 {t("integrations.whatsapp")}</div>
        {instances.map(inst => (
          <div key={inst.instance_key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot(inst.status), flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{inst.phone_number}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{inst.messages_today}/{inst.daily_limit} {t("integrations.msg_count")}</div>
            </div>
            <button onClick={() => handleDisconnect(inst.instance_key)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>
              {t("integrations.disconnect")}
            </button>
          </div>
        ))}

        {activeQR && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text)", margin: 0 }}>📱 Scannez avec WhatsApp</p>
            <div style={{ padding: 10, background: "#fff", borderRadius: 10 }}>
              <img src={activeQR} width={180} height={180} alt="QR" />
            </div>
            <button onClick={() => setActiveQR(null)} style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>✕ {t("integrations.close")}</button>
          </div>
        )}

        {showAddPhone ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+212600000000" style={inp} />
            <button onClick={handleAddNumber} style={{ padding: "9px 14px", borderRadius: 8, background: "#25D366", color: "#fff", border: "none", fontSize: 13, cursor: "pointer" }}>📱</button>
            <button onClick={() => setShowAddPhone(false)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShowAddPhone(true)} style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
            {t("integrations.add_number")}
          </button>
        )}
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
  const [saving, setSaving] = useState(false)
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
    toast.success("✅ Déconnecté")
  }

  async function handleAddNumber() {
    if (!newPhone || !/^\+[1-9]\d{7,14}$/.test(newPhone)) {
      toast.error("Format invalide — ex: +212600000000"); return
    }
    try {
      const res = await fetch(`${API}/api/whatsapp/${tenantId}/instance/create`, {
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

  async function saveDelivery() {
    setSaving(true)
    try {
      await supabase.from("tenants").update({ delivery_provider: settings.delivery_provider }).eq("id", tenantId)
      toast.success("✅ Livraison sauvegardée")
    } catch { toast.error("Erreur") } finally { setSaving(false) }
  }

  const dot = (s: string) => s === "online" ? "#22c55e" : s === "connecting" ? "#f59e0b" : "#ef4444"
  const sec: React.CSSProperties = { padding: 16, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16 }
  const inp: React.CSSProperties = { flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, outline: "none" }

  return (
    <div>
      {/* Store */}
      <div style={sec}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🛍️ {t("integrations.store")}</div>
        <div style={{ display: "flex", gap: 10 }}>
          {(["shopify", "youcan"] as const).map(p => (
            <button key={p} onClick={() => setSettings((s: any) => ({ ...s, store_type: p }))} style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: `2px solid ${settings.store_type === p ? "#8B9A35" : "var(--border)"}`,
              background: settings.store_type === p ? "rgba(139,154,53,0.1)" : "transparent",
              color: settings.store_type === p ? "#8B9A35" : "var(--text-muted)"
            }}>{p === "shopify" ? "🛒 Shopify" : "🏪 YouCan"}</button>
          ))}
        </div>
        {settings.store_type && (
          <div style={{ fontSize: 11, color: "#8B9A35", marginTop: 10 }}>
            ✅ {t("integrations.store_connected")}
          </div>
        )}
      </div>

      {/* Delivery */}
      <div style={sec}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🚚 {t("integrations.delivery")}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {(["maystro", "yalidin"] as const).map(p => (
            <button key={p} onClick={() => setSettings((s: any) => ({ ...s, delivery_provider: p }))} style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: `2px solid ${settings.delivery_provider === p ? "#8B9A35" : "var(--border)"}`,
              background: settings.delivery_provider === p ? "rgba(139,154,53,0.1)" : "transparent",
              color: settings.delivery_provider === p ? "#8B9A35" : "var(--text-muted)"
            }}>{p === "maystro" ? "📦 Maystro" : "🚀 Yalidin"}</button>
          ))}
          <button onClick={saveDelivery} disabled={saving} style={{ padding: "7px 14px", borderRadius: 8, background: "#8B9A35", color: "#fff", border: "none", fontSize: 12, cursor: "pointer" }}>
            {saving ? "..." : "💾"}
          </button>
        </div>
      </div>

      {/* WhatsApp */}
      <div style={sec}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📱 {t("integrations.whatsapp")}</div>
        {instances.map(inst => (
          <div key={inst.instance_key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot(inst.status), flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{inst.phone_number}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{inst.messages_today}/{inst.daily_limit} {t("integrations.msg_count")}</div>
            </div>
            <button onClick={() => handleDisconnect(inst.instance_key)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>
              {t("integrations.disconnect")}
            </button>
          </div>
        ))}

        {activeQR && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text)", margin: 0 }}>📱 Scannez avec WhatsApp</p>
            <div style={{ padding: 10, background: "#fff", borderRadius: 10 }}>
              <img src={activeQR} width={180} height={180} alt="QR" />
            </div>
            <button onClick={() => setActiveQR(null)} style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>✕ {t("integrations.close")}</button>
          </div>
        )}

        {showAddPhone ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+212600000000" style={inp} />
            <button onClick={handleAddNumber} style={{ padding: "9px 14px", borderRadius: 8, background: "#25D366", color: "#fff", border: "none", fontSize: 13, cursor: "pointer" }}>📱</button>
            <button onClick={() => setShowAddPhone(false)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShowAddPhone(true)} style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
            {t("integrations.add_number")}
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
    label: tab.icon + ' ' + (tab.key === 'whatsapp' ? 'Intégrations' : t(tab.tk)),
  }))

  const [loading,   setLoading]   = useState(true)
  const [hasInstance, setHasInstance] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [tenantId,  setTenantId]  = useState<string | null>(null)
  const [settings,  setSettings]  = useState({
    company_name: '', owner_phone: '',
    delivery_provider: 'maystro', ai_coach_frequency: 'weekly',
  })

  useEffect(() => { fetchSettings() }, [])

  async function checkInstance(tid: string) {
    try {
      const res = await fetch(`${API}/api/whatsapp/${tid}/instances`)
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
      toast.success('Paramètres sauvegardés ✓')
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
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '9px 16px', borderRadius: 10,
              border: '1px solid var(--border)',
              background: activeTab === tab.key ? '#8B9A35' : 'var(--card)',
              color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
            }}>{tab.label}</button>
          ))}
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



          {activeTab === 'whatsapp' && tenantId && (
            hasInstance
              ? <IntegrationsManagement tenantId={tenantId} settings={settings} setSettings={setSettings} />
              : <WizardOnboarding tenantId={tenantId} onComplete={() => setHasInstance(true)} />
          )}

          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Fréquence du rapport AI Coach</label>
                <select value={settings.ai_coach_frequency}
                  onChange={e => setSettings(s => ({ ...s, ai_coach_frequency: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="weekly">Hebdomadaire (chaque vendredi)</option>
                  <option value="monthly">Mensuel (1er du mois)</option>
                  <option value="both">Les deux</option>
                </select>
              </div>
              <div style={{
                padding: 14, borderRadius: 10, background: 'rgba(139,154,53,0.08)',
                border: '1px solid rgba(139,154,53,0.2)',
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
              }}>
                🧠 L'AI Coach analyse vos données et génère un rapport stratégique personnalisé.
              </div>
            </div>
          )}

          {activeTab !== 'whatsapp' && (
            <button onClick={handleSave} disabled={saving} style={{
              marginTop: 24, padding: '11px 24px', borderRadius: 10,
              background: '#8B9A35', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Sauvegarde...' : t('settings.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
