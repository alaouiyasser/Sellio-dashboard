'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import { toast } from 'sonner'

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
  { key: 'ai',           icon: '🧠', tk: 'settings.aicoach' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const { t } = useLang()
  const TABS = TABS_KEYS.map(tab => ({ key: tab.key, label: tab.icon + ' ' + t(tab.tk) }))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    company_name: '',
    owner_phone: '',
    delivery_provider: 'maystro',
    ai_coach_frequency: 'weekly',
  })

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
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

      const updates: Record<string, any> = {}
      if (settings.company_name !== undefined) updates.company_name = settings.company_name
      if (settings.owner_phone !== undefined) updates.owner_phone = settings.owner_phone
      if (settings.delivery_provider !== undefined) updates.delivery_provider = settings.delivery_provider
      if (settings.ai_coach_frequency !== undefined) updates.ai_coach_frequency = settings.ai_coach_frequency

      const { error } = await supabase.from('tenants').update(updates).eq('id', user.id)
      if (error) throw error
      toast.success('Paramètres sauvegardés ✓'); setTimeout(() => window.location.reload(), 800)
    } catch (err: any) {
      console.error(err)
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
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
                <input
                  style={inputStyle}
                  value={settings.company_name}
                  placeholder="Ex: Maroc Beauty Store"
                  onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))}
                />
                {settings.company_name && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(27,45,62,0.8)',
                    border: '1px solid rgba(139,154,53,0.3)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: 'linear-gradient(135deg, #1B2D3E, #2A4560)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 0 1.5px rgba(139,154,53,0.4)',
                      fontSize: 13, fontWeight: 800, color: '#8B9A35',
                    }}>S</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      Sellio{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>·</span>{' '}
                      <span style={{ color: '#8B9A35' }}>{settings.company_name}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Téléphone propriétaire (WhatsApp)</label>
                <input
                  style={inputStyle}
                  value={settings.owner_phone}
                  placeholder="+212600000000"
                  onChange={e => setSettings(s => ({ ...s, owner_phone: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Prestataire de livraison</label>
                <select
                  value={settings.delivery_provider}
                  onChange={e => setSettings(s => ({ ...s, delivery_provider: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="maystro">Maystro</option>
                  <option value="yalidine">Yalidine</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Fréquence du rapport AI Coach</label>
                <select
                  value={settings.ai_coach_frequency}
                  onChange={e => setSettings(s => ({ ...s, ai_coach_frequency: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="weekly">Hebdomadaire (chaque vendredi)</option>
                  <option value="monthly">Mensuel (1er du mois)</option>
                  <option value="both">Les deux</option>
                </select>
              </div>
              <div style={{
                padding: 14, borderRadius: 10,
                background: 'rgba(139,154,53,0.08)',
                border: '1px solid rgba(139,154,53,0.2)',
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
              }}>
                🧠 L'AI Coach analyse vos données et génère un rapport stratégique personnalisé.
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              marginTop: 24, padding: '11px 24px', borderRadius: 10,
              background: '#8B9A35', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            {saving ? 'Sauvegarde...' : t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
