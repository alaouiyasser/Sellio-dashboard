'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from './LanguageProvider'

const OLIVE = '#8B9A35'

const NAV_ITEMS = [
  { path: '/dashboard',  icon: '📊', labelKey: 'nav.dashboard'  },
  { path: '/orders',     icon: '📦', labelKey: 'nav.orders'     },
  { path: '/credits',    icon: '💳', labelKey: 'nav.credits'    },
  { path: '/analytics',  icon: '📈', labelKey: 'nav.analytics'  },
  { path: '/logs',       icon: '💬', labelKey: 'nav.messages'   },
  { path: '/ai-coach',   icon: '🧠', labelKey: 'nav.aicoach'    },
  { path: '/settings',   icon: '⚙️', labelKey: 'nav.settings'   },
]

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const { t }     = useLang()
  const [credits, setCredits]   = useState<number | null>(null)
  const [company, setCompany]   = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: cr }, { data: tn }] = await Promise.all([
        supabase.from('credits').select('balance').eq('tenant_id', user.id).single(),
        supabase.from('tenants').select('company_name').eq('id', user.id).single(),
      ])
      if (cr?.balance !== undefined) setCredits(cr.balance)
      if (tn?.company_name) setCompany(tn.company_name)
    }
    load()
  }, [])

  const creditColor = credits === null ? '#6B7B8D'
    : credits < 200 ? '#EF4444'
    : credits < 500 ? '#F59E0B'
    : OLIVE
  const creditPct = credits === null ? 0 : Math.min((credits / 2000) * 100, 100)

  if (isMobile && !mobileOpen) return null

  function navigate(path: string) {
    router.push(path)
    if (isMobile && onClose) onClose()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    width: 240, zIndex: 100,
    background: 'var(--sidebar)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    transition: 'transform 0.3s ease',
    transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
        }} />
      )}

      <aside style={sidebarStyle} className={mobileOpen ? "sidebar-open" : ""}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #1B2D3E, #2A4560)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 1.5px rgba(139,154,53,0.4)',
              fontSize: 14, fontWeight: 800, color: OLIVE,
            }}>S</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Sellio <span style={{ color: OLIVE }}>·</span> <span style={{ color: OLIVE }}>{company || '...'}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Dashboard</div>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 18, padding: 4,
            }}>✕</button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.path
            return (
              <div key={item.path} onClick={() => navigate(item.path)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: active ? 'rgba(139,154,53,0.12)' : 'transparent',
                borderLeft: active ? '3px solid #8B9A35' : '3px solid transparent',
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                <span style={{
                  fontSize: 13.5, fontWeight: active ? 600 : 400,
                  color: active ? OLIVE : 'var(--text)',
                  whiteSpace: 'nowrap',
                }}>{t(item.labelKey)}</span>
              </div>
            )
          })}
        </nav>

        {/* Credits */}
        <div style={{
          margin: '0 8px 8px', padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(139,154,53,0.08)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{t('nav.credits')}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: creditColor }}>
            {credits === null ? '...' : credits.toLocaleString()}
          </div>
          <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: 'var(--border)' }}>
            <div style={{ width: `${creditPct}%`, height: '100%', borderRadius: 4, background: creditColor, transition: 'width 0.5s' }} />
          </div>
          {credits !== null && credits < 500 && (
            <div style={{ fontSize: 10, color: creditColor, marginTop: 4 }}>
              {credits < 200 ? t('credits.lowAlert') : t('credits.medAlert')}
            </div>
          )}
        </div>

        {/* Logout */}
        <div style={{ padding: '0 8px 16px' }}>
          <div onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            color: '#EF4444', fontSize: 13, fontWeight: 500,
            transition: 'background 0.2s',
          }}>
            <span>🚪</span>
            <span>{t('nav.logout')}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
