// Building blocks of the public store, in the look of the wizard's phone preview
// (components/store/PhonePreview.tsx) at web-page size. Only the merchant's real data is shown:
// generic blocks (benefits, how to use, size guide…) say what is true of every Sellio store
// (cash on delivery, WhatsApp confirmation), never something about a given product.
// Buyer-facing text is French (the merchant's texts are too), not the dashboard language.
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { Banknote, CircleCheck, House, ImageIcon, MapPin, MessageCircle, PackageCheck, Ruler, Sparkles, Truck } from 'lucide-react'
import { fontCss, type Colors, type ThemeId } from '@/lib/store-api'
import { WEB_THEME, readable, type ThemeTokens } from '@/lib/store-theme'
import {
  colorsOf, fmtDh, profileIdOf, themeOf, waLink,
  type PublicCategory, type PublicProduct, type PublicStore,
} from '@/lib/storefront'

export interface Look { store: PublicStore; c: Colors; t: ThemeTokens; theme: ThemeId; font: string; base: string }
export const lookOf = (store: PublicStore, base: string): Look => {
  const theme = themeOf(store)
  return { store, c: colorsOf(store), t: WEB_THEME[theme], theme, font: fontCss(store.font), base }
}
export const homeHref = (l: Look) => l.base || '/'
export const productHref = (l: Look, p: { slug: string }) => `${l.base}/products/${p.slug}`

// ─── Primitives ──────────────────────────────────────────────────────────────

export function btnStyle(l: Look, extra?: CSSProperties): CSSProperties {
  const { c, t, theme } = l
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
    background: c.button, color: readable(c.button), fontWeight: t.btnWeight, fontSize: t.btnSize, fontFamily: 'inherit',
    padding: t.btnPad, borderRadius: t.radius, textTransform: t.upper ? 'uppercase' : 'none', letterSpacing: t.upper ? 0.6 : 0,
    boxShadow: theme === 'impact' ? `0 8px 22px ${c.button}55` : 'none',
    border: theme === 'elegance' ? `1px solid ${c.text}` : 'none', textDecoration: 'none', lineHeight: 1.2, maxWidth: '100%', textAlign: 'center', ...extra,
  }
}
export function ghostBtnStyle(l: Look, extra?: CSSProperties): CSSProperties {
  return { ...btnStyle(l), background: 'transparent', color: l.c.text, border: `1.5px solid ${l.c.text}`, boxShadow: 'none', ...extra }
}

export function Img({ l, src, h, alt = '', ratio }: { l: Look; src: string | null | undefined; h?: number; alt?: string; ratio?: string }) {
  const box: CSSProperties = { width: '100%', height: ratio ? 'auto' : h, aspectRatio: ratio, borderRadius: l.t.imgRadius, display: 'block' }
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt={alt} loading="lazy" style={{ ...box, objectFit: 'cover', background: l.c.secondary }} />
    : <div aria-hidden style={{ ...box, background: l.c.secondary, display: 'grid', placeItems: 'center', color: l.c.text, opacity: 0.5 }}><ImageIcon size={28} /></div>
}

export function Block({ l, id, title, children, tinted, narrow }: { l: Look; id?: string; title?: ReactNode; children: ReactNode; tinted?: boolean; narrow?: boolean }) {
  return (
    <section id={id} style={{ background: tinted ? l.c.secondary : 'transparent', padding: '36px 0' }}>
      <div className="sf-wrap" style={{ maxWidth: narrow ? 760 : undefined }}>
        {title && <h2 style={h2Style(l)}>{title}</h2>}
        {children}
      </div>
    </section>
  )
}
export const h2Style = (l: Look): CSSProperties => ({
  fontSize: l.theme === 'impact' ? 26 : 22, fontWeight: l.theme === 'elegance' ? 400 : 800, margin: '0 0 18px',
  textTransform: l.theme === 'impact' ? 'uppercase' : 'none', letterSpacing: l.theme === 'elegance' ? 1.5 : 0,
  fontStyle: l.theme === 'elegance' ? 'italic' : 'normal', textAlign: l.theme === 'elegance' ? 'center' : 'left',
})

