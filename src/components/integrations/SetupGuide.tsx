'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { SetupGuide as Guide } from '@/lib/integrations-api'

function CopyValue({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800) } catch { /* select manually */ }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
      <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()}
        style={{ flex: 1, minWidth: 0, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
      <button type="button" onClick={copy} aria-label={`Copier ${label}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none', background: done ? 'var(--success)' : 'var(--brand)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {done ? <Check size={13} /> : <Copy size={13} />} {done ? 'Copié' : 'Copier'}
      </button>
    </div>
  )
}

/** Numbered setup steps for an integration, with the exact values to paste on the other side. */
export default function SetupGuide({ guide, open }: { guide: Guide; open: boolean }) {
  return (
    <details open={open} style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', padding: '10px 12px' }}>
      <summary style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>Comment configurer</summary>
      <ol style={{ margin: '10px 0 0', paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {guide.steps.map((s, i) => (
          <li key={i} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55 }}>
            {s.text}
            {s.copy && <CopyValue label={s.copy.label} value={s.copy.value} />}
          </li>
        ))}
      </ol>
      {guide.note && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>{guide.note}</div>}
    </details>
  )
}
