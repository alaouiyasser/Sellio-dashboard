import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductView from '@/components/storefront/ProductView'
import { fmtDh } from '@/lib/storefront'
import { loadProductPage, storeBasePath } from '@/lib/storefront-server'

type Params = Promise<{ slug: string; productSlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, productSlug } = await params
  const data = await loadProductPage(slug, productSlug).catch(() => null)
  if (!data) return { title: 'Produit introuvable', robots: { index: false } }
  const { product: p } = data
  const description = (p.description?.replace(/\s+/g, ' ').trim().slice(0, 160)) || `${fmtDh(p.price)} · Paiement à la livraison`
  return {
    title: p.name,
    description,
    openGraph: { title: p.name, description, images: p.images?.slice(0, 1), type: 'website' },
    robots: data.preview ? { index: false, follow: false } : undefined,
  }
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug, productSlug } = await params
  const data = await loadProductPage(slug, productSlug)
  if (!data) notFound()
  return <ProductView store={data.store} product={data.product} base={await storeBasePath(data.store.slug)} preview={data.preview} />
}