export function Price({ l, price, compareAt, from, size = 16 }: { l: Look; price: number; compareAt?: number | null; from?: boolean; size?: number }) {
  return (
    <span style={{ fontWeight: 800, fontSize: size, color: l.c.primary }}>
      {from && <span style={{ fontWeight: 400, fontSize: size * 0.75, opacity: 0.8, color: l.c.text }}>À partir de </span>}
      {fmtDh(price)}
      {compareAt && compareAt > price ? <s style={{ opacity: 0.55, fontWeight: 400, marginInlineStart: 8, fontSize: size * 0.8, color: l.c.text }}>{fmtDh(compareAt)}</s> : null}
    </span>
  )
}

/** Lowest variant price ("À partir de") when the variants' prices differ. */
export function priceOf(p: PublicProduct): { price: number; from: boolean } {
  const prices = p.variants.map((v) => v.price)
  if (!prices.length) return { price: p.price, from: false }
  const min = Math.min(...prices)
  return { price: min, from: Math.max(...prices) > min }
}

export function ProductCard({ l, p }: { l: Look; p: PublicProduct }) {
  const { price, from } = priceOf(p)
  const soldOut = p.variants.length > 0 && p.variants.every((v) => !v.inStock)
  return (
    <Link href={productHref(l, p)} style={{
      display: 'block', color: 'inherit', textDecoration: 'none', borderRadius: l.t.radius,
      background: l.theme === 'essentiel' ? l.c.background : 'transparent',
      border: l.theme === 'essentiel' ? `1px solid ${l.c.secondary}` : 'none', padding: l.theme === 'essentiel' ? 8 : 0,
      textAlign: l.theme === 'elegance' ? 'center' : 'left', position: 'relative',
    }}>
      <Img l={l} src={p.images?.[0]} ratio={l.theme === 'elegance' ? '4 / 5' : '1 / 1'} alt={p.name} />
      {soldOut && <span style={{ position: 'absolute', top: 12, left: 12, fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: l.c.text, color: l.c.background }}>Épuisé</span>}
      <div style={{ fontSize: 14, fontWeight: l.theme === 'elegance' ? 400 : 600, marginTop: 10, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.name}</div>
      <div style={{ marginTop: 4 }}><Price l={l} price={price} compareAt={from ? null : p.compare_at_price} from={from} size={15} /></div>
    </Link>
  )
}

export function ProductRow({ l, id, title, products }: { l: Look; id: string; title: string; products: PublicProduct[] }) {
  if (!products.length) return null
  return (
    <Block l={l} id={id} title={title}>
      <div className="sf-grid">{products.map((p) => <ProductCard key={p.id} l={l} p={p} />)}</div>
    </Block>
  )
}

// ─── Header / footer / floating WhatsApp ─────────────────────────────────────

export function Header({ l, cart }: { l: Look; cart?: ReactNode }) {
  const { c, theme, store } = l
  const bg = theme === 'impact' ? c.primary : c.background
  const fg = theme === 'impact' ? readable(c.primary) : c.text
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: bg, color: fg, borderBottom: theme === 'essentiel' ? `1px solid ${c.secondary}` : theme === 'elegance' ? `1px solid ${c.text}22` : 'none' }}>
      <div className="sf-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: theme === 'elegance' ? 'center' : 'space-between', gap: 12, minHeight: 64, position: 'relative' }}>
        <Link href={homeHref(l)} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {store.logo_url && <img src={store.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />}
          <span style={{
            fontWeight: theme === 'elegance' ? 400 : 800, fontSize: theme === 'elegance' ? 22 : 19,
            letterSpacing: theme === 'elegance' ? 3 : 0, textTransform: theme === 'elegance' ? 'uppercase' : 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{store.name}</span>
        </Link>
        {cart && <div style={theme === 'elegance' ? { position: 'absolute', right: 20 } : undefined}>{cart}</div>}
      </div>
    </header>
  )
}

export function Footer({ l }: { l: Look }) {
  const { store } = l
  const wa = waLink(store.whatsapp)
  return (
    <footer style={{ marginTop: 24, padding: '32px 0', background: l.c.secondary, fontSize: 14, textAlign: 'center', lineHeight: 1.7 }}>
      <div className="sf-wrap">
        <div style={{ fontWeight: 700, fontSize: 16 }}>{store.name}</div>
        {store.city && <div style={{ opacity: 0.75, display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={14} strokeWidth={1.8} />{store.city}</div>}
        {wa && <div><a href={wa} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Nous écrire sur WhatsApp</a></div>}
        <div style={{ opacity: 0.6, fontSize: 12, marginTop: 10 }}>Paiement à la livraison · © {new Date().getFullYear()} {store.name}</div>
      </div>
    </footer>
  )
}

export function WhatsappFloat({ l }: { l: Look }) {
  const href = waLink(l.store.whatsapp, `Bonjour ${l.store.name}, `)
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Nous écrire sur WhatsApp" style={{
      position: 'fixed', right: 18, bottom: 18, zIndex: 40, width: 56, height: 56, borderRadius: 999, background: '#25d366', color: '#fff',
      display: 'grid', placeItems: 'center', boxShadow: '0 6px 18px rgba(0,0,0,.25)',
    }}><MessageCircle size={28} /></a>
  )
}

