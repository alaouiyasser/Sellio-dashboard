'use client'
// "Catégories" in 3 short screens (a product is always saved in a category, so this comes first):
//   1 « Choisissez un modèle »  ready-made structures for the niche, shown as small trees (one click)
//   2 « Vos rayons »            one card per main category, its sub-categories inside
//   3 « Aperçu du menu »        the shop menu as customers will see it, then « Continuer vers les produits »
// Suggestions come in ONE language (the dashboard's, through tx()). Existing categories are never
// changed by a model: only the missing names are added, and screen 1 is skipped when there are some.
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Loader2, Menu, PencilLine } from 'lucide-react'
import { profileOf, storeApi, type Category, type SiteType, type StoreProfile } from '@/lib/store-api'
import { normName, TREE_TEMPLATES, type TplNode } from '@/lib/store-templates'
import { tx } from '@/lib/i18n'
import CategoriesEditor from './CategoriesEditor'
import { btn, card, h2, muted } from './ui'

export default function CategoriesStep({ profile, siteType, categories, onChange, onContinue }: {
  profile: StoreProfile; siteType: SiteType; categories: Category[]; onChange: (c: Category[]) => void; onContinue: () => void
}) {
  const preset = profileOf(profile)
  const models = modelsFor(profile)
  const [screen, setScreen] = useState<1 | 2 | 3>(() => (categories.length === 0 && models.length > 0 ? 1 : 2))
  const [busy, setBusy] = useState<string | null>(null)

  async function apply(id: string, tree: TplNode[]) {
    setBusy(id)
    try {
      // Add what is missing, level by level; what exists already is left untouched.
      let all = categories
      for (const node of tree) {
        const name = tx(node.name)
        let top = all.find((c) => !c.parent_id && normName(c.name) === normName(name))
        if (!top) { top = await storeApi.createCategory(name); all = [...all, top] }
        for (const k of node.kids ?? []) {
          const kn = tx(k)
          if (!all.some((c) => c.parent_id === top!.id && normName(c.name) === normName(kn))) all = [...all, await storeApi.createCategory(kn, top.id)]
        }
      }
      onChange(await storeApi.categories())
      setScreen(2)
    } catch (e) {
      toast.error((e as Error).message)
      storeApi.categories().then(onChange).catch(() => {})
    } finally { setBusy(null) }
  }

  if (siteType === 'landing') {
    return (
      <div style={card}>
        <h2 style={h2}>{tx('Catégories')}</h2>
        <p style={muted}>{tx('Une landing page présente un seul produit : pas besoin de catégories. Passez à l’étape suivante.')}</p>
      </div>
    )
  }

  if (screen === 1) {
    return (
      <div style={card}>
        <h2 style={h2}>{tx('Choisissez un modèle')}</h2>
        <p style={{ ...muted, marginBottom: 14 }}>{tx('Un modèle prépare les rayons de votre boutique « {0} » en un clic. Vous pourrez tout changer ensuite.', [tx(preset.label)])}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {models.map((m, i) => (
            <button key={m.id} type="button" disabled={!!busy} onClick={() => apply(m.id, m.tree)}
              style={{ textAlign: 'start', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: busy ? 'wait' : 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, fontSize: 13 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12 }}>{'ABC'[i]}</span>
                {busy === m.id && <Loader2 size={14} className="animate-spin" />}
              </div>
              <MiniTree tree={m.tree} />
            </button>
          ))}
          <button type="button" disabled={!!busy} onClick={() => setScreen(2)}
            style={{ textAlign: 'start', padding: 14, borderRadius: 12, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--border)', color: 'var(--text)', display: 'grid', placeItems: 'center', fontSize: 12 }}>{'ABC'[models.length]}</span>
              <PencilLine size={15} /> {tx('Je fais moi-même')}
            </div>
            <p style={{ ...muted, fontSize: 12, marginTop: 8 }}>{tx('Vous partez de zéro et créez vos rayons un par un.')}</p>
          </button>
        </div>
      </div>
    )
  }

  const tops = categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position)

  if (screen === 2) {
    return (
      <div style={card}>
        <h2 style={h2}>{tx('Vos rayons')}</h2>
        <p style={{ ...muted, marginBottom: 14 }}>{tx('Un rayon est une catégorie principale de votre boutique, avec ses sous-catégories dedans.')}</p>
        <CategoriesEditor categories={categories} onChange={onChange} />
        {tops.length === 0 && <p style={{ ...muted, fontSize: 12, marginTop: 10, color: 'var(--warning)' }}>{tx('Créez au moins un rayon pour ajouter vos produits.')}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {models.length > 0 && categories.length === 0
            ? <button type="button" onClick={() => setScreen(1)} style={btn('ghost')}><ArrowLeft size={14} /> {tx('Choisir un modèle')}</button>
            : <span />}
          <button type="button" disabled={tops.length === 0} onClick={() => setScreen(3)} style={btn('primary', tops.length === 0)}>
            {tx('Voir l’aperçu du menu')} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={card}>
      <h2 style={h2}>{tx('Aperçu du menu')}</h2>
      <p style={{ ...muted, marginBottom: 14 }}>{tx('Voici le menu de votre boutique tel que vos clients le verront.')}</p>
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: '#fff', color: '#111', overflow: 'hidden', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 13 }}>
          <Menu size={16} /> {tx('Menu')}
        </div>
        {tops.map((t) => (
          <div key={t.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
            {categories.filter((c) => c.parent_id === t.id).sort((a, b) => a.position - b.position).map((k) => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#4b5563', marginTop: 5, paddingInlineStart: 8 }}>
                <ChevronRight size={12} /> {k.name}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setScreen(2)} style={btn('ghost')}><ArrowLeft size={14} /> {tx('Modifier mes rayons')}</button>
        <button type="button" onClick={onContinue} style={btn('primary')}><Check size={14} /> {tx('Continuer vers les produits')}</button>
      </div>
    </div>
  )
}

/** A (tree, when the niche has one) and B (the flat list), in the dashboard language. */
function modelsFor(profile: StoreProfile): { id: string; tree: TplNode[] }[] {
  const flat = profileOf(profile).categories
  const tree = TREE_TEMPLATES[profile]
  const out: { id: string; tree: TplNode[] }[] = []
  if (tree) out.push({ id: 'a', tree })
  if (flat.length) out.push({ id: 'b', tree: flat.map((name) => ({ name })) })
  return out
}

/** Small tree: main category in bold, its sub-categories after "›". */
function MiniTree({ tree }: { tree: TplNode[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, lineHeight: 1.35 }}>
      {tree.map((n) => (
        <div key={n.name}>
          <strong>{tx(n.name)}</strong>
          {n.kids && n.kids.length > 0 && <span style={{ color: 'var(--text-muted)' }}> › {n.kids.map((k) => tx(k)).join(', ')}</span>}
        </div>
      ))}
    </div>
  )
}
