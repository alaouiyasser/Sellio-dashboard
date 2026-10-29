'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, ExternalLink } from 'lucide-react'
import { startYouCanConnect, startShopifyConnect, wooAuthorizeUrl, type IntegrationItem, type StoreReturnTo } from '@/lib/integrations-api'

import { tx } from '@/lib/i18n'
const btn: React.CSSProperties = {
  width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: 12, borderRadius: 10, border: 'none', background: 'var(--brand)', color: '#fff',
  fontSize: 14, fontWeight: 650, cursor: 'pointer',
}
const input: React.CSSProperties = {
  width: '100%', padding: '11px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12,
}
const note: React.CSSProperties = { display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px' }

/**
 * One-click store connection: the seller approves Sellio on their own store
 * (YouCan OAuth, WooCommerce "Approve") and comes back connected. No token or
 * key to copy; Sellio sets up the order webhook itself.
 */
export default function StoreOneClick({ item, tenantId, returnTo, onManual }: {
  item: IntegrationItem
  tenantId: string
  returnTo: StoreReturnTo
  onManual?: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [storeUrl, setStoreUrl] = useState('')

  async function go() {
    setBusy(true)
    try {
      const url = item.oneClick === 'youcan-oauth'
        ? await startYouCanConnect(tenantId, returnTo)
        : item.oneClick === 'shopify-oauth'
          ? await startShopifyConnect(tenantId, storeUrl.trim(), returnTo)
          : await wooAuthorizeUrl(tenantId, storeUrl.trim(), returnTo)
      window.location.href = url
    } catch (e: any) {
      toast.error(e?.message || 'Connexion impossible')
      setBusy(false)
    }
  }

  const youcan = item.oneClick === 'youcan-oauth'
  const shopify = item.oneClick === 'shopify-oauth'
  return (
    <div>
      <p style={note}>
        <ShieldCheck size={16} strokeWidth={2.2} color="var(--success)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          {youcan
            ? tx("Vous allez sur YouCan pour autoriser Sellio à lire vos commandes, puis vous revenez ici. Aucun token à copier : les nouvelles commandes arrivent automatiquement.")
            : shopify
              ? tx("Indiquez l’adresse xxx.myshopify.com de votre boutique (Shopify → Paramètres → Domaines). Vous installez Sellio sur Shopify, puis vous revenez ici. Aucun token à copier.")
              : tx("Vous allez sur votre site pour cliquer « Approuver ». WooCommerce crée les clés pour Sellio et les commandes arrivent automatiquement. Aucune clé à copier.")}
        </span>
      </p>

      {!youcan && (
        <input value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder={shopify ? 'ma-boutique.myshopify.com' : 'https://ma-boutique.ma'}
          inputMode="url" autoComplete="url" style={input} />
      )}

      <button onClick={go} disabled={busy || (!youcan && !storeUrl.trim())} style={{ ...btn, opacity: busy || (!youcan && !storeUrl.trim()) ? 0.6 : 1 }}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <><ExternalLink size={15} /> {youcan ? tx("Connecter ma boutique YouCan") : shopify ? tx("Connecter ma boutique Shopify") : tx("Autoriser Sellio sur WooCommerce")}</>}
      </button>

      {onManual && (
        <button type="button" onClick={onManual} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
          {tx("Saisir les clés manuellement")}
        </button>
      )}
    </div>
  )
}