// ─── Hero (boutique home) ────────────────────────────────────────────────────

export function Hero({ l, image }: { l: Look; image: string | null }) {
  const { c, t, theme, store } = l
  const bg = theme === 'impact' ? c.primary : theme === 'essentiel' ? c.secondary : c.background
  return (
    <section style={{ background: bg, color: theme === 'impact' ? readable(c.primary) : c.text }}>
      <div className="sf-wrap" style={{ padding: t.heroPad, textAlign: theme === 'essentiel' ? 'left' : 'center', maxWidth: theme === 'elegance' ? 900 : undefined }}>
        {theme === 'elegance' && image && <div style={{ marginBottom: 24 }}><Img l={l} src={image} ratio="16 / 7" /></div>}
        <h1 style={{
          fontSize: `clamp(${Math.round(t.h1 * 0.7)}px, 6vw, ${t.h1}px)`, fontWeight: theme === 'elegance' ? 400 : 900, lineHeight: 1.1, margin: '0 0 14px',
          fontStyle: theme === 'elegance' ? 'italic' : 'normal', textTransform: theme === 'impact' ? 'uppercase' : 'none',
        }}>{store.name}</h1>
        {store.city && <p style={{ margin: '0 0 22px', opacity: 0.85 }}>{store.city} · Paiement à la livraison</p>}
        <a href="#catalogue" style={btnStyle(l)}>Commander — paiement à la livraison</a>
      </div>
    </section>
  )
}

// ─── Categories / banners ────────────────────────────────────────────────────

