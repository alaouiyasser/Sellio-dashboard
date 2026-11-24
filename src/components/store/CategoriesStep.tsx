'use client'
// "Catégories", edited directly on the phone preview (a product is always saved in a category):
//   - the « Vos catégories » row of the phone: one tile per main category, a + tile to add one;
//   - no category yet → the niche examples show faded, « Utiliser ces catégories » creates them;
//   - a tile clicked → a panel next to the phone: rename, photo, sub-categories, add a product, delete.
// Examples come in ONE language (the dashboard's, through tx()). Applying them only adds the
// missing names: what exists already is left untouched. Two levels at most.
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2, MousePointerClick, Pencil, Plus, Trash2, X } from 'lucide-react'
import { profileOf, storeApi, type Category, type Product, type SiteType, type StoreProfile } from '@/lib/store-api'
import { normName, TREE_TEMPLATES, type TplNode } from '@/lib/store-templates'
import { tx } from '@/lib/i18n'
import { useIsMobile } from '@/hooks/useIsMobile'
import PhonePreview, { type PreviewData } from './PhonePreview'
import { btn, card, h2, input, label, muted } from './ui'

const byPos = (a: Category, b: Category) => a.position - b.position

/** The niche examples: its tree when it has one, else its flat list. */
export function examplesFor(profile: StoreProfile): TplNode[] {
  return TREE_TEMPLATES[profile] ?? profileOf(profile).categories.map((name) => ({ name }))
}

