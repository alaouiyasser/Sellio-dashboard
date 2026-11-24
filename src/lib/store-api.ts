// Store builder V1 (issue #69), PR 3a — merchant side of the Sellio store ("Ma boutique").
// Endpoints: /api/store/* (sellio/apps/api/src/routes/store-builder.routes.ts). Field names
// and allowed values mirror sellio/apps/api/src/modules/store-builder/store-builder.ts.
import { Car, Flower2, Headphones, House, Leaf, Shirt, ShoppingBag, SprayCan, Target, ToyBrick, Watch, type LucideIcon } from 'lucide-react'
import { tx } from './i18n'
import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

// ─── Types (API rows) ────────────────────────────────────────────────────────

/** The 13 niches of step 1 (same list as STORE_PROFILES in sellio/apps/api/src/modules/store-builder/store-builder.ts). */
export type StoreProfile =
  | 'streetwear' | 'mode' | 'modeste' | 'parfums' | 'beaute' | 'beldi' | 'bijoux'
  | 'maison' | 'enfants' | 'gadgets' | 'auto' | 'mono' | 'autre'
export type SiteType = 'landing' | 'boutique' | 'both'
export type ThemeId = 'impact' | 'essentiel' | 'elegance'
export type StoreStatus = 'draft' | 'pending' | 'online' | 'suspended'
export type ColorKey = 'primary' | 'secondary' | 'button' | 'background' | 'text'
export type Colors = Record<ColorKey, string>

export interface Store {
  id: string; slug: string; name: string; profile: StoreProfile | null; site_type: SiteType | null; theme: ThemeId | null
  colors: Partial<Colors> | null; font: string | null; logo_url: string | null; whatsapp: string | null; city: string | null
  delivery_text: string | null; return_text: string | null; sections: Record<string, boolean> | null
  status: StoreStatus; activated_at: string | null
}
/** Body of POST/PATCH /store (camelCase, as the API reads it). */
export interface StoreInput {
  name?: string; slug?: string; profile?: StoreProfile; siteType?: SiteType; theme?: ThemeId; colors?: Partial<Colors>
  font?: string | null; logoUrl?: string | null; whatsapp?: string | null; city?: string | null
  deliveryText?: string | null; returnText?: string | null; sections?: Record<string, boolean>
}

export interface Category { id: string; parent_id: string | null; name: string; image_url: string | null; position: number }
export interface OptionDef { name: string; values: string[] }
export interface Variant { id?: string; options: Record<string, string>; price: number; stock: number; sku: string | null; image_url?: string | null }
export interface Fitment { id?: string; make: string; model: string; year_from: number | null; year_to: number | null }
export interface Product {
  id: string; category_id: string | null; name: string; slug: string; description: string | null; images: string[]
  option_defs: OptionDef[]; price: number; compare_at_price: number | null; reference: string | null
  status: 'draft' | 'active' | 'archived'; position: number
  store_variants?: Variant[]; variants?: Variant[]; fitments?: Fitment[]
}
export interface ProductInput {
  name?: string; description?: string | null; images?: string[]; options?: OptionDef[]; price?: number
  compareAtPrice?: number | null; reference?: string | null; status?: 'draft' | 'active'; categoryId?: string | null
}

export interface Activation {
  status: StoreStatus; configured: boolean; amount: number
  beneficiary: string | null; rib: string | null; supportWhatsapp: string | null; whatsappLink: string | null; message: string
  request: { id: string; status: 'pending' | 'approved' | 'rejected'; reason: string | null; created_at: string; decided_at: string | null } | null
}

// ─── Calls ───────────────────────────────────────────────────────────────────

export class StoreApiError extends Error { constructor(public status: number, message: string) { super(message) } }

