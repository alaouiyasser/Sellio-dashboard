'use client'
import { authFetch } from '@/lib/api-fetch'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchIntegrations, connectIntegration, updateIntegration, initialFormValues, missingFields, readStoreReturn, type IntegrationItem } from '@/lib/integrations-api'
import IntegrationFields from '@/components/integrations/IntegrationFields'
import StoreOneClick from '@/components/integrations/StoreOneClick'
import { toast } from 'sonner'
import { NICHE_LABEL, SOURCE_LABEL, VOLUME_LABEL } from '@/lib/merchant-profile'
import { fetchWaMode, type WaMode } from '@/lib/whatsapp-mode'
import OfficialNumberCard from '@/components/OfficialNumberCard'
import {
  ShoppingBag, ShoppingCart, Store, KeyRound, Truck, Package, Rocket,
  Phone, Smartphone, QrCode, Copy, Info, Check, ArrowLeft, ArrowRight,
  Sparkles, MapPin, BarChart3,
} from 'lucide-react'

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
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  border: `2px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
  background: active ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'transparent',
  color: active ? 'var(--brand)' : 'var(--text-muted)',
})
const nextBtn = (on: boolean): React.CSSProperties => ({
  flex: 2, padding: 13, borderRadius: 12, border: 'none', fontSize: 14,
  fontWeight: 600, cursor: on ? 'pointer' : 'not-allowed',
  background: on ? 'var(--brand)' : 'var(--border)', color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
})
const backBtn: React.CSSProperties = {
  flex: 1, padding: 13, borderRadius: 12, fontSize: 14, cursor: 'pointer',
  border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
const h2: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 9, fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }
const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }

interface Props { tenantId: string; onComplete: () => void }

export default function WizardOnboarding({ tenantId, onComplete }: Props) {
  const [step, setStep] = useState(1)

  const [source, setSource] = useState<string | null>(null)
  const [city, setCity] = useState('')
  const [niche, setNiche] = useState<string | null>(null)
  const [volume, setVolume] = useState<string | null>(null)

  const [storeType, setStoreType] = useState<'shopify' | 'youcan' | 'woocommerce' | null>(null)
  const [storeForm, setStoreForm] = useState<Record<string, string>>({})

  const [deliveryProvider, setDeliveryProvider] = useState<string | null>(null)
  const [carrierForm, setCarrierForm] = useState<Record<string, string>>({})
  // Store and carrier both go through the integrations hub: same fields, same
  // credential check, and they show up in Intégrations afterwards.
  const [catalog, setCatalog] = useState<IntegrationItem[]>([])
  useEffect(() => { fetchIntegrations(tenantId).then(setCatalog).catch(() => {}) }, [tenantId])
  const carriers = catalog.filter((i) => i.category === 'carrier' && i.status !== 'coming_soon')
  const storeItem = catalog.find((i) => i.slug === storeType && i.category === 'ecommerce')
  const [storeManual, setStoreManual] = useState(false)

  // Back from YouCan / WooCommerce approval: resume at the carrier step (or retry the store).
  useEffect(() => {
    const r = readStoreReturn()
    if (!r) return
    setStoreType(r.store)
    if (r.ok) {
      toast.success(r.store === 'youcan' ? 'Boutique YouCan connectee' : 'Boutique WooCommerce autorisee')
      setStep(4)
    } else {
      toast.error(r.message ?? 'Connexion de la boutique echouee')
      setStep(3)
    }
  }, [])

  const [waPhone, setWaPhone] = useState('')
  const [waAge, setWaAge] = useState<string | null>(null)
  const [waLimit, setWaLimit] = useState(300)
  // Alerts go to the number verified at signup (it is also the login number, so it is not edited here).
  const [alertPhone, setAlertPhone] = useState<string | null>(null)
  useEffect(() => {
    createClient().from('tenants').select('owner_phone').eq('id', tenantId).maybeSingle()
      .then(({ data }) => setAlertPhone((data as any)?.owner_phone ?? null))
  }, [tenantId])

  const [qrCode, setQrCode] = useState<string | null>(null)
  const [waMode, setWaMode] = useState<WaMode | null>(null)
  useEffect(() => { fetchWaMode().then(setWaMode) }, [])

  async function finishCloud() {
    setLoading(true)
    try {
      await finishOnboarding()
    } finally { setLoading(false) }
  }
  const [loading, setLoading] = useState(false)

  const SOURCES = Object.entries(SOURCE_LABEL).map(([v, label]) => ({ v, label }))
  const NICHES = Object.entries(NICHE_LABEL).map(([v, label]) => ({ v, label }))
  const VOLUMES = Object.entries(VOLUME_LABEL).map(([v, label]) => ({ v, label }))

  const AGES = [
    { v: 'new',         label: 'Nouveau (< 1 semaine)',  limit: 30  },
    { v: '1_2_weeks',   label: '1-2 semaines',           limit: 80  },
    { v: '2_4_weeks',   label: '2-4 semaines',           limit: 150 },
    { v: 'established', label: 'Etabli (+ 1 mois)',      limit: 300 },
  ]

  async function handleSaveProfile() {
    if (!source || !city.trim() || !niche || !volume) { toast.error('Remplissez tous les champs'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('tenants').update({
        acquisition_source: source,
        city: city.trim(),
        niche,
        monthly_volume: volume,
      }).eq('id', tenantId)
      if (error) throw error
      setStep(2)
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  function validatePhone(phone: string): boolean { return /^\+[1-9]\d{7,14}$/.test(phone.trim()) }

  async function handleSaveStore() {
    if (!storeType || !storeItem) return
    const missing = missingFields(storeItem, storeForm)
    if (missing.length) { toast.error(`Champs requis : ${missing.map((f) => f.label).join(', ')}`); return }
    setLoading(true)
    try {
      // The API opens the store with these credentials before saving them.
      const r: any = await connectIntegration(tenantId, storeType, storeForm)
      toast.success(r?.detail ?? 'Boutique connectee')
      setStep(4)
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  async function handleSaveDelivery() {
    if (!deliveryProvider) return
    const carrier = carriers.find((c) => c.slug === deliveryProvider)
    if (carrier) {
      const missing = missingFields(carrier, carrierForm)
      if (missing.length) { toast.error(`Champs requis : ${missing.map((f) => f.label).join(', ')}`); return }
    }
    setLoading(true)
    try {
      // The carrier is connected in the Integrations hub (single source of truth):
      // credentials are checked by the API and orders can be shipped automatically.
      if (carrier) {
        await connectIntegration(tenantId, carrier.slug, carrier.method === 'api' ? carrierForm : {})
        await updateIntegration(tenantId, carrier.slug, { isDefault: true }).catch(() => {})
      }
      const supabase = createClient()
      await supabase.from('tenants').update({ delivery_provider: deliveryProvider }).eq('id', tenantId)
      toast.success('Livraison configuree')
      setStep(6)
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  async function finishOnboarding() {
    try {
      const supabase = createClient()
      await supabase.from('tenants').update({ onboarding_completed: true }).eq('id', tenantId)
    } catch {}
    onComplete()
  }

  async function handleWhatsApp() {
    if (!waPhone || !waAge) return
    if (!validatePhone(waPhone)) { toast.error('Format invalide - ex: +212776168329'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const res = await authFetch(`${API}/api/whatsapp/${tenantId}/instance/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: waPhone, daily_limit: waLimit, number_age: waAge }),
      })
      const data = await res.json()
      if (data.ok && data.qrcode?.base64) { setQrCode(data.qrcode.base64); setStep(7) }
      else if (data.ok) { toast.success('WhatsApp connecte'); finishOnboarding() }
      else { toast.error(data.error ?? 'Erreur WhatsApp') }
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  const TOTAL = 5

  if (step === 7 && qrCode) return (
    <div style={card}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Smartphone size={32} strokeWidth={1.8} color="var(--brand)" /></div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Scannez le QR Code</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Ouvrez WhatsApp - Appareils Lies - Scanner</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ padding: 12, background: '#fff', borderRadius: 12 }}>
          <img src={qrCode} alt="QR" width={200} height={200} />
        </div>
      </div>
      <button onClick={finishOnboarding} style={{
        width: '100%', padding: 13, borderRadius: 12, background: '#25D366',
        color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Check size={17} strokeWidth={2.6} /> J'ai scanne, continuer
      </button>
    </div>
  )

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < step ? 'var(--brand)' : 'var(--border)', transition: 'background 0.3s' }} />
        ))}
      </div>

      {step === 1 && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginBottom: 6 }}>ETAPE 1 / {TOTAL}</div>
          <h2 style={h2}><Sparkles size={20} strokeWidth={2.2} color="var(--brand)" /> A propos de vous</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Aidez-nous a mieux vous connaitre</p>

          <label style={fieldLabel}>Comment avez-vous connu Sellio ?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {SOURCES.map(s => (
              <button key={s.v} onClick={() => setSource(s.v)} style={{ ...pill(source === s.v), padding: '8px 14px', fontSize: 13 }}>{s.label}</button>
            ))}
          </div>

          <label style={fieldLabel}><MapPin size={13} strokeWidth={2.2} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />Ville</label>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder='Casablanca, Tanger...' style={input} />

          <label style={fieldLabel}><ShoppingBag size={13} strokeWidth={2.2} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />Type de produit</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {NICHES.map(n => (
              <button key={n.v} onClick={() => setNiche(n.v)} style={{ ...pill(niche === n.v), padding: '8px 14px', fontSize: 13 }}>{n.label}</button>
            ))}
          </div>

          <label style={fieldLabel}><BarChart3 size={13} strokeWidth={2.2} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />Commandes / mois</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {VOLUMES.map(vl => (
              <button key={vl.v} onClick={() => setVolume(vl.v)} style={{ ...pill(volume === vl.v), padding: '8px 18px', fontSize: 13 }}>{vl.label}</button>
            ))}
          </div>

          <button onClick={handleSaveProfile} disabled={loading || !source || !city.trim() || !niche || !volume}
            style={{ ...nextBtn(!!source && !!city.trim() && !!niche && !!volume && !loading), width: '100%' }}>
            {loading ? 'Enregistrement...' : <>Suivant <ArrowRight size={15} /></>}
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginBottom: 6 }}>ETAPE 2 / {TOTAL}</div>
          <h2 style={h2}><ShoppingBag size={20} strokeWidth={2.2} color="var(--brand)" /> Votre plateforme e-commerce</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Choisissez la plateforme de votre boutique</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button onClick={() => setStoreType('shopify')} style={pill(storeType === 'shopify')}><ShoppingCart size={16} strokeWidth={2.2} /> Shopify</button>
            <button onClick={() => setStoreType('youcan')} style={pill(storeType === 'youcan')}><Store size={16} strokeWidth={2.2} /> YouCan</button>
            <button onClick={() => setStoreType('woocommerce')} style={pill(storeType === 'woocommerce')}><ShoppingBag size={16} strokeWidth={2.2} /> WooCommerce</button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={backBtn}><ArrowLeft size={15} /> Retour</button>
            <button onClick={() => {
              const item = catalog.find((i) => i.slug === storeType)
              setStoreForm(item ? initialFormValues(item) : {})
              setStep(3)
            }} disabled={!storeType} style={nextBtn(!!storeType)}>Suivant <ArrowRight size={15} /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginBottom: 6 }}>ETAPE 3 / {TOTAL}</div>
          <h2 style={h2}><KeyRound size={20} strokeWidth={2.2} color="var(--brand)" /> Integration {storeType === 'shopify' ? 'Shopify' : storeType === 'youcan' ? 'YouCan' : 'WooCommerce'}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Ces infos permettent a Sellio de recevoir vos commandes</p>

          {storeItem?.oneClick && !storeManual ? (
            <div style={{ marginBottom: 20 }}>
              <StoreOneClick item={storeItem} tenantId={tenantId} returnTo="onboarding"
                onManual={storeItem.oneClick === 'wc-auth' ? () => setStoreManual(true) : undefined} />
              <div style={{ marginTop: 16 }}>
                <button onClick={() => setStep(2)} style={{ ...backBtn, width: '100%' }}><ArrowLeft size={15} /> Retour</button>
              </div>
            </div>
          ) : (<>
          {storeItem
            ? <div style={{ marginBottom: 16 }}><IntegrationFields item={storeItem} form={storeForm} onChange={(k, v) => setStoreForm((f) => ({ ...f, [k]: v }))} /></div>
            : <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Chargement…</p>}

          <div style={{ padding: 12, borderRadius: 10, background: 'color-mix(in srgb, var(--brand) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 15%, transparent)', marginBottom: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Info size={14} strokeWidth={2.2} /> Webhook URL a configurer dans {storeType === 'shopify' ? 'Shopify' : storeType === 'youcan' ? 'YouCan' : 'WooCommerce'}:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <code style={{ color: 'var(--brand)', fontSize: 11, flex: 1, wordBreak: 'break-all' }}>
                https://sellio-production-ccf6.up.railway.app/webhook/{tenantId}/{storeType}
              </code>
              <button onClick={() => {
                navigator.clipboard.writeText(`https://sellio-production-ccf6.up.railway.app/webhook/${tenantId}/${storeType}`)
                toast.success('Copie')
              }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--brand)', background: 'transparent', color: 'var(--brand)', fontSize: 11, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <Copy size={12} strokeWidth={2.2} /> Copier
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(2)} style={backBtn}><ArrowLeft size={15} /> Retour</button>
            <button onClick={handleSaveStore} disabled={loading || !storeItem} style={nextBtn(!!storeItem && !loading)}>
              {loading ? 'Verification de la boutique...' : <>Verifier et continuer <ArrowRight size={15} /></>}
            </button>
          </div>
          </>)}
        </div>
      )}

      {step === 4 && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginBottom: 6 }}>ETAPE 4 / {TOTAL}</div>
          <h2 style={h2}><Truck size={20} strokeWidth={2.2} color="var(--brand)" /> Societe de livraison</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Choisissez votre partenaire de livraison</p>
          <select
            value={deliveryProvider ?? ''}
            onChange={(e) => {
              const slug = e.target.value || null
              setDeliveryProvider(slug)
              const c = carriers.find((x) => x.slug === slug)
              setCarrierForm(c ? initialFormValues(c) : {})
            }}
            style={{ ...input, cursor: 'pointer' }}
          >
            <option value="">— Choisir un transporteur —</option>
            <optgroup label="API (synchronisation automatique)">
              {carriers.filter((c) => c.method === 'api').map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}{c.country && c.country !== 'MA' ? ` (${c.country})` : ''}</option>
              ))}
            </optgroup>
            <optgroup label="Manuel (export / import Excel)">
              {carriers.filter((c) => c.method !== 'api').map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </optgroup>
          </select>
          {deliveryProvider && carriers.find((c) => c.slug === deliveryProvider)?.method !== 'api' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'var(--text-muted)', padding: '10px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 12 }}>
              <Info size={14} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Vous exporterez vos commandes en Excel, votre transporteur remplira les statuts, puis vous importerez le fichier. Ideal pour les transporteurs marocains sans API.</span>
            </div>
          )}

          {(() => {
            const c = carriers.find((x) => x.slug === deliveryProvider)
            if (!c || c.method !== 'api' || c.fields.length === 0) return null
            return (
              <div style={{ marginBottom: 12 }}>
                <IntegrationFields item={c} form={carrierForm} onChange={(k, v) => setCarrierForm((f) => ({ ...f, [k]: v }))} />
              </div>
            )
          })()}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setStep(3)} style={backBtn}><ArrowLeft size={15} /> Retour</button>
            <button onClick={handleSaveDelivery} disabled={loading || !deliveryProvider} style={nextBtn(!!deliveryProvider && !loading)}>
              {loading ? 'Enregistrement...' : <>Suivant <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      )}

      {step === 6 && waMode?.provider === 'cloud' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginBottom: 6 }}>ETAPE 5 / {TOTAL}</div>
          <h2 style={h2}><Smartphone size={20} strokeWidth={2.2} color="var(--brand)" /> WhatsApp</h2>
          <div style={{ margin: '12px 0 16px' }}><OfficialNumberCard displayNumber={waMode.displayNumber} /></div>
          {alertPhone && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
              <Phone size={14} strokeWidth={2.2} /> Vos alertes de commandes arrivent sur votre numero {alertPhone}.
            </p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(4)} style={backBtn}><ArrowLeft size={15} /> Retour</button>
            <button onClick={finishCloud} disabled={loading} style={nextBtn(!loading)}>
              {loading ? 'Finalisation...' : <>Terminer <Check size={15} /></>}
            </button>
          </div>
        </div>
      )}

      {step === 6 && waMode?.provider !== 'cloud' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginBottom: 6 }}>ETAPE 5 / {TOTAL}</div>
          <h2 style={h2}><Smartphone size={20} strokeWidth={2.2} color="var(--brand)" /> Connexion WhatsApp</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Numero WhatsApp dedie a votre boutique</p>

          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Numero WhatsApp</label>
          <input value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder='+212600000000' style={input} />

          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Anciennete du numero</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {AGES.map(a => (
              <button key={a.v} onClick={() => { setWaAge(a.v); setWaLimit(a.limit) }} style={{ ...pill(waAge === a.v), display: 'block', textAlign: 'left' as const }}>
                {a.label}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>Limite: {a.limit} msg/jour</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(4)} style={backBtn}><ArrowLeft size={15} /> Retour</button>
            <button onClick={handleWhatsApp} disabled={loading || !waPhone || !waAge} style={{ ...nextBtn(!!waPhone && !!waAge && !loading), background: waPhone && waAge && !loading ? '#25D366' : 'var(--border)' }}>
              {loading ? 'Connexion...' : <><QrCode size={16} strokeWidth={2.2} /> Scanner QR</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