export default function CategoriesStep({ profile, siteType, categories, onChange, preview, products, onAddProduct }: {
  profile: StoreProfile; siteType: SiteType; categories: Category[]; onChange: (c: Category[]) => void
  /** What the phone shows around the categories row. */
  preview: PreviewData; products: Product[]
  /** « Ajouter un produit » of the panel: opens the product editor in that category. */
  onAddProduct: (categoryId: string) => void
}) {
  const isMobile = useIsMobile()
  const examples = examplesFor(profile)
  const [selected, setSelected] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  const tops = categories.filter((c) => !c.parent_id).sort(byPos)
  const current = categories.find((c) => c.id === selected && !c.parent_id) ?? null

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    try { await fn(); return true }
    catch (e) { toast.error((e as Error).message); storeApi.categories().then(onChange).catch(() => {}); return false }
    finally { setBusy(false) }
  }

  /** Add the missing examples, level by level; what exists already is left untouched. */
  const applyExamples = () => run(async () => {
    let all = categories
    for (const node of examples) {
      const name = tx(node.name)
      let top = all.find((c) => !c.parent_id && normName(c.name) === normName(name))
      if (!top) { top = await storeApi.createCategory(name); all = [...all, top] }
      for (const k of node.kids ?? []) {
        const kn = tx(k)
        if (!all.some((c) => c.parent_id === top!.id && normName(c.name) === normName(kn))) all = [...all, await storeApi.createCategory(kn, top.id)]
      }
    }
    onChange(await storeApi.categories())
    setAdding(false)
  })

  if (siteType === 'landing') {
    return (
      <div style={card}>
        <h2 style={h2}>{tx('Catégories')}</h2>
        <p style={muted}>{tx('Une landing page présente un seul produit : pas besoin de catégories. Passez à l’étape suivante.')}</p>
      </div>
    )
  }

  const phone = (
    <PhonePreview d={{ ...preview, sections: { ...preview.sections, categories: true } }} products={products} categories={categories} edit={{
      selectedId: current?.id ?? null, adding, busy,
      examples: examples.map((n) => tx(n.name)),
      onSelect: (id) => { setAdding(false); setSelected(id) },
      onAdd: () => { setSelected(null); setAdding(true) },
      onUseExamples: applyExamples,
    }} />
  )

  return (
    <div style={card}>
      <h2 style={h2}>{tx('Catégories')}</h2>
      <p style={{ ...muted, marginBottom: 14 }}>{tx('Modifiez vos catégories directement sur l’aperçu : touchez une catégorie pour la modifier, ou + pour en ajouter une.')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        {phone}
        <div style={{ minWidth: 0 }}>
          {adding ? (
            <NewCategory categories={categories} busy={busy} run={run} onDone={(c) => { setAdding(false); if (c) setSelected(c.id) }} onChange={onChange} />
          ) : current ? (
            <CategoryPanel key={current.id} cat={current} categories={categories} products={products} busy={busy} run={run} onChange={onChange}
              onClose={() => setSelected(null)} onAddProduct={() => onAddProduct(current.id)} />
          ) : (
            <div style={{ ...card, padding: 16, background: 'var(--bg)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MousePointerClick size={18} style={{ flexShrink: 0, color: 'var(--brand)', marginTop: 1 }} aria-hidden />
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                  {tops.length === 0
                    ? (examples.length > 0
                      ? tx('Les catégories en pointillés sont des exemples pour votre niche. Cliquez « Utiliser ces catégories » sur l’aperçu, ou + pour créer les vôtres.')
                      : tx('Cliquez + sur l’aperçu pour créer votre première catégorie (ex : Homme, Femme, Accessoires).'))
                    : tx('Touchez une catégorie sur l’aperçu pour la renommer, lui mettre une photo, gérer ses sous-catégories ou y ajouter un produit.')}
                </div>
              </div>
            </div>
          )}
          {tops.length === 0 && <p style={{ ...muted, fontSize: 12, marginTop: 10, color: 'var(--warning)' }}>{tx('Créez au moins une catégorie pour ajouter vos produits.')}</p>}
        </div>
      </div>
    </div>
  )
}

type Run = (fn: () => Promise<void>) => Promise<boolean>

/** Same level (same parent), same name once case and accents are ignored → refused. */
function taken(categories: Category[], name: string, parentId: string | null, exceptId?: string) {
  const n = normName(name)
  return categories.some((c) => (c.parent_id ?? null) === parentId && c.id !== exceptId && normName(c.name) === n)
}

function NewCategory({ categories, busy, run, onDone, onChange }: {
  categories: Category[]; busy: boolean; run: Run; onDone: (c: Category | null) => void; onChange: (c: Category[]) => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  async function submit() {
    const n = name.trim().slice(0, 60)
    if (!n) return
    if (taken(categories, n, null)) { setError(tx('« {0} » existe déjà', [n])); return }
    let created: Category | null = null
    const ok = await run(async () => { created = await storeApi.createCategory(n); onChange(await storeApi.categories()) })
    if (ok) onDone(created)
  }
  return (
    <div style={{ ...card, padding: 16 }}>
      <PanelHead title={tx('Nouvelle catégorie')} onClose={() => onDone(null)} />
      <span style={label}>{tx('Nom de la catégorie')}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input autoFocus value={name} maxLength={60} placeholder={tx('Ex : Homme')} style={input}
          onChange={(e) => { setName(e.target.value); setError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onDone(null) }} />
        <button type="button" onClick={submit} disabled={busy || !name.trim()} style={btn('primary', busy || !name.trim())}>
          {busy && <Loader2 size={14} className="animate-spin" />} {tx('Ajouter')}
        </button>
      </div>
      {error && <p role="alert" style={errStyle}>{error}</p>}
    </div>
  )
}

function CategoryPanel({ cat, categories, products, busy, run, onChange, onClose, onAddProduct }: {
  cat: Category; categories: Category[]; products: Product[]; busy: boolean; run: Run
  onChange: (c: Category[]) => void; onClose: () => void; onAddProduct: () => void
}) {
  const [name, setName] = useState(cat.name)
  const [error, setError] = useState('')
  const [kidText, setKidText] = useState('')
  const [kidError, setKidError] = useState('')
  const [renamingKid, setRenamingKid] = useState<{ id: string; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const kids = categories.filter((c) => c.parent_id === cat.id).sort(byPos)
  const ids = new Set([cat.id, ...kids.map((k) => k.id)])
  const count = products.filter((p) => p.category_id && ids.has(p.category_id)).length
  const refresh = async () => onChange(await storeApi.categories())

  async function rename() {
    const n = name.trim().slice(0, 60)
    if (!n || n === cat.name) return
    if (taken(categories, n, null, cat.id)) { setError(tx('« {0} » existe déjà', [n])); return }
    await run(async () => { await storeApi.updateCategory(cat.id, { name: n }); await refresh() })
  }

  async function photo(f: File | undefined) {
    if (!f) return
    setUploading(true)
    try { const url = await storeApi.uploadImage(f); await storeApi.updateCategory(cat.id, { imageUrl: url }); await refresh() }
    catch (e) { toast.error((e as Error).message) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function addKid() {
    const n = kidText.trim().slice(0, 60)
    if (!n) return
    if (taken(categories, n, cat.id)) { setKidError(tx('« {0} » existe déjà', [n])); return }
    if (await run(async () => { await storeApi.createCategory(n, cat.id); await refresh() })) setKidText('')
  }

  async function renameKid() {
    if (!renamingKid) return
    const n = renamingKid.text.trim().slice(0, 60)
    const kid = kids.find((k) => k.id === renamingKid.id)
    if (!n || !kid || n === kid.name) { setRenamingKid(null); return }
    if (taken(categories, n, cat.id, kid.id)) { setKidError(tx('« {0} » existe déjà', [n])); return }
    if (await run(async () => { await storeApi.updateCategory(kid.id, { name: n }); await refresh() })) setRenamingKid(null)
  }

  function removeKid(k: Category) {
    if (!confirm(tx('Supprimer « {0} » ? Les produits restent, sans catégorie.', [k.name]))) return
    run(async () => { await storeApi.deleteCategory(k.id); await refresh() })
  }

  function remove() {
    const msg = kids.length
      ? tx('Supprimer « {0} » et ses {1} sous-catégories ? Les produits restent, sans catégorie.', [cat.name, kids.length])
      : tx('Supprimer « {0} » ? Les produits restent, sans catégorie.', [cat.name])
    if (!confirm(msg)) return
    run(async () => { await storeApi.deleteCategory(cat.id); await refresh(); onClose() })
  }

  return (
    <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PanelHead title={cat.name} sub={tx('{0} produit(s)', [count])} onClose={onClose} />

      <div>
        <span style={label}>{tx('Renommer')}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={name} maxLength={60} style={input} onChange={(e) => { setName(e.target.value); setError('') }} onKeyDown={(e) => { if (e.key === 'Enter') rename() }} />
          <button type="button" onClick={rename} disabled={busy || !name.trim() || name.trim() === cat.name} style={btn('primary', busy || !name.trim() || name.trim() === cat.name)}>{tx('Enregistrer')}</button>
        </div>
        {error && <p role="alert" style={errStyle}>{error}</p>}
      </div>

      <div>
        <span style={label}>{tx('Photo')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cat.image_url
            ? <img src={cat.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
            : <div style={{ width: 48, height: 48, borderRadius: 10, border: '1px dashed var(--border)' }} />}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || busy} style={btn('ghost', uploading || busy)}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {cat.image_url ? tx('Changer') : tx('Ajouter')}
          </button>
          {cat.image_url && (
            <button type="button" disabled={busy} onClick={() => run(async () => { await storeApi.updateCategory(cat.id, { imageUrl: null }); await refresh() })} style={btn('ghost', busy)} aria-label={tx('Retirer la photo')}>
              <X size={14} />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => photo(e.target.files?.[0])} />
        </div>
      </div>

      <div>
        <span style={label}>{tx('Sous-catégories')}</span>
        {kids.length === 0 && <p style={{ ...muted, fontSize: 12, marginBottom: 8 }}>{tx('Aucune sous-catégorie : c’est facultatif.')}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {kids.map((k) => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}>
              {renamingKid?.id === k.id ? (
                <>
                  <input autoFocus value={renamingKid.text} maxLength={60} style={{ ...input, padding: '6px 10px' }}
                    onChange={(e) => { setRenamingKid({ id: k.id, text: e.target.value }); setKidError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') renameKid(); if (e.key === 'Escape') setRenamingKid(null) }} />
                  <button type="button" onClick={renameKid} disabled={busy} style={{ ...btn('primary', busy), padding: '6px 10px' }}>{tx('OK')}</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--text)' }}>{k.name}</span>
                  <IconBtn title={tx('Renommer')} disabled={busy} onClick={() => { setKidError(''); setRenamingKid({ id: k.id, text: k.name }) }}><Pencil size={14} /></IconBtn>
                  <IconBtn title={tx('Supprimer')} disabled={busy} onClick={() => removeKid(k)}><Trash2 size={14} /></IconBtn>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={kidText} maxLength={60} placeholder={tx('Nom de la sous-catégorie')} style={input}
            onChange={(e) => { setKidText(e.target.value); setKidError('') }} onKeyDown={(e) => { if (e.key === 'Enter') addKid() }} />
          <button type="button" onClick={addKid} disabled={busy || !kidText.trim()} style={btn('ghost', busy || !kidText.trim())}><Plus size={14} /> {tx('Ajouter')}</button>
        </div>
        {kidError && <p role="alert" style={errStyle}>{kidError}</p>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <button type="button" onClick={onAddProduct} disabled={busy} style={btn('primary', busy)}><Plus size={14} /> {tx('Ajouter un produit')}</button>
        <button type="button" onClick={remove} disabled={busy} style={btn('danger', busy)}><Trash2 size={14} /> {tx('Supprimer la catégorie')}</button>
      </div>
    </div>
  )
}

function PanelHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontSize: 15, color: 'var(--text)' }}>{title}</strong>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
      <IconBtn title={tx('Fermer')} onClick={onClose}><X size={16} /></IconBtn>
    </div>
  )
}

function IconBtn({ children, title, disabled, onClick }: { children: React.ReactNode; title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick}
      style={{ background: 'none', border: 'none', padding: 5, borderRadius: 6, cursor: disabled ? 'default' : 'pointer', color: 'var(--text-muted)', opacity: disabled ? 0.3 : 1, display: 'inline-flex' }}>
      {children}
    </button>
  )
}

const errStyle: React.CSSProperties = { margin: '6px 0 0', fontSize: 12, color: 'var(--destructive)' }
