'use client'
// Home page of a store. Boutique / both: hero, catalogue sections, then the generic ones, in the
// order of homeBlocks(). Landing: the first product's landing page (as in the wizard preview).
import { useMemo, useState, type CSSProperties } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import {
  applyFilters, byMerchantOrder, enabledFilters, facetsFor, featuredProducts, homeBlocks, newArrivals, siteTypeOf, topCategories,
  type FilterState, type PageBlock, type StorePageData,
} from '@/lib/storefront'
import { swatchOf } from '@/lib/store-api'
import {
  Banners, Benefits, Block, CategoryTiles, Delivery, Faq, Footer, Hero, HowItWorks, HowToUse, ProductCard, ProductRow,
  SizeGuide, Trust, ghostBtnStyle, lookOf, type Look,
} from './kit'
import ProductView from './ProductView'

export default function StoreHome({ data, base }: { data: StorePageData; base: string }) {
  const { store, products, preview } = data
  const l = lookOf(store, base)
  if (siteTypeOf(store) === 'landing') {
    const first = byMerchantOrder(products)[0]
    if (!first) return <Empty l={l} text="Le produit de cette page arrive bientôt." />
    return <ProductView store={store} product={first} base={base} preview={preview} />
  }
  return <BoutiqueHome data={data} l={l} />
}

function Empty({ l, text }: { l: Look; text: string }) {
  return <Block l={l}><div style={{ textAlign: 'center', padding: 40, opacity: 0.7, border: `1px dashed ${l.c.text}44`, borderRadius: l.t.radius }}>{text}</div></Block>
}

function BoutiqueHome({ data, l }: { data: StorePageData; l: Look }) {
  const { store, categories, products } = data
  const [f, setF] = useState<FilterState>({})
  const blocks = homeBlocks(store)
  const ordered = useMemo(() => byMerchantOrder(products), [products])
  const tops = useMemo(() => topCategories(categories), [categories])
  const filters = useMemo(() => enabledFilters(store), [store])
  const facets = useMemo(() => facetsFor(filters, products, categories), [filters, products, categories])
  const vehicleFacets = useMemo(() => facetsFor(['filter_vehicle'], products, categories).vehicle, [products, categories])
  const shown = useMemo(() => applyFilters(ordered, categories, f), [ordered, categories, f])
  const featured = useMemo(() => featuredProducts(ordered), [ordered])
  const fresh = useMemo(() => newArrivals(products), [products])
  const heroImage = ordered.find((p) => p.images?.[0])?.images[0] ?? store.logo_url

  const pickCategory = (id: string | null) => {
    setF((x) => ({ ...x, categoryId: id }))
    document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const render = (b: PageBlock) => {
    switch (b) {
      case 'hero': return <Hero key={b} l={l} image={heroImage} />
      case 'vehicle_search': return vehicleFacets ? <VehicleSearch key={b} l={l} facets={vehicleFacets} f={f} setF={setF} /> : null
      case 'categories': return <CategoryTiles key={b} l={l} categories={tops} selected={f.categoryId ?? null} onSelect={pickCategory} />
      case 'featured': return <ProductRow key={b} l={l} id="selection" title="Notre sélection" products={featured} />
      case 'new_arrivals': return <ProductRow key={b} l={l} id="nouveautes" title="Nouveautés" products={fresh} />
      case 'catalog': return <Catalog key={b} l={l} data={data} f={f} setF={setF} facets={facets} shown={shown} tops={tops} />
      case 'banners': return <Banners key={b} l={l} categories={tops} onSelect={pickCategory} />
      case 'benefits': return <Benefits key={b} l={l} />
      case 'how_it_works': return <HowItWorks key={b} l={l} />
      case 'size_guide': return <SizeGuide key={b} l={l} />
      case 'how_to_use': return <HowToUse key={b} l={l} />
      case 'delivery': return <Delivery key={b} l={l} />
      case 'trust': return <Trust key={b} l={l} />
      case 'faq': return <Faq key={b} l={l} />
      case 'footer': return <Footer key={b} l={l} />
      default: return null
    }
  }
  return <>{blocks.map(render)}</>
}

// ─── Catalogue (filters + grid) ──────────────────────────────────────────────

type SetF = React.Dispatch<React.SetStateAction<FilterState>>

function Catalog({ l, data, f, setF, facets, shown, tops }: {
  l: Look; data: StorePageData; f: FilterState; setF: SetF; facets: ReturnType<typeof facetsFor>; shown: StorePageData['products']; tops: StorePageData['categories']
}) {
  const [open, setOpen] = useState(false)
  const active = Object.entries(f).filter(([k, v]) => k !== 'categoryId' && v !== null && v !== undefined && v !== '').length
  const hasFacets = Object.keys(facets).length > 0
  const chip = (selected: boolean): CSSProperties => ({
    fontSize: 13, padding: '7px 12px', borderRadius: l.theme === 'elegance' ? 0 : 999, cursor: 'pointer', font: 'inherit',
    border: `1.5px solid ${selected ? l.c.primary : `${l.c.text}33`}`, background: selected ? l.c.primary : 'transparent',
    color: selected ? l.c.background : l.c.text, display: 'inline-flex', alignItems: 'center', gap: 6,
  })
  const chips = (label: string, values: string[] | undefined, key: 'size' | 'color' | 'gender' | 'family' | 'brand') => values && (
    <fieldset style={{ border: 'none', padding: 0, margin: '0 0 14px' }}>
      <legend style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{label}</legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {values.map((v) => {
          const sw = key === 'color' ? swatchOf(v) : null
          return (
            <button key={v} type="button" aria-pressed={f[key] === v} style={chip(f[key] === v)} onClick={() => setF((x) => ({ ...x, [key]: x[key] === v ? null : v }))}>
              {sw && <span aria-hidden style={{ width: 14, height: 14, borderRadius: 999, background: sw, border: '1px solid #0002' }} />}{v}
            </button>
          )
        })}
      </div>
    </fieldset>
  )

  return (
    <Block l={l} id="catalogue" title="Nos produits">
      {(tops.length > 0 || hasFacets) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18, alignItems: 'center' }}>
          {tops.length > 0 && <button type="button" style={chip(!f.categoryId)} onClick={() => setF((x) => ({ ...x, categoryId: null }))}>Tout</button>}
          {tops.map((c) => <button key={c.id} type="button" style={chip(f.categoryId === c.id)} aria-pressed={f.categoryId === c.id} onClick={() => setF((x) => ({ ...x, categoryId: x.categoryId === c.id ? null : c.id }))}>{c.name}</button>)}
          {hasFacets && (
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ ...ghostBtnStyle(l, { padding: '7px 14px', fontSize: 13 }), marginInlineStart: 'auto' }}>
              <SlidersHorizontal size={15} /> Filtres{active ? ` (${active})` : ''}
            </button>
          )}
        </div>
      )}
      {open && hasFacets && (
        <div style={{ padding: 18, borderRadius: l.t.radius, background: l.c.secondary, marginBottom: 20 }}>
          {facets.price && (
            <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
              Prix maximum : {Math.round(f.priceMax ?? facets.price.max)} DH
              <input type="range" min={facets.price.min} max={facets.price.max} step={1} value={f.priceMax ?? facets.price.max}
                onChange={(e) => setF((x) => ({ ...x, priceMax: Number(e.target.value) >= facets.price!.max ? null : Number(e.target.value) }))}
                style={{ accentColor: l.c.primary }} />
            </label>
          )}
          {chips('Taille / pointure', facets.size, 'size')}
          {chips('Couleur', facets.color, 'color')}
          {chips('Homme / femme', facets.gender, 'gender')}
          {chips('Famille olfactive', facets.family, 'family')}
          {chips('Marque', facets.brand, 'brand')}
          {facets.vehicle && <VehicleSelects l={l} facets={facets.vehicle} f={f} setF={setF} />}
          {active > 0 && <button type="button" onClick={() => setF({})} style={ghostBtnStyle(l, { padding: '7px 14px', fontSize: 13 })}><X size={14} /> Effacer les filtres</button>}
        </div>
      )}
      {shown.length > 0 ? (
        <div className="sf-grid">{shown.map((p) => <ProductCard key={p.id} l={l} p={p} />)}</div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.7, border: `1px dashed ${l.c.text}44`, borderRadius: l.t.radius }}>
          {data.products.length ? 'Aucun produit ne correspond à ces filtres.' : 'Les produits arrivent bientôt.'}
        </div>
      )}
    </Block>
  )
}

