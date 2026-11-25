// Public store (<slug>.sellioagency.store), pure rules shared by the server pages and the client
// components. No fetch here (see storefront-server.ts). The API side is
// sellio/apps/api/src/modules/store-builder/storefront(.service).ts: shapes and rules mirror it.
import {
  FILTERS, PALETTES, SECTIONS, filtersFor, isColorOption, presetSections, profileOf, sectionsFor,
  type Colors, type OptionDef, type SiteType, type StoreProfile, type ThemeId,
} from './store-api'

// ─── API shapes (GET /s/:slug, GET /s/:slug/products/:productSlug) ───────────

export interface PublicStore {
  id: string; slug: string; name: string; profile: StoreProfile | null; site_type: SiteType | null; theme: ThemeId | null
  colors: Partial<Colors> | null; font: string | null; logo_url: string | null; whatsapp: string | null; city: string | null
  delivery_text: string | null; return_text: string | null; sections: Record<string, boolean> | null; status: string
}
export interface PublicCategory { id: string; parent_id: string | null; name: string; image_url: string | null; position: number }
export interface PublicVariant { id: string; options: Record<string, string>; price: number; imageUrl: string | null; inStock: boolean; position: number }
export interface PublicFitment { make: string; model: string; year_from: number | null; year_to: number | null }
export interface BundleOffer { qty: number; price: number }
export interface PublicProduct {
  id: string; category_id: string | null; name: string; slug: string; description: string | null; images: string[]
  option_defs: OptionDef[] | null; price: number; compare_at_price: number | null; reference: string | null
  details: Record<string, unknown> | null; bundle_offers: BundleOffer[] | null; countdown_ends_at: string | null
  position: number; variants: PublicVariant[]; fitments: PublicFitment[]
  /** Not selected by the public API today; « Nouveautés » shows only when it is. */
  created_at?: string | null
}
export interface StorePageData { store: PublicStore; categories: PublicCategory[]; products: PublicProduct[]; preview: boolean }
export interface ProductPageData { store: PublicStore; product: PublicProduct; preview: boolean }

// ─── Look ────────────────────────────────────────────────────────────────────

export const DEFAULT_COLORS: Colors = PALETTES[0].colors
export const colorsOf = (s: PublicStore): Colors => ({ ...DEFAULT_COLORS, ...(s.colors ?? {}) })
export const themeOf = (s: PublicStore): ThemeId => (s.theme === 'essentiel' || s.theme === 'elegance' ? s.theme : 'impact')
export const siteTypeOf = (s: PublicStore): SiteType =>
  s.site_type === 'landing' || s.site_type === 'both' || s.site_type === 'boutique' ? s.site_type : profileOf(s.profile).siteType
export const profileIdOf = (s: PublicStore): StoreProfile => profileOf(s.profile).id
/** Boutique and « both » have a cart; a landing page orders one product straight away. */
export const hasCart = (s: PublicStore) => siteTypeOf(s) !== 'landing'
/** Landing and « both »: each product page has its own COD form. */
export const hasDirectOrder = (s: PublicStore) => siteTypeOf(s) !== 'boutique'

export const fmtDh = (n: number) => `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(Math.round((Number(n) || 0) * 100) / 100)} DH`

// ─── Sections ────────────────────────────────────────────────────────────────
// Which sections a store shows = the ones its niche offers (sectionsFor: preset of the niche,
// minus the catalogue sections on a landing page) that the merchant left on (store.sections; a
// key the store never saved takes the niche's preset value, like the wizard).

export type SectionId = (typeof SECTIONS)[number]['id']
const KNOWN = new Set<string>(SECTIONS.map((s) => s.id))

/** The merchant's on/off for one key, falling back on the niche preset. */
function isOn(store: PublicStore, key: string): boolean {
  const saved = store.sections?.[key]
  return typeof saved === 'boolean' ? saved : !!presetSections(profileIdOf(store))[key]
}

/** Sections this store shows (any order). */
export function enabledSections(store: PublicStore): Set<string> {
  return new Set(sectionsFor(profileIdOf(store), siteTypeOf(store)).map((s) => s.id).filter((id) => KNOWN.has(id) && isOn(store, id)))
}

/** Filters this store shows on its catalogue (none on a landing page). */
export function enabledFilters(store: PublicStore): string[] {
  if (siteTypeOf(store) === 'landing') return []
  return filtersFor(profileIdOf(store)).map((f) => f.id).filter((id) => isOn(store, id))
}

/**
 * Page order. `catalog` (filters + all products) and `order` (COD form of a landing page) are not
 * merchant sections: they are always there on the page type that needs them.
 * whatsapp_button is a floating button, not a block: it is not in this list (see enabledSections).
 */