export function CategoryTiles({ l, categories, selected, onSelect }: { l: Look; categories: PublicCategory[]; selected: string | null; onSelect: (id: string | null) => void }) {
  if (!categories.length) return null
  const { c, theme, t } = l
  return (
    <Block l={l} id="categories" title="Catégories">
      <div style={{ display: 'flex', gap: 18, overflowX: 'auto', paddingBottom: 6 }}>
        {categories.map((cat) => (
          <button key={cat.id} type="button" onClick={() => onSelect(selected === cat.id ? null : cat.id)} aria-pressed={selected === cat.id}
            style={{ flexShrink: 0, background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', width: 96 }}>
            <div style={{
              width: 88, height: 88, borderRadius: theme === 'essentiel' ? 999 : t.imgRadius, overflow: 'hidden', margin: '0 auto',
              background: theme === 'impact' ? c.primary : c.secondary, color: theme === 'impact' ? readable(c.primary) : c.text,
              display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 28,
              boxShadow: selected === cat.id ? `0 0 0 3px ${c.background}, 0 0 0 5px ${c.button}` : 'none',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cat.image_url ? <img src={cat.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : cat.name.trim().charAt(0).toUpperCase()}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
          </button>
        ))}
      </div>
    </Block>
  )
}

/** « Bannières »: the merchant's category photos as wide promo tiles. No photo → nothing (no stock image). */
export function Banners({ l, categories, onSelect }: { l: Look; categories: PublicCategory[]; onSelect: (id: string) => void }) {
  const withPhoto = categories.filter((x) => x.image_url).slice(0, 3)
  if (!withPhoto.length) return null
  return (
    <Block l={l} id="bannieres">
      <div className="sf-banners">
        {withPhoto.map((cat) => (
          <button key={cat.id} type="button" onClick={() => onSelect(cat.id)} style={{ position: 'relative', border: 'none', padding: 0, cursor: 'pointer', background: 'none', textAlign: 'left', font: 'inherit' }}>
            <Img l={l} src={cat.image_url} ratio="16 / 7" alt={cat.name} />
            <span style={{ position: 'absolute', left: 16, bottom: 16, ...btnStyle(l, { padding: '10px 16px', fontSize: 13 }) }}>{cat.name}</span>
          </button>
        ))}
      </div>
    </Block>
  )
}

// ─── Generic sections (true of every Sellio store) ───────────────────────────

function Cards({ l, items }: { l: Look; items: Array<{ icon: ReactNode; title: string; text: string }> }) {
  return (
    <div className="sf-cards">
      {items.map((it) => (
        <div key={it.title} style={{ padding: 18, borderRadius: l.t.radius, background: l.c.background, border: `1px solid ${l.c.text}14` }}>
          <div style={{ color: l.c.primary, marginBottom: 8 }}>{it.icon}</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{it.title}</div>
          <div style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.5 }}>{it.text}</div>
        </div>
      ))}
    </div>
  )
}

/** « Avantages »: what the buyer gets with this store (cash on delivery, WhatsApp check, delivery). */
export function Benefits({ l }: { l: Look }) {
  const items = [
    { icon: <Banknote size={24} />, title: 'Paiement à la livraison', text: 'Vous payez en espèces à la réception de votre colis. Rien à payer en ligne.' },
    { icon: <CircleCheck size={24} />, title: 'Commande confirmée sur WhatsApp', text: 'Nous vous écrivons sur WhatsApp pour confirmer votre commande avant l’envoi.' },
    { icon: <House size={24} />, title: 'Livraison à votre adresse', text: l.store.delivery_text?.trim() || 'Votre colis est livré à l’adresse indiquée dans le formulaire.' },
  ]
  return <Block l={l} id="avantages" title="Pourquoi commander chez nous" tinted><Cards l={l} items={items} /></Block>
}

export function HowItWorks({ l }: { l: Look }) {
  const steps = [
    { n: 1, title: 'Vous commandez en 30 secondes', text: 'Nom, téléphone, ville et adresse : c’est tout.' },
    { n: 2, title: 'Nous confirmons sur WhatsApp', text: 'Vous recevez un message pour valider la commande.' },
    { n: 3, title: 'Vous payez à la livraison', text: 'Le livreur vous remet le colis, vous payez à ce moment-là.' },
  ]
  return (
    <Block l={l} id="comment-ca-marche" title="Comment ça marche">
      <div className="sf-cards">
        {steps.map((s) => (
          <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 999, background: l.c.primary, color: readable(l.c.primary), display: 'grid', placeItems: 'center', fontWeight: 800 }}>{s.n}</span>
            <div><div style={{ fontWeight: 700 }}>{s.title}</div><div style={{ fontSize: 14, opacity: 0.8, marginTop: 2 }}>{s.text}</div></div>
          </div>
        ))}
      </div>
    </Block>
  )
}

