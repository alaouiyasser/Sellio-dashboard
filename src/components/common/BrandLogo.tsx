'use client'

// Carrier and store-platform logos (public/carriers/<id>.png, public/platforms/<id>.png) on a white
// tile with a 1px border (docs/REDESIGN.md §1). Unknown brands get a neutral lucide icon, never an emoji.

import { useState } from 'react'
import { Plug, Store, Truck, type LucideIcon } from 'lucide-react'

const CARRIERS = ['sendit', 'ozon', 'ameex', 'coliix', 'aramex', 'forcelog', 'tawsilex', 'quicklivraison', 'olivraison', 'chronodiali', 'speedaf']
const PLATFORMS = ['youcan', 'shopify', 'woocommerce']

const norm = (s: string | null | undefined) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** Local logo path for a carrier or platform id/slug/name, or null when there is none. */
export function brandLogoSrc(id: string | null | undefined): string | null {
  const k = norm(id)
  if (!k) return null
  const carrier = CARRIERS.find((c) => k === c || k.startsWith(c))
  if (carrier) return `/carriers/${carrier}.png`
  const platform = PLATFORMS.find((p) => k === p || k.startsWith(p))
  return platform ? `/platforms/${platform}.png` : null
}

export default function BrandLogo({ id, name, kind, size = 24, fallbackSrc }: {
  /** Slug, provider id or name ("sendit", "Shopify"…). */
  id: string | null | undefined
  name?: string
  kind?: 'carrier' | 'ecommerce' | 'other'
  size?: number
  /** Remote logo to try when there is no local one (only http(s) or / paths are used). */
  fallbackSrc?: string | null
}) {
  const [broken, setBroken] = useState(false)
  const remote = fallbackSrc && /^(https?:\/\/|\/)/.test(fallbackSrc) ? fallbackSrc : null
  const src = brandLogoSrc(id) ?? brandLogoSrc(name) ?? remote
  const tile: React.CSSProperties = {
    width: size, height: size, borderRadius: Math.max(6, Math.round(size * 0.24)), flexShrink: 0,
    background: '#FFFFFF', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', overflow: 'hidden',
  }
  if (!src || broken) {
    const Icon: LucideIcon = kind === 'carrier' ? Truck : kind === 'ecommerce' ? Store : Plug
    return <span style={{ ...tile, background: 'var(--separator)' }} aria-hidden><Icon size={Math.round(size * 0.55)} strokeWidth={1.8} color="var(--text-muted)" /></span>
  }
  return (
    <span style={tile}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name ?? ''} onError={() => setBroken(true)} style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
    </span>
  )
}
