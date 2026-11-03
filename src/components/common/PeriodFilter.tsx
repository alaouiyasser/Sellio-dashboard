'use client'
// Today / this week / this month / … / a custom range. Same control on every merchant page.
import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { PRESETS, presetPeriod, customPeriod, dayInput, type Period, type PresetKey } from '@/lib/period'
import { tx, intlLocale } from '@/lib/i18n'

export default function PeriodFilter({ value, onChange, presets }: {
  value: Period; onChange: (p: Period) => void; presets?: PresetKey[]
}) {
  const [from, setFrom] = useState(dayInput(value.from))
  const [to, setTo] = useState(dayInput(new Date(value.to.getTime() - 1)))
  const list = PRESETS.filter((p) => !presets || presets.includes(p.key))
  const pick = (k: PresetKey) => {
    if (k === 'custom') { const c = customPeriod(from, to); onChange(c ?? { ...value, key: 'custom' }); return }
    onChange(presetPeriod(k))
  }
  const fmt = (d: Date) => d.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' })
  const chip = (on: boolean): React.CSSProperties => ({
    padding: '7px 12px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`,
    background: on ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--card)',
    color: on ? 'var(--brand)' : 'var(--text)', fontWeight: on ? 600 : 500,
  })
  const input: React.CSSProperties = { padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 12.5 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div role="group" aria-label={tx('Période')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {list.map((p) => <button key={p.key} onClick={() => pick(p.key)} aria-pressed={value.key === p.key} style={chip(value.key === p.key)}>{p.label()}</button>)}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', marginInlineStart: 4 }}>
          <CalendarRange size={14} /> {fmt(value.from)} → {fmt(new Date(value.to.getTime() - 1))}
        </span>
      </div>
      {value.key === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-muted)' }}>
          <label>{tx('Du')} <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={input} /></label>
          <label>{tx('au')} <input type="date" value={to} min={from} max={dayInput(new Date())} onChange={(e) => setTo(e.target.value)} style={input} /></label>
          <button onClick={() => { const c = customPeriod(from, to); if (c) onChange(c) }} style={{ ...chip(true), padding: '6px 12px' }}>{tx('Appliquer')}</button>
        </div>
      )}
    </div>
  )
}