/** « Guide des tailles »: how to choose, plus the sizes this product really comes in (product page). */
export function SizeGuide({ l, sizes }: { l: Look; sizes?: Array<{ name: string; values: Array<{ value: string; available: boolean }> }> }) {
  const wa = waLink(l.store.whatsapp, 'Bonjour, j’ai une question sur les tailles : ')
  return (
    <Block l={l} id="guide-des-tailles" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Ruler size={20} />Guide des tailles</span>} narrow>
      <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
        Choisissez la taille que vous portez d’habitude. Les tailles proposées sont celles indiquées sur chaque produit.
        {wa ? <> Un doute entre deux tailles ? <a href={wa} target="_blank" rel="noopener noreferrer" style={{ color: l.c.primary, fontWeight: 700 }}>Demandez-nous sur WhatsApp</a> avant de commander.</> : ' Un doute ? Indiquez-le lors de la confirmation de votre commande.'}
      </p>
      {sizes?.map((o) => (
        <div key={o.name} style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{o.name} : choix disponibles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {o.values.map((v) => (
              <span key={v.value} style={{ fontSize: 13, padding: '5px 10px', borderRadius: l.t.radius, border: `1px solid ${l.c.text}33`, opacity: v.available ? 1 : 0.4, textDecoration: v.available ? 'none' : 'line-through' }}>{v.value}</span>
            ))}
          </div>
        </div>
      ))}
    </Block>
  )
}

/** « Conseils d’utilisation »: general care advice by niche (the product's own advice is in its description). */
export function HowToUse({ l }: { l: Look }) {
  const niche = profileIdOf(l.store)
  const tips = [
    'Lisez la description du produit : les conseils du vendeur y sont indiqués.',
    niche === 'beaute' ? 'Pour un soin de la peau ou des cheveux, faites un essai sur une petite zone avant la première utilisation.'
      : niche === 'beldi' ? 'Conservez les produits naturels au sec, à l’abri de la chaleur et de la lumière.'
        : niche === 'parfums' ? 'Conservez votre parfum à l’abri de la lumière et de la chaleur, flacon bien fermé.'
          : 'Gardez l’emballage le temps de vérifier que tout vous convient.',
    waLink(l.store.whatsapp) ? 'Une question avant ou après la commande ? Écrivez-nous sur WhatsApp.' : 'Une question ? Posez-la lors de la confirmation de votre commande.',
  ]
  return (
    <Block l={l} id="conseils" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Sparkles size={20} />Conseils d’utilisation</span>} narrow>
      <ul style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.8 }}>{tips.map((x) => <li key={x}>{x}</li>)}</ul>
    </Block>
  )
}

