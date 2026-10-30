'use client'
// Founder console — its own shell, reachable only by the founder account (the API answers 403 otherwise).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, Receipt, ArrowLeft, ShieldCheck, Lock, Menu, X, Sun, Moon, Calculator } from 'lucide-react'
import { adminApi, AdminError } from '@/lib/admin-api'
import { useTheme } from '@/components/layout/ThemeProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import { btn } from '@/components/admin/ui'

const NAV = [
  { href: '/admin', label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: '/admin/merchants', label: 'Marchands', icon: Store },
  { href: '/admin/economics', label: 'Rentabilité', icon: Calculator },
  { href: '/admin/expenses', label: 'Coûts & dépenses', icon: Receipt },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { theme, toggle } = useTheme()
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    adminApi.me()
      .then(() => setState('ok'))
      .catch((e) => setState(e instanceof AdminError && (e.status === 401 || e.status === 403) ? 'forbidden' : 'error'))
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  if (state !== 'ok') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 24 }}>
        {state === 'loading' ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Vérification de l’accès…</div>
        ) : (
          <div style={{ maxWidth: 380, textAlign: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px', display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--destructive) 12%, transparent)' }}>
              <Lock size={22} color="var(--destructive)" />
            </div>
            <h1 style={{ fontSize: 18, margin: '0 0 8px', color: 'var(--text)' }}>
              {state === 'forbidden' ? 'Accès réservé' : 'Console indisponible'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
              {state === 'forbidden'
                ? 'Cet espace est réservé à l’équipe Sellio.'
                : 'Impossible de joindre l’API pour le moment. Réessayez dans un instant.'}
            </p>
            <Link href="/dashboard" style={{ ...btn('primary'), textDecoration: 'none' }}><ArrowLeft size={15} /> Retour au dashboard</Link>
          </div>
        )}
      </div>
    )
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))
  const showSide = !isMobile || open

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {isMobile && (
        <div style={{ position: 'sticky', top: 0, zIndex: 50, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
          <button aria-label="Menu" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'grid' }}><Menu size={20} /></button>
          <span style={{ fontWeight: 750, fontSize: 14, color: 'var(--text)' }}>Sellio <span style={{ color: 'var(--brand)' }}>Console</span></span>
          <span style={{ width: 20 }} />
        </div>
      )}

      {isMobile && open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,.45)' }} />}

      {showSide && (
        <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 232, zIndex: 100, background: 'var(--sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--brand)', display: 'grid', placeItems: 'center' }}>
                <ShieldCheck size={18} color="#fff" strokeWidth={2.3} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Sellio</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Console fondateur</div>
              </div>
            </div>
            {isMobile && <button aria-label="Fermer" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'grid' }}><X size={18} /></button>}
          </div>

          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(({ href, label, icon: Icon }) => {
              const on = isActive(href)
              return (
                <Link key={href} href={href} className={on ? undefined : 'admin-nav-item'} style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                  background: on ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'transparent',
                  color: on ? 'var(--brand)' : 'var(--text)', fontSize: 13.5, fontWeight: on ? 650 : 500,
                }}>
                  <Icon size={18} strokeWidth={2} color={on ? 'var(--brand)' : 'var(--text-muted)'} />{label}
                </Link>
              )
            })}
          </nav>

          <div style={{ padding: '0 8px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={toggle} className="admin-nav-item" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 13.5, fontWeight: 500 }}>
              {theme === 'dark' ? <Sun size={18} color="var(--text-muted)" /> : <Moon size={18} color="var(--text-muted)" />}
              {theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
            </button>
            <Link href="/dashboard" className="admin-nav-item" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', color: 'var(--text)', fontSize: 13.5, fontWeight: 500 }}>
              <ArrowLeft size={18} color="var(--text-muted)" /> Dashboard marchand
            </Link>
          </div>
        </aside>
      )}

      <main style={{ marginLeft: isMobile ? 0 : 232, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
