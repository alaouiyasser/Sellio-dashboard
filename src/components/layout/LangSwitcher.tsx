'use client'

import { useLang } from './LanguageProvider'
import { useState } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'

const LANGS = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'AR', name: 'العربية' },
  { code: 'es', label: 'ES', name: 'Español' },
]

export default function LangSwitcher() {
  const { locale, setLocale } = useLang()
  const [open, setOpen] = useState(false)
  const current = LANGS.find(l => l.code === locale) ?? LANGS[0]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 11px', borderRadius: 9,
          border: '1px solid var(--border)', background: 'var(--card)',
          color: 'var(--text)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <Globe size={15} strokeWidth={2.2} color="var(--text-muted)" />
        <span>{current.label}</span>
        <ChevronDown size={13} strokeWidth={2.4} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 999,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', minWidth: 160,
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          }}>
            {LANGS.map(l => (
              <div
                key={l.code}
                onClick={() => { setLocale(l.code as any); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                  background: locale === l.code ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'transparent',
                  color: locale === l.code ? 'var(--brand)' : 'var(--text)',
                  fontWeight: locale === l.code ? 600 : 500,
                }}
              >
                <span style={{ width: 24, fontSize: 12, fontWeight: 700, color: locale === l.code ? 'var(--brand)' : 'var(--text-muted)' }}>{l.label}</span>
                <span style={{ flex: 1 }}>{l.name}</span>
                {locale === l.code && <Check size={15} strokeWidth={2.6} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
