'use client'

import { useTheme } from './ThemeProvider'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import LangSwitcher from './LangSwitcher'

interface TopbarProps {
  title: string
  subtitle?: string
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { theme, toggle } = useTheme()
  const [initials, setInitials] = useState('??')
  const supabase = createClient()

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const parts = user.email.split('@')[0].split(/[._-]/)
        setInitials(((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase())
      }
    }
    fetchUser()
  }, [])

  return (
    <header className="topbar-header" style={{ maxWidth: '100vw', overflow: 'hidden',
      height: 60, background: 'var(--sidebar)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
    }}>
      <div>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{title}</span>
        {subtitle && <span className="topbar-subtitle" style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>{subtitle}</span>}
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="topbar-lang"><LangSwitcher /></span>

        <div onClick={toggle} style={{
          width: 40, height: 22, borderRadius: 11,
          background: theme === 'dark' ? '#8B9A35' : 'var(--border)',
          cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
        }}>
          <div style={{
            position: 'absolute', top: 3,
            left: theme === 'dark' ? 21 : 3,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'left 0.3s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </div>
        <span style={{ fontSize: 13 }}>{theme === 'dark' ? '🌙' : '☀️'}</span>

        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1B2D3E, #8B9A35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
        }}>{initials}</div>
      </div>
    </header>
  )
}
