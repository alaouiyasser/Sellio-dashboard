'use client'
// "Ma boutique": the store builder wizard with a live phone preview.
//   1 Que vendez-vous ? → 2 Type de site → 3 Thème → 4 Couleurs → 5 Marque et infos → 6 Catégories
//   → 7 Produits (each one in a category) → 8 Sections → 9 Messages automatiques → Activer
// Each "Suivant" saves the step to the API (the store is created at the end of step 1).
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, Check, ExternalLink, Eye, ImagePlus, Loader2, Package, Pencil, Plus, Rocket, Trash2, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  COLOR_LABELS, FONTS, FONTS_HREF, PALETTES, PROFILES, SITE_TYPES, STATUS_LABEL, THEMES,
  filtersFor, presetSections, profileOf, sectionsFor, storeApi, storeUrl, storeUrlParts, type ProfilePreset,
  type Category, type ColorKey, type Colors, type Product, type SiteType, type Store, type StoreProfile, type StoreStatus, type ThemeId,
} from '@/lib/store-api'
import { tx } from '@/lib/i18n'
import PhonePreview, { type PreviewData } from './PhonePreview'
import ProductEditor from './ProductEditor'
import CategoriesStep from './CategoriesStep'
import MessagesStep from './MessagesStep'
import ActivateStep from './ActivateStep'
import { btn, card, choice, h2, input, label, muted } from './ui'

const STEPS = [
  'Que vendez-vous ?', 'Type de site', 'Thème', 'Couleurs', 'Marque et infos', 'Catégories', 'Produits', 'Sections', 'Messages automatiques',
] as const
const CATEGORIES = 5, PRODUCTS = 6, SECTIONS_STEP = 7, MESSAGES = 8
const ACTIVATE = STEPS.length // the last screen, after the 9 steps
const STEP_KEY = 'sellio-store-step-v2' // v2: Catégories became its own step (before Produits)
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

interface Draft extends PreviewData { profile: StoreProfile; slug: string }

function fromStore(s: Store | null, fallbackName: string): Draft {
  const profile = s?.profile ?? 'autre'
  return {
    profile, slug: s?.slug ?? '',
    name: s?.name ?? fallbackName, logoUrl: s?.logo_url ?? null,
    siteType: s?.site_type ?? profileOf(profile).siteType, theme: s?.theme ?? 'impact',
    colors: { ...PALETTES[0].colors, ...(s?.colors ?? {}) } as Colors, font: s?.font ?? FONTS[0].id,
    city: s?.city ?? '', deliveryText: s?.delivery_text ?? '', returnText: s?.return_text ?? '',
    sections: s?.sections && Object.keys(s.sections).length ? s.sections : presetSections(profile),
    whatsapp: s?.whatsapp ?? '',
  }
}

