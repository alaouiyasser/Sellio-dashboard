'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar as RBar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { Plus, Trash2, Megaphone, Server, Wrench, Package, Receipt, CalendarRange, Check } from 'lucide-react'
import { adminApi, type Expense, type ExpenseCategory } from '@/lib/admin-api'
import { Card, Kpi, Badge, PageHead, Skeleton, ErrorBox, mad, dateFr, th, td, inputStyle, btn, EXPENSE_LABEL } from '@/components/admin/ui'

const CATS: { k: ExpenseCategory; icon: typeof Megaphone; color: string }[] = [
  { k: 'ads', icon: Megaphone, color: 'var(--brand)' },
  { k: 'infra', icon: Server, color: 'var(--chart-2)' },
  { k: 'tools', icon: Wrench, color: 'var(--warning)' },
  { k: 'other', icon: Package, color: 'var(--text-muted)' },
]
const PRESETS: { label: string; category: ExpenseCategory }[] = [
  { label: 'Meta Ads', category: 'ads' }, { label: 'TikTok Ads', category: 'ads' },
  { label: 'Railway', category: 'infra' }, { label: 'Supabase', category: 'infra' }, { label: 'Vercel', category: 'infra' },
  { label: 'WhatsApp / SIM', category: 'tools' }, { label: 'Domaine', category: 'tools' }, { label: 'Claude', category: 'tools' },
]
const today = () => new Date().toISOString().slice(0, 10)
const monthKey = (d: string) => d.slice(0, 7)
const monthLabel = (k: string) => new Date(k + '-01T00:00:00Z').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' })

