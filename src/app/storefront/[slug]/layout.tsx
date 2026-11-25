// Public store: <slug>.sellioagency.store (src/proxy.ts rewrites to /storefront/<slug>), or
// /storefront/<slug> on the dashboard host (the merchant's preview). Outside the (dashboard) group:
// no auth, no app shell.
import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import StoreShell from '@/components/storefront/StoreShell'
import { colorsOf } from '@/lib/storefront'
import { loadStorePage, storeBasePath } from '@/lib/storefront-server'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const data = await loadStorePage(slug).catch(() => null)
  if (!data) return { title: 'Boutique introuvable', robots: { index: false }, manifest: null, appleWebApp: null }
  const { store } = data
  const description = [store.city, 'Paiement à la livraison'].filter(Boolean).join(' · ')
  return {
    title: { default: store.name, template: `%s — ${store.name}` },
    description,
    // Not the dashboard's PWA: no manifest, no « Sellio » home-screen app.
    manifest: null, appleWebApp: null,
    icons: store.logo_url ? { icon: store.logo_url, apple: store.logo_url } : undefined,
    openGraph: { title: store.name, description, siteName: store.name, images: store.logo_url ? [store.logo_url] : undefined, type: 'website' },
    robots: data.preview ? { index: false, follow: false } : undefined,
  }
}

export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  const { slug } = await params
  const data = await loadStorePage(slug).catch(() => null)
  return { themeColor: data ? colorsOf(data.store).primary : '#ffffff' }
}

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { slug } = await params
  const data = await loadStorePage(slug)
  if (!data) notFound()
  return <StoreShell store={data.store} base={await storeBasePath(data.store.slug)} preview={data.preview}>{children}</StoreShell>
}
