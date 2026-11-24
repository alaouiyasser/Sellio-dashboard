'use client'
// Categories on two levels. Drag and drop a category: onto another one to make it a
// sub-category, or between two to reorder. Arrow buttons do the same on a phone (no drag there).
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, CornerDownRight, CornerUpLeft, GripVertical, Plus, Trash2 } from 'lucide-react'
import { storeApi, type Category } from '@/lib/store-api'
import { tx } from '@/lib/i18n'
import { btn, input } from './ui'

type Tree = { tops: Category[]; kids: Record<string, Category[]> }

function tree(all: Category[]): Tree {
  const byPos = (a: Category, b: Category) => a.position - b.position
  const tops = all.filter((c) => !c.parent_id).sort(byPos)
  const kids: Record<string, Category[]> = {}
  for (const t of tops) kids[t.id] = all.filter((c) => c.parent_id === t.id).sort(byPos)
  return { tops, kids }
}

export default function CategoriesEditor({ categories, onChange }: { categories: Category[]; onChange: (c: Category[]) => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const t = tree(categories)

  async function run(fn: () => Promise<Category[] | void>) {
    setBusy(true)
    try { const r = await fn(); if (r) onChange(r) }
    catch (e) { toast.error((e as Error).message) }
    finally { setBusy(false) }
  }

  /** Move `id` to `parentId` at `index`, then save the whole order. */
  function move(id: string, parentId: string | null, index: number) {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    if (parentId && (t.kids[id]?.length ?? 0) > 0) { toast.error(tx('Cette catégorie a des sous-catégories : elle reste au premier niveau')); return }
    if (parentId === id) return
    const lists: Record<string, Category[]> = { '': t.tops.filter((c) => c.id !== id) }
    for (const top of t.tops) if (top.id !== id) lists[top.id] = (t.kids[top.id] ?? []).filter((c) => c.id !== id)
    const target = lists[parentId ?? '']
    if (!target) return
    target.splice(Math.max(0, Math.min(index, target.length)), 0, { ...cat, parent_id: parentId })
    const order = Object.entries(lists).flatMap(([pid, list]) => list.map((c, i) => ({ id: c.id, parentId: pid || null, position: i })))
    // Optimistic: the list moves at once, the API answer replaces it.
    onChange(order.map((o) => ({ ...categories.find((c) => c.id === o.id)!, parent_id: o.parentId, position: o.position })))
    run(() => storeApi.reorderCategories(order)).catch(() => {})
  }

  function dropProps(key: string, parentId: string | null, index: number) {
    return {
      onDragOver: (e: React.DragEvent) => { if (drag) { e.preventDefault(); setOver(key) } },
      onDragLeave: () => setOver((o) => (o === key ? null : o)),
      onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(null); if (drag) move(drag, parentId, index); setDrag(null) },
    }
  }

  const gap = (k: string, parentId: string | null, index: number) => (
    <div key={k} {...dropProps(k, parentId, index)} style={{ height: drag ? 10 : 4, borderRadius: 4, background: over === k ? 'var(--brand)' : 'transparent', transition: 'height .1s' }} />
  )

  const row = (c: Category, parentId: string | null, index: number, siblings: Category[]) => {
    const isTop = !parentId
    const prevTop = isTop ? siblings[index - 1] : null
    const dropInto = isTop ? dropProps(`into:${c.id}`, c.id, (t.kids[c.id] ?? []).length) : {}
    return (
      <div
        key={c.id}
        draggable={!busy}
        onDragStart={(e) => { setDrag(c.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.id) }}
        onDragEnd={() => { setDrag(null); setOver(null) }}
        {...dropInto}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 10, background: 'var(--bg)',
          border: `1px solid ${over === `into:${c.id}` ? 'var(--brand)' : 'var(--border)'}`, opacity: drag === c.id ? 0.5 : 1,
          marginInlineStart: isTop ? 0 : 26,
        }}
      >
        <GripVertical size={15} style={{ color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 }} aria-hidden />
        {editing?.id === c.id ? (
          <input autoFocus value={editing.name} style={{ ...input, padding: '5px 8px' }}
            onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
            onBlur={() => { const n = editing.name.trim(); setEditing(null); if (n && n !== c.name) run(async () => { await storeApi.updateCategory(c.id, { name: n }); return storeApi.categories() }) }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null) }} />
        ) : (
          <button type="button" onClick={() => setEditing({ id: c.id, name: c.name })} title={tx('Renommer')}
            style={{ flex: 1, textAlign: 'start', background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, fontWeight: isTop ? 600 : 500, cursor: 'text', padding: 0 }}>
            {c.name}
          </button>
        )}
        <IconBtn title={tx('Monter')} disabled={index === 0} onClick={() => move(c.id, parentId, index - 1)}><ArrowUp size={14} /></IconBtn>
        <IconBtn title={tx('Descendre')} disabled={index === siblings.length - 1} onClick={() => move(c.id, parentId, index + 1)}><ArrowDown size={14} /></IconBtn>
        {isTop
          ? <IconBtn title={tx('Mettre dans la catégorie au-dessus')} disabled={!prevTop || (t.kids[c.id]?.length ?? 0) > 0}
              onClick={() => prevTop && move(c.id, prevTop.id, (t.kids[prevTop.id] ?? []).length)}><CornerDownRight size={14} /></IconBtn>
          : <IconBtn title={tx('Remettre au premier niveau')} onClick={() => move(c.id, null, t.tops.findIndex((x) => x.id === parentId) + 1)}><CornerUpLeft size={14} /></IconBtn>}
        <IconBtn title={tx('Supprimer')} onClick={() => {
          const n = t.kids[c.id]?.length ?? 0
          if (!confirm(n ? tx('Supprimer « {0} » et ses {1} sous-catégories ? Les produits restent, sans catégorie.', [c.name, n]) : tx('Supprimer « {0} » ? Les produits restent, sans catégorie.', [c.name]))) return
          run(async () => { await storeApi.deleteCategory(c.id); return storeApi.categories() })
        }}><Trash2 size={14} /></IconBtn>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tx('Nouvelle catégorie (ex : Homme)')} style={input}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
        <button type="button" onClick={add} disabled={busy || !name.trim()} style={btn('primary', busy || !name.trim())}><Plus size={14} /> {tx('Ajouter')}</button>
      </div>
      {t.tops.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{tx('Aucune catégorie pour l’instant.')}</p>
      ) : (
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px' }}>{tx('Glissez une catégorie sur une autre pour en faire une sous-catégorie, ou entre deux pour changer l’ordre.')}</p>
          {t.tops.map((c, i) => (
            <div key={c.id}>
              {gap(`gap::${i}`, null, i)}
              {row(c, null, i, t.tops)}
              {(t.kids[c.id] ?? []).map((k, j, arr) => (
                <div key={k.id}>
                  <div style={{ marginInlineStart: 26 }}>{gap(`gap:${c.id}:${j}`, c.id, j)}</div>
                  {row(k, c.id, j, arr)}
                </div>
              ))}
            </div>
          ))}
          {gap('gap::end', null, t.tops.length)}
        </div>
      )}
    </div>
  )

  function add() {
    const n = name.trim()
    if (!n) return
    run(async () => { await storeApi.createCategory(n); setName(''); return storeApi.categories() })
  }
}

function IconBtn({ children, title, disabled, onClick }: { children: React.ReactNode; title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick}
      style={{ background: 'none', border: 'none', padding: 4, borderRadius: 6, cursor: disabled ? 'default' : 'pointer', color: 'var(--text-muted)', opacity: disabled ? 0.3 : 1, display: 'inline-flex' }}>
      {children}
    </button>
  )
}
