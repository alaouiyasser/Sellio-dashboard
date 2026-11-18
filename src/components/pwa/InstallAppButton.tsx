'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'
import { useLang } from '@/components/layout/LanguageProvider'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
type Platform = 'ios' | 'macSafari' | 'other'

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)) return 'ios'
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|edg|opr|firefox|fxios/i.test(ua)
  if (ua.includes('Macintosh') && isSafari) return 'macSafari'
  return 'other'
}

/**
 * "Installer l'app" button in the top bar. Always visible until Sellio runs as an installed app.
 * - Chrome / Edge (Android, Windows, Mac) when the browser offers it: opens the install dialog.
 * - Everywhere else (iPhone, Safari on Mac, Firefox, or Chrome before it is ready):
 *   shows the steps for that device.
 */
export default function InstallAppButton() {
  const { t } = useLang()
  const [prompt, setPrompt] = useState<PromptEvent | null>(null)
  const [platform, setPlatform] = useState<Platform>('other')
  const [installed, setInstalled] = useState(true)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    setPlatform(detectPlatform())
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as PromptEvent) }
    const onInstalled = () => { setInstalled(true); setPrompt(null); setHelp(false) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  async function install() {
    if (prompt) {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setPrompt(null)
    } else {
      setHelp(true)
    }
  }

  const icon = { color: 'var(--brand)' }
  const steps: { text: string; icon?: ReactNode }[] =
    platform === 'ios'
      ? [
          { text: t('pwa.iosStep1'), icon: <Share size={16} style={icon} /> },
          { text: t('pwa.iosStep2'), icon: <Plus size={16} style={icon} /> },
          { text: t('pwa.iosStep3') },
        ]
      : platform === 'macSafari'
        ? [
            { text: t('pwa.macStep1') },
            { text: t('pwa.macStep2'), icon: <Plus size={16} style={icon} /> },
            { text: t('pwa.macStep3') },
          ]
        : [
            { text: t('pwa.otherStep1') },
            { text: t('pwa.otherStep2'), icon: <Download size={16} style={icon} /> },
            { text: t('pwa.otherStep3') },
          ]
  const title = platform === 'ios' ? t('pwa.iosTitle') : platform === 'macSafari' ? t('pwa.macTitle') : t('pwa.otherTitle')

  return (
    <>
      <button onClick={install} title={t('pwa.install')} style={{
        display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
        borderRadius: 8, border: '1px solid var(--brand)', background: 'transparent',
        color: 'var(--brand)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        <Download size={15} strokeWidth={2.4} />
        <span className="topbar-install-label">{t('pwa.install')}</span>
      </button>

      {help && (
        <div onClick={() => setHelp(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.55)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 420, background: 'var(--sidebar)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 16, padding: 20, position: 'relative',
          }}>
            <button onClick={() => setHelp(false)} aria-label="close" style={{
              position: 'absolute', top: 12, insetInlineEnd: 12, background: 'transparent', border: 0,
              color: 'var(--text-muted)', cursor: 'pointer',
            }}><X size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <img src="/icons/icon-192.png" alt="" width={44} height={44} style={{ borderRadius: 10 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('pwa.iosSubtitle')}</div>
              </div>
            </div>
            <ol style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 10, fontSize: 14 }}>
              {steps.map((s, i) => (
                <li key={i}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {s.text} {s.icon}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
