'use client'
// "Pages" of the management space: the store page (its link), the product pages that already exist
// (/products/<slug>, one per active product) and the site type.
// « Nouvelle landing page » stays disabled: the Sellio API has no table or endpoint for landing pages
// separate from the store (a store has one site_type; a product page is /products/<slug>). It is
// enabled once the API offers it, never simulated here.
import { ExternalLink, FilePlus2, Store as StoreIcon } from 'lucide-react'
import { SITE_TYPES, productUrl, storeUrl, type Product, type SiteType } from '@/lib/store-api'
import { tx } from '@/lib/i18n'
import { CopyButton, btn, card, choice, h2, label, muted } from './ui'

export default function PagesPanel({ slug, siteType, products, onSiteType }: {
  slug: string; siteType: SiteType; products: Product[]; onSiteType: (s: SiteType) => void
}) {
  const home = storeUrl(slug)
  const active = products.filter((p) => p.status === 'active')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <h2 style={h2}>{tx('Pages')}</h2>
        <p style={{ ...muted, marginBottom: 14 }}>{tx('Les pages que vos clients peuvent ouvrir.')}</p>

        <PageRow icon={<StoreIcon size={18} />} title={siteType === 'landing' ? tx('Landing page') : tx('Boutique')} hint={tx('Page principale')} url={home} />

        {siteType !== 'landing' && (
          <>
            <span style={{ ...label, marginTop: 16 }}>{tx('Pages produit')}</span>
            {active.length === 0
              ? <p style={{ ...muted, fontSize: 12 }}>{tx('Ajoutez des produits pour avoir leurs pages.')}</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {active.map((p) => <PageRow key={p.id} image={p.images?.[0]} title={p.name} url={productUrl(slug, p.slug)} />)}
                </div>}
          </>
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <button type="button" disabled style={btn('ghost', true)} aria-describedby="new-landing-hint"><FilePlus2 size={14} /> {tx('Nouvelle landing page')}</button>
          <p id="new-landing-hint" style={{ ...muted, fontSize: 12, marginTop: 6 }}>
            {tx('Bientôt disponible : une landing page à part, avec sa propre adresse. En attendant, choisissez « Les deux » ci-dessous : chaque produit a sa page.')}
          </p>
        </div>
      </div>

      <div style={card}>
        <h2 style={h2}>{tx('Type de site')}</h2>
        <p style={{ ...muted, marginBottom: 14 }}>{tx('Une landing page pour vendre un produit avec la pub, une boutique pour un catalogue, ou les deux.')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {SITE_TYPES.map((s) => (
            <button key={s.id} type="button" onClick={() => onSiteType(s.id)} style={choice(siteType === s.id)} aria-pressed={siteType === s.id}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{tx(s.label)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{tx(s.hint)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PageRow({ icon, image, title, hint, url }: { icon?: React.ReactNode; image?: string; title: string; hint?: string; url: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', flexWrap: 'wrap' }}>
      {image ? <img src={image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
        : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{title}{hint && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {hint}</span>}</div>
        <div dir="ltr" style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url.replace(/^https?:\/\//, '')}</div>
      </div>
      <a href={url} target="_blank" rel="noreferrer" style={{ ...btn('ghost'), textDecoration: 'none', padding: '8px 12px' }}><ExternalLink size={14} /> {tx('Ouvrir')}</a>
      <CopyButton text={url} />
    </div>
  )
}