export default function AdminExpensesPage() {
  const [rows, setRows] = useState<Expense[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ spent_on: today(), category: 'ads' as ExpenseCategory, label: '', amount_mad: '' })
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)

  const load = useCallback(() => {
    setError(null)
    adminApi.expenses(365).then((r) => setRows(r.expenses)).catch((e) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const amount = Number(form.amount_mad)
  const valid = form.label.trim() && /^\d{4}-\d{2}-\d{2}$/.test(form.spent_on) && Number.isFinite(amount) && amount > 0

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true); setFormErr(null)
    try {
      const { expense } = await adminApi.addExpense({ spent_on: form.spent_on, category: form.category, label: form.label.trim(), amount_mad: amount })
      setRows((r) => [expense, ...(r ?? [])].sort((a, b) => b.spent_on.localeCompare(a.spent_on)))
      setForm((f) => ({ ...f, label: '', amount_mad: '' }))
    } catch (err) { setFormErr((err as Error).message) } finally { setSaving(false) }
  }

  async function remove(id: number) {
    if (confirmDel !== id) { setConfirmDel(id); return }
    setConfirmDel(null)
    const prev = rows
    setRows((r) => (r ?? []).filter((x) => x.id !== id))
    try { await adminApi.deleteExpense(id) } catch (err) { setRows(prev); setError((err as Error).message) }
  }

  const stats = useMemo(() => {
    const r = rows ?? []
    const thisMonth = monthKey(today())
    const by = (list: Expense[]) => Object.fromEntries(CATS.map((c) => [c.k, list.filter((e) => e.category === c.k).reduce((s, e) => s + Number(e.amount_mad), 0)])) as Record<ExpenseCategory, number>
    const month = r.filter((e) => monthKey(e.spent_on) === thisMonth)
    const months: string[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7))
    const chart = months.map((k) => ({ month: monthLabel(k), ...by(r.filter((e) => monthKey(e.spent_on) === k)) }))
    const year = r.reduce((s, e) => s + Number(e.amount_mad), 0)
    return { month: by(month), monthTotal: month.reduce((s, e) => s + Number(e.amount_mad), 0), year, chart }
  }, [rows])

  return (
    <div className="admin-page" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1400 }}>
      <PageHead title="Coûts & dépenses" subtitle="Pub, infrastructure et outils — intégrés au compte de résultat. Le coût WhatsApp est calculé automatiquement." />

      {error && <ErrorBox message={error} onRetry={load} />}

      {rows ? (
        <div className="admin-grid-4">
          <Kpi label="Ce mois-ci" icon={CalendarRange} value={mad(stats.monthTotal)} sub={`12 derniers mois : ${mad(stats.year)}`} />
          <Kpi label={EXPENSE_LABEL.ads} icon={Megaphone} value={mad(stats.month.ads)} sub="ce mois-ci" />
          <Kpi label={EXPENSE_LABEL.infra} icon={Server} tone="brand" value={mad(stats.month.infra)} sub="ce mois-ci" />
          <Kpi label="Outils & autres" icon={Wrench} tone="warning" value={mad(stats.month.tools + stats.month.other)} sub="ce mois-ci" />
        </div>
      ) : !error && <div className="admin-grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={118} />)}</div>}

      <div className="admin-grid-main">
        <Card title="Dépenses par mois" icon={Receipt}>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                  cursor={{ fill: 'color-mix(in srgb, var(--brand) 6%, transparent)' }} formatter={(v, n) => [mad(Number(v)), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                {CATS.map((c, i) => (
                  <RBar key={c.k} dataKey={c.k} name={EXPENSE_LABEL[c.k]} stackId="a" fill={c.color} radius={i === CATS.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Nouvelle dépense" icon={Plus}>
          <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESETS.map((p) => (
                <button type="button" key={p.label} onClick={() => setForm((f) => ({ ...f, label: p.label, category: p.category }))}
                  style={{ ...btn('ghost'), padding: '5px 9px', fontSize: 11.5, borderColor: form.label === p.label ? 'var(--brand)' : 'var(--border)' }}>{p.label}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
              {CATS.map(({ k, icon: Icon }) => {
                const on = form.category === k
                return (
                  <button type="button" key={k} onClick={() => setForm((f) => ({ ...f, category: k }))} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 9, cursor: 'pointer',
                    border: '1px solid', borderColor: on ? 'var(--brand)' : 'var(--border)', fontSize: 11, fontWeight: 600,
                    background: on ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'transparent', color: on ? 'var(--brand)' : 'var(--text-muted)',
                  }}><Icon size={15} />{EXPENSE_LABEL[k].split(' ')[0]}</button>
                )
              })}
            </div>
            <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Libellé (ex. Meta Ads — campagne octobre)" maxLength={120} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="number" min={0} step="0.01" value={form.amount_mad} onChange={(e) => setForm((f) => ({ ...f, amount_mad: e.target.value }))} placeholder="Montant (DH)" style={inputStyle} />
              <input type="date" value={form.spent_on} max={today()} onChange={(e) => setForm((f) => ({ ...f, spent_on: e.target.value }))} style={inputStyle} />
            </div>
            <button type="submit" disabled={!valid || saving} style={{ ...btn('primary'), justifyContent: 'center', opacity: !valid || saving ? 0.55 : 1, cursor: !valid || saving ? 'not-allowed' : 'pointer' }}>
              <Plus size={15} /> {saving ? 'Enregistrement…' : 'Ajouter la dépense'}
            </button>
            {formErr && <div style={{ fontSize: 12.5, color: 'var(--destructive)' }}>{formErr}</div>}
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Montants en dirhams. Pour une facture en dollars, convertir au taux du jour. La pub alimente le CAC.
            </p>
          </form>
        </Card>
      </div>

      <Card title="Historique (12 mois)" icon={Receipt} pad={false}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Date</th><th style={th}>Catégorie</th><th style={th}>Libellé</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, width: 120 }} /></tr></thead>
            <tbody>
              {!rows && !error && <tr><td colSpan={5} style={td}><div className="admin-skel" style={{ height: 28, borderRadius: 8 }} /></td></tr>}
              {rows?.map((e) => (
                <tr key={e.id} className="admin-row">
                  <td style={{ ...td, color: 'var(--text-muted)' }}>{dateFr(e.spent_on)}</td>
                  <td style={td}><Badge tone={e.category === 'ads' ? 'brand' : e.category === 'tools' ? 'warning' : 'muted'}>{EXPENSE_LABEL[e.category] ?? e.category}</Badge></td>
                  <td style={{ ...td, whiteSpace: 'normal' }}>{e.label}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 650 }}>{mad(Number(e.amount_mad), true)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => remove(e.id)} onBlur={() => setConfirmDel(null)} style={{ ...btn('danger'), padding: '5px 9px', fontSize: 12 }}>
                      {confirmDel === e.id ? <><Check size={13} /> Confirmer</> : <><Trash2 size={13} /> Supprimer</>}
                    </button>
                  </td>
                </tr>
              ))}
              {rows && !rows.length && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', padding: 36 }}>Aucune dépense saisie. Commencez par l’infra (Railway, Supabase) et la pub du mois.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
