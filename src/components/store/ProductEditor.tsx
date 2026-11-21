'use client'
// One product: photos, price, options as chips (pre-filled by the store's profile), the table of
// every combination (tick what you sell, price and stock per line, bulk fill), and for car parts
// the compatible vehicles.
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'
import {
  combinations, comboKey, profileOf, storeApi, type Category, type OptionDef, type Product, type StoreProfile,
} from '@/lib/store-api'
import { tx } from '@/lib/i18n'
import { btn, card, chip, input, label, muted } from './ui'

const MAX_OPTIONS = 3, MAX_VALUES = 30, MAX_VARIANTS = 200, MAX_IMAGES = 10, MAX_FITMENTS = 300

interface Row { sold: boolean; price: string; stock: string; sku: string }
interface FitRow { make: string; model: string; yearFrom: string; yearTo: string }

const num = (s: string) => Number(String(s).replace(',', '.').trim())

export default function ProductEditor({ productId, profile, categories, onSaved, onClose }: {
  productId: string | null; profile: StoreProfile; categories: Category[]
  onSaved: (p: Product) => void; onClose: () => void
}) {
  const preset = profileOf(profile)
  const [loading, setLoading] = useState(!!productId)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [compareAt, setCompareAt] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [categoryId, setCategoryId] = useState<string>('')
  const [options, setOptions] = useState<OptionDef[]>([])
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkStock, setBulkStock] = useState('')
  const [fitments, setFitments] = useState<FitRow[]>([])
  const [newOption, setNewOption] = useState('')
  const [custom, setCustom] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!productId) return
    storeApi.product(productId).then((p) => {
      setName(p.name); setDescription(p.description ?? ''); setPrice(String(p.price ?? ''))
      setCompareAt(p.compare_at_price ? String(p.compare_at_price) : ''); setImages(p.images ?? []); setCategoryId(p.category_id ?? '')
      const defs = p.option_defs ?? []
      setOptions(defs)
      const r: Record<string, Row> = {}
      for (const v of p.variants ?? []) r[comboKey(defs, v.options)] = { sold: true, price: String(v.price), stock: String(v.stock), sku: v.sku ?? '' }
      // Combinations not sold yet: shown unticked.
      for (const c of combinations(defs)) { const k = comboKey(defs, c); if (!r[k]) r[k] = { sold: false, price: String(p.price ?? ''), stock: '0', sku: '' } }
      setRows(r)
      setFitments((p.fitments ?? []).map((f) => ({ make: f.make, model: f.model, yearFrom: f.year_from ? String(f.year_from) : '', yearTo: f.year_to ? String(f.year_to) : '' })))
    }).catch((e) => { toast.error((e as Error).message); onClose() }).finally(() => setLoading(false))
  }, [productId]) // eslint-disable-line react-hooks/exhaustive-deps

  const combos = useMemo(() => combinations(options), [options])
  const tooMany = combos.length > MAX_VARIANTS
  const rowOf = (k: string): Row => rows[k] ?? { sold: true, price, stock: '0', sku: '' }
  const setRow = (k: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [k]: { ...rowOf(k), ...patch } }))

  // Chips: the profile's suggestions + what the product already uses + custom options.
  const optionBlocks = useMemo(() => {
    const blocks: OptionDef[] = preset.options.map((o) => ({ name: o.name, values: [...o.values] }))
    for (const o of options) {
      const b = blocks.find((x) => x.name.toLowerCase() === o.name.toLowerCase())
      if (b) { for (const v of o.values) if (!b.values.includes(v)) b.values.push(v) } else blocks.push({ name: o.name, values: [...o.values] })
    }
    return blocks
  }, [preset, options])

  function toggleValue(optName: string, value: string) {
    setOptions((cur) => {
      const i = cur.findIndex((o) => o.name === optName)
      if (i < 0) {
        if (cur.length >= MAX_OPTIONS) { toast.error(tx('{0} options au maximum', [MAX_OPTIONS])); return cur }
        return [...cur, { name: optName, values: [value] }]
      }
      const has = cur[i].values.includes(value)
      if (!has && cur[i].values.length >= MAX_VALUES) { toast.error(tx('{0} valeurs au maximum par option', [MAX_VALUES])); return cur }
      const values = has ? cur[i].values.filter((v) => v !== value) : [...cur[i].values, value]
      // A suggested option with nothing ticked is dropped; an option the merchant typed stays (to tick again).
      const suggested = preset.options.some((o) => o.name === optName)
      return values.length || !suggested ? cur.map((o, j) => (j === i ? { ...o, values } : o)) : cur.filter((_, j) => j !== i)
    })
  }

  function addCustomValue(optName: string) {
    const v = (custom[optName] ?? '').trim().slice(0, 30)
    if (!v) return
    const cur = options.find((o) => o.name === optName)
    if (!cur?.values.includes(v)) toggleValue(optName, v)
    setCustom((c) => ({ ...c, [optName]: '' }))
  }

  function addOption() {
    const n = newOption.trim().slice(0, 30)
    if (!n) return
    if (optionBlocks.some((o) => o.name.toLowerCase() === n.toLowerCase())) { toast.error(tx('Cette option existe déjà')); return }
    if (options.length >= MAX_OPTIONS) { toast.error(tx('{0} options au maximum', [MAX_OPTIONS])); return }
    setOptions((cur) => [...cur, { name: n, values: [] }])
    setNewOption('')
  }

  function applyBulk() {
    if (!bulkPrice.trim() && !bulkStock.trim()) return
    if (bulkPrice.trim() && !(num(bulkPrice) >= 0)) { toast.error(tx('Prix invalide')); return }
    if (bulkStock.trim() && !(Number.isInteger(num(bulkStock)) && num(bulkStock) >= 0)) { toast.error(tx('Stock invalide')); return }
    setRows((r) => {
      const out = { ...r }
      for (const c of combos) {
        const k = comboKey(options, c)
        const cur = out[k] ?? rowOf(k)
        if (!cur.sold) continue
        out[k] = { ...cur, ...(bulkPrice.trim() && { price: bulkPrice.trim() }), ...(bulkStock.trim() && { stock: bulkStock.trim() }) }
      }
      return out
    })
    toast.success(tx('Appliqué aux lignes cochées'))
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return
    const room = MAX_IMAGES - images.length
    if (room <= 0) { toast.error(tx('{0} images au maximum', [MAX_IMAGES])); return }
    setUploading(true)
    try {
      for (const f of Array.from(files).slice(0, room)) {
        try { const url = await storeApi.uploadImage(f); setImages((i) => [...i, url]) }
        catch (e) { toast.error((e as Error).message) }
      }
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function save() {
    if (name.trim().length < 2) { toast.error(tx('Donnez un nom au produit')); return }
    if (!(num(price) > 0)) { toast.error(tx('Indiquez le prix')); return }
    if (compareAt.trim() && !(num(compareAt) > num(price))) { toast.error(tx('L’ancien prix doit être plus élevé que le prix')); return }
    const empty = options.find((o) => !o.values.length)
    if (empty) { toast.error(tx('Option « {0} » : choisissez au moins une valeur', [empty.name])); return }
    if (tooMany) { toast.error(tx('{0} combinaisons au maximum : retirez des valeurs', [MAX_VARIANTS])); return }
    const variants = combos.map((c) => ({ c, r: rowOf(comboKey(options, c)) })).filter((x) => x.r.sold)
    if (!variants.length) { toast.error(tx('Cochez au moins une ligne à vendre')); return }
    for (const { r } of variants) {
      if (!(num(r.price) > 0)) { toast.error(tx('Chaque ligne cochée doit avoir un prix')); return }
      if (!(Number.isInteger(num(r.stock || '0')) && num(r.stock || '0') >= 0)) { toast.error(tx('Stock invalide')); return }
    }
    const fits = fitments.filter((f) => f.make.trim() || f.model.trim())
    if (fits.some((f) => !f.make.trim() || !f.model.trim())) { toast.error(tx('Chaque véhicule doit avoir une marque et un modèle')); return }

    setSaving(true)
    try {
      const body = {
        name: name.trim(), description: description.trim() || null, images, options, price: num(price),
        compareAtPrice: compareAt.trim() ? num(compareAt) : null, categoryId: categoryId || null, status: 'active' as const,
      }
      const p = productId ? await storeApi.updateProduct(productId, body) : await storeApi.createProduct(body)
      const saved = await storeApi.setVariants(p.id, variants.map(({ c, r }) => ({ options: c, price: num(r.price), stock: Math.round(num(r.stock || '0')), sku: r.sku.trim() || null })))
      if (profile === 'auto' || fitments.length) {
        await storeApi.setFitments(p.id, fits.map((f) => ({
          make: f.make.trim(), model: f.model.trim(), yearFrom: f.yearFrom ? Number(f.yearFrom) : null, yearTo: f.yearTo ? Number(f.yearTo) : null,
        })))
      }
      toast.success(tx('Produit enregistré'))
      onSaved({ ...p, store_variants: saved })
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 size={18} className="animate-spin" style={{ display: 'inline' }} /></div>

  const tops = categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position)

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 16, color: 'var(--text)' }}>{productId ? tx('Modifier le produit') : tx('Nouveau produit')}</strong>
        <button type="button" onClick={onClose} aria-label={tx('Fermer')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
      </div>

      {/* Photos */}
      <div>
        <span style={label}>{tx('Photos ({0}/{1}) — la première est la photo principale', [images.length, MAX_IMAGES])}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {images.map((u, i) => (
            <div key={u} style={{ position: 'relative', width: 72, height: 72 }}>
              <img src={u} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: i === 0 ? '2px solid var(--brand)' : '1px solid var(--border)' }} />
              <button type="button" aria-label={tx('Retirer')} onClick={() => setImages((x) => x.filter((y) => y !== u))}
                style={{ position: 'absolute', top: -6, insetInlineEnd: -6, width: 20, height: 20, borderRadius: 999, border: 'none', background: 'var(--destructive)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={12} /></button>
              {i > 0 && <button type="button" onClick={() => setImages((x) => [u, ...x.filter((y) => y !== u)])} title={tx('Photo principale')}
                style={{ position: 'absolute', bottom: 2, insetInlineStart: 2, fontSize: 9, padding: '1px 4px', borderRadius: 4, border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', cursor: 'pointer' }}>★</button>}
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ width: 72, height: 72, borderRadius: 10, border: '1px dashed var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={20} />}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={label}>{tx('Nom du produit')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} style={input} maxLength={120} />
        </div>
        <div>
          <span style={label}>{tx('Prix (DH)')}</span>
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} style={input} />
        </div>
        <div>
          <span style={label}>{tx('Ancien prix barré (DH, facultatif)')}</span>
          <input inputMode="decimal" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} style={input} />
        </div>
        {tops.length > 0 && (
          <div>
            <span style={label}>{tx('Catégorie')}</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={input}>
              <option value="">{tx('Sans catégorie')}</option>
              {tops.map((t) => [
                <option key={t.id} value={t.id}>{t.name}</option>,
                ...categories.filter((c) => c.parent_id === t.id).sort((a, b) => a.position - b.position)
                  .map((c) => <option key={c.id} value={c.id}>{`— ${c.name}`}</option>),
              ])}
            </select>
          </div>
        )}
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={label}>{tx('Description')}</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={5000} style={{ ...input, resize: 'vertical' }} />
        </div>
      </div>

      {/* Options as chips */}
      <div>
        <span style={label}>{tx('Options (taille, couleur…) — cochez les valeurs que vous vendez')}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {optionBlocks.map((b) => {
            const sel = options.find((o) => o.name === b.name)
            return (
              <div key={b.name} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                  {b.name}
                  {sel && (
                    <button type="button" onClick={() => setOptions((cur) => cur.filter((o) => o.name !== b.name))}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>{tx('Retirer l’option')}</button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {b.values.map((v) => {
                    const on = !!sel?.values.includes(v)
                    return <button key={v} type="button" aria-pressed={on} onClick={() => toggleValue(b.name, v)} style={chip(on)}>{v}</button>
                  })}
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    <input value={custom[b.name] ?? ''} onChange={(e) => setCustom((c) => ({ ...c, [b.name]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') addCustomValue(b.name) }}
                      placeholder={tx('Autre valeur')} style={{ ...input, width: 120, padding: '5px 9px', fontSize: 12.5 }} />
                    <button type="button" onClick={() => addCustomValue(b.name)} style={{ ...chip(false), padding: '5px 8px' }} aria-label={tx('Ajouter')}><Plus size={13} /></button>
                  </span>
                </div>
              </div>
            )
          })}
          {options.length < MAX_OPTIONS && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newOption} onChange={(e) => setNewOption(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addOption() }}
                placeholder={tx('Nouvelle option (ex : Matière)')} style={input} />
              <button type="button" onClick={addOption} style={btn('ghost')}><Plus size={14} /> {tx('Option')}</button>
            </div>
          )}
        </div>
      </div>

      {/* Combinations */}
      <div>
        <span style={label}>{options.length ? tx('{0} combinaisons — cochez celles que vous vendez', [combos.length]) : tx('Prix et stock')}</span>
        {tooMany ? (
          <p style={{ ...muted, color: 'var(--destructive)' }}>{tx('{0} combinaisons au maximum : retirez des valeurs', [MAX_VARIANTS])}</p>
        ) : (<>
          {combos.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8, padding: 10, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx('Remplir toutes les lignes cochées :')}</span>
              <input inputMode="decimal" placeholder={tx('Prix')} value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} style={{ ...input, width: 90, padding: '6px 9px' }} />
              <input inputMode="numeric" placeholder={tx('Stock')} value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} style={{ ...input, width: 90, padding: '6px 9px' }} />
              <button type="button" onClick={applyBulk} style={{ ...btn('ghost'), padding: '6px 12px' }}>{tx('Appliquer')}</button>
              <button type="button" onClick={() => setRows((r) => { const o = { ...r }; for (const c of combos) { const k = comboKey(options, c); o[k] = { ...(o[k] ?? rowOf(k)), sold: true } } return o })}
                style={{ ...btn('ghost'), padding: '6px 12px' }}>{tx('Tout cocher')}</button>
              <button type="button" onClick={() => setRows((r) => { const o = { ...r }; for (const c of combos) { const k = comboKey(options, c); o[k] = { ...(o[k] ?? rowOf(k)), sold: false } } return o })}
                style={{ ...btn('ghost'), padding: '6px 12px' }}>{tx('Tout décocher')}</button>
            </div>
          )}
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'var(--text)' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', textAlign: 'start' }}>
                  <th style={th}>{tx('Vendu')}</th>
                  {options.map((o) => <th key={o.name} style={th}>{o.name}</th>)}
                  <th style={th}>{tx('Prix (DH)')}</th>
                  <th style={th}>{tx('Stock')}</th>
                  <th style={th}>{tx('Référence')}</th>
                </tr>
              </thead>
              <tbody>
                {combos.map((c) => {
                  const k = comboKey(options, c)
                  const r = rowOf(k)
                  return (
                    <tr key={k} style={{ borderTop: '1px solid var(--border)', opacity: r.sold ? 1 : 0.5 }}>
                      <td style={td}><input type="checkbox" checked={r.sold} onChange={(e) => setRow(k, { sold: e.target.checked })} aria-label={tx('Vendu')} /></td>
                      {options.map((o) => <td key={o.name} style={td}>{c[o.name]}</td>)}
                      <td style={td}><input inputMode="decimal" value={r.price} onChange={(e) => setRow(k, { price: e.target.value })} style={cell} /></td>
                      <td style={td}><input inputMode="numeric" value={r.stock} onChange={(e) => setRow(k, { stock: e.target.value })} style={cell} /></td>
                      <td style={td}><input value={r.sku} onChange={(e) => setRow(k, { sku: e.target.value })} style={{ ...cell, width: 100 }} maxLength={60} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>)}
      </div>

      {/* Compatible vehicles (car parts) */}
      {(profile === 'auto' || fitments.length > 0) && (
        <div>
          <span style={label}>{tx('Véhicules compatibles ({0})', [fitments.length])}</span>
          <p style={{ ...muted, fontSize: 12, marginBottom: 8 }}>{tx('Le client retrouve la pièce en cherchant sa voiture. Laissez les années vides si toutes conviennent.')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fitments.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) 64px 64px 28px', gap: 6, alignItems: 'center' }}>
                <input placeholder={tx('Marque (ex : Dacia)')} value={f.make} onChange={(e) => setFitments((x) => x.map((y, j) => (j === i ? { ...y, make: e.target.value } : y)))} style={cell} maxLength={40} />
                <input placeholder={tx('Modèle (ex : Logan)')} value={f.model} onChange={(e) => setFitments((x) => x.map((y, j) => (j === i ? { ...y, model: e.target.value } : y)))} style={cell} maxLength={60} />
                <input inputMode="numeric" placeholder={tx('De')} value={f.yearFrom} onChange={(e) => setFitments((x) => x.map((y, j) => (j === i ? { ...y, yearFrom: e.target.value.replace(/\D/g, '').slice(0, 4) } : y)))} style={cell} />
                <input inputMode="numeric" placeholder={tx('À')} value={f.yearTo} onChange={(e) => setFitments((x) => x.map((y, j) => (j === i ? { ...y, yearTo: e.target.value.replace(/\D/g, '').slice(0, 4) } : y)))} style={cell} />
                <button type="button" aria-label={tx('Retirer')} onClick={() => setFitments((x) => x.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" disabled={fitments.length >= MAX_FITMENTS} onClick={() => setFitments((x) => [...x, { make: x[x.length - 1]?.make ?? '', model: '', yearFrom: '', yearTo: '' }])} style={btn('ghost')}>
                <Plus size={14} /> {tx('Ajouter un véhicule')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} style={btn('ghost')}>{tx('Annuler')}</button>
        <button type="button" onClick={save} disabled={saving} style={btn('primary', saving)}>
          {saving && <Loader2 size={14} className="animate-spin" />} {tx('Enregistrer le produit')}
        </button>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', textAlign: 'start', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '6px 10px', whiteSpace: 'nowrap' }
const cell: React.CSSProperties = { ...input, padding: '6px 8px', fontSize: 13, width: 80 }
