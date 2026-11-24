'use client'
// Live phone preview of the store while the merchant fills the wizard. It only shows what the
// merchant entered (no invented products, reviews or counters): empty parts show a placeholder.
import { Banknote, CheckCircle2, ImageIcon, MapPin, MessageCircle, Search, ShoppingBag, Truck } from 'lucide-react'
import { fontCss, type Category, type Colors, type Product, type SiteType, type ThemeId } from '@/lib/store-api'
import { tx } from '@/lib/i18n'

export interface PreviewData {
  name: string; logoUrl: string | null; siteType: SiteType; theme: ThemeId; colors: Colors; font: string | null
  city: string; deliveryText: string; returnText: string; sections: Record<string, boolean>; whatsapp: string
}

const fmt = (n: number) => `${Math.round(Number(n) || 0)} DH`

export default function PhonePreview({ d, products, categories }: { d: PreviewData; products: Product[]; categories: Category[] }) {
  const c = d.colors
  const on = (k: string) => !!d.sections[k]
  const font = fontCss(d.font)
  const t = THEME[d.theme]
  const first = products[0]
  const landing = d.siteType === 'landing'
  const tops = categories.filter((x) => !x.parent_id)

  const btnEl = (children: React.ReactNode) => (
    <div style={{
      background: c.button, color: readable(c.button), textAlign: 'center', fontWeight: t.btnWeight, fontSize: t.btnSize,
      padding: t.btnPad, borderRadius: t.radius, textTransform: t.upper ? 'uppercase' : 'none', letterSpacing: t.upper ? 0.5 : 0,
      boxShadow: d.theme === 'impact' ? `0 6px 16px ${c.button}55` : 'none',
      border: d.theme === 'elegance' ? `1px solid ${c.text}` : 'none',
    }}>{children}</div>
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
                  <div key={l} style={{ fontSize: 10, padding: '6px 6px', borderRadius: 6, background: c.background, opacity: 0.85 }}>{l} ▾</div>
                ))}
              </div>
            </div>
          )}

          {on('categories') && !landing && tops.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 12px 4px' }}>
              {tops.map((cat) => (
                <div key={cat.id} style={{
                  flexShrink: 0, fontSize: 11, padding: '6px 12px', borderRadius: d.theme === 'essentiel' ? 999 : t.radius,
                  background: d.theme === 'impact' ? c.primary : c.secondary, color: d.theme === 'impact' ? readable(c.primary) : c.text,
                  fontWeight: 600,
                }}>{cat.name}</div>
              ))}
            </div>
          )}

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

          {on('how_it_works') && (
            <div style={{ padding: 12, fontSize: 11 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{tx('Comment ça marche')}</div>
              {[tx('1. Vous commandez en 30 secondes'), tx('2. Nous confirmons sur WhatsApp'), tx('3. Vous payez à la livraison')].map((s) => (
                <div key={s} style={{ opacity: 0.85, marginBottom: 3 }}>{s}</div>
              ))}
            </div>
          )}

          {on('delivery') && (d.deliveryText || d.returnText || d.city) && (
            <div style={{ margin: 12, padding: 10, borderRadius: t.radius, background: c.secondary, fontSize: 10.5, lineHeight: 1.45 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, marginBottom: 4 }}><Truck size={12} /> {tx('Livraison')}</div>
              {d.deliveryText && <div style={{ marginBottom: 4 }}>{d.deliveryText}</div>}
              {d.returnText && <div style={{ opacity: 0.8 }}>{d.returnText}</div>}
              {d.city && <div style={{ opacity: 0.7, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {d.city}</div>}
            </div>
          )}
          {on('banners') && !landing && <div style={{ padding: '4px 12px' }}>{img(null, 70)}</div>}

          {on('trust') && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', fontSize: 10, fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Banknote size={12} /> {tx('Paiement à la livraison')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> {tx('Confirmation sur WhatsApp')}</span>
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

const THEME: Record<ThemeId, {
  radius: number; imgRadius: number; btnWeight: number; btnSize: number; btnPad: string; upper: boolean; heroPad: string; h1: number
}> = {
  impact: { radius: 10, imgRadius: 10, btnWeight: 900, btnSize: 13, btnPad: '13px 10px', upper: true, heroPad: '18px 14px 20px', h1: 24 },
  essentiel: { radius: 8, imgRadius: 6, btnWeight: 600, btnSize: 12, btnPad: '10px 10px', upper: false, heroPad: '16px 14px', h1: 18 },
  elegance: { radius: 0, imgRadius: 0, btnWeight: 400, btnSize: 11, btnPad: '11px 10px', upper: true, heroPad: '14px 16px 22px', h1: 21 },
}

/** Black or white text on a colour, whichever reads better. */
export function readable(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#111' : '#fff'
}