async function call<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(`${API_BASE}/api${path}`, {
    credentials: 'include', ...init,
    headers: init?.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init?.headers },
  })
  const data = await res.json().catch(() => ({})) as { success?: boolean; error?: string | { message?: string } }
  if (res.status === 429) throw new StoreApiError(429, tx('Trop de demandes : réessayez dans une minute'))
  const err = typeof data?.error === 'string' ? data.error : data?.error?.message
  if (!res.ok || data?.success === false) throw new StoreApiError(res.status, err || tx('Erreur ({0})', [res.status]))
  return data as unknown as T
}
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const storeApi = {
  get: () => call<{ store: Store | null }>('/store').then((d) => d.store),
  create: (b: StoreInput) => call<{ store: Store }>('/store', json('POST', b)).then((d) => d.store),
  update: (b: StoreInput) => call<{ store: Store }>('/store', json('PATCH', b)).then((d) => d.store),

  uploadImage: async (file: File): Promise<string> => {
    const blob = await compressImage(file)
    const fd = new FormData()
    fd.append('file', blob, 'image.' + (blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'))
    return (await call<{ url: string }>('/store/images', { method: 'POST', body: fd })).url
  },

  categories: () => call<{ categories: Category[] }>('/store/categories').then((d) => d.categories),
  createCategory: (name: string, parentId: string | null = null) =>
    call<{ category: Category }>('/store/categories', json('POST', { name, parentId })).then((d) => d.category),
  updateCategory: (id: string, b: { name?: string; parentId?: string | null }) =>
    call<{ category: Category }>(`/store/categories/${id}`, json('PATCH', b)).then((d) => d.category),
  deleteCategory: (id: string) => call(`/store/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (order: Array<{ id: string; parentId: string | null; position: number }>) =>
    call<{ categories: Category[] }>('/store/categories/order', json('PUT', { order })).then((d) => d.categories),

  products: () => call<{ products: Product[] }>('/store/products').then((d) => d.products),
  product: (id: string) => call<{ product: Product }>(`/store/products/${id}`).then((d) => d.product),
  createProduct: (b: ProductInput) => call<{ product: Product }>('/store/products', json('POST', b)).then((d) => d.product),
  updateProduct: (id: string, b: ProductInput) => call<{ product: Product }>(`/store/products/${id}`, json('PATCH', b)).then((d) => d.product),
  archiveProduct: (id: string) => call(`/store/products/${id}`, { method: 'DELETE' }),
  setVariants: (id: string, variants: Array<{ options: Record<string, string>; price: number; stock: number; sku?: string | null }>) =>
    call<{ variants: Variant[] }>(`/store/products/${id}/variants`, json('PUT', { variants })).then((d) => d.variants),
  setFitments: (id: string, fitments: Array<{ make: string; model: string; yearFrom: number | null; yearTo: number | null }>) =>
    call<{ fitments: Fitment[] }>(`/store/products/${id}/fitments`, json('PUT', { fitments })).then((d) => d.fitments),

  /** Draft description by AI (gpt-4o-mini) from the first photo, name, niche and options. Nothing is saved. */
  describeProduct: (b: { imageUrl: string; name: string; niche: StoreProfile; options: OptionDef[]; lang: string }) =>
    call<{ description: string }>('/store/products/describe', json('POST', b)).then((d) => d.description),

  activation: () => call<{ activation: Activation }>('/store/activation').then((d) => d.activation),
  requestActivation: () => call<{ activation: Activation }>('/store/activation', { method: 'POST' }).then((d) => d.activation),
}

// ─── Images: compressed in the browser (the API refuses more than 1 MB) ──────

const IMAGE_MAX_SIDE = 1600
const IMAGE_MAX_BYTES = 1024 * 1024

export async function compressImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) && !/^image\//.test(file.type)) throw new Error(tx('Format accepté : JPEG, PNG ou WebP'))
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error(tx('Image illisible'))); i.src = url
    })
    const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    for (const q of [0.85, 0.75, 0.6, 0.45]) {
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', q))
      const out = blob && blob.type === 'image/webp' ? blob : await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', q))
      if (out && out.size <= IMAGE_MAX_BYTES) return out
    }
    throw new Error(tx('Image trop lourde, choisissez-en une plus petite'))
  } finally { URL.revokeObjectURL(url) }
}

// ─── Public links ────────────────────────────────────────────────────────────
// NEXT_PUBLIC_STORE_BASE_URL is the short public address of the stores, never the dashboard's
// or Vercel's host: "https://{slug}.sellio.ma" (sub-domain) or "https://sellio.ma" (→ /<slug>).
// Not set yet → the current origin and /s/<slug> (served by the Sellio storefront).

const STORE_BASE = (process.env.NEXT_PUBLIC_STORE_BASE_URL ?? '').trim().replace(/\/+$/, '')
const origin = () => (typeof window !== 'undefined' ? window.location.origin : '')

/** Store link for a base: {slug} template, plain base (→ /<slug>), or origin + /s/<slug>. */
export function storeUrlFor(base: string, slug: string, fallbackOrigin: string): string {
  if (!base) return `${fallbackOrigin}/s/${slug}`
  return base.includes('{slug}') ? base.replace('{slug}', slug) : `${base}/${slug}`
}
export const storeUrl = (slug: string) => storeUrlFor(STORE_BASE, slug, origin())
/** One link per product, for WhatsApp quick replies and ads. */
export const productUrl = (storeSlug: string, productSlug: string) => `${storeUrl(storeSlug)}/products/${productSlug}`
/** What is around the slug in the address, for the "Adresse de la boutique" field (no https://). */
export function storeUrlParts(): { before: string; after: string } {
  const marker = 'SLUGMARK'
  const [before = '', after = ''] = storeUrl(marker).replace(/^https?:\/\//, '').split(marker)
  return { before, after }
}

// ─── Presets (one per niche) ─────────────────────────────────────────────────
// A niche decides which sections, filters and product fields the merchant sees (and which are
// on at first); the merchant still turns each one on or off. Filters are stored as `filter_*`
// keys of store.sections.

export interface OptionPreset { name: string; values: string[] }
export interface ProfilePreset {
  id: StoreProfile; label: string; hint: string; /** Shown on the step-1 card while the niche photo is missing. */
  icon: LucideIcon; siteType: SiteType
  /** Card photo of step 1 (public/store-niches/<id>.webp); a coloured card if the file is missing. */
  photo: string; tint: string
  options: OptionPreset[]
  /** Sections this niche can show, and the ones on at first. */
  sections: string[]; defaultOff?: string[]
  filters: string[]
  /** Product fields: colour swatches on the colour chips, compatible vehicles. */
  fields: { colorSwatches: boolean; vehicles: boolean }
  /** Categories suggested at the categories step (ticked, renamable). */
  categories: string[]
}

/** The general sections every store can have (and the only ones of « Autre »). */
export const GENERAL_SECTIONS = ['hero', 'categories', 'featured', 'banners', 'trust', 'faq', 'footer']
const STORE = (...extra: string[]) => [...GENERAL_SECTIONS.slice(0, 3), ...extra, ...GENERAL_SECTIONS.slice(3), 'delivery', 'whatsapp_button']

const COLORS_CLOTHES = ['Noir', 'Blanc', 'Gris', 'Beige', 'Marron', 'Bleu', 'Rouge', 'Vert', 'Rose']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const photo = (id: string) => `/store-niches/${id}.webp`

export const PROFILES: ProfilePreset[] = [
  {
    id: 'streetwear', label: 'Streetwear', hint: 'Hoodies, t-shirts, sneakers', icon: Shirt, siteType: 'boutique', photo: photo('streetwear'), tint: '#1f2937',
    options: [{ name: 'Taille', values: SIZES }, { name: 'Pointure', values: ['38', '39', '40', '41', '42', '43', '44', '45'] }, { name: 'Couleur', values: COLORS_CLOTHES }],
    sections: STORE('new_arrivals', 'size_guide'), filters: ['filter_size', 'filter_color', 'filter_price'],
    fields: { colorSwatches: true, vehicles: false }, categories: ['Hoodies', 'T-shirts', 'Pantalons', 'Sneakers', 'Accessoires'],
  },
  {
    id: 'mode', label: 'Mode', hint: 'Vêtements et chaussures, homme et femme', icon: Shirt, siteType: 'boutique', photo: photo('mode'), tint: '#9d174d',
    options: [{ name: 'Taille', values: SIZES }, { name: 'Pointure', values: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] }, { name: 'Couleur', values: COLORS_CLOTHES }],
    sections: STORE('new_arrivals', 'size_guide'), filters: ['filter_size', 'filter_color', 'filter_gender', 'filter_price'],
    fields: { colorSwatches: true, vehicles: false }, categories: ['Femme', 'Homme', 'Chaussures', 'Sacs', 'Accessoires'],
  },
  {
    id: 'modeste', label: 'Mode modeste', hint: 'Abayas, djellabas, kaftans', icon: Shirt, siteType: 'boutique', photo: photo('modeste'), tint: '#6b4f3a',
    options: [{ name: 'Taille', values: ['S', 'M', 'L', 'XL', 'XXL', 'Taille unique'] }, { name: 'Longueur', values: ['52', '54', '56', '58', '60'] }, { name: 'Couleur', values: COLORS_CLOTHES }],
    sections: STORE('new_arrivals', 'size_guide'), filters: ['filter_size', 'filter_color', 'filter_price'],
    fields: { colorSwatches: true, vehicles: false }, categories: ['Abayas', 'Djellabas', 'Kaftans', 'Hijabs', 'Ensembles'],
  },
  {
    id: 'parfums', label: 'Parfums', hint: 'Contenances, homme / femme, décants', icon: Flower2, siteType: 'boutique', photo: photo('parfums'), tint: '#7c3aed',
    options: [
      { name: 'Contenance', values: ['5 ml', '10 ml', '30 ml', '50 ml', '100 ml'] },
      { name: 'Type', values: ['Eau de parfum', 'Eau de toilette', 'Huile parfumée', 'Musc'] },
    ],
    sections: STORE('new_arrivals'), filters: ['filter_gender', 'filter_family', 'filter_price'],
    fields: { colorSwatches: false, vehicles: false }, categories: ['Homme', 'Femme', 'Décants', 'Coffrets'],
  },
  {
    id: 'beaute', label: 'Beauté et skincare', hint: 'Soins visage, corps, cheveux', icon: SprayCan, siteType: 'boutique', photo: photo('beaute'), tint: '#db2777',
    options: [
      { name: 'Contenance', values: ['30 ml', '50 ml', '100 ml', '200 ml', '500 ml'] },
      { name: 'Type de peau', values: ['Tous types', 'Normale', 'Sèche', 'Grasse', 'Mixte', 'Sensible'] },
    ],
    sections: STORE('benefits', 'how_to_use'), filters: ['filter_price'],
    fields: { colorSwatches: false, vehicles: false }, categories: ['Visage', 'Corps', 'Cheveux', 'Maquillage', 'Coffrets'],
  },
  {
    id: 'beldi', label: 'Naturel et beldi', hint: 'Huiles, savon beldi, miel, amlou', icon: Leaf, siteType: 'boutique', photo: photo('beldi'), tint: '#4d7c0f',
    options: [{ name: 'Format', values: ['100 g', '250 g', '500 g', '1 kg', '100 ml', '250 ml', '500 ml', '1 L'] }],
    sections: STORE('benefits', 'how_to_use'), filters: ['filter_price'],
    fields: { colorSwatches: false, vehicles: false }, categories: ['Huiles', 'Savon et ghassoul', 'Miel et amlou', 'Épices', 'Plantes'],
  },
  {
    id: 'bijoux', label: 'Montres et bijoux', hint: 'Montres, bagues, colliers, bracelets', icon: Watch, siteType: 'boutique', photo: photo('bijoux'), tint: '#a16207',
    options: [{ name: 'Taille de bague', values: ['50', '52', '54', '56', '58', '60', '62'] }, { name: 'Finition', values: ['Doré', 'Argenté', 'Rosé', 'Noir'] }],
    sections: STORE('new_arrivals'), filters: ['filter_gender', 'filter_price'],
    fields: { colorSwatches: false, vehicles: false }, categories: ['Montres', 'Bagues', 'Colliers', 'Bracelets', 'Boucles d’oreilles'],
  },
  {
    id: 'maison', label: 'Maison et cuisine', hint: 'Cuisine, déco, rangement', icon: House, siteType: 'boutique', photo: photo('maison'), tint: '#0f766e',
    options: [{ name: 'Taille', values: ['Petit', 'Moyen', 'Grand'] }, { name: 'Couleur', values: ['Noir', 'Blanc', 'Gris', 'Beige', 'Bois', 'Doré'] }],
    sections: STORE('new_arrivals', 'benefits'), filters: ['filter_color', 'filter_price'],
    fields: { colorSwatches: true, vehicles: false }, categories: ['Cuisine', 'Décoration', 'Rangement', 'Linge de maison'],
  },
  {
    id: 'enfants', label: 'Bébé et enfants', hint: 'Vêtements par âge, jouets, puériculture', icon: ToyBrick, siteType: 'boutique', photo: photo('enfants'), tint: '#0284c7',
    options: [
      { name: 'Âge', values: ['0-3 mois', '3-6 mois', '6-12 mois', '1-2 ans', '2-3 ans', '3-4 ans', '4-6 ans', '6-8 ans'] },
      { name: 'Couleur', values: ['Blanc', 'Rose', 'Bleu', 'Jaune', 'Vert', 'Gris'] },
    ],
    sections: STORE('new_arrivals', 'size_guide'), filters: ['filter_size', 'filter_color', 'filter_price'],
    fields: { colorSwatches: true, vehicles: false }, categories: ['Bébé', 'Fille', 'Garçon', 'Jouets', 'Puériculture'],
  },
  {
    id: 'gadgets', label: 'Gadgets et électronique', hint: 'Accessoires téléphone, audio, maison connectée', icon: Headphones, siteType: 'boutique', photo: photo('gadgets'), tint: '#1652f0',
    options: [{ name: 'Couleur', values: ['Noir', 'Blanc', 'Gris', 'Bleu', 'Rose'] }, { name: 'Modèle', values: ['iPhone', 'Samsung', 'Xiaomi', 'Universel'] }],
    sections: STORE('benefits', 'how_it_works'), filters: ['filter_color', 'filter_brand', 'filter_price'],
    fields: { colorSwatches: true, vehicles: false }, categories: ['Téléphone et accessoires', 'Audio', 'Montres connectées', 'Maison connectée'],
  },
  {
    id: 'auto', label: 'Pièces auto', hint: 'Recherche par marque, modèle et année', icon: Car, siteType: 'boutique', photo: photo('auto'), tint: '#b91c1c',
    options: [{ name: 'Position', values: ['Avant', 'Arrière', 'Gauche', 'Droite'] }, { name: 'État', values: ['Neuf', 'Occasion'] }],
    sections: STORE('vehicle_search'), filters: ['filter_vehicle', 'filter_brand', 'filter_price'],
    fields: { colorSwatches: false, vehicles: true }, categories: ['Freinage', 'Moteur', 'Éclairage', 'Carrosserie', 'Accessoires'],
  },
  {
    id: 'mono', label: 'Mono-produit (landing)', hint: 'Un produit gagnant, une page qui vend', icon: Target, siteType: 'landing', photo: photo('mono'), tint: '#ea580c',
    options: [{ name: 'Couleur', values: ['Noir', 'Blanc', 'Gris', 'Bleu', 'Rose'] }],
    sections: ['hero', 'benefits', 'gallery', 'how_it_works', 'trust', 'faq', 'delivery', 'whatsapp_button', 'footer'], filters: [],
    fields: { colorSwatches: true, vehicles: false }, categories: [],
  },
  {
    id: 'autre', label: 'Autre', hint: 'Sections et champs généraux, à vous de compléter', icon: ShoppingBag, siteType: 'boutique', photo: photo('autre'), tint: '#475569',
    options: [], sections: GENERAL_SECTIONS, filters: ['filter_price'],
    fields: { colorSwatches: false, vehicles: false }, categories: [],
  },
]
export const profileOf = (id: StoreProfile | null | undefined) => PROFILES.find((p) => p.id === id) ?? PROFILES[PROFILES.length - 1]

export const SITE_TYPES: Array<{ id: SiteType; label: string; hint: string }> = [
  { id: 'landing', label: 'Landing page', hint: 'Une page pour un produit, idéale pour la pub' },
  { id: 'boutique', label: 'Boutique', hint: 'Catalogue, catégories, filtres et panier' },
  { id: 'both', label: 'Les deux', hint: 'Une boutique, et une landing page par produit' },
]

export const THEMES: Array<{ id: ThemeId; label: string; hint: string }> = [
  { id: 'impact', label: 'Impact', hint: 'Gros titres, bouton visible, pour la pub' },
  { id: 'essentiel', label: 'Essentiel', hint: 'Clair et simple, les produits d’abord' },
  { id: 'elegance', label: 'Élégance', hint: 'Aéré et raffiné, pour le haut de gamme' },
]

export const PALETTES: Array<{ id: string; label: string; colors: Colors }> = [
  { id: 'ocean', label: 'Océan', colors: { primary: '#1652f0', secondary: '#e8efff', button: '#1652f0', background: '#ffffff', text: '#1a1f36' } },
  { id: 'sahara', label: 'Sahara', colors: { primary: '#b45309', secondary: '#fdf3e7', button: '#d97706', background: '#fffbf5', text: '#3b2a1a' } },
  { id: 'menthe', label: 'Menthe', colors: { primary: '#047857', secondary: '#e7f6ef', button: '#059669', background: '#ffffff', text: '#12261e' } },
  { id: 'nuit', label: 'Nuit', colors: { primary: '#facc15', secondary: '#1f2937', button: '#facc15', background: '#111827', text: '#f9fafb' } },
  { id: 'rose', label: 'Rose', colors: { primary: '#be185d', secondary: '#fdf0f6', button: '#db2777', background: '#fffafc', text: '#3a1328' } },
  { id: 'or', label: 'Noir et or', colors: { primary: '#a16207', secondary: '#f5f0e6', button: '#1c1917', background: '#fcfaf6', text: '#1c1917' } },
]
export const COLOR_LABELS: Record<ColorKey, string> = {
  primary: 'Principale', secondary: 'Secondaire', button: 'Boutons', background: 'Fond', text: 'Texte',
}
export const FONTS: Array<{ id: string; label: string; css: string }> = [
  { id: 'Cairo', label: 'Cairo', css: "'Cairo', system-ui, sans-serif" },
  { id: 'Poppins', label: 'Poppins', css: "'Poppins', system-ui, sans-serif" },
  { id: 'Playfair Display', label: 'Playfair Display', css: "'Playfair Display', Georgia, serif" },
]
export const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;600;800&display=swap'
export const fontCss = (f: string | null | undefined) => FONTS.find((x) => x.id === f)?.css ?? FONTS[0].css

export const SECTIONS: Array<{ id: string; label: string; hint: string }> = [
  { id: 'hero', label: 'Bannière d’accueil', hint: 'Grande image, titre et bouton Commander' },
  { id: 'benefits', label: 'Avantages', hint: 'Les points forts du produit' },
  { id: 'gallery', label: 'Galerie photos', hint: 'Toutes les photos du produit' },
  { id: 'how_it_works', label: 'Comment ça marche', hint: 'Commande, confirmation WhatsApp, livraison' },
  { id: 'vehicle_search', label: 'Recherche par véhicule', hint: 'Marque, modèle, année' },
  { id: 'categories', label: 'Catégories', hint: 'Vos catégories en vignettes' },
  { id: 'featured', label: 'Meilleures ventes', hint: 'Vos produits les plus vendus en haut de page' },
  { id: 'new_arrivals', label: 'Nouveautés', hint: 'Les derniers produits ajoutés' },
  { id: 'size_guide', label: 'Guide des tailles', hint: 'Aide le client à choisir sa taille' },
  { id: 'how_to_use', label: 'Conseils d’utilisation', hint: 'Comment utiliser le produit' },
  { id: 'banners', label: 'Bannières', hint: 'Images promo entre les sections' },
  { id: 'trust', label: 'Confiance', hint: 'Paiement à la livraison, confirmation WhatsApp' },
  { id: 'faq', label: 'Questions fréquentes', hint: 'Livraison, paiement, retours' },
  { id: 'delivery', label: 'Livraison et retours', hint: 'Vos textes de livraison et de retour' },
  { id: 'whatsapp_button', label: 'Bouton WhatsApp', hint: 'Le client vous écrit en un clic' },
  { id: 'footer', label: 'Pied de page', hint: 'Nom, ville, contact et liens' },
]
export const FILTERS: Array<{ id: string; label: string }> = [
  { id: 'filter_price', label: 'Prix' },
  { id: 'filter_size', label: 'Taille / pointure' },
  { id: 'filter_color', label: 'Couleur' },
  { id: 'filter_gender', label: 'Homme / femme' },
  { id: 'filter_family', label: 'Famille olfactive' },
  { id: 'filter_vehicle', label: 'Véhicule compatible' },
  { id: 'filter_brand', label: 'Marque' },
]
/** Sections the Sections step shows for this niche (landing pages have no catalogue sections). */
export function sectionsFor(profile: StoreProfile, siteType: SiteType) {
  const allowed = new Set(profileOf(profile).sections)
  const catalogue = ['categories', 'featured', 'new_arrivals', 'vehicle_search', 'banners']
  return SECTIONS.filter((s) => allowed.has(s.id) && (siteType !== 'landing' || !catalogue.includes(s.id)))
}
export const filtersFor = (profile: StoreProfile) => FILTERS.filter((f) => profileOf(profile).filters.includes(f.id))

/** Sections + filters a niche turns on (every known key is written, so the store keeps the merchant's "off"). */
export function presetSections(profile: StoreProfile): Record<string, boolean> {
  const p = profileOf(profile)
  const on = new Set([...p.sections.filter((k) => !p.defaultOff?.includes(k)), ...p.filters])
  return Object.fromEntries([...SECTIONS.map((s) => s.id), ...FILTERS.map((f) => f.id)].map((k) => [k, on.has(k)]))
}

/** Swatch colour of a colour option value ("Noir" → #111). Unknown names: no swatch. */
export const SWATCHES: Record<string, string> = {
  noir: '#111111', blanc: '#ffffff', gris: '#9ca3af', beige: '#e8d9bd', marron: '#7c4a2d', bleu: '#2563eb', rouge: '#dc2626',
  vert: '#16a34a', rose: '#f472b6', jaune: '#facc15', orange: '#f97316', violet: '#7c3aed', bois: '#a47148', 'doré': '#d4a017',
  'argenté': '#c0c0c0', bordeaux: '#7f1d1d', kaki: '#6b7041', marine: '#1e3a8a', camel: '#c19a6b', ecru: '#f3efe0', 'écru': '#f3efe0',
}
export const isColorOption = (name: string) => /^(couleur|coloris|color|colour|اللون|لون)$/i.test(name.trim())
export const swatchOf = (value: string) => SWATCHES[value.trim().toLowerCase()] ?? null

/** Every combination of the chosen option values (same order as the API's combinations()). */
export function combinations(defs: OptionDef[]): Array<Record<string, string>> {
  let out: Array<Record<string, string>> = [{}]
  for (const d of defs) out = out.flatMap((c) => d.values.map((v) => ({ ...c, [d.name]: v })))
  return out
}
export const comboKey = (defs: OptionDef[], o: Record<string, string>) => defs.map((d) => o[d.name] ?? '').join('\u0000')

export const STATUS_LABEL: Record<StoreStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'var(--text-muted)' },
  pending: { label: 'En attente de vérification', color: 'var(--warning)' },
  online: { label: 'En ligne', color: 'var(--success)' },
  suspended: { label: 'Suspendue', color: 'var(--destructive)' },
}

// ─── Plans (tenants.plan) ────────────────────────────────────────────────────

export type Plan = 'demarrage' | 'croissance'
export const PLAN_LABEL: Record<Plan, string> = { demarrage: 'Démarrage', croissance: 'Croissance' }
/** Both plans: 5 DH per delivered order (sellio/apps/api/src/modules/agents/sellio-knowledge.ts). */
export const PLAN_PRICE_DH = 5
export const parsePlan = (v: unknown): Plan | null => {
  const s = String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return s === 'demarrage' || s === 'croissance' ? s : null
}
