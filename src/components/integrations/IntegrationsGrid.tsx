'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/layout/LanguageProvider'
import { inputCls, primaryBtn } from '@/lib/auth-client'
import {
  fetchIntegrations, connectIntegration, testIntegration,
  updateIntegration, disconnectIntegration,
  type IntegrationItem,
} from '@/lib/integrations-api'
import { toast } from 'sonner'
import { Check, Loader2, X, Trash2, Zap, Star, Power, MessageCircle } from 'lucide-react'

type Locale = 'fr' | 'en' | 'ar' | 'es'
const STR: Record<Locale, Record<string, string>> = {
  fr: { title: 'Intégrations', subtitle: 'Connectez vos plateformes e-commerce, transporteurs et sources de leads.',
    ecommerce: 'Plateformes E-commerce', carrier: 'Sociétés de livraison', lead_source: 'Sources de leads',
    connect: 'Connecter', connected: 'Connecté', comingSoon: 'Bientôt', beta: 'Bêta', error: 'Erreur',
    test: 'Tester', disconnect: 'Déconnecter', makeDefault: 'Définir par défaut', isDefault: 'Par défaut',
    enable: 'Activer', disable: 'Désactiver', disabled: 'Désactivé', save: 'Enregistrer', cancel: 'Annuler',
    saving: 'Enregistrement…', testing: 'Test…', loading: 'Chargement…', empty: 'Aucune intégration' },
  en: { title: 'Integrations', subtitle: 'Connect your e-commerce platforms, carriers and lead sources.',
    ecommerce: 'E-commerce platforms', carrier: 'Delivery carriers', lead_source: 'Lead sources',
    connect: 'Connect', connected: 'Connected', comingSoon: 'Soon', beta: 'Beta', error: 'Error',
    test: 'Test', disconnect: 'Disconnect', makeDefault: 'Set as default', isDefault: 'Default',
    enable: 'Enable', disable: 'Disable', disabled: 'Disabled', save: 'Save', cancel: 'Cancel',
    saving: 'Saving…', testing: 'Testing…', loading: 'Loading…', empty: 'No integrations' },
  ar: { title: 'التكاملات', subtitle: 'اربط منصات التجارة الإلكترونية وشركات التوصيل ومصادر العملاء.',
    ecommerce: 'منصات التجارة الإلكترونية', carrier: 'شركات التوصيل', lead_source: 'مصادر العملاء',
    connect: 'ربط', connected: 'متصل', comingSoon: 'قريباً', beta: 'تجريبي', error: 'خطأ',
    test: 'اختبار', disconnect: 'فصل', makeDefault: 'تعيين كافتراضي', isDefault: 'افتراضي',
    enable: 'تفعيل', disable: 'تعطيل', disabled: 'معطّل', save: 'حفظ', cancel: 'إلغاء',
    saving: 'جارٍ الحفظ…', testing: 'جارٍ الاختبار…', loading: 'جارٍ التحميل…', empty: 'لا توجد تكاملات' },
  es: { title: 'Integraciones', subtitle: 'Conecta tus plataformas, transportistas y fuentes de leads.',
    ecommerce: 'Plataformas E-commerce', carrier: 'Transportistas', lead_source: 'Fuentes de leads',
    connect: 'Conectar', connected: 'Conectado', comingSoon: 'Pronto', beta: 'Beta', error: 'Error',
    test: 'Probar', disconnect: 'Desconectar', makeDefault: 'Predeterminado', isDefault: 'Predeterminado',
    enable: 'Activar', disable: 'Desactivar', disabled: 'Desactivado', save: 'Guardar', cancel: 'Cancelar',
    saving: 'Guardando…', testing: 'Probando…', loading: 'Cargando…', empty: 'Sin integraciones' },
}

const CATEGORY_ORDER: Array<IntegrationItem['category']> = ['ecommerce', 'carrier', 'lead_source']

function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, color, background: bg, whiteSpace: 'nowrap' }}>{children}</span>
}

function Logo({ item }: { item: IntegrationItem }) {
  const [err, setErr] = useState(false)
  if (err) {
    return <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'color-mix(in srgb, var(--brand) 14%, transparent)', color: 'var(--brand)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16 }}>{item.name.charAt(0)}</div>
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.logo} alt={item.name} onError={() => setErr(true)} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain', flexShrink: 0, background: '#fff', padding: 2 }} />
}

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
  padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text)', transition: 'all .15s',
}