export function Trust({ l }: { l: Look }) {
  const items = [
    { icon: <Banknote size={18} strokeWidth={1.8} />, text: 'Paiement à la livraison' },
    { icon: <CircleCheck size={18} strokeWidth={1.8} />, text: 'Confirmation sur WhatsApp' },
    { icon: <PackageCheck size={18} strokeWidth={1.8} />, text: 'Rien à payer en ligne' },
  ]
  return (
    <section style={{ padding: '22px 0', borderTop: `1px solid ${l.c.text}14`, borderBottom: `1px solid ${l.c.text}14` }}>
      <div className="sf-wrap" style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', fontSize: 14, fontWeight: 600 }}>
        {items.map((it) => <span key={it.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{it.icon}{it.text}</span>)}
      </div>
    </section>
  )
}

export function Faq({ l }: { l: Look }) {
  const { store } = l
  const wa = waLink(store.whatsapp)
  const qa: Array<{ q: string; a: string }> = [
    { q: 'Comment se passe la livraison ?', a: store.delivery_text?.trim() || 'Après votre commande, nous vous contactons sur WhatsApp pour confirmer l’adresse et la livraison.' },
    { q: 'Comment payer ?', a: 'En espèces, à la livraison, quand vous recevez votre colis. Aucun paiement en ligne n’est demandé.' },
    { q: 'Comment ma commande est-elle confirmée ?', a: 'Vous recevez un message WhatsApp au numéro indiqué dans le formulaire pour confirmer votre commande.' },
  ]
  if (store.return_text?.trim()) qa.push({ q: 'Puis-je retourner un produit ?', a: store.return_text.trim() })
  else if (wa) qa.push({ q: 'Une autre question ?', a: 'Écrivez-nous sur WhatsApp, nous vous répondons.' })
  return (
    <Block l={l} id="faq" title="Questions fréquentes" narrow>
      {qa.map((x) => (
        <details key={x.q} style={{ borderBottom: `1px solid ${l.c.text}1f`, padding: '14px 0' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, listStyle: 'revert' }}>{x.q}</summary>
          <p style={{ margin: '10px 0 0', opacity: 0.85, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{x.a}</p>
        </details>
      ))}
    </Block>
  )
}

export function Delivery({ l }: { l: Look }) {
  const { store } = l
  if (!store.delivery_text?.trim() && !store.return_text?.trim() && !store.city?.trim()) return null
  return (
    <Block l={l} id="livraison" narrow>
      <div style={{ padding: 20, borderRadius: l.t.radius, background: l.c.secondary, lineHeight: 1.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}><Truck size={18} /> Livraison et retours</div>
        {store.delivery_text && <p style={{ margin: '0 0 8px', whiteSpace: 'pre-line' }}>{store.delivery_text}</p>}
        {store.return_text && <p style={{ margin: '0 0 8px', opacity: 0.85, whiteSpace: 'pre-line' }}>{store.return_text}</p>}
        {store.city && <div style={{ opacity: 0.75, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={15} strokeWidth={1.8} />{store.city}</div>}
      </div>
    </Block>
  )
}

export function Gallery({ l, images }: { l: Look; images: string[] }) {
  if (images.length < 2) return null
  return (
    <Block l={l} id="galerie" title="Photos">
      <div className="sf-gallery">{images.slice(0, 10).map((u) => <Img key={u} l={l} src={u} ratio="1 / 1" />)}</div>
    </Block>
  )
}

export function PreviewBanner() {
  return (
    <div role="status" style={{ background: '#fef3c7', color: '#78350f', padding: '10px 16px', fontSize: 14, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <strong>Aperçu</strong> : seul vous voyez cette boutique tant qu’elle n’est pas en ligne. Les commandes y sont désactivées.
    </div>
  )
}

/** Global styles of the store page (responsive grids: inline styles cannot hold media queries). */
export function StoreStyles({ l }: { l: Look }) {
  return (
    <style>{`
      .sf-root { min-height: 100vh; background: ${l.c.background}; color: ${l.c.text}; font-family: ${l.font}; }
      .sf-root *, .sf-root *::before, .sf-root *::after { box-sizing: border-box; }
      .sf-wrap { max-width: 1180px; margin: 0 auto; padding: 0 20px; }
      .sf-grid { display: grid; gap: ${l.theme === 'elegance' ? 28 : 18}px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      @media (min-width: 720px) { .sf-grid { grid-template-columns: repeat(${l.theme === 'elegance' ? 3 : 4}, minmax(0, 1fr)); } }
      .sf-cards { display: grid; gap: 16px; grid-template-columns: 1fr; }
      @media (min-width: 720px) { .sf-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      .sf-banners { display: grid; gap: 16px; grid-template-columns: 1fr; }
      @media (min-width: 720px) { .sf-banners { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); } }
      .sf-gallery { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      @media (min-width: 720px) { .sf-gallery { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
      .sf-product { display: grid; gap: 32px; grid-template-columns: 1fr; }
      @media (min-width: 880px) { .sf-product { grid-template-columns: 1.1fr 1fr; align-items: start; } }
      .sf-input { width: 100%; padding: 13px 14px; font: inherit; font-size: 16px; color: ${l.c.text}; background: ${l.c.background};
        border: 1.5px solid ${l.c.text}33; border-radius: ${Math.max(l.t.radius, 4)}px; outline: none; }
      .sf-input:focus { border-color: ${l.c.primary}; box-shadow: 0 0 0 3px ${l.c.primary}33; }
      .sf-input[aria-invalid="true"] { border-color: #dc2626; }
      .sf-root a:focus-visible, .sf-root button:focus-visible, .sf-root summary:focus-visible { outline: 2px solid ${l.c.primary}; outline-offset: 2px; }
      .sf-root button:disabled { opacity: .55; cursor: not-allowed; }
    `}</style>
  )
}
