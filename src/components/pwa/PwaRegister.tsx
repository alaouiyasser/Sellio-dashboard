'use client'

import { useEffect } from 'react'
import { storeSlugFromHost } from '@/lib/storefront-host'

/** Registers the service worker that makes Sellio installable (production only). */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    // Public stores are not the Sellio app: no service worker, no offline « Sellio » page for buyers.
    if (storeSlugFromHost(location.host) || location.pathname.startsWith('/storefront')) return
    navigator.serviceWorker.register('/sw.js').catch(() => { /* not critical */ })
  }, [])
  return null
}