// ─── Vehicle search (auto parts) ─────────────────────────────────────────────

type VehicleFacets = NonNullable<ReturnType<typeof facetsFor>['vehicle']>

function VehicleSelects({ l, facets, f, setF }: { l: Look; facets: VehicleFacets; f: FilterState; setF: SetF }) {
  const models = f.make ? facets.models[f.make] ?? [] : []
  const sel: CSSProperties = { padding: '12px 10px', font: 'inherit', fontSize: 15, borderRadius: Math.max(l.t.radius, 4), border: `1.5px solid ${l.c.text}33`, background: l.c.background, color: l.c.text, width: '100%' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
      <select aria-label="Marque" style={sel} value={f.make ?? ''} onChange={(e) => setF((x) => ({ ...x, make: e.target.value || null, model: null }))}>
        <option value="">Marque</option>{facets.makes.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select aria-label="Modèle" style={sel} value={f.model ?? ''} disabled={!f.make} onChange={(e) => setF((x) => ({ ...x, model: e.target.value || null }))}>
        <option value="">Modèle</option>{models.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select aria-label="Année" style={sel} value={f.year ?? ''} disabled={!facets.years.length} onChange={(e) => setF((x) => ({ ...x, year: e.target.value ? Number(e.target.value) : null }))}>
        <option value="">Année</option>{facets.years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

function VehicleSearch({ l, facets, f, setF }: { l: Look; facets: VehicleFacets; f: FilterState; setF: SetF }) {
  return (
    <Block l={l} id="vehicule">
      <div style={{ padding: 20, borderRadius: l.t.radius, background: l.c.secondary }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Trouvez la pièce de votre voiture</div>
        <VehicleSelects l={l} facets={facets} f={f} setF={setF} />
        {(f.make || f.model || f.year) && (
          <a href="#catalogue" style={{ display: 'inline-block', marginTop: 12, color: l.c.primary, fontWeight: 700 }}>Voir les pièces compatibles</a>
        )}
      </div>
    </Block>
  )
}
