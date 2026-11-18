'use client'

import { useEffect } from 'react'

/** Registers the service worker that makes Sellio installable (production only). */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => { /* not critical */ })
  }, [])
  return null
}
