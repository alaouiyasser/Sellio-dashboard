'use client'
import type { ReactNode } from 'react'
import { hasCart, showWhatsappButton, type PublicStore } from '@/lib/storefront'
import { FONTS_HREF } from '@/lib/store-api'
import { CartButton, CartDrawer, CartProvider } from './cart'
import { Header, PreviewBanner, StoreStyles, WhatsappFloat, lookOf } from './kit'

/** Frame of every store page: header (cart button on boutique / both), drawer, floating WhatsApp. */
export default function StoreShell({ store, base, preview, children }: { store: PublicStore; base: string; preview: boolean; children: ReactNode }) {
  const l = lookOf(store, base)
  const cart = hasCart(store)
  return (
    <CartProvider slug={store.slug} enabled={cart}>
      <link rel="stylesheet" href={FONTS_HREF} />
      <StoreStyles l={l} />
      <div className="sf-root" dir="ltr" lang="fr">
        {preview && <PreviewBanner />}
        <Header l={l} cart={cart ? <CartButton l={l} /> : undefined} />
        <main>{children}</main>
        {cart && <CartDrawer l={l} preview={preview} />}
        {showWhatsappButton(store) && <WhatsappFloat l={l} />}
      </div>
    </CartProvider>
  )
}
