'use client'

import type { IntegrationItem } from '@/lib/integrations-api'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
}

/** Renders an integration's credential/config fields (text, password, url, select). */
export default function IntegrationFields({ item, form, onChange }: {
  item: IntegrationItem
  form: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  const editing = !!item.connection
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {item.fields.map((f) => {
        const keepSecret = f.secret && editing
        return (
          <div key={f.key}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
              {f.label} {f.required && !keepSecret && <span style={{ color: 'var(--destructive)' }}>*</span>}
            </label>
            {f.type === 'select' ? (
              <select
                value={form[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input
                type={f.type === 'password' ? 'password' : f.type === 'url' ? 'url' : 'text'}
                value={form[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={keepSecret ? '•••••• (laisser vide pour garder la clé actuelle)' : f.placeholder}
                // Chrome ignores "off" on password fields and autofills the Sellio
                // login password into API-key fields → the carrier rejects the key.
                autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                name={`integration-${item.slug}-${f.key}`}
                data-1p-ignore
                data-lpignore="true"
                style={inputStyle}
              />
            )}
            {f.help && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{f.help}</div>}
          </div>
        )
      })}
    </div>
  )
}
