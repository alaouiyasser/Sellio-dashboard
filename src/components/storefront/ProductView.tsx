'use client'
// One product. Boutique: photos, options, « Ajouter au panier ». Landing / both: the product's
// landing (hero band, photos, then the COD form; « both » can also add to the cart).
// Blocks and their order: productBlocks() in lib/storefront.ts.
import { useEffect, useMemo, useState } from 'react'
import { Clock, ShoppingBag } from 'lucide-react'
import { isColorOption, swatchOf } from '@/lib/store-api'
import { readable } from '@/lib/store-theme'
import {
  countdownLeft, enabledSections, fmtDh, hasCart, hasDirectOrder, lineTotal, productBlocks, sizeOptions, valueAvailable, variantFor, variantLabelOf,
  ORDER_LIMITS, type PageBlock, type PublicProduct, type PublicStore,
} from '@/lib/storefront'
import { addedToast, OrderForm, Qty, useCart } from './cart'
import {
  Benefits, Block, Delivery, Faq, Footer, Gallery, HowItWorks, HowToUse, Img, Price, SizeGuide, Trust,
  btnStyle, ghostBtnStyle, lookOf, priceOf, type Look,
} from './kit'

export default function ProductView({ store, product: p, base, preview }: { store: PublicStore; product: PublicProduct; base: string; preview: boolean }) {
  const l = lookOf(store, base)
  const cart = useCart()
  const defs = useMemo(() => (p.option_defs ?? []).filter((d) => d.values.length > 0), [p])
  // Pre-select the only value of an option, and the first in-stock variant's values otherwise.
  const [chosen, setChosen] = useState<Record<string, string>>(() => {
    const first = p.variants.find((v) => v.inStock) ?? p.variants[0]
    return Object.fromEntries(defs.map((d) => [d.name, d.values.length === 1 ? d.values[0] : first?.options?.[d.name] ?? '']).filter(([, v]) => v))
  })
  const [qty, setQty] = useState(1)

  const variant = variantFor(p, chosen)
  const unit = variant?.price ?? priceOf(p).price
  const total = lineTotal(unit, qty, p.bundle_offers)
  const missing = defs.filter((d) => !chosen[d.name]).map((d) => d.name)
  const soldOut = !!variant && !variant.inStock
  const canBuy = !!variant && variant.inStock
  const images = [...(p.images ?? [])]
  if (variant?.imageUrl && !images.includes(variant.imageUrl)) images.unshift(variant.imageUrl)
  // The photo the buyer clicked, else the chosen variant's photo, else the first one.
  const [picked, setPicked] = useState<string | null>(null)
  const mainImage = (picked && images.includes(picked) ? picked : null) ?? variant?.imageUrl ?? images[0] ?? null

  const blocks = productBlocks(store)
  const on = enabledSections(store)
  const landing = hasDirectOrder(store)
  const withCart = hasCart(store) && !!cart

  const status = !p.variants.length ? 'Ce produit n’est pas disponible pour le moment.'
    : missing.length ? `Choisissez : ${missing.join(', ').toLowerCase()}`
      : !variant ? 'Cette combinaison n’est pas disponible.'
        : soldOut ? 'En rupture de stock' : null

  const addToCart = () => {
    if (!cart || !variant || !canBuy) return
    const ok = cart.add({
      variantId: variant.id, productSlug: p.slug, name: p.name, variantLabel: variantLabelOf(variant.options, defs),
      unitPrice: variant.price, image: variant.imageUrl ?? p.images?.[0] ?? null, quantity: qty, offers: p.bundle_offers ?? [],
    })
    addedToast(ok, p.name, () => cart.setOpen(true))
  }

  // ─── Pieces ────────────────────────────────────────────────────────────────
  const photos = (
    <div>
      <Img l={l} src={mainImage} ratio="1 / 1" alt={p.name} />
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto' }}>
          {images.map((u, i) => (
            <button key={u} type="button" onClick={() => setPicked(u)} aria-label={`Photo ${i + 1}`} aria-pressed={u === mainImage}
              style={{ width: 68, flexShrink: 0, padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: l.t.imgRadius, outline: u === mainImage ? `2px solid ${l.c.primary}` : 'none', outlineOffset: 2 }}>
              <Img l={l} src={u} ratio="1 / 1" />
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const title = (
    <>
      <h1 style={{ fontSize: l.theme === 'impact' ? 30 : 26, fontWeight: l.theme === 'elegance' ? 400 : 800, lineHeight: 1.2, margin: '0 0 10px', textTransform: l.theme === 'impact' ? 'uppercase' : 'none', fontStyle: l.theme === 'elegance' ? 'italic' : 'normal' }}>{p.name}</h1>
      <div style={{ marginBottom: 14 }}><Price l={l} price={unit} compareAt={p.compare_at_price} from={!variant && priceOf(p).from} size={22} /></div>
      <Countdown l={l} endsAt={p.countdown_ends_at} />
    </>
  )

  const chooser = (
    <div style={{ display: 'grid', gap: 16 }}>
      {defs.map((d) => {
        const color = isColorOption(d.name)
        return (
          <fieldset key={d.name} style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{d.name}{chosen[d.name] ? ` : ${chosen[d.name]}` : ''}</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {d.values.map((v) => {
                const sel = chosen[d.name] === v
                const avail = valueAvailable(p, chosen, d.name, v)
                const sw = color ? swatchOf(v) : null
                return (
                  <button key={v} type="button" aria-pressed={sel} onClick={() => { setChosen((x) => ({ ...x, [d.name]: v })); setPicked(null) }}
                    title={avail ? v : `${v} (épuisé)`}
                    style={{
                      font: 'inherit', fontSize: 14, cursor: 'pointer', padding: sw ? '6px 12px 6px 6px' : '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 8,
                      borderRadius: l.theme === 'elegance' ? 0 : Math.max(l.t.radius, 6), background: sel ? l.c.primary : 'transparent', color: sel ? readable(l.c.primary) : l.c.text,
                      border: `1.5px solid ${sel ? l.c.primary : `${l.c.text}33`}`, opacity: avail ? 1 : 0.45, textDecoration: avail ? 'none' : 'line-through',
                    }}>
                    {sw && <span aria-hidden style={{ width: 22, height: 22, borderRadius: 999, background: sw, border: '1px solid #0002' }} />}{v}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )
      })}
      {(p.bundle_offers?.length ?? 0) > 0 && (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Offres</legend>
          <div style={{ display: 'grid', gap: 8 }}>
            {[(p.bundle_offers ?? []).find((o) => o.qty === 1) ?? { qty: 1, price: unit }, ...(p.bundle_offers ?? []).filter((o) => o.qty > 1)].map((o) => {
              const sel = qty === o.qty
              const save = Math.round((unit * o.qty - o.price) * 100) / 100
              return (
                <button key={o.qty} type="button" aria-pressed={sel} onClick={() => setQty(o.qty)} style={{
                  font: 'inherit', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderRadius: Math.max(l.t.radius, 6), border: `2px solid ${sel ? l.c.primary : `${l.c.text}22`}`, background: sel ? l.c.secondary : 'transparent', color: l.c.text,
                }}>
                  <span><strong>{o.qty === 1 ? '1 pièce' : `${o.qty} pièces`}</strong>{o.qty > 1 && save > 0 && <span style={{ marginInlineStart: 8, fontSize: 13, color: l.c.primary, fontWeight: 700 }}>−{fmtDh(save)}</span>}</span>
                  <strong>{fmtDh(o.price)}</strong>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Quantité</span>
        <Qty l={l} value={qty} onChange={(q) => setQty(Math.max(1, Math.min(ORDER_LIMITS.quantity, q)))} />
        <span style={{ marginInlineStart: 'auto', fontWeight: 800, fontSize: 18 }}>{fmtDh(total)}</span>
      </div>
      {status && <div role="status" style={{ fontSize: 14, fontWeight: 600, color: soldOut || !p.variants.length ? '#dc2626' : l.c.text, opacity: soldOut ? 1 : 0.8 }}>{status}</div>}
    </div>
  )

  const cartButton = withCart && (
    <button type="button" onClick={addToCart} disabled={!canBuy} style={landing ? ghostBtnStyle(l, { width: '100%' }) : btnStyle(l, { width: '100%' })}>
      <ShoppingBag size={18} /> Ajouter au panier
    </button>
  )

  const description = p.description?.trim() && (
    <div style={{ lineHeight: 1.7, whiteSpace: 'pre-line', opacity: 0.92 }}>{p.description}</div>
  )

  // ─── Blocks ────────────────────────────────────────────────────────────────
  const render = (b: PageBlock) => {
    switch (b) {
      case 'product':
        if (landing && on.has('hero')) return <LandingHero key={b} l={l} p={p} unit={unit} image={mainImage} />
        return (
          <Block key={b} l={l} id="produit">
            <div className="sf-product">
              {photos}
              <div style={{ display: 'grid', gap: 18 }}>
                <div>{title}</div>
                {!landing && chooser}
                {!landing && cartButton}
                {landing && <a href="#commander" style={btnStyle(l, { width: '100%' })}>Commander — paiement à la livraison</a>}
                {description}
                {p.reference && <div style={{ fontSize: 13, opacity: 0.6 }}>Réf. {p.reference}</div>}
              </div>
            </div>
          </Block>
        )
      case 'gallery': return <Gallery key={b} l={l} images={p.images ?? []} />
      case 'order':
        return (
          <Block key={b} l={l} id="commander" tinted narrow title="Commander">
            {landing && on.has('hero') && description && <div style={{ marginBottom: 20 }}>{description}</div>}
            <div style={{ display: 'grid', gap: 18 }}>
              {chooser}
              {cartButton}
              <OrderForm l={l} preview={preview} lines={canBuy ? [{ variantId: variant!.id, quantity: qty }] : []} total={total} />
            </div>
          </Block>
        )
      case 'size_guide': {
        const sizes = sizeOptions(p).map((d) => ({ name: d.name, values: d.values.map((v) => ({ value: v, available: valueAvailable(p, {}, d.name, v) })) }))
        return <SizeGuide key={b} l={l} sizes={sizes} />
      }
      case 'how_to_use': return <HowToUse key={b} l={l} />
      case 'benefits': return <Benefits key={b} l={l} />
      case 'how_it_works': return <HowItWorks key={b} l={l} />
      case 'delivery': return <Delivery key={b} l={l} />
      case 'trust': return <Trust key={b} l={l} />
      case 'faq': return <Faq key={b} l={l} />
      case 'footer': return <Footer key={b} l={l} />
      default: return null
    }
  }
  return <>{blocks.map(render)}</>
}

/** Landing hero band (theme look of the wizard preview): name, price, photo, « Commander ». */
function LandingHero({ l, p, unit, image }: { l: Look; p: PublicProduct; unit: number; image: string | null }) {
  const { c, t, theme } = l
  const bg = theme === 'impact' ? c.primary : theme === 'essentiel' ? c.secondary : c.background
  const fg = theme === 'impact' ? readable(c.primary) : c.text
  return (
    <section id="produit" style={{ background: bg, color: fg }}>
      <div className="sf-wrap sf-product" style={{ padding: t.heroPad, alignItems: 'center' }}>
        <Img l={l} src={image} ratio="1 / 1" alt={p.name} />
        <div style={{ textAlign: theme === 'essentiel' ? 'left' : 'center' }}>
          <h1 style={{
            fontSize: `clamp(${Math.round(t.h1 * 0.7)}px, 5vw, ${t.h1}px)`, fontWeight: theme === 'elegance' ? 400 : 900, lineHeight: 1.1, margin: '0 0 14px',
            fontStyle: theme === 'elegance' ? 'italic' : 'normal', textTransform: theme === 'impact' ? 'uppercase' : 'none',
          }}>{p.name}</h1>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>
            {fmtDh(unit)}
            {p.compare_at_price && p.compare_at_price > unit ? <s style={{ opacity: 0.6, fontWeight: 400, marginInlineStart: 10, fontSize: 18 }}>{fmtDh(p.compare_at_price)}</s> : null}
          </div>
          <div style={{ marginBottom: 20 }}><Countdown l={l} endsAt={p.countdown_ends_at} color={fg} /></div>
          <a href="#commander" style={btnStyle(l)}>Commander — paiement à la livraison</a>
        </div>
      </div>
    </section>
  )
}

/** Real end date set by the merchant, still in the future; nothing otherwise. Ticks after hydration only. */
function Countdown({ l, endsAt, color }: { l: Look; endsAt: string | null; color?: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!endsAt) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])
  if (now === null) return null
  const left = countdownLeft(endsAt, now)
  if (left === null) return null
  const s = Math.floor(left / 1000)
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: color ?? l.c.primary }}>
      <Clock size={17} /> Offre valable encore {d > 0 ? `${d} j ` : ''}{pad(h)}:{pad(m)}:{pad(sec)}
    </div>
  )
}