const HOME_ORDER = [
  'hero', 'vehicle_search', 'categories', 'featured', 'new_arrivals', 'catalog', 'banners',
  'benefits', 'how_it_works', 'size_guide', 'how_to_use', 'delivery', 'trust', 'faq', 'footer',
] as const
const LANDING_ORDER = [
  'product', 'gallery', 'benefits', 'size_guide', 'how_to_use', 'order', 'how_it_works', 'delivery', 'trust', 'faq', 'footer',
] as const
const PRODUCT_ORDER = ['product', 'size_guide', 'how_to_use', 'benefits', 'how_it_works', 'delivery', 'trust', 'faq', 'footer'] as const

export type PageBlock = (typeof HOME_ORDER)[number] | (typeof LANDING_ORDER)[number] | (typeof PRODUCT_ORDER)[number]

/**
 * A product's landing (landing store home, and every product page of a landing / « both » store):
 * `product` (photos, price, options; styled as the hero band when the hero section is on) and
 * `order` (COD form) are always there.
 */
function landingBlocks(store: PublicStore): PageBlock[] {
  const on = enabledSections(store)
  return LANDING_ORDER.filter((b) => b === 'product' || b === 'order' || on.has(b))
}

/** Ordered blocks of the store's home page (boutique / both: catalogue; landing: first product's landing). */
export function homeBlocks(store: PublicStore): PageBlock[] {
  if (siteTypeOf(store) === 'landing') return landingBlocks(store)
  const on = enabledSections(store)
  return HOME_ORDER.filter((b) => b === 'catalog' || on.has(b))
}

/** Ordered blocks of a product page (boutique: product + add to cart; landing / both: the product's landing). */
export function productBlocks(store: PublicStore): PageBlock[] {
  if (hasDirectOrder(store)) return landingBlocks(store)
  const on = enabledSections(store)
  return PRODUCT_ORDER.filter((b) => b === 'product' || on.has(b))
}

export const showWhatsappButton = (store: PublicStore) => enabledSections(store).has('whatsapp_button') && !!waNumber(store.whatsapp)

// ─── Products: featured, new arrivals, categories, size options ──────────────

/** The merchant's own order (position), then as the API sent them. */
export const byMerchantOrder = <T extends { position: number }>(ps: T[]): T[] => ps.map((p, i) => ({ p, i })).sort((a, b) => (a.p.position - b.p.position) || (a.i - b.i)).map((x) => x.p)

/**
 * « Notre sélection » (section featured). The public API has no sales figures, so this is never
 * called « best sellers »: it is the first products in the order the merchant chose.
 */
export const featuredProducts = <T extends { position: number }>(ps: T[], n = 4): T[] => (ps.length > n ? byMerchantOrder(ps).slice(0, n) : [])

/** « Nouveautés »: newest first, only when the products carry their creation date (else []: nothing made up). */
export function newArrivals<T extends { created_at?: string | null }>(ps: T[], n = 4): T[] {
  const dated = ps.filter((p) => p.created_at && !Number.isNaN(Date.parse(p.created_at)))
  if (dated.length < 2) return []
  return [...dated].sort((a, b) => Date.parse(b.created_at!) - Date.parse(a.created_at!)).slice(0, n)
}

export const topCategories = (cs: PublicCategory[]) => cs.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position)
/** A category and its sub-categories (a product in a sub-category belongs to the parent too). */
export function categoryIds(cs: PublicCategory[], id: string): Set<string> {
  const out = new Set([id])
  for (const c of cs) if (c.parent_id && out.has(c.parent_id)) out.add(c.id)
  return out
}

const SIZE_OPTION = /^(taille|pointure|âge|age|longueur|taille de bague|size)$/i
export const isSizeOption = (name: string) => SIZE_OPTION.test(name.trim())
/** Size-like options of a product with their values (« Taille : S, M, L »), for the size guide. */
export const sizeOptions = (p: PublicProduct) => (p.option_defs ?? []).filter((d) => isSizeOption(d.name) && d.values.length > 0)

// ─── Catalogue filters (built from the merchant's real data only) ────────────

export interface Facets {
  price?: { min: number; max: number }
  size?: string[]; color?: string[]; gender?: string[]; family?: string[]; brand?: string[]
  vehicle?: { makes: string[]; models: Record<string, string[]>; years: number[] }
}
export interface FilterState {
  priceMax?: number | null; size?: string | null; color?: string | null; gender?: string | null
  family?: string | null; brand?: string | null; make?: string | null; model?: string | null; year?: number | null
  categoryId?: string | null
}

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))
const detail = (p: PublicProduct, ...keys: string[]): string | null => {
  for (const k of keys) { const v = p.details?.[k]; if (typeof v === 'string' && v.trim()) return v.trim() }
  return null
}
const optionValues = (p: PublicProduct, test: (name: string) => boolean) =>
  (p.option_defs ?? []).filter((d) => test(d.name)).flatMap((d) => d.values)
