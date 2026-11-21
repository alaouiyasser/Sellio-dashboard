// Store builder V1 (issue #69), PR 3a — merchant side of the Sellio store ("Ma boutique").
// Endpoints: /api/store/* (sellio/apps/api/src/routes/store-builder.routes.ts). Field names
// and allowed values mirror sellio/apps/api/src/modules/store-builder/store-builder.ts.
import { tx } from './i18n'
import { authFetch } from './api-fetch'
import { API_BASE } from './auth-client'

// ─── Types (API rows) ────────────────────────────────────────────────────────

export type StoreProfile = 'mono' | 'parfums' | 'mode' | 'auto' | 'autre'
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
  const data = await res.json().catch(() => ({})) as { success?: boolean; error?: string }
  if (!res.ok || data?.success === false) throw new StoreApiError(res.status, data?.error || tx('Erreur ({0})', [res.status]))
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

// ─── Public links (store at /s/<slug>, served by the Sellio storefront) ──────

const origin = () => (typeof window !== 'undefined' ? window.location.origin : '')
export const storeUrl = (slug: string) => `${origin()}/s/${slug}`
/** One link per product, for WhatsApp quick replies and ads. */
export const productUrl = (storeSlug: string, productSlug: string) => `${origin()}/s/${storeSlug}/products/${productSlug}`

// ─── Presets ─────────────────────────────────────────────────────────────────
// A profile only pre-fills choices (site type, option chips, filters, sections): the merchant
// can change everything. Filters are stored as `filter_*` keys of store.sections.

export interface OptionPreset { name: string; values: string[] }
export interface ProfilePreset {
  id: StoreProfile; label: string; hint: string; emoji: string; siteType: SiteType
  options: OptionPreset[]; sections: string[]; filters: string[]
}

export const PROFILES: ProfilePreset[] = [
  {
    id: 'mono', label: 'Un seul produit', hint: 'Un produit gagnant, une page qui vend', emoji: '🎯', siteType: 'landing',
    options: [{ name: 'Couleur', values: ['Noir', 'Blanc', 'Gris', 'Bleu', 'Rose'] }],
    sections: ['hero', 'benefits', 'gallery', 'how_it_works', 'faq', 'delivery', 'whatsapp_button'], filters: [],
  },
  {
    id: 'parfums', label: 'Parfums', hint: 'Contenances, familles olfactives, homme / femme', emoji: '🌸', siteType: 'boutique',
    options: [
      { name: 'Contenance', values: ['10 ml', '30 ml', '50 ml', '100 ml'] },
      { name: 'Type', values: ['Eau de parfum', 'Eau de toilette', 'Huile parfumée', 'Musc'] },
    ],
    sections: ['hero', 'categories', 'featured', 'new_arrivals', 'delivery', 'faq', 'whatsapp_button'],
    filters: ['filter_gender', 'filter_family', 'filter_price'],
  },
  {
    id: 'mode', label: 'Mode et chaussures', hint: 'Tailles, pointures, couleurs', emoji: '👟', siteType: 'boutique',
    options: [
      { name: 'Taille', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'Pointure', values: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
      { name: 'Couleur', values: ['Noir', 'Blanc', 'Beige', 'Marron', 'Bleu', 'Rouge', 'Vert'] },
    ],
    sections: ['hero', 'categories', 'featured', 'new_arrivals', 'size_guide', 'delivery', 'whatsapp_button'],
    filters: ['filter_size', 'filter_color', 'filter_price'],
  },
  {
    id: 'auto', label: 'Pièces auto', hint: 'Recherche par marque, modèle et année', emoji: '🚗', siteType: 'boutique',
    options: [
      { name: 'Position', values: ['Avant', 'Arrière', 'Gauche', 'Droite'] },
      { name: 'État', values: ['Neuf', 'Occasion'] },
    ],
    sections: ['hero', 'vehicle_search', 'categories', 'featured', 'delivery', 'whatsapp_button'],
    filters: ['filter_vehicle', 'filter_brand', 'filter_price'],
  },
  {
    id: 'autre', label: 'Autre chose', hint: 'Vous choisissez tout vous-même', emoji: '🛍️', siteType: 'both',
    options: [], sections: ['hero', 'categories', 'featured', 'delivery', 'whatsapp_button'], filters: ['filter_price'],
  },
]
export const profileOf = (id: StoreProfile | null | undefined) => PROFILES.find((p) => p.id === id) ?? PROFILES[4]

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
  { id: 'featured', label: 'Produits vedettes', hint: 'Une sélection en haut de page' },
  { id: 'new_arrivals', label: 'Nouveautés', hint: 'Les derniers produits ajoutés' },
  { id: 'size_guide', label: 'Guide des tailles', hint: 'Aide le client à choisir sa taille' },
  { id: 'faq', label: 'Questions fréquentes', hint: 'Livraison, paiement, retours' },
  { id: 'delivery', label: 'Livraison et retours', hint: 'Vos textes de livraison et de retour' },
  { id: 'whatsapp_button', label: 'Bouton WhatsApp', hint: 'Le client vous écrit en un clic' },
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

/** Sections + filters a profile turns on (every known key is written, so the store keeps the merchant's "off"). */
export function presetSections(profile: StoreProfile): Record<string, boolean> {
  const p = profileOf(profile)
  const on = new Set([...p.sections, ...p.filters])
  return Object.fromEntries([...SECTIONS.map((s) => s.id), ...FILTERS.map((f) => f.id)].map((k) => [k, on.has(k)]))
}

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
