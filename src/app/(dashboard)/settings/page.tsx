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
interface WaInstance {
  instance_key: string
  phone_number: string
  status: string
  messages_today: number
  daily_limit: number
}

function WhatsAppTab({ tenantId }: { tenantId: string }) {
  const [instances, setInstances] = useState<WaInstance[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeQR, setActiveQR]   = useState<string | null>(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [newPhone, setNewPhone]   = useState('')
  const [adding, setAdding]       = useState(false)

  useEffect(() => { fetchInstances() }, [tenantId])

  async function fetchInstances() {
    try {
      const res = await fetch(`${API}/api/whatsapp/${tenantId}/instances`)
      const data = await res.json()
      if (data.ok) setInstances(data.instances ?? [])
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
        setActiveQR(data.qrcode.base64)
        setShowAdd(false)
        setNewPhone('')
        await fetchInstances()
        toast('📱 سكان الـ QR Code')
      } else if (data.ok && data.qrcode?.instance?.state === 'open') {
        toast.success('✅ WhatsApp déjà connecté!')
        setShowAdd(false)
        await fetchInstances()
      } else {
        toast.error(data.error ?? 'Erreur de connexion')
      }
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
        setActiveQR(data.qrcode.base64)
        toast('🔄 Session réinitialisée')
        await fetchInstances()
      }
    } catch (err: any) { toast.error(err.message) }
  }

  const dot = (s: string) => s === 'online' ? '#22c55e' : s === 'connecting' ? '#f59e0b' : '#ef4444'

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {instances.map(inst => (
        <div key={inst.instance_key} style={{ padding: 16, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot(inst.status), flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{inst.phone_number}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inst.messages_today}/{inst.daily_limit} auj.</span>
            <button onClick={() => handleReset(inst.instance_key)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>🔄 Reset</button>
          </div>
        </div>
      ))}

      {activeQR && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 20, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>📱 سكان الـ QR Code بـ WhatsApp</p>
          <div style={{ padding: 10, background: '#fff', borderRadius: 10 }}>
            <img src={activeQR} width={200} height={200} alt='QR' />
          </div>
          <button onClick={() => setActiveQR(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>✕ إغلاق</button>
        </div>
      )}

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
        <button onClick={() => setShowAdd(true)} style={{ padding: 11, borderRadius: 10, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', width: '100%' }}>
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
    delivery_provider: 'maystro', ai_coach_frequency: 'weekly', store_type: 'shopify' as 'shopify' | 'youcan', store_url: '', webhook_secret: '', access_token: '',
  })

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setTenantId(user.id)
    const { data } = await supabase
      .from('tenants').select('company_name, owner_phone, delivery_provider, ai_coach_frequency')
      .eq('id', user.id).maybeSingle()
    if (!data) {
      // Tenant ما تخلقش — نعاودو نخلقوه
      await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, storeName: user.email?.split('@')[0] ?? 'Ma Boutique', email: user.email }),
      })
    }
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
              {/* Store Integration */}
              <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(139,154,53,0.03)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>🛍️ Boutique e-commerce</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {(['shopify', 'youcan'] as const).map(t => (
                    <button key={t} onClick={() => setSettings(s => ({ ...s, store_type: t }))}
                      style={{ padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        border: `2px solid ${settings.store_type === t ? '#8B9A35' : 'var(--border)'}`,
                        background: settings.store_type === t ? 'rgba(139,154,53,0.1)' : 'transparent',
                        color: settings.store_type === t ? '#8B9A35' : 'var(--text-muted)' }}>
                      {t === 'shopify' ? '🛒 Shopify' : '🏪 YouCan'}
                    </button>
                  ))}
                </div>
                <input style={inputStyle} placeholder={settings.store_type === 'youcan' ? 'ma-boutique.youcan.shop' : 'ma-boutique.myshopify.com'}
                  value={settings.store_url ?? ''} onChange={e => setSettings(s => ({ ...s, store_url: e.target.value }))} />
                <input style={inputStyle} placeholder="Webhook Secret" type="password"
                  value={settings.webhook_secret ?? ''} onChange={e => setSettings(s => ({ ...s, webhook_secret: e.target.value }))} />
                <input style={inputStyle} placeholder="Access Token (pour sync catalogue) — optionnel"
                  value={settings.access_token ?? ''} onChange={e => setSettings(s => ({ ...s, access_token: e.target.value }))} />
                {settings.store_type && tenantId && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', marginTop: -4, marginBottom: 8 }}>
                    📌 Webhook URL: <span style={{ color: '#8B9A35' }}>https://sellio-production-ccf6.up.railway.app/webhook/{tenantId}/{settings.store_type}</span>
                  </div>
                )}
                <button onClick={async () => {
                  if (!settings.store_type || !settings.store_url || !settings.webhook_secret) return
                  try {
                    const res = await fetch('/api/onboarding/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tenantId, provider: settings.store_type, credentials: { store_url: settings.store_url, webhook_secret: settings.webhook_secret, access_token: settings.access_token ?? '' } }) })
                    const d = await res.json()
                    if (d.ok) toast.success('✅ Boutique sauvegardée')
                    else toast.error(d.error)
                  } catch { toast.error('Erreur') }
                }} style={{ padding: '10px 20px', borderRadius: 8, background: '#8B9A35', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  💾 Sauvegarder
                </button>
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

