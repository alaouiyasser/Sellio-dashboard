// Server-side loading of the public store pages. Mirrors the API's rules
// (sellio/apps/api/src/routes/storefront.routes.ts):
// - public request first, without any credentials, cached 60 s like the API's
//   `cache-control: public, max-age=60`;
// - only when the API answers 404 and the viewer has a dashboard session (dashboard host, not a
//   <slug>.sellioagency.store host: buyers never have one), retry with the merchant's token to get
//   the owner's preview (canViewStore → 'preview'). That request is `no-store`: a preview is never
//   put in a shared cache, as the API's `private, no-store` asks.
import { headers } from 'next/headers'
import { createServerSupabaseClient } from './supabase-server'
import { STORE_HOST_HEADER } from './storefront-host'
import type { ProductPageData, StorePageData } from './storefront'

const API = (process.env.SELLIO_API_URL || 'https://sellio-production-ccf6.up.railway.app').replace(/\/+$/, '')
const PUBLIC_MAX_AGE = 60

export class StorefrontUnavailable extends Error {}

/** Links of the store pages: "" on <slug>.sellioagency.store, "/storefront/<slug>" on the dashboard host. */
export async function storeBasePath(slug: string): Promise<string> {
  return (await headers()).get(STORE_HOST_HEADER) ? '' : `/storefront/${slug}`
}

async function ownerToken(): Promise<string | null> {
  if ((await headers()).get(STORE_HOST_HEADER)) return null
  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch { return null }
}

async function load<T>(path: string): Promise<(T & { preview: boolean }) | null> {
  const get = (init: RequestInit & { next?: { revalidate: number } }) =>
    fetch(`${API}${path}`, { ...init, headers: { Accept: 'application/json', ...init.headers } })

  let res: Response
  try { res = await get({ next: { revalidate: PUBLIC_MAX_AGE } }) } catch { throw new StorefrontUnavailable('Boutique indisponible, réessayez') }
  if (res.status === 404) {
    const token = await ownerToken()
    if (!token) return null
    try { res = await get({ cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }) } catch { throw new StorefrontUnavailable('Boutique indisponible, réessayez') }
    if (res.status === 404) return null
  }
  const data = await res.json().catch(() => null) as ({ ok?: boolean; preview?: boolean; message?: string } & T) | null
  if (!res.ok || !data?.ok) throw new StorefrontUnavailable(data?.message || 'Boutique indisponible, réessayez')
  return { ...data, preview: !!data.preview }
}

const seg = (s: string) => encodeURIComponent(String(s ?? '').toLowerCase().slice(0, 60))

export const loadStorePage = (slug: string) => load<Omit<StorePageData, 'preview'>>(`/s/${seg(slug)}`)
export const loadProductPage = (slug: string, productSlug: string) =>
  load<Omit<ProductPageData, 'preview'>>(`/s/${seg(slug)}/products/${seg(productSlug)}`)
