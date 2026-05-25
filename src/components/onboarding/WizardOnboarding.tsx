'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/layout/LanguageProvider'
import { toast } from 'sonner'

const API = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:3001'

const cardStyle: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 16, padding: 32, maxWidth: 560, margin: '0 auto',
}

const btnStyle = (active: boolean): React.CSSProperties => ({
  padding: '12px 20px', borderRadius: 12,
  border: `2px solid ${active ? '#8B9A35' : 'var(--border)'}`,
  background: active ? 'rgba(139,154,53,0.1)' : 'var(--bg)',
  color: active ? '#8B9A35' : 'var(--text-muted)',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.2s', textAlign: 'left' as const, width: '100%',
})

const nextBtn = (enabled: boolean): React.CSSProperties => ({
  flex: 2, padding: '13px', borderRadius: 12,
  background: enabled ? '#8B9A35' : 'var(--border)',
  color: '#fff', border: 'none', fontSize: 14, fontWeight: 600,
  cursor: enabled ? 'pointer' : 'not-allowed',
})

const backBtn: React.CSSProperties = {
  flex: 1, padding: '13px', borderRadius: 12,
  border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
}

interface WizardProps {
  tenantId: string
  onComplete: () => void
}

export default function WizardOnboarding({ tenantId, onComplete }: WizardProps) {
  const { t } = useLang()
  const [step, setStep]           = useState(1)
  const [ordersVal, setOrders]    = useState<string | null>(null)
  const [ageVal, setAge]          = useState<string | null>(null)
  const [ageLimit, setAgeLimit]   = useState(300)
  const [needExtra, setNeedExtra] = useState(false)
  const [extraDays, setExtraDays] = useState(0)
  const [phone, setPhone]         = useState('')
  const [waNum, setWaNum]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [qrCode, setQrCode]       = useState<string | null>(null)

  const ORDERS = [
    { value: 'lt50',    label: t('wizard.lt50'),    needExtra: false, days: 0,  sims: 0, simCost: 0   },
    { value: '50_150',  label: t('wizard.50_150'),  needExtra: true,  days: 14, sims: 1, simCost: 10  },
    { value: '150_300', label: t('wizard.150_300'), needExtra: true,  days: 7,  sims: 2, simCost: 20  },
    { value: 'gt300',   label: t('wizard.gt300'),   needExtra: true,  days: 1,  sims: 4, simCost: 40  },
  ]

  const AGES = [
    { value: 'new',         label: t('wizard.age_new'), limit: 30,  sub: '30 msg/jour'  },
    { value: '1_2_weeks',   label: t('wizard.age_1_2'), limit: 80,  sub: '80 msg/jour'  },
    { value: '2_4_weeks',   label: t('wizard.age_2_4'), limit: 150, sub: '150 msg/jour' },
    { value: 'established', label: t('wizard.age_old'), limit: 300, sub: '300 msg/jour' },
  ]

  async function handleFinish() {
    if (!waNum) { toast.error('أدخل رقم WhatsApp'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      if (phone) await supabase.from('tenants').update({ owner_phone: phone }).eq('id', tenantId)

      const res = await fetch(`${API}/api/whatsapp/${tenantId}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: waNum, daily_limit: ageLimit, number_age: ageVal }),
      })
      const data = await res.json()
      if (data.ok && data.qrcode?.base64) {
        setQrCode(data.qrcode.base64)
        setStep(5)
      } else if (data.ok && data.qrcode?.instance?.state === 'open') {
        toast.success('✅ WhatsApp déjà connecté!')
        onComplete()
      } else {
        toast.error(data.error ?? 'Erreur de connexion')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 5: QR ──
  if (step === 5 && qrCode) return (
    <div style={cardStyle}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📱</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          {t('wizard.step5_title')}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
          {t('wizard.step5_sub')}
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ padding: 12, background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
          <img src={qrCode} alt="QR" width={200} height={200} />
        </div>
      </div>
      <div style={{ padding: 16, borderRadius: 12, background: 'rgba(139,154,53,0.06)', border: '1px solid rgba(139,154,53,0.2)', marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>
          📊 {t('wizard.config_title')}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0' }}>
          🔢 {t('wizard.daily_limit')}: <strong style={{ color: '#8B9A35' }}>{ageLimit} msg/jour</strong>
        </p>
        {needExtra && (
          <p style={{ fontSize: 12, color: '#f59e0b', margin: '4px 0' }}>
            ⚠️ {t('wizard.need_extra')} {extraDays} {t('wizard.days')}
          </p>
        )}
      </div>
      <button onClick={onComplete} style={{
        width: '100%', padding: '13px', borderRadius: 12,
        background: '#25D366', color: '#fff', border: 'none',
        fontSize: 15, fontWeight: 700, cursor: 'pointer',
      }}>
        {t('wizard.done_btn')}
      </button>
    </div>
  )

  return (
    <div style={cardStyle}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {[1,2,3,4].map(s => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 4,
            background: s <= step ? '#8B9A35' : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {t('wizard.step1_title')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('wizard.step1_sub')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ORDERS.map(o => (
              <button key={o.value} onClick={() => { setOrders(o.value); setNeedExtra(o.needExtra); setExtraDays(o.days) }} style={btnStyle(ordersVal === o.value)}>
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} disabled={!ordersVal} style={{ ...nextBtn(!!ordersVal), marginTop: 24, width: '100%' }}>
            {t('wizard.next')}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {t('wizard.step2_title')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('wizard.step2_sub')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {AGES.map(a => (
              <button key={a.value} onClick={() => { setAge(a.value); setAgeLimit(a.limit) }} style={btnStyle(ageVal === a.value)}>
                {a.label}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                  {t('wizard.daily_limit')}: {a.limit} msg/jour
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={backBtn}>{t('wizard.back')}</button>
            <button onClick={() => setStep(3)} disabled={!ageVal} style={nextBtn(!!ageVal)}>{t('wizard.next')}</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {t('wizard.step3_title')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('wizard.step3_sub')}
          </p>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+212600000000"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={backBtn}>{t('wizard.back')}</button>
            <button onClick={() => setStep(4)} disabled={!phone} style={nextBtn(!!phone)}>{t('wizard.next')}</button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {t('wizard.step4_title')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('wizard.step4_sub')}
          </p>
          <input value={waNum} onChange={e => setWaNum(e.target.value)} placeholder="+212600000000"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 16 }} />
          <div style={{ padding: 14, borderRadius: 10, background: 'rgba(139,154,53,0.06)', border: '1px solid rgba(139,154,53,0.2)', marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#8B9A35', margin: '0 0 6px' }}>📊 {t('wizard.config_title')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0' }}>🔢 {t('wizard.daily_limit')}: <strong>{ageLimit}</strong> msg/jour</p>
            {needExtra && <p style={{ fontSize: 12, color: '#f59e0b', margin: '4px 0 0' }}>⚠️ {t('wizard.need_extra')} {extraDays} {t('wizard.days')}</p>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(3)} style={backBtn}>{t('wizard.back')}</button>
            <button onClick={handleFinish} disabled={loading || !waNum} style={{ ...nextBtn(!!waNum && !loading), background: waNum && !loading ? '#25D366' : 'var(--border)', flex: 2 }}>
              {loading ? t('wizard.connecting') : t('wizard.scan_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
