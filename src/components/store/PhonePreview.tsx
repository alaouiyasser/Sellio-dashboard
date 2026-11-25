'use client'
// Live phone preview of the store while the merchant fills the wizard. It only shows what the
// merchant entered (no invented products, reviews or counters): empty parts show a placeholder.
import { Banknote, ChevronDown, CircleCheck, House, ImageIcon, Loader2, MapPin, MessageCircle, Plus, Ruler, Search, ShoppingBag, Sparkles, Truck } from 'lucide-react'
import { fontCss, type Category, type Colors, type Product, type SiteType, type StoreProfile, type ThemeId } from '@/lib/store-api'
import { BLOCK_TITLES, benefitItems, howToUseTips, sizeGuideHelp, sizeGuideIntro, type BenefitKey } from '@/lib/store-blocks'
import { featuredProducts, isSizeOption, newArrivals } from '@/lib/storefront'
import { tx } from '@/lib/i18n'
import { THEME, readable } from '@/lib/store-theme'

export { readable }

export interface PreviewData {
  name: string; logoUrl: string | null; siteType: SiteType; theme: ThemeId; colors: Colors; font: string | null
  city: string; deliveryText: string; returnText: string; sections: Record<string, boolean>; whatsapp: string
  /** Niche: picks the wording of the generic blocks (size guide, how to use), as on the public store. */
  profile?: StoreProfile
}

/** Edit mode of the « Vos catégories » row (categories step): tiles are buttons, a + tile adds one,
 *  and the niche examples show (faded) with « Utiliser ces catégories » while there are none. */
export interface CategoryEdit {
  selectedId: string | null; adding: boolean; busy: boolean
  /** Names of the niche examples (already in the dashboard language), or [] when the niche has none. */
  examples: string[]
  onSelect: (id: string) => void; onAdd: () => void; onUseExamples: () => void
}

const fmt = (n: number) => `${Math.round(Number(n) || 0)} DH`
const BENEFIT_ICON: Record<BenefitKey, typeof Banknote> = { cod: Banknote, whatsapp: CircleCheck, delivery: House }

