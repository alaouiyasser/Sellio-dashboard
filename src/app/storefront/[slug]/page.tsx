import { notFound } from 'next/navigation'
import StoreHome from '@/components/storefront/StoreHome'
import { loadStorePage, storeBasePath } from '@/lib/storefront-server'

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await loadStorePage(slug)
  if (!data) notFound()
  return <StoreHome data={data} base={await storeBasePath(data.store.slug)} />
}