export default function IntegrationsGrid() {
  const { locale } = useLang()
  const L = STR[(locale as Locale)] ?? STR.fr
  const supabase = createClient()

  const [tid, setTid] = useState<string | null>(null)
  const [items, setItems] = useState<IntegrationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [modal, setModal] = useState<IntegrationItem | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  const load = useCallback(async (t: string) => {
    try { setItems(await fetchIntegrations(t)) }
    catch (e: any) { toast.error(e?.message ?? 'Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setTid(user.id)
      await load(user.id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openConnect(item: IntegrationItem) {
    const init: Record<string, string> = {}
    for (const f of item.fields) init[f.key] = item.connection?.config?.[f.key] ?? ''
    setForm(init)
    setModal(item)
  }

  async function submitConnect() {
    if (!tid || !modal) return
    const missing = modal.fields.filter((f) => f.required && !form[f.key]?.trim())
    if (missing.length) { toast.error(`${missing.map((f) => f.label).join(', ')} — ${L.connect}`); return }
    setBusy(modal.slug)
    try {
      await connectIntegration(tid, modal.slug, form)
      toast.success(`${modal.name} ✓`)
      setModal(null)
      await load(tid)
    } catch (e: any) { toast.error(e?.message ?? 'Error') }
    finally { setBusy(null) }
  }

  async function act(slug: string, fn: () => Promise<any>, okMsg?: string) {
    if (!tid) return
    setBusy(slug)
    try { await fn(); if (okMsg) toast.success(okMsg); await load(tid) }
    catch (e: any) { toast.error(e?.message ?? 'Error') }
    finally { setBusy(null) }
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 size={16} className="animate-spin" /> {L.loading}</div>
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({ cat, list: items.filter((i) => i.category === cat) }))

  return (
    <div style={{ padding: '28px 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{L.title}</h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, marginBottom: 28 }}>{L.subtitle}</p>

      <section style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>WhatsApp</h2>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#25D366', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <MessageCircle size={22} color="#fff" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>WhatsApp Business</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Connectez le numero qui enverra les messages a vos clients</div>
            </div>
          </div>
          <a href="/settings?tab=whatsapp" style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Configurer</a>
        </div>
      </section>

      {grouped.map(({ cat, list }) => list.length === 0 ? null : (
        <section key={cat} style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{L[cat]}</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--border)', padding: '1px 8px', borderRadius: 999 }}>{list.length}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: 12 }}>
            {list.map((item) => {
              const c = item.connection
              const isBusy = busy === item.slug
              const dim = item.status === 'coming_soon' && !c
              return (
                <div key={item.slug} style={{
                  border: '1px solid var(--border)', borderRadius: 14, padding: 16,
                  background: 'var(--card, var(--background))', opacity: dim ? 0.55 : 1,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Logo item={item} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.country.toUpperCase()}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: 22 }}>
                    {c?.status === 'connected' && <Badge color="#0a7d32" bg="color-mix(in srgb, #0a7d32 14%, transparent)">● {L.connected}</Badge>}
                    {c?.status === 'disabled' && <Badge color="var(--text-muted)" bg="var(--border)">{L.disabled}</Badge>}
                    {c?.status === 'error' && <Badge color="var(--destructive)" bg="color-mix(in srgb, var(--destructive) 14%, transparent)">{L.error}</Badge>}
                    {c?.isDefault && <Badge color="var(--brand)" bg="color-mix(in srgb, var(--brand) 14%, transparent)">★ {L.isDefault}</Badge>}
                    {!c && item.status === 'beta' && <Badge color="#9a6b00" bg="color-mix(in srgb, #FFDE59 35%, transparent)">{L.beta}</Badge>}
                    {!c && item.status === 'coming_soon' && <Badge color="var(--text-muted)" bg="var(--border)">{L.comingSoon}</Badge>}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
                    {!c && (item.status === 'available' || item.status === 'beta') && (
                      <button onClick={() => openConnect(item)} className={primaryBtn} style={{ flex: 1, padding: '8px 12px' }}>
                        {L.connect}
                      </button>
                    )}

                    {c && (
                      <>
                        <button disabled={isBusy} onClick={() => act(item.slug, () => testIntegration(tid!, item.slug), L.test + ' ✓')} style={ghostBtn}>
                          {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />} {L.test}
                        </button>
                        {item.category === 'carrier' && !c.isDefault && c.status === 'connected' && (
                          <button disabled={isBusy} onClick={() => act(item.slug, () => updateIntegration(tid!, item.slug, { isDefault: true }), L.isDefault + ' ✓')} style={ghostBtn}>
                            <Star size={13} /> {L.makeDefault}
                          </button>
                        )}
                        <button disabled={isBusy} onClick={() => act(item.slug, () => updateIntegration(tid!, item.slug, { enabled: c.status === 'disabled' }))} style={ghostBtn}>
                          <Power size={13} /> {c.status === 'disabled' ? L.enable : L.disable}
                        </button>
                        <button disabled={isBusy} onClick={() => act(item.slug, () => disconnectIntegration(tid!, item.slug))} style={{ ...ghostBtn, color: 'var(--destructive)', borderColor: 'color-mix(in srgb, var(--destructive) 30%, var(--border))' }}>
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {modal && (
        <div onClick={() => !busy && setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Logo item={modal} />
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{L.connect} {modal.name}</div>
              </div>
              <button onClick={() => !busy && setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {modal.fields.map((f) => (
                <div key={f.key}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
                    {f.label} {f.required && <span style={{ color: 'var(--destructive)' }}>*</span>}
                  </label>
                  <input
                    type={f.type === 'password' ? 'password' : f.type === 'url' ? 'url' : 'text'}
                    className={inputCls}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setModal(null)} disabled={!!busy} style={{ ...ghostBtn, flex: 1, justifyContent: 'center', padding: '10px' }}>{L.cancel}</button>
              <button onClick={submitConnect} disabled={!!busy} className={primaryBtn} style={{ flex: 2 }}>
                {busy ? <><Loader2 size={14} className="animate-spin" /> {L.saving}</> : <><Check size={14} /> {L.save}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
