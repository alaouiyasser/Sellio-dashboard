'use client'
// "Catégories": the merchant creates the categories BEFORE the products (a product is always
// saved in a category). Suggestions for the niche as chips: tick, rename, create in one click.
// « Autre » has no suggestion, only a short explanation.
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2, Plus } from 'lucide-react'
import { profileOf, storeApi, type Category, type SiteType, type StoreProfile } from '@/lib/store-api'
import { tx } from '@/lib/i18n'
import CategoriesEditor from './CategoriesEditor'
import { btn, h2, input, muted, card } from './ui'

export default function CategoriesStep({ profile, siteType, categories, onChange }: {
  profile: StoreProfile; siteType: SiteType; categories: Category[]; onChange: (c: Category[]) => void
}) {
  const preset = profileOf(profile)
  const existing = useMemo(() => new Set(categories.map((c) => c.name.trim().toLowerCase())), [categories])
  const suggestions = preset.categories.filter((n) => !existing.has(tx(n).trim().toLowerCase()))
  // Ticked suggestions, with the name the merchant typed (renaming a chip).
  const [picked, setPicked] = useState<Record<string, string>>(() => Object.fromEntries(suggestions.map((n) => [n, tx(n)])))
  const [busy, setBusy] = useState(false)
  const toCreate = suggestions.filter((n) => picked[n] !== undefined && picked[n].trim())

  async function createPicked() {
    if (!toCreate.length) return
    setBusy(true)
    try {
      for (const n of toCreate) {
        const name = picked[n].trim().slice(0, 60)
        if (!existing.has(name.toLowerCase())) await storeApi.createCategory(name)
      }
      onChange(await storeApi.categories())
      setPicked({})
      toast.success(tx('Catégories créées'))
    } catch (e) { toast.error((e as Error).message) }
    finally { setBusy(false) }
  }

  if (siteType === 'landing') {
    return (
      <div style={card}>
        <h2 style={h2}>{tx('Catégories')}</h2>
        <p style={muted}>{tx('Une landing page présente un seul produit : pas besoin de catégories. Passez à l’étape suivante.')}</p>
      </div>
    )
  }

  return (
    <div style={card}>
      <h2 style={h2}>{tx('Catégories')}</h2>
      <p style={{ ...muted, marginBottom: 14 }}>
        {tx('Créez d’abord les rayons de votre boutique. Ensuite, vous ajouterez chaque produit dans une catégorie.')}
      </p>

      {suggestions.length > 0 ? (
        <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: 16 }}>
          <strong style={{ fontSize: 13, color: 'var(--text)' }}>{tx('Suggérées pour « {0} »', [tx(preset.label)])}</strong>
          <p style={{ ...muted, fontSize: 12, margin: '2px 0 10px' }}>{tx('Cochez celles que vous voulez, renommez-les si besoin.')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map((n) => {
              const on = picked[n] !== undefined
              return (
                <span key={n} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 4px', borderRadius: 999,
                  border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--brand) 8%, transparent)' : 'transparent',
                }}>
                  <button type="button" aria-pressed={on} aria-label={on ? tx('Décocher') : tx('Cocher')}
                    onClick={() => setPicked((p) => { const o = { ...p }; if (on) delete o[n]; else o[n] = tx(n); return o })}
                    style={{ width: 22, height: 22, borderRadius: 999, border: on ? 'none' : '1px solid var(--border)', background: on ? 'var(--brand)' : 'transparent', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                    {on && <Check size={13} />}
                  </button>
                  <input value={on ? picked[n] : tx(n)} disabled={!on} maxLength={60} aria-label={tx('Nom de la catégorie')}
                    onChange={(e) => setPicked((p) => ({ ...p, [n]: e.target.value }))}
                    style={{ ...input, width: Math.max(80, (on ? picked[n] : tx(n)).length * 8 + 24), padding: '4px 8px', fontSize: 13, borderRadius: 999, opacity: on ? 1 : 0.6 }} />
                </span>
              )
            })}
          </div>
          <button type="button" onClick={createPicked} disabled={busy || !toCreate.length} style={{ ...btn('primary', busy || !toCreate.length), marginTop: 12 }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {tx('Créer les catégories cochées ({0})', [toCreate.length])}
          </button>
        </div>
      ) : categories.length === 0 && (
        <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: 16 }}>
          <p style={{ ...muted, fontSize: 13 }}>
            {tx('Une catégorie, c’est un rayon de votre boutique : par exemple « Sacs », « Chaussures » ou « Promos ». Le client les voit en haut de la boutique et retrouve vite ce qu’il cherche. Créez-en au moins une ci-dessous.')}
          </p>
        </div>
      )}

      <strong style={{ fontSize: 14, color: 'var(--text)' }}>{tx('Vos catégories')}</strong>
      <div style={{ marginTop: 8 }}><CategoriesEditor categories={categories} onChange={onChange} /></div>
      {categories.length === 0 && <p style={{ ...muted, fontSize: 12, marginTop: 8, color: 'var(--warning)' }}>{tx('Créez au moins une catégorie pour ajouter vos produits.')}</p>}
    </div>
  )
}
