'use client'
// "Vos rayons": one card per main category, its sub-categories as bullets inside. Simple words,
// no drag and drop: pencil to rename, arrows to reorder, bin to delete. Two levels at most.
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { storeApi, type Category } from '@/lib/store-api'
import { normName } from '@/lib/store-templates'
import { tx } from '@/lib/i18n'
import { btn, card, input } from './ui'

const byPos = (a: Category, b: Category) => a.position - b.position

export default function CategoriesEditor({ categories, onChange }: { categories: Category[]; onChange: (c: Category[]) => void }) {
  const [busy, setBusy] = useState(false)
  // What is being typed: a new rayon ('top'), a new sub-category in a card, or a new name for one.
  const [adding, setAdding] = useState<string | null>(null) // 'top' | parent id
  const [renaming, setRenaming] = useState<string | null>(null) // category id
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const tops = categories.filter((c) => !c.parent_id).sort(byPos)
  const kidsOf = (id: string) => categories.filter((c) => c.parent_id === id).sort(byPos)

  function stop() { setAdding(null); setRenaming(null); setText(''); setError('') }

  /** Same level (same parent), same name once case and accents are ignored → refused. */
  function taken(name: string, parentId: string | null, exceptId?: string) {
    const n = normName(name)
    return categories.some((c) => (c.parent_id ?? null) === parentId && c.id !== exceptId && normName(c.name) === n)
  }

  async function run(fn: () => Promise<Category[] | void>) {
    setBusy(true)
    try { const r = await fn(); if (r) onChange(r); return true }
    catch (e) { toast.error((e as Error).message); return false }
    finally { setBusy(false) }
  }

  async function submit() {
    const name = text.trim().slice(0, 60)
    if (!name) return
    const parentId = renaming ? categories.find((c) => c.id === renaming)?.parent_id ?? null : adding === 'top' ? null : adding
    if (taken(name, parentId, renaming ?? undefined)) { setError(tx('« {0} » existe déjà', [name])); return }
    const ok = await run(async () => {
      if (renaming) await storeApi.updateCategory(renaming, { name })
      else await storeApi.createCategory(name, parentId)
      return storeApi.categories()
    })
    if (ok) stop()
  }

  /** Swap with the neighbour, then save the whole order. */
  function shift(c: Category, siblings: Category[], dir: -1 | 1) {
    const i = siblings.findIndex((x) => x.id === c.id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= siblings.length) return
    const list = [...siblings]; [list[i], list[j]] = [list[j], list[i]]
    const moved = new Map(list.map((x, k) => [x.id, k]))
    onChange(categories.map((x) => (moved.has(x.id) ? { ...x, position: moved.get(x.id)! } : x)))
    // The API takes the whole order: other lists keep theirs.
    const order = [
      ...tops.filter((t) => !moved.has(t.id)).map((t, k) => ({ id: t.id, parentId: null as string | null, position: k })),
      ...tops.flatMap((t) => kidsOf(t.id).filter((k) => !moved.has(k.id)).map((k, n) => ({ id: k.id, parentId: t.id as string | null, position: n }))),
      ...list.map((x, k) => ({ id: x.id, parentId: x.parent_id, position: k })),
    ]
    run(() => storeApi.reorderCategories(order)).then((ok) => {
      if (!ok) storeApi.categories().then(onChange).catch(() => {})
    })
  }

  function remove(c: Category) {
    const n = kidsOf(c.id).length
    if (!confirm(n ? tx('Supprimer « {0} » et ses {1} sous-catégories ? Les produits restent, sans catégorie.', [c.name, n]) : tx('Supprimer « {0} » ? Les produits restent, sans catégorie.', [c.name]))) return
    run(async () => { await storeApi.deleteCategory(c.id); return storeApi.categories() })
  }

  const form = (placeholder: string) => (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input autoFocus value={text} maxLength={60} placeholder={placeholder} style={input}
          onChange={(e) => { setText(e.target.value); setError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') stop() }} />
        <button type="button" onClick={submit} disabled={busy || !text.trim()} style={btn('primary', busy || !text.trim())}>{tx('OK')}</button>
        <button type="button" onClick={stop} style={btn('ghost')}>{tx('Annuler')}</button>
      </div>
      {error && <p role="alert" style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--destructive)' }}>{error}</p>}
    </div>
  )

  const actions = (c: Category, siblings: Category[]) => {
    const i = siblings.findIndex((x) => x.id === c.id)
    return (
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>
        <IconBtn title={tx('Renommer')} disabled={busy} onClick={() => { stop(); setRenaming(c.id); setText(c.name) }}><Pencil size={14} /></IconBtn>
        <IconBtn title={tx('Monter')} disabled={busy || i === 0} onClick={() => shift(c, siblings, -1)}><ArrowUp size={14} /></IconBtn>
        <IconBtn title={tx('Descendre')} disabled={busy || i === siblings.length - 1} onClick={() => shift(c, siblings, 1)}><ArrowDown size={14} /></IconBtn>
        <IconBtn title={tx('Supprimer')} disabled={busy} onClick={() => remove(c)}><Trash2 size={14} /></IconBtn>
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tops.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{tx('Aucun rayon pour l’instant.')}</p>}

      {tops.map((c) => {
        const kids = kidsOf(c.id)
        return (
          <div key={c.id} style={{ ...card, padding: 14 }}>
            {renaming === c.id ? form(tx('Nouveau nom')) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--text)' }}>{c.name}</strong>
                {actions(c, tops)}
              </div>
            )}
            {kids.length > 0 && (
              <ul style={{ listStyle: 'disc', margin: '8px 0 0', paddingInlineStart: 22, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {kids.map((k) => (
                  <li key={k.id} style={{ fontSize: 14, color: 'var(--text)' }}>
                    {renaming === k.id ? form(tx('Nouveau nom')) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ flex: 1, minWidth: 0 }}>{k.name}</span>
                        {actions(k, kids)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {adding === c.id
              ? form(tx('Nom de la sous-catégorie'))
              : <button type="button" disabled={busy} onClick={() => { stop(); setAdding(c.id) }} style={{ ...btn('ghost'), marginTop: 10, padding: '6px 12px' }}><Plus size={14} /> {tx('Ajouter une sous-catégorie')}</button>}
          </div>
        )
      })}

      {adding === 'top' ? <div style={{ ...card, padding: 14 }}>{form(tx('Nom du rayon (ex : Homme)'))}</div>
        : <button type="button" disabled={busy} onClick={() => { stop(); setAdding('top') }} style={{ ...btn('primary', busy), alignSelf: 'flex-start' }}><Plus size={14} /> {tx('Ajouter un rayon')}</button>}
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
