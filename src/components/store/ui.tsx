'use client'
// Small shared styles for the "Ma boutique" screens (same tokens as the rest of the dashboard).
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { tx } from '@/lib/i18n'

export const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }
export const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
export const label: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600 }
export const h2: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }
export const muted: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }

export const btn = (kind: 'primary' | 'ghost' | 'danger' = 'primary', disabled = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 10,
  fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
  border: kind === 'primary' ? 'none' : '1px solid var(--border)',
  background: kind === 'primary' ? 'var(--brand)' : 'transparent',
  color: kind === 'primary' ? '#fff' : kind === 'danger' ? 'var(--destructive)' : 'var(--text)',
})

export const choice = (active: boolean): React.CSSProperties => ({
  textAlign: 'start', padding: 14, borderRadius: 12, cursor: 'pointer', width: '100%',
  border: `2px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
  background: active ? 'color-mix(in srgb, var(--brand) 8%, transparent)' : 'var(--card)', color: 'var(--text)',
})

export const chip = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer',
  border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
  background: active ? 'var(--brand)' : 'transparent', color: active ? '#fff' : 'var(--text)', fontWeight: active ? 600 : 500,
})

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); toast.success(tx('Copié')) }
  catch { toast.error(tx('Copie impossible : sélectionnez le texte et copiez-le')) }
}

export function CopyButton({ text, label: l }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" style={btn('ghost')} onClick={async () => { await copyText(text); setDone(true); setTimeout(() => setDone(false), 1500) }}>
      {done ? <Check size={14} /> : <Copy size={14} />} {l ?? tx('Copier')}
    </button>
  )
}
