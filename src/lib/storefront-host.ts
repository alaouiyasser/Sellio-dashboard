// Public stores are served at <slug>.<STORE_ROOT_DOMAIN> (Vercel wildcard domain on this project).
// Pure: used by src/proxy.ts (rewrite to /storefront/<slug>) and by the client (PWA, links).
//
// The bare root domain, www, *.vercel.app and plain localhost keep serving the dashboard.
// Sub-domains the API refuses as store slugs (RESERVED_SLUGS in
// sellio/apps/api/src/modules/store-builder/store-builder.ts) can never be a store either, so they
// keep the dashboard too (e.g. app.<root> if it is ever attached).

export const STORE_ROOT_DOMAIN = (process.env.NEXT_PUBLIC_STORE_ROOT_DOMAIN || 'sellioagency.store').trim().toLowerCase()

/** Set by the proxy on the rewrite: the store pages' links then have no /storefront/<slug> prefix. */
export const STORE_HOST_HEADER = 'x-sellio-store-host'

/** Same list as RESERVED_SLUGS in the API. */
export const RESERVED_SUBDOMAINS = new Set([
  'admin', 'api', 'app', 'www', 'sellio', 'support', 'help', 'login', 'signup', 'dashboard', 'store', 'stores',
  'shop', 'checkout', 'cart', 'order', 'orders', 'track', 'tracking', 'legal', 'static', 'assets', 'cdn', 'webhook',
])

/** Same rule as isValidSlug in the API (minus the reserved list, checked separately). */
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

/**
 * "parfums-dar.sellioagency.store" → "parfums-dar". Anything else (root domain, www, reserved,
 * nested sub-domains, vercel.app, localhost, IPs) → null = dashboard as today.
 * "<slug>.localhost" is accepted too, for local testing.
 */
export function storeSlugFromHost(host: string | null | undefined, root: string = STORE_ROOT_DOMAIN): string | null {
  const h = String(host ?? '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '')
  if (!h) return null
  const suffix = h.endsWith(`.${root}`) ? `.${root}` : h.endsWith('.localhost') ? '.localhost' : null
  if (!suffix) return null
  const label = h.slice(0, -suffix.length)
  if (!label || label.includes('.')) return null
  if (RESERVED_SUBDOMAINS.has(label) || !SLUG_RE.test(label) || label.includes('--')) return null
  return label
}