const GENDER = /^(homme|femme|mixte|unisexe|garçon|fille|enfant)s?$/i
const genderOf = (p: PublicProduct, cs: PublicCategory[]): string | null => {
  const fromDetails = detail(p, 'gender', 'genre')
  if (fromDetails) return fromDetails
  // Niches like Mode / Parfums suggest « Homme » / « Femme » categories: use them when they exist.
  let c = cs.find((x) => x.id === p.category_id)
  while (c) { if (GENDER.test(c.name.trim())) return c.name.trim(); c = cs.find((x) => x.id === c!.parent_id) }
  return null
}
const minPrice = (p: PublicProduct) => (p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : p.price)

/** Values each enabled filter can take; a filter with nothing to choose from is left out. */
export function facetsFor(filters: string[], ps: PublicProduct[], cs: PublicCategory[]): Facets {
  const f: Facets = {}
  const has = (id: string) => filters.includes(id)
  if (has('filter_price') && ps.length > 1) {
    const prices = ps.map(minPrice)
    const min = Math.floor(Math.min(...prices)), max = Math.ceil(Math.max(...prices))
    if (max > min) f.price = { min, max }
  }
  const list = (id: string, key: 'size' | 'color' | 'gender' | 'family' | 'brand', values: string[]) => {
    if (!has(id)) return
    const u = uniq(values)
    if (u.length > 1) f[key] = u
  }
  list('filter_size', 'size', ps.flatMap((p) => optionValues(p, isSizeOption)))
  list('filter_color', 'color', ps.flatMap((p) => optionValues(p, isColorOption)))
  list('filter_gender', 'gender', ps.map((p) => genderOf(p, cs) ?? ''))
  list('filter_family', 'family', ps.map((p) => detail(p, 'family', 'famille', 'famille_olfactive') ?? ''))
  list('filter_brand', 'brand', ps.map((p) => detail(p, 'brand', 'marque') ?? ''))
  if (has('filter_vehicle')) {
    const fits = ps.flatMap((p) => p.fitments)
    if (fits.length) {
      const models: Record<string, string[]> = {}
      for (const x of fits) (models[x.make] ??= []).push(x.model)
      for (const k of Object.keys(models)) models[k] = uniq(models[k])
      const years = new Set<number>()
      for (const x of fits) {
        if (x.year_from && x.year_to && x.year_to >= x.year_from && x.year_to - x.year_from <= 60) for (let y = x.year_from; y <= x.year_to; y++) years.add(y)
        else if (x.year_from) years.add(x.year_from)
        else if (x.year_to) years.add(x.year_to)
      }
      f.vehicle = { makes: uniq(Object.keys(models)), models, years: [...years].sort((a, b) => b - a) }
    }
  }
  return f
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
/** A product fits the car when one of its fitments matches every part the buyer chose. */
export function fitsVehicle(p: PublicProduct, make?: string | null, model?: string | null, year?: number | null): boolean {
  if (!make && !model && !year) return true
  return p.fitments.some((x) =>
    (!make || sameText(x.make, make)) && (!model || sameText(x.model, model)) &&
    (!year || ((x.year_from ?? -Infinity) <= year && year <= (x.year_to ?? Infinity))))
}

export function applyFilters(ps: PublicProduct[], cs: PublicCategory[], s: FilterState): PublicProduct[] {
  const cats = s.categoryId ? categoryIds(cs, s.categoryId) : null
  return ps.filter((p) =>
    (!cats || (p.category_id !== null && cats.has(p.category_id))) &&
    (s.priceMax == null || minPrice(p) <= s.priceMax) &&
    (!s.size || optionValues(p, isSizeOption).some((v) => sameText(v, s.size!))) &&
    (!s.color || optionValues(p, isColorOption).some((v) => sameText(v, s.color!))) &&
    (!s.gender || sameText(genderOf(p, cs) ?? '', s.gender)) &&
    (!s.family || sameText(detail(p, 'family', 'famille', 'famille_olfactive') ?? '', s.family)) &&
    (!s.brand || sameText(detail(p, 'brand', 'marque') ?? '', s.brand)) &&
    fitsVehicle(p, s.make, s.model, s.year))
}

// ─── Variants and prices ─────────────────────────────────────────────────────

/** The variant matching the chosen options (every option of the product must be chosen). */
export function variantFor(p: PublicProduct, chosen: Record<string, string>): PublicVariant | null {
  const defs = (p.option_defs ?? []).filter((d) => d.values.length)
  if (!defs.length) return p.variants[0] ?? null
  if (defs.some((d) => !chosen[d.name])) return null
  return p.variants.find((v) => defs.every((d) => v.options?.[d.name] === chosen[d.name])) ?? null
}

/** "40 / Noir": the variant's values in the product's option order (as variantLabel in the API). */
export function variantLabelOf(options: Record<string, string> | null | undefined, defs: OptionDef[]): string {
  const o = options ?? {}
  const ordered = defs.map((d) => o[d.name]).filter(Boolean)
  return (ordered.length ? ordered : Object.values(o).filter(Boolean)).join(' / ')
}

/** Is any in-stock variant left with this option value, given the other choices? (greys out chips) */
export function valueAvailable(p: PublicProduct, chosen: Record<string, string>, option: string, value: string): boolean {
  const want = { ...chosen, [option]: value }
  return p.variants.some((v) => v.inStock && Object.entries(want).every(([k, x]) => !x || v.options?.[k] === x))
}

/** Same rule as priceStoreOrder in the API: a quantity matching a bundle offer costs the offer's price. */
export function lineTotal(unitPrice: number, quantity: number, offers: BundleOffer[] | null | undefined): number {
  const offer = (offers ?? []).find((o) => Number(o.qty) === quantity)
  return Math.round((offer ? Number(offer.price) : unitPrice * quantity) * 100) / 100
}

/** A countdown is shown only with a real end date still in the future (the API refuses past ones). */
export function countdownLeft(endsAt: string | null | undefined, now = Date.now()): number | null {
  const t = endsAt ? Date.parse(endsAt) : NaN
  return Number.isFinite(t) && t > now ? t - now : null
}

// ─── COD form (same rules as validateStoreOrderInput in the API) ─────────────

export const ORDER_LIMITS = { lines: 20, quantity: 10 } as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Same as moroccanPhone in the API (shopify-cod-form.ts): 06…, 07…, 05…, +212…, 00212… → +212XXXXXXXXX. */
export function moroccanPhone(input: unknown): string | null {
  let d = String(input ?? '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('212')) d = d.slice(3)
  if (d.length === 10 && d.startsWith('0')) d = d.slice(1)
  return /^[5-7]\d{8}$/.test(d) ? `+212${d}` : null
}

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

export interface OrderForm { name: string; phone: string; city: string; address: string }
export interface OrderLine { variantId: string; quantity: number }
export type OrderCheck =
  | { ok: true; body: OrderForm & { items: OrderLine[] } }
  | { ok: false; field: 'name' | 'phone' | 'city' | 'address' | 'items' | 'quantity'; message: string }

/** Checked in the page before sending, so the buyer sees the same message the API would give. */
export function checkOrder(form: OrderForm, lines: OrderLine[]): OrderCheck {
  const name = clean(form.name, 80)
  if (name.length < 2) return { ok: false, field: 'name', message: 'Indiquez votre nom' }
  if (!moroccanPhone(form.phone)) return { ok: false, field: 'phone', message: 'Numéro de téléphone invalide (ex : 06 12 34 56 78)' }
  const city = clean(form.city, 60)
  if (city.length < 2) return { ok: false, field: 'city', message: 'Indiquez votre ville' }
  const address = clean(form.address, 200)
  if (address.length < 4) return { ok: false, field: 'address', message: 'Indiquez votre adresse' }
  if (!lines.length) return { ok: false, field: 'items', message: 'Choisissez un produit' }
  if (lines.length > ORDER_LIMITS.lines) return { ok: false, field: 'items', message: `${ORDER_LIMITS.lines} produits au maximum` }
  const merged = new Map<string, number>()
  for (const l of lines) {
    if (!UUID_RE.test(l.variantId)) return { ok: false, field: 'items', message: 'Produit introuvable' }
    const q = Math.trunc(Number(l.quantity))
    if (!(q >= 1 && q <= ORDER_LIMITS.quantity)) return { ok: false, field: 'quantity', message: `Quantité entre 1 et ${ORDER_LIMITS.quantity}` }
    merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + q)
  }
  if ([...merged.values()].some((q) => q > ORDER_LIMITS.quantity)) return { ok: false, field: 'quantity', message: `Quantité entre 1 et ${ORDER_LIMITS.quantity}` }
  return { ok: true, body: { name, phone: form.phone.trim(), city, address, items: [...merged].map(([variantId, quantity]) => ({ variantId, quantity })) } }
}

// ─── Links ───────────────────────────────────────────────────────────────────

/** wa.me number from what the merchant typed (Moroccan numbers → 212…); null when unusable. */
export function waNumber(raw: string | null | undefined): string | null {
  const m = moroccanPhone(raw)
  if (m) return m.slice(1)
  const d = String(raw ?? '').replace(/\D/g, '')
  return d.length >= 8 && d.length <= 15 ? d : null
}
export const waLink = (raw: string | null | undefined, text?: string) => {
  const n = waNumber(raw)
  return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null
}

export const FILTER_LABELS: Record<string, string> = Object.fromEntries(FILTERS.map((f) => [f.id, f.label]))
