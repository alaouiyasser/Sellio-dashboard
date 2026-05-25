'use client'
import WizardOnboarding from '@/components/onboarding/WizardOnboarding'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { toast } from 'sonner'

const API = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:3001'

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
  { key: 'integrations', icon: '🔗', tk: 'settings.integrations' },
  { key: 'whatsapp',     icon: '📱', tk: 'WhatsApp' },
  { key: 'ai',           icon: '🧠', tk: 'settings.aicoach' },
]

// ─── WhatsApp Tab ─────────────────────────────────────────────────────────────
interface Instance {
  instance_key: string
  phone_number: string
  status: string
  messages_today: number
  daily_limit: number
}

function WhatsAppTab({ tenantId }: { tenantId: string }) {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading]     = useState(true)
  const [qrCodes, setQrCodes]     = useState<Record<string, string>>({})
  const [showAdd, setShowAdd]     = useState(false)
  const [newPhone, setNewPhone]   = useState('')
  const [adding, setAdding]       = useState(false)
  const pollRef = useRef<Record<string, NodeJS.Timeout>>({})

  useEffect(() => { fetchInstances(); return () => Object.values(pollRef.current).forEach(clearInterval) }, [tenantId])

  async function fetchInstances() {
    try {
      const res = await fetch(`${API}/api/whatsapp/${tenantId}/instances`)
      const data = await res.json()
      if (data.ok) setInstances(data.instances)
    } catch {} finally { setLoading(false) }
  }

  async function handleAdd() {
    if (!newPhone) { toast.error('أدخل الرقم'); return }
    setAdding(true)
    try {
      const res = await fetch(`${API}/api/whatsapp/${tenantId}/instance/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: newPhone }),
      })
      const data = await res.json()
      if (data.ok && data.qrcode?.base64) {
        setQrCodes(q => ({ ...q, [newPhone]: data.qrcode.base64 }))
        setShowAdd(false)
        setNewPhone('')
        await fetchInstances()
        toast('📱 سكان الـ QR Code')
      } else { toast.error(data.error ?? 'Erreur') }
    } catch (err: any) { toast.error(err.message) } finally { setAdding(false) }
  }

  async function handleReset(instanceKey: string) {
    try {
      const res = await fetch(`${API}/api/whatsapp/${tenantId}/instance/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purge_queue: false }),
      })
      const data = await res.json()
      if (data.ok && data.qrcode?.base64) {
        setQrCodes(q => ({ ...q, [instanceKey]: data.qrcode.base64 }))
        toast('🔄 Session réinitialisée')
        await fetchInstances()
      }
    } catch (err: any) { toast.error(err.message) }
  }

  const statusColor = (s: string) => s === 'online' ? '#22c55e' : s === 'connecting' ? '#f59e0b' : '#ef4444'

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Instances list */}
      {instances.map(inst => (
        <div key={inst.instance_key} style={{
          padding: 16, borderRadius: 12,
          background: 'var(--bg)', border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor(inst.status), flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{inst.phone_number}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inst.messages_today}/{inst.daily_limit} auj.</span>
            <button onClick={() => handleReset(inst.instance_key)} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #ef4444',
              background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer',
            }}>🔄 Reset</button>
          </div>
          {qrCodes[inst.instance_key] && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: 10, background: '#fff', borderRadius: 10 }}>
                <img src={qrCodes[inst.instance_key]} width={180} height={180} alt="QR" />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new number */}
      {showAdd ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+212600000000"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
          <button onClick={handleAdd} disabled={adding} style={{ padding: '10px 16px', borderRadius: 8, background: '#25D366', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {adding ? '...' : '📱 Ajouter'}
          </button>
          <button onClick={() => setShowAdd(false)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>✕</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{
          padding: '11px', borderRadius: 10, border: '1px dashed var(--border)',
          background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
          width: '100%',
        }}>
          + إضافة رقم WhatsApp جديد
        </button>
      )}

      <div style={{ padding: 12, borderRadius: 10, background: 'rgba(139,154,53,0.05)', border: '1px solid rgba(139,154,53,0.15)', fontSize: 12, color: 'var(--text-muted)' }}>
        ⚠️ إلا تبانت رسالة → Sellio يبعت على الرقم التالي أوتوماتيك
      </div>
    </div>
  )
}


export default function SettingsPage(): React.ReactElement {
  const supabase = createClient()
  const { t }    = useLang()
  const TABS     = TABS_KEYS.map(tab => ({
    key: tab.key,
    label: tab.icon + ' ' + (tab.key === 'whatsapp' ? 'WhatsApp' : t(tab.tk)),
  }))

  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [tenantId,  setTenantId]  = useState<string | null>(null)
  const [hasInstance, setHasInstance] = useState(false)
  const [settings,  setSettings]  = useState({
    company_name: '', owner_phone: '',
    delivery_provider: 'maystro', ai_coach_frequency: 'weekly',
  })

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setTenantId(user.id)
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

          {activeTab === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Téléphone propriétaire</label>
                <input style={inputStyle} value={settings.owner_phone}
                  placeholder="+212600000000"
                  onChange={e => setSettings(s => ({ ...s, owner_phone: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Prestataire de livraison</label>
                <select value={settings.delivery_provider}
                  onChange={e => setSettings(s => ({ ...s, delivery_provider: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="maystro">Maystro</option>
                  <option value="yalidine">Yalidine</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && tenantId && (
            hasInstance
              ? <WhatsAppTab tenantId={tenantId} />
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