export default function StoreWizard() {
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Store | null>(null)
  const [d, setD] = useState<Draft>(fromStore(null, ''))
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  /** Product being edited: an id, or a new product in a category ('' = landing page, no category). */
  const [editing, setEditing] = useState<{ id: string | null; categoryId: string } | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const [s, tenant] = await Promise.all([
          storeApi.get(),
          user ? supabase.from('tenants').select('company_name, name').eq('id', user.id).maybeSingle().then((r) => r.data) : null,
        ])
        const tn = tenant as { company_name?: string | null; name?: string | null } | null
        const fallback = String(tn?.company_name || tn?.name || '').trim()
        setStore(s); setD(fromStore(s, fallback))
        if (s) {
          const [p, c] = await Promise.all([storeApi.products(), storeApi.categories()])
          setProducts(p); setCategories(c)
          let saved = NaN
          try { saved = Number(localStorage.getItem(STEP_KEY)) } catch {}
          setStep(Number.isInteger(saved) && saved >= 0 && saved <= ACTIVATE ? saved : c.length || s.site_type === 'landing' ? PRODUCTS : CATEGORIES)
        }
      } catch (e) { toast.error((e as Error).message) }
      finally { setLoading(false) }
    })()
  }, [])

  useEffect(() => { if (store) try { localStorage.setItem(STEP_KEY, String(step)) } catch {} }, [step, store])

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))
  const activeProducts = products.filter((p) => p.status === 'active').length
  const status: StoreStatus = store?.status ?? 'draft'

  function pickProfile(p: StoreProfile) {
    const pre = profileOf(p)
    set({ profile: p, siteType: pre.siteType, sections: presetSections(p) })
  }

  const needsCategories = d.siteType !== 'landing'

  /** Save what the current step changed, then go to `to`. */
  async function saveAndGo(to: number) {
    // Products always go in a category: categories first (except a landing page).
    // The current step is still saved, then the merchant lands on Catégories.
    if (to >= PRODUCTS && step <= CATEGORIES && store && needsCategories && categories.length === 0) {
      toast.error(tx('Créez d’abord au moins une catégorie'))
      to = CATEGORIES
    }
    setSaving(true)
    try {
      let s = store
      if (step === 0) {
        const body = { profile: d.profile, siteType: d.siteType, sections: d.sections }
        s = s ? await storeApi.update(body) : await storeApi.create({ ...body, name: d.name.trim().length >= 2 ? d.name.trim() : tx('Ma boutique') })
        if (!store) { setD((x) => ({ ...x, slug: s!.slug, name: s!.name })); const [p, c] = await Promise.all([storeApi.products(), storeApi.categories()]); setProducts(p); setCategories(c) }
      } else if (!s) {
        toast.error(tx('Choisissez d’abord ce que vous vendez')); setStep(0); return
      } else if (step === 1) s = await storeApi.update({ siteType: d.siteType })
      else if (step === 2) s = await storeApi.update({ theme: d.theme })
      else if (step === 3) s = await storeApi.update({ colors: d.colors, font: d.font })
      else if (step === 4) {
        if (d.name.trim().length < 2) { toast.error(tx('Donnez un nom à la boutique')); return }
        if (d.slug !== s.slug && !SLUG_RE.test(d.slug)) { toast.error(tx('Adresse invalide : 3 à 40 caractères, lettres, chiffres et tirets')); return }
        s = await storeApi.update({
          name: d.name.trim(), ...(d.slug !== s.slug && { slug: d.slug }), logoUrl: d.logoUrl, whatsapp: d.whatsapp.trim() || null,
          city: d.city.trim() || null, deliveryText: d.deliveryText.trim() || null, returnText: d.returnText.trim() || null,
        })
        setD((x) => ({ ...x, whatsapp: s!.whatsapp ?? '', slug: s!.slug }))
      } else if (step === SECTIONS_STEP) s = await storeApi.update({ sections: d.sections })
      setStore(s)
      setEditing(null)
      setStep(to)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  async function removeProduct(p: Product) {
    if (!confirm(tx('Retirer « {0} » de la boutique ?', [p.name]))) return
    try { await storeApi.archiveProduct(p.id); setProducts((x) => x.filter((y) => y.id !== p.id)) } catch (e) { toast.error((e as Error).message) }
  }

  async function uploadLogo(f: File | undefined) {
    if (!f) return
    setUploadingLogo(true)
    try { set({ logoUrl: await storeApi.uploadImage(f) }) }
    catch (e) { toast.error((e as Error).message) }
    finally { setUploadingLogo(false); if (logoRef.current) logoRef.current.value = '' }
  }

  const preview = useMemo(() => <PhonePreview d={d} products={products.filter((p) => p.status === 'active')} categories={categories} />, [d, products, categories])

  const urlParts = storeUrlParts()
  const tops = categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position)
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id).sort((a, b) => a.position - b.position)
  const known = new Set(categories.map((c) => c.id))

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>{tx('Chargement...')}</div>

  const stepBody = (() => {
    switch (step) {
      case 0: return (
        <Section title={tx('Que vendez-vous ?')} hint={tx('Nous préparons les sections, les filtres et les champs produit de votre niche. Vous pourrez tout changer.')}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            {PROFILES.map((p) => <NicheCard key={p.id} p={p} on={d.profile === p.id} onPick={() => pickProfile(p.id)} />)}
          </div>
          {store && store.profile !== d.profile && <p style={{ ...muted, fontSize: 12, marginTop: 10, color: 'var(--warning)' }}>{tx('Changer de niche remet le type de site et les sections proposés pour cette niche.')}</p>}
        </Section>
      )
      case 1: return (
        <Section title={tx('Type de site')} hint={tx('Une landing page pour vendre un produit avec la pub, une boutique pour un catalogue, ou les deux.')}>
          <div style={grid}>
            {SITE_TYPES.map((s) => (
              <button key={s.id} type="button" onClick={() => set({ siteType: s.id as SiteType })} style={choice(d.siteType === s.id)} aria-pressed={d.siteType === s.id}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{tx(s.label)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{tx(s.hint)}</div>
              </button>
            ))}
          </div>
        </Section>
      )
      case 2: return (
        <Section title={tx('Thème')} hint={tx('La mise en page de votre boutique. Les couleurs viennent à l’étape suivante.')}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
            {THEMES.map((t) => (
              <button key={t.id} type="button" onClick={() => set({ theme: t.id as ThemeId })} style={{ ...choice(d.theme === t.id), padding: 10 }} aria-pressed={d.theme === t.id}>
                <div style={{ height: 250, overflow: 'hidden', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ transform: 'scale(0.42)', transformOrigin: 'top center' }}>
                    <PhonePreview d={{ ...d, theme: t.id as ThemeId }} products={products.filter((p) => p.status === 'active')} categories={categories} />
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{tx(t.label)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx(t.hint)}</div>
              </button>
            ))}
          </div>
        </Section>
      )
      case 3: return (
        <Section title={tx('Couleurs')} hint={tx('Choisissez une palette, puis ajustez chaque couleur si vous voulez.')}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10 }}>
            {PALETTES.map((p) => {
              const on = (Object.keys(p.colors) as ColorKey[]).every((k) => d.colors[k] === p.colors[k])
              return (
                <button key={p.id} type="button" onClick={() => set({ colors: { ...p.colors } })} style={{ ...choice(on), padding: 10 }} aria-pressed={on}>
                  <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {(['primary', 'button', 'secondary', 'background', 'text'] as ColorKey[]).map((k) => <div key={k} style={{ flex: 1, background: p.colors[k] }} />)}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6 }}>{tx(p.label)}</div>
                </button>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 16 }}>
            {(Object.keys(COLOR_LABELS) as ColorKey[]).map((k) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer' }}>
                <input type="color" value={d.colors[k]} onChange={(e) => set({ colors: { ...d.colors, [k]: e.target.value.toLowerCase() } })}
                  style={{ width: 30, height: 30, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} />
                <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{tx(COLOR_LABELS[k])}</span>
              </label>
            ))}
          </div>
          <span style={{ ...label, marginTop: 16 }}>{tx('Police')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
            {FONTS.map((f) => (
              <button key={f.id} type="button" onClick={() => set({ font: f.id })} style={choice(d.font === f.id)} aria-pressed={d.font === f.id}>
                <div style={{ fontFamily: f.css, fontSize: 18, fontWeight: 700 }}>{d.name || 'Aa'}</div>
                <div style={{ fontFamily: f.css, fontSize: 12, color: 'var(--text-muted)' }}>{f.label} · مرحبا</div>
              </button>
            ))}
          </div>
        </Section>
      )
      case 4: return (
        <Section title={tx('Marque et infos')} hint={tx('Ce que vos clients voient en haut de la boutique et avant de commander.')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <span style={label}>{tx('Nom de la boutique')}</span>
              <input value={d.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} style={input} />
            </div>
            <div>
              <span style={label}>{tx('Adresse de la boutique')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} dir="ltr">
                {urlParts.before && <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{urlParts.before}</span>}
                <input value={d.slug} disabled={status === 'online'} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) })} style={input} />
                {urlParts.after && <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{urlParts.after}</span>}
              </div>
              {status === 'online' && <p style={{ ...muted, fontSize: 11, marginTop: 4 }}>{tx('L’adresse d’une boutique en ligne ne peut plus changer')}</p>}
            </div>
            <div>
              <span style={label}>{tx('Logo (facultatif)')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {d.logoUrl
                  ? <img src={d.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
                  : <div style={{ width: 44, height: 44, borderRadius: 10, border: '1px dashed var(--border)' }} />}
                <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo} style={btn('ghost', uploadingLogo)}>
                  {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {d.logoUrl ? tx('Changer') : tx('Ajouter')}
                </button>
                {d.logoUrl && <button type="button" onClick={() => set({ logoUrl: null })} style={btn('ghost')} aria-label={tx('Retirer')}><X size={14} /></button>}
                <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => uploadLogo(e.target.files?.[0])} />
              </div>
            </div>
            <div>
              <span style={label}>{tx('WhatsApp de la boutique')}</span>
              <input type="tel" dir="ltr" placeholder="06 12 34 56 78" value={d.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} style={input} />
            </div>
            <div>
              <span style={label}>{tx('Ville')}</span>
              <input value={d.city} onChange={(e) => set({ city: e.target.value })} maxLength={60} style={input} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={label}>{tx('Livraison')}</span>
              <textarea rows={2} value={d.deliveryText} onChange={(e) => set({ deliveryText: e.target.value })} maxLength={1000}
                placeholder={tx('Ex : Livraison partout au Maroc en 24 à 72 h. Paiement à la livraison.')} style={{ ...input, resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={label}>{tx('Retours')}</span>
              <textarea rows={2} value={d.returnText} onChange={(e) => set({ returnText: e.target.value })} maxLength={1000}
                placeholder={tx('Ex : Échange possible sous 7 jours si le produit n’a pas été utilisé.')} style={{ ...input, resize: 'vertical' }} />
            </div>
          </div>
        </Section>
      )
      case CATEGORIES: return <CategoriesStep profile={d.profile} siteType={d.siteType} categories={categories} onChange={setCategories} />
      case PRODUCTS: return (
        <Section title={tx('Produits')} hint={needsCategories ? tx('Ajoutez vos produits dans leurs catégories, avec leurs options, prix et stock.') : tx('Ajoutez votre produit avec ses options, prix et stock.')}>
          {editing ? (
            <ProductEditor key={editing.id ?? `new:${editing.categoryId}`} productId={editing.id} initialCategoryId={editing.categoryId}
              profile={d.profile} categories={categories} requireCategory={needsCategories}
              onClose={() => setEditing(null)}
              onSaved={async () => { setEditing(null); try { setProducts(await storeApi.products()) } catch {} }} />
          ) : !needsCategories ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {products.map((p) => <ProductRow key={p.id} p={p} onEdit={() => setEditing({ id: p.id, categoryId: p.category_id ?? '' })} onRemove={() => removeProduct(p)} />)}
              {products.length === 0 && <p style={muted}>{tx('Aucun produit pour l’instant.')}</p>}
              <div><button type="button" onClick={() => setEditing({ id: null, categoryId: '' })} style={btn('primary')}>+ {tx('Ajouter un produit')}</button></div>
            </div>
          ) : categories.length === 0 ? (
            <div>
              <p style={muted}>{tx('Créez d’abord au moins une catégorie : chaque produit est rangé dans une catégorie.')}</p>
              <button type="button" onClick={() => setStep(CATEGORIES)} style={{ ...btn('primary'), marginTop: 10 }}>{tx('Créer mes catégories')}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tops.flatMap((t) => [t, ...childrenOf(t.id)]).map((cat) => {
                const list = products.filter((p) => p.category_id === cat.id)
                return (
                  <div key={cat.id} style={{ marginInlineStart: cat.parent_id ? 18 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <strong style={{ fontSize: cat.parent_id ? 13 : 14, color: 'var(--text)' }}>{cat.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({list.length})</span></strong>
                      <button type="button" onClick={() => setEditing({ id: null, categoryId: cat.id })} style={{ ...btn('ghost'), padding: '6px 10px' }}>
                        <Plus size={13} /> {tx('Ajouter un produit')}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {list.map((p) => <ProductRow key={p.id} p={p} onEdit={() => setEditing({ id: p.id, categoryId: cat.id })} onRemove={() => removeProduct(p)} />)}
                      {list.length === 0 && <p style={{ ...muted, fontSize: 12 }}>{tx('Aucun produit dans cette catégorie.')}</p>}
                    </div>
                  </div>
                )
              })}
              {products.some((p) => !p.category_id || !known.has(p.category_id)) && (
                <div>
                  <strong style={{ fontSize: 14, color: 'var(--warning)' }}>{tx('À ranger dans une catégorie')}</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {products.filter((p) => !p.category_id || !known.has(p.category_id)).map((p) => (
                      <ProductRow key={p.id} p={p} onEdit={() => setEditing({ id: p.id, categoryId: '' })} onRemove={() => removeProduct(p)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
      )
      case SECTIONS_STEP: return (
        <Section title={tx('Sections')} hint={tx('Les sections de votre niche. Choisissez ce qui s’affiche sur la boutique : l’essentiel est déjà coché.')}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
            {sectionsFor(d.profile, d.siteType).map((s) => (
              <Toggle key={s.id} on={!!d.sections[s.id]} title={tx(s.label)} hint={tx(s.hint)} onChange={(v) => set({ sections: { ...d.sections, [s.id]: v } })} />
            ))}
          </div>
          {d.siteType !== 'landing' && filtersFor(d.profile).length > 0 && (<>
            <span style={{ ...label, marginTop: 16 }}>{tx('Filtres du catalogue')}</span>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
              {filtersFor(d.profile).map((f) => <Toggle key={f.id} on={!!d.sections[f.id]} title={tx(f.label)} onChange={(v) => set({ sections: { ...d.sections, [f.id]: v } })} />)}
            </div>
          </>)}
        </Section>
      )
      case MESSAGES: return <MessagesStep storeName={d.name} slug={d.slug} products={products.filter((p) => p.status === 'active')} />
      default: return <ActivateStep slug={d.slug} activeProducts={activeProducts} onStatus={(st) => setStore((s) => (s && s.status !== st ? { ...s, status: st } : s))} />
    }
  })()

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <link rel="stylesheet" href={FONTS_HREF} precedence="default" />

      {/* Status + link */}
      {store && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, color: STATUS_LABEL[status].color, border: `1px solid ${STATUS_LABEL[status].color}` }}>
            {tx(STATUS_LABEL[status].label)}
          </span>
          <a href={storeUrl(store.slug)} target="_blank" rel="noreferrer" dir="ltr" style={{ fontSize: 12, color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {storeUrl(store.slug).replace(/^https?:\/\//, '')} <ExternalLink size={12} />
          </a>
          {status !== 'online' && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx('(aperçu visible par vous seul)')}</span>}
        </div>
      )}

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 16 }}>
        {[...STEPS, 'Activer'].map((s, i) => {
          const on = i === step, done = !!store && i < step
          const reachable = !!store || i === 0
          return (
            <button key={s} type="button" disabled={!reachable || saving || !!editing} onClick={() => { if (i !== step) saveAndGo(i) }}
              style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`, background: on ? 'var(--brand)' : 'var(--card)',
                color: on ? '#fff' : reachable ? 'var(--text)' : 'var(--text-muted)', cursor: reachable ? 'pointer' : 'not-allowed', opacity: reachable ? 1 : 0.6,
              }}>
              {i === ACTIVATE ? <Rocket size={12} /> : done ? <Check size={12} /> : <span>{i + 1}</span>} {tx(s)}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          {step < ACTIVATE && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{tx('Étape {0} sur {1}', [step + 1, STEPS.length])}</div>}
          {stepBody}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'space-between' }}>
            <button type="button" onClick={() => saveAndGo(step - 1)} disabled={step === 0 || saving} style={btn('ghost', step === 0 || saving)}><ArrowLeft size={14} /> {tx('Retour')}</button>
            {step < ACTIVATE && (
              <button type="button" onClick={() => saveAndGo(step + 1)} disabled={saving || !!editing} style={btn('primary', saving || !!editing)}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {step === ACTIVATE - 1 ? tx('Activer la boutique') : tx('Suivant')} <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {isMobile ? (
          <div>
            <button type="button" onClick={() => setShowPreview((v) => !v)} style={{ ...btn('ghost'), width: '100%' }}><Eye size={14} /> {showPreview ? tx('Masquer l’aperçu') : tx('Voir l’aperçu')}</button>
            {showPreview && <div style={{ marginTop: 12 }}>{preview}</div>}
          </div>
        ) : (
          <div style={{ position: 'sticky', top: 16 }}>
            {preview}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>{tx('Aperçu en direct')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }

/** Step 1 card: the niche photo (public/store-niches/<id>.webp), or its colour + emoji until the photo is there. */
function NicheCard({ p, on, onPick }: { p: ProfilePreset; on: boolean; onPick: () => void }) {
  const [broken, setBroken] = useState(false)
  return (
    <button type="button" onClick={onPick} aria-pressed={on} style={{ ...choice(on), padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 96, width: '100%', background: `linear-gradient(135deg, ${p.tint}, color-mix(in srgb, ${p.tint} 55%, #ffffff))`, display: 'grid', placeItems: 'center' }}>
        {!broken
          ? <img src={p.photo} alt="" onError={() => setBroken(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 34 }} aria-hidden>{p.emoji}</span>}
        {on && <span style={{ position: 'absolute', top: 6, insetInlineEnd: 6, width: 22, height: 22, borderRadius: 999, background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center' }}><Check size={13} /></span>}
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{tx(p.label)}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.35 }}>{tx(p.hint)}</div>
      </div>
    </button>
  )
}

function ProductRow({ p, onEdit, onRemove }: { p: Product; onEdit: () => void; onRemove: () => void }) {
  const vs = p.store_variants ?? []
  const stock = vs.reduce((n, v) => n + (Number(v.stock) || 0), 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}>
      {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
        : <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}><Package size={18} /></div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {tx('{0} DH · {1} variantes · stock {2}', [Math.round(p.price), vs.length, stock])}
          {vs.length === 0 && <span style={{ color: 'var(--warning)' }}> · {tx('aucune variante : pas encore commandable')}</span>}
        </div>
      </div>
      <button type="button" onClick={onEdit} style={btn('ghost')} aria-label={tx('Modifier')}><Pencil size={14} /></button>
      <button type="button" style={btn('danger')} aria-label={tx('Retirer')} onClick={onRemove}><Trash2 size={14} /></button>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <h2 style={h2}>{title}</h2>
      <p style={{ ...muted, marginBottom: 14 }}>{hint}</p>
      {children}
    </div>
  )
}

function Toggle({ on, title, hint, onChange }: { on: boolean; title: string; hint?: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      style={{ ...choice(on), display: 'flex', alignItems: 'center', gap: 10, padding: 10 }}>
      <span style={{ width: 34, height: 20, borderRadius: 999, background: on ? 'var(--brand)' : 'var(--border)', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 2, insetInlineStart: on ? 16 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', transition: 'inset-inline-start .15s' }} />
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{title}</span>
        {hint && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)' }}>{hint}</span>}
      </span>
    </button>
  )
}
