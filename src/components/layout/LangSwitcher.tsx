'use client'

import { useLang } from './LanguageProvider'
import { useState } from 'react'

const LANGS = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'ar', label: 'AR', flag: '🇲🇦' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
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
          padding: '6px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--card)',
          color: 'var(--text)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 100,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, overflow: 'hidden', minWidth: 110,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>
          {LANGS.map(l => (
            <div
              key={l.code}
              onClick={() => { setLocale(l.code as any); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                background: locale === l.code ? 'rgba(139,154,53,0.12)' : 'transparent',
                color: locale === l.code ? '#8B9A35' : 'var(--text)',
                fontWeight: locale === l.code ? 600 : 400,
                transition: 'background 0.15s',
              }}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