export default function PhonePreview({ d, products, categories, edit }: { d: PreviewData; products: Product[]; categories: Category[]; edit?: CategoryEdit }) {
  const c = d.colors
  const on = (k: string) => !!d.sections[k]
  const font = fontCss(d.font)
  const t = THEME[d.theme]
  const first = products[0]
  const landing = d.siteType === 'landing'
  const tops = categories.filter((x) => !x.parent_id).sort((a, b) => a.position - b.position)
  const niche = d.profile ?? 'autre'
  const hasWa = !!d.whatsapp.trim()
  // Same rules as the public store (lib/storefront.ts): featured = the merchant's first products,
  // shown once there are more than that; new arrivals = newest first, from the creation dates.
  const featured = featuredProducts(products)
  const fresh = newArrivals(products)
  const sizeValues = [...new Set(products.flatMap((p) => (p.option_defs ?? []).filter((o) => isSizeOption(o.name)).flatMap((o) => o.values)))].slice(0, 10)

  const btnEl = (children: React.ReactNode) => (
    <div style={{
      background: c.button, color: readable(c.button), textAlign: 'center', fontWeight: t.btnWeight, fontSize: t.btnSize,
      padding: t.btnPad, borderRadius: t.radius, textTransform: t.upper ? 'uppercase' : 'none', letterSpacing: t.upper ? 0.5 : 0,
      boxShadow: d.theme === 'impact' ? `0 6px 16px ${c.button}55` : 'none',
      border: d.theme === 'elegance' ? `1px solid ${c.text}` : 'none',
    }}>{children}</div>
  )

  const title = (text: string, Icon?: typeof Banknote) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, fontSize: d.theme === 'impact' ? 12.5 : 12,
      fontWeight: d.theme === 'elegance' ? 400 : 800, textTransform: d.theme === 'essentiel' ? 'none' : 'uppercase',
      letterSpacing: d.theme === 'elegance' ? 1.5 : d.theme === 'impact' ? 0.3 : 0,
      justifyContent: d.theme === 'elegance' ? 'center' : 'flex-start',
    }}>{Icon && <Icon size={13} strokeWidth={1.8} />}{text}</div>
  )
  // Where a section has nothing to show yet: what will appear there, never invented content.
  const placeholder = (text: string) => (
    <div style={{ fontSize: 10.5, opacity: 0.6, textAlign: 'center', padding: 14, border: `1px dashed ${c.text}44`, borderRadius: t.radius }}>{text}</div>
  )
  const productRow = (id: 'featured' | 'new_arrivals', list: Product[], empty: string) => (
    <div style={{ padding: '12px 12px 4px' }}>
      {title(tx(BLOCK_TITLES[id]))}
      {list.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {list.map((p) => (
            <div key={p.id} style={{ flexShrink: 0, width: 96, textAlign: d.theme === 'elegance' ? 'center' : 'left' }}>
              {img(p.images?.[0], 84)}
              <div style={{ fontSize: 10, fontWeight: d.theme === 'elegance' ? 400 : 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: c.primary }}>{fmt(p.price)}</div>
            </div>
          ))}
        </div>
      ) : placeholder(empty)}
    </div>
  )

  const img = (src: string | null | undefined, h: number, key?: string) => src
    ? <img key={key} src={src} alt="" style={{ width: '100%', height: h, objectFit: 'cover', borderRadius: t.imgRadius, display: 'block' }} />
      : <div key={key} style={{ height: h, borderRadius: t.imgRadius, background: c.secondary, display: 'grid', placeItems: 'center', color: c.text, opacity: 0.5 }}><ImageIcon size={22} /></div>

  return (
    <div aria-label={tx('Aperçu sur téléphone')} style={{
      width: 300, maxWidth: '100%', height: 600, borderRadius: 40, padding: 10, background: '#0b0d12',
      boxShadow: '0 20px 50px rgba(0,0,0,.25)', margin: '0 auto', flexShrink: 0,
    }}>
      <div style={{ height: '100%', borderRadius: 31, overflow: 'hidden', background: c.background, color: c.text, fontFamily: font, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: d.theme === 'elegance' ? 'center' : 'space-between', gap: 8,
          padding: '22px 14px 10px', background: d.theme === 'impact' ? c.primary : c.background,
          color: d.theme === 'impact' ? readable(c.primary) : c.text,
          borderBottom: d.theme === 'essentiel' ? `1px solid ${c.secondary}` : 'none', position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            {d.logoUrl && <img src={d.logoUrl} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} />}
            <span style={{
              fontWeight: d.theme === 'elegance' ? 400 : 800, fontSize: d.theme === 'elegance' ? 17 : 15,
              letterSpacing: d.theme === 'elegance' ? 2 : 0, textTransform: d.theme === 'elegance' ? 'uppercase' : 'none',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{d.name || tx('Votre boutique')}</span>
          </div>
          {!landing && d.theme !== 'elegance' && <ShoppingBag size={17} />}
          {!landing && d.theme === 'elegance' && <ShoppingBag size={15} style={{ position: 'absolute', right: 14 }} />}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Hero */}
          {on('hero') && (
            <div style={{ padding: t.heroPad, background: d.theme === 'impact' ? c.primary : d.theme === 'essentiel' ? c.secondary : c.background, color: d.theme === 'impact' ? readable(c.primary) : c.text, textAlign: d.theme === 'essentiel' ? 'left' : 'center' }}>
              {d.theme === 'elegance' && img(first?.images?.[0] ?? d.logoUrl, 150)}
              <div style={{
                fontSize: t.h1, fontWeight: d.theme === 'elegance' ? 400 : 900, lineHeight: 1.15, margin: d.theme === 'elegance' ? '14px 0 6px' : '0 0 8px',
                fontStyle: d.theme === 'elegance' ? 'italic' : 'normal', textTransform: d.theme === 'impact' ? 'uppercase' : 'none',
              }}>
                {landing && first ? first.name : d.name || tx('Votre boutique')}
              </div>
              {landing && first && (
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
                  {fmt(first.price)}
                  {first.compare_at_price ? <s style={{ opacity: 0.6, fontWeight: 400, marginInlineStart: 6, fontSize: 12 }}>{fmt(first.compare_at_price)}</s> : null}
                </div>
              )}
              {d.theme === 'impact' && landing && <div style={{ marginBottom: 12 }}>{img(first?.images?.[0], 150)}</div>}
              {btnEl(tx('Commander — paiement à la livraison'))}
            </div>
          )}

          {on('vehicle_search') && !landing && (
            <div style={{ margin: 12, padding: 10, borderRadius: t.radius, background: c.secondary }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{tx('Trouvez la pièce de votre voiture')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                {[tx('Marque'), tx('Modèle'), tx('Année')].map((l) => (
                  <div key={l} style={{ fontSize: 10, padding: '6px 6px', borderRadius: 6, background: c.background, opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>{l} <ChevronDown size={10} strokeWidth={1.8} /></div>
                ))}
              </div>
            </div>
          )}

          {!landing && (edit || (on('categories') && tops.length > 0)) && (
            <div style={{ padding: '12px 0 4px', outline: edit ? `2px dashed ${c.primary}` : 'none', outlineOffset: -4, borderRadius: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, padding: '0 12px 8px' }}>{edit ? tx('Vos catégories') : tx('Catégories')}</div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 12px 6px' }}>
                {tops.map((cat) => {
                  const tile = (
                    <>
                      <div style={{
                        width: 58, height: 58, borderRadius: d.theme === 'essentiel' ? 999 : t.imgRadius, overflow: 'hidden', margin: '0 auto',
                        background: d.theme === 'impact' ? c.primary : c.secondary, color: d.theme === 'impact' ? readable(c.primary) : c.text,
                        display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18,
                        boxShadow: edit?.selectedId === cat.id ? `0 0 0 2px ${c.background}, 0 0 0 4px ${c.button}` : 'none',
                      }}>
                        {cat.image_url ? <img src={cat.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : cat.name.trim().charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 5, textAlign: 'center', width: 66, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                    </>
                  )
                  return edit
                    ? <button key={cat.id} type="button" onClick={() => edit.onSelect(cat.id)} aria-pressed={edit.selectedId === cat.id} aria-label={tx('Modifier « {0} »', [cat.name])}
                        style={{ flexShrink: 0, background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}>{tile}</button>
                    : <div key={cat.id} style={{ flexShrink: 0 }}>{tile}</div>
                })}
                {edit && tops.length === 0 && edit.examples.map((name) => (
                  <div key={name} aria-hidden style={{ flexShrink: 0, opacity: 0.45 }}>
                    <div style={{ width: 58, height: 58, borderRadius: d.theme === 'essentiel' ? 999 : t.imgRadius, margin: '0 auto', border: `1.5px dashed ${c.text}`, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18 }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 5, textAlign: 'center', width: 66, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  </div>
                ))}
                {edit && (
                  <button type="button" onClick={edit.onAdd} disabled={edit.busy} aria-label={tx('Ajouter une catégorie')} aria-pressed={edit.adding}
                    style={{ flexShrink: 0, background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
                    <div style={{
                      width: 58, height: 58, borderRadius: d.theme === 'essentiel' ? 999 : t.imgRadius, margin: '0 auto', border: `1.5px dashed ${c.primary}`, color: c.primary,
                      display: 'grid', placeItems: 'center', boxShadow: edit.adding ? `0 0 0 2px ${c.background}, 0 0 0 4px ${c.button}` : 'none',
                    }}><Plus size={22} /></div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 5, textAlign: 'center', width: 66 }}>{tx('Ajouter')}</div>
                  </button>
                )}
              </div>
              {edit && tops.length === 0 && edit.examples.length > 0 && (
                <div style={{ padding: '6px 12px 4px' }}>
                  <button type="button" onClick={edit.onUseExamples} disabled={edit.busy} style={{ width: '100%', border: 'none', padding: 0, background: 'none', cursor: 'pointer', font: 'inherit' }}>
                    {btnEl(<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{edit.busy && <Loader2 size={13} className="animate-spin" />}{tx('Utiliser ces catégories')}</span>)}
                  </button>
                  <div style={{ fontSize: 10, opacity: 0.6, textAlign: 'center', marginTop: 6 }}>{tx('Exemples pour votre niche : vous pourrez tout changer.')}</div>
                </div>
              )}
            </div>
          )}

          {on('featured') && !landing && productRow('featured', featured, tx('Vos 4 premiers produits s’afficheront ici, à partir de 5 produits'))}
          {on('new_arrivals') && !landing && productRow('new_arrivals', fresh, tx('Vos derniers produits ajoutés s’afficheront ici'))}

          {!landing && Object.keys(d.sections).some((k) => k.startsWith('filter_') && d.sections[k]) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 10, opacity: 0.8 }}>
              <Search size={11} /> {tx('Filtres')}
            </div>
          )}

          {/* Products */}
          {!landing && (
            <div style={{ display: 'grid', gridTemplateColumns: d.theme === 'elegance' ? '1fr' : '1fr 1fr', gap: d.theme === 'elegance' ? 18 : 10, padding: 12 }}>
              {products.slice(0, 6).map((p) => (
                <div key={p.id} style={{
                  background: d.theme === 'essentiel' ? c.background : 'transparent', borderRadius: t.radius,
                  border: d.theme === 'essentiel' ? `1px solid ${c.secondary}` : 'none', padding: d.theme === 'essentiel' ? 6 : 0,
                  textAlign: d.theme === 'elegance' ? 'center' : 'left',
                }}>
                  {img(p.images?.[0], d.theme === 'elegance' ? 160 : 90)}
                  <div style={{ fontSize: 11, fontWeight: d.theme === 'elegance' ? 400 : 600, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: c.primary }}>{fmt(p.price)}</div>
                </div>
              ))}
              {products.length === 0 && (
                <div style={{ gridColumn: '1 / -1', fontSize: 11, opacity: 0.6, textAlign: 'center', padding: 20, border: `1px dashed ${c.text}44`, borderRadius: t.radius }}>
                  {tx('Vos produits apparaîtront ici')}
                </div>
              )}
            </div>
          )}

          {landing && on('gallery') && first && (first.images?.length ?? 0) > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 12 }}>
              {first.images.slice(1, 5).map((u) => img(u, 80, u))}
            </div>
          )}
          {landing && !first && (
            <div style={{ margin: 12, fontSize: 11, opacity: 0.6, textAlign: 'center', padding: 20, border: `1px dashed ${c.text}44`, borderRadius: t.radius }}>
              {tx('Ajoutez votre produit pour le voir ici')}
            </div>
          )}

          {on('benefits') && (
            <div style={{ margin: '8px 0', padding: 12, background: c.secondary }}>
              {title(tx(BLOCK_TITLES.benefits))}
              <div style={{ display: 'grid', gap: 6 }}>
                {benefitItems(d.deliveryText).map((b) => {
                  const Icon = BENEFIT_ICON[b.key]
                  return (
                    <div key={b.key} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start', padding: 8, borderRadius: t.radius, background: c.background,
                      border: d.theme === 'elegance' ? `1px solid ${c.text}22` : 'none',
                    }}>
                      <span style={{
                        flexShrink: 0, width: 24, height: 24, borderRadius: d.theme === 'elegance' ? 0 : 999, display: 'grid', placeItems: 'center',
                        background: d.theme === 'impact' ? c.primary : 'transparent', color: d.theme === 'impact' ? readable(c.primary) : c.primary,
                      }}><Icon size={13} strokeWidth={1.8} /></span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, fontWeight: d.theme === 'elegance' ? 600 : 700 }}>{tx(b.title)}</div>
                        <div style={{ fontSize: 9.5, opacity: 0.75, lineHeight: 1.4, marginTop: 1 }}>{b.key === 'delivery' && d.deliveryText.trim() ? b.text : tx(b.text)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {on('how_it_works') && (
            <div style={{ padding: 12, fontSize: 11 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{tx('Comment ça marche')}</div>
              {[tx('1. Vous commandez en 30 secondes'), tx('2. Nous confirmons sur WhatsApp'), tx('3. Vous payez à la livraison')].map((s) => (
                <div key={s} style={{ opacity: 0.85, marginBottom: 3 }}>{s}</div>
              ))}
            </div>
          )}

          {on('size_guide') && (
            <div style={{ padding: 12, fontSize: 10.5, lineHeight: 1.45 }}>
              {title(tx(BLOCK_TITLES.size_guide), Ruler)}
              <div style={{ opacity: 0.85 }}>{tx(sizeGuideIntro(niche))} {tx(sizeGuideHelp(hasWa))}</div>
              {sizeValues.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {sizeValues.map((v) => (
                    <span key={v} style={{ fontSize: 9.5, padding: '3px 7px', borderRadius: t.radius, border: `1px solid ${c.text}33` }}>{v}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {on('how_to_use') && (
            <div style={{ padding: 12, fontSize: 10.5, lineHeight: 1.45 }}>
              {title(tx(BLOCK_TITLES.how_to_use), Sparkles)}
              <ul style={{ margin: 0, paddingInlineStart: 16, opacity: 0.85 }}>
                {howToUseTips(niche, hasWa).map((x) => <li key={x} style={{ marginBottom: 3 }}>{tx(x)}</li>)}
              </ul>
            </div>
          )}

          {on('delivery') && (d.deliveryText || d.returnText || d.city) && (
            <div style={{ margin: 12, padding: 10, borderRadius: t.radius, background: c.secondary, fontSize: 10.5, lineHeight: 1.45 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, marginBottom: 4 }}><Truck size={12} /> {tx('Livraison')}</div>
              {d.deliveryText && <div style={{ marginBottom: 4 }}>{d.deliveryText}</div>}
              {d.returnText && <div style={{ opacity: 0.8 }}>{d.returnText}</div>}
              {d.city && <div style={{ opacity: 0.7, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} strokeWidth={1.8} />{d.city}</div>}
            </div>
          )}
          {on('banners') && !landing && <div style={{ padding: '4px 12px' }}>{img(null, 70)}</div>}

          {on('trust') && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', fontSize: 10, fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Banknote size={12} strokeWidth={1.8} />{tx('Paiement à la livraison')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CircleCheck size={12} strokeWidth={1.8} />{tx('Confirmation sur WhatsApp')}</span>
            </div>
          )}

          {on('faq') && (
            <div style={{ padding: '8px 12px', fontSize: 11 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{tx('Questions fréquentes')}</div>
              {[tx('Livraison'), tx('Paiement'), tx('Retours')].map((q) => (
                <div key={q} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${c.secondary}`, opacity: 0.85 }}>{q} <span>+</span></div>
              ))}
            </div>
          )}

          {on('footer') && (
            <div style={{ marginTop: 12, padding: '14px 12px', background: c.secondary, fontSize: 10, textAlign: 'center', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700 }}>{d.name || tx('Votre boutique')}</div>
              {d.city && <div style={{ opacity: 0.75 }}>{d.city}</div>}
            </div>
          )}
          <div style={{ height: 50 }} />
        </div>

        {on('whatsapp_button') && d.whatsapp && (
          <div style={{ position: 'absolute', right: 12, bottom: 12, width: 40, height: 40, borderRadius: 999, background: '#25d366', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.25)' }}>
            <MessageCircle size={20} />
          </div>
        )}
      </div>
    </div>
  )
}
