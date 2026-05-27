'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

const API = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:3001'

const card: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 16, padding: 32, maxWidth: 560, margin: '0 auto',
}
const input: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 14, outline: 'none',
  boxSizing: 'border-box' as const, marginBottom: 12,
}
const pill = (active: boolean): React.CSSProperties => ({
  padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  border: `2px solid ${active ? '#8B9A35' : 'var(--border)'}`,
  background: active ? 'rgba(139,154,53,0.1)' : 'transparent',
  color: active ? '#8B9A35' : 'var(--text-muted)',
})
const nextBtn = (on: boolean): React.CSSProperties => ({
  flex: 2, padding: 13, borderRadius: 12, border: 'none', fontSize: 14,
  fontWeight: 600, cursor: on ? 'pointer' : 'not-allowed',
  background: on ? '#8B9A35' : 'var(--border)', color: '#fff',
})
const backBtn: React.CSSProperties = {
  flex: 1, padding: 13, borderRadius: 12, fontSize: 14, cursor: 'pointer',
  border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)',
}

interface Props { tenantId: string; onComplete: () => void }

export default function WizardOnboarding({ tenantId, onComplete }: Props) {
  const [step, setStep] = useState(1)

  // Store
  const [logo, setLogo] = useState<string | null>(null)
  const [storeType, setStoreType] = useState<'shopify' | 'youcan' | null>(null)
  const [storeUrl, setStoreUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [accessToken, setAccessToken] = useState('')

  // Delivery
  const [deliveryProvider, setDeliveryProvider] = useState<'maystro' | 'yalidin' | null>(null)
  const [agencyId, setAgencyId] = useState('')

  // WhatsApp
  const [waPhone, setWaPhone] = useState('')
  const [waAge, setWaAge] = useState<string | null>(null)
  const [waLimit, setWaLimit] = useState(300)
  const [ownerPhone, setOwnerPhone] = useState('')

  // QR
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const AGES = [
    { v: 'new',         label: 'Nouveau (< 1 semaine)',  limit: 30  },
    { v: '1_2_weeks',   label: '1–2 semaines',           limit: 80  },
    { v: '2_4_weeks',   label: '2–4 semaines',           limit: 150 },
    { v: 'established', label: 'Établi (+ 1 mois)',      limit: 300 },
  ]

  async function saveCredentials(provider: string, creds: Record<string, string>) {
    const res = await fetch(`${API}/api/onboarding/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, provider, credentials: creds }),
    })
    const d = await res.json()
    if (!d.ok) throw new Error(d.error)
  }

  function validateStoreUrl(url: string) {
    return url.includes('.myshopify.com') || url.includes('.youcan.shop') || url.includes('http')
  }

  async function handleSaveStore() {
    if (!storeType || !storeUrl || !webhookSecret || !accessToken) {
      toast.error('Tous les champs sont obligatoires'); return
    }
    if (!validateStoreUrl(storeUrl)) {
      toast.error('URL invalide — ex: ma-boutique.myshopify.com'); return
    }
    if (webhookSecret.length < 8) {
      toast.error('Webhook Secret trop court (min 8 caractères)'); return
    }
    setLoading(true)
    try {
      await saveCredentials(storeType, {
        store_url: storeUrl.trim(),
        webhook_secret: webhookSecret.trim(),
        access_token: accessToken.trim(),
      })
      toast.success('✅ Boutique configurée')
      setStep(3)
    } catch (e: any) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  async function handleSaveDelivery() {
    if (!deliveryProvider) return
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.from('tenants').update({ delivery_provider: deliveryProvider }).eq('id', tenantId)

      toast.success('✅ Livraison configurée')
      setStep(4)
    } catch (e: any) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  async function handleWhatsApp() {
    if (!waPhone || !waAge) return
    setLoading(true)
    try {
      const supabase = createClient()
      if (ownerPhone) await supabase.from('tenants').update({ owner_phone: ownerPhone }).eq('id', tenantId)

      const res = await fetch(`${API}/api/whatsapp/${tenantId}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: waPhone, daily_limit: waLimit, number_age: waAge }),
      })
      const data = await res.json()
      if (data.ok && data.qrcode?.base64) {
        setQrCode(data.qrcode.base64)
        setStep(6)
      } else if (data.ok) {
        toast.success('✅ WhatsApp connecté!')
        onComplete()
      } else {
        toast.error(data.error ?? 'Erreur WhatsApp')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  const TOTAL = 5

  // ── QR Step ──
  if (step === 6 && qrCode) return (
    <div style={card}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📱</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Scannez le QR Code</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
          Ouvrez WhatsApp → Appareils Liés → Scanner
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ padding: 12, background: '#fff', borderRadius: 12 }}>
          <img src={qrCode} alt="QR" width={200} height={200} />
        </div>
      </div>
      <button onClick={onComplete} style={{
        width: '100%', padding: 13, borderRadius: 12, background: '#25D366',
        color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
      }}>
        ✅ J'ai scanné, continuer
      </button>
    </div>
  )

  return (
    <div style={card}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 4,
            background: i < step ? '#8B9A35' : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* ── Step 1: Store Type ── */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 13, color: '#8B9A35', fontWeight: 600, marginBottom: 6 }}>ÉTAPE 1 / {TOTAL}</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            🛍️ Votre plateforme e-commerce
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Choisissez la plateforme de votre boutique
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button onClick={() => setStoreType('shopify')} style={pill(storeType === 'shopify')}>
              🛒 Shopify
            </button>
            <button onClick={() => setStoreType('youcan')} style={pill(storeType === 'youcan')}>
              🏪 YouCan
            </button>
          </div>
          <button onClick={() => setStep(2)} disabled={!storeType}
            style={{ ...nextBtn(!!storeType), width: '100%' }}>
            Suivant →
          </button>
        </div>
      )}

      {/* ── Step 2: Store Credentials ── */}
      {step === 2 && (
        <div>
          <div style={{ fontSize: 13, color: '#8B9A35', fontWeight: 600, marginBottom: 6 }}>ÉTAPE 2 / {TOTAL}</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            🔑 Intégration {storeType === 'shopify' ? 'Shopify' : 'YouCan'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Ces infos permettent à Sellio de recevoir vos commandes
          </p>

          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            URL de la boutique
          </label>
          <input value={storeUrl} onChange={e => setStoreUrl(e.target.value)}
            placeholder={storeType === 'shopify' ? 'ma-boutique.myshopify.com' : 'ma-boutique.youcan.shop'}
            style={input} />

          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Webhook Secret
          </label>
          <input value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)}
            placeholder='Clé secrète webhook' style={input} />

          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Access Token <span style={{ color: '#e74c3c', fontSize: 11 }}>* obligatoire</span>
          </label>
          <input value={accessToken} onChange={e => setAccessToken(e.target.value)}
            placeholder={storeType === 'shopify' ? 'shpat_xxxxxxxxxxxx' : 'Token API YouCan'} style={input} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.15)', marginBottom: 12 }}>
            {storeType === 'shopify'
              ? '📌 Shopify Admin → Apps → Develop apps → Create app → Admin API access token'
              : '📌 YouCan → Paramètres → API → Générer token'}
          </div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Logo de la boutique <span style={{ color: '#6B7B8D', fontSize: 11 }}>— optionnel</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {logo && <img src={logo} alt="logo" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '2px solid #8B9A35' }} />}
            <label style={{ padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
              📁 Choisir un fichier
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = ev => setLogo(ev.target?.result as string)
                reader.readAsDataURL(file)
              }} />
            </label>
            {logo && <button onClick={() => setLogo(null)} style={{ fontSize: 11, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Supprimer</button>}
          </div>

          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(139,154,53,0.05)', border: '1px solid rgba(139,154,53,0.15)', marginBottom: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            📌 Webhook URL à configurer dans {storeType === 'shopify' ? 'Shopify' : 'YouCan'}:<br />
            <code style={{ color: '#8B9A35', fontSize: 11 }}>
              https://sellio-production-ccf6.up.railway.app/webhook/{tenantId}/{storeType}
            </code>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={backBtn}>← Retour</button>
            <button onClick={handleSaveStore}
              disabled={loading || !storeUrl || !webhookSecret}
              style={nextBtn(!!storeUrl && !!webhookSecret && !loading)}>
              {loading ? 'Enregistrement...' : 'Suivant →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Delivery ── */}
      {step === 3 && (
        <div>
          <div style={{ fontSize: 13, color: '#8B9A35', fontWeight: 600, marginBottom: 6 }}>ÉTAPE 3 / {TOTAL}</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            🚚 Société de livraison
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Choisissez votre partenaire de livraison
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button onClick={() => setDeliveryProvider('maystro')} style={pill(deliveryProvider === 'maystro')}>
              📦 Maystro
            </button>
            <button onClick={() => setDeliveryProvider('yalidin')} style={pill(deliveryProvider === 'yalidin')}>
              🚀 Yalidin
            </button>
          </div>

          {deliveryProvider && (
            <>

              {deliveryProvider === 'yalidin' && (
                <>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Agency ID
                  </label>
                  <input value={agencyId} onChange={e => setAgencyId(e.target.value)}
                    placeholder='ID agence Yalidin' style={input} />
                </>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setStep(2)} style={backBtn}>← Retour</button>
            <button onClick={handleSaveDelivery}
              disabled={loading || !deliveryProvider}
              style={nextBtn(!!deliveryProvider && !loading)}>
              {loading ? 'Enregistrement...' : 'Suivant →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Owner Phone ── */}
      {step === 4 && (
        <div>
          <div style={{ fontSize: 13, color: '#8B9A35', fontWeight: 600, marginBottom: 6 }}>ÉTAPE 4 / {TOTAL}</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            📞 Votre numéro (vendeur)
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Vous recevrez les alertes de commandes ici
          </p>
          <input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)}
            placeholder='+212600000000' style={input} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setStep(3)} style={backBtn}>← Retour</button>
            <button onClick={() => setStep(5)} disabled={!ownerPhone} style={nextBtn(!!ownerPhone)}>
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: WhatsApp Setup ── */}
      {step === 5 && (
        <div>
          <div style={{ fontSize: 13, color: '#8B9A35', fontWeight: 600, marginBottom: 6 }}>ÉTAPE 5 / {TOTAL}</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            📱 Connexion WhatsApp
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Numéro WhatsApp dédié à votre boutique
          </p>

          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Numéro WhatsApp
          </label>
          <input value={waPhone} onChange={e => setWaPhone(e.target.value)}
            placeholder='+212600000000' style={input} />

          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
            Ancienneté du numéro
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {AGES.map(a => (
              <button key={a.v} onClick={() => { setWaAge(a.v); setWaLimit(a.limit) }} style={{
                ...pill(waAge === a.v), textAlign: 'left' as const,
              }}>
                {a.label}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                  Limite: {a.limit} msg/jour
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(4)} style={backBtn}>← Retour</button>
            <button onClick={handleWhatsApp}
              disabled={loading || !waPhone || !waAge}
              style={{ ...nextBtn(!!waPhone && !!waAge && !loading), background: waPhone && waAge && !loading ? '#25D366' : 'var(--border)' }}>
              {loading ? 'Connexion...' : '📲 Scanner QR'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
