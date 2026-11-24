'use client'
// End of the wizard: about 2 s full screen in the store's colours, the logo (or its initial) then
// the name revealed. prefers-reduced-motion: no movement, the same screen shows still. A tap, a
// click or a key skips it. Then onDone() (the « Voir ma boutique » / « Mettre en ligne » screen).
import { useEffect, useRef } from 'react'
import { fontCss, type Colors } from '@/lib/store-api'
import { tx } from '@/lib/i18n'
import { readable } from './PhonePreview'

const DURATION_MS = 2200

export default function Celebration({ name, logoUrl, colors, font, onDone }: {
  name: string; logoUrl: string | null; colors: Colors; font: string | null; onDone: () => void
}) {
  const done = useRef(false)
  const finish = useRef(onDone)
  useEffect(() => { finish.current = onDone })
  const end = () => { if (!done.current) { done.current = true; finish.current() } }

  useEffect(() => {
    const t = setTimeout(end, DURATION_MS)
    const key = () => end()
    window.addEventListener('keydown', key)
    return () => { clearTimeout(t); window.removeEventListener('keydown', key) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once, on mount

  const fg = readable(colors.primary)
  return (
    <div role="dialog" aria-modal="true" aria-label={tx('Félicitations, votre boutique est prête')} onClick={end}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 24,
        background: `radial-gradient(circle at 50% 40%, ${colors.button}, ${colors.primary} 70%)`, color: fg, fontFamily: fontCss(font),
      }}>
      <style>{`
        @keyframes sellio-pop { 0% { opacity: 0; transform: scale(.4) } 60% { opacity: 1; transform: scale(1.08) } 100% { transform: scale(1) } }
        @keyframes sellio-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes sellio-ring { from { opacity: .55; transform: scale(.8) } to { opacity: 0; transform: scale(1.9) } }
        .sellio-cel-logo { animation: sellio-pop .7s cubic-bezier(.2,.9,.3,1.2) both }
        .sellio-cel-ring { animation: sellio-ring 1.4s ease-out .35s both }
        .sellio-cel-name { animation: sellio-rise .55s ease-out .55s both }
        .sellio-cel-sub { animation: sellio-rise .55s ease-out .85s both }
        @media (prefers-reduced-motion: reduce) {
          .sellio-cel-logo, .sellio-cel-name, .sellio-cel-sub { animation: none }
          .sellio-cel-ring { display: none }
        }
      `}</style>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div style={{ position: 'relative', width: 112, height: 112, margin: '0 auto 22px' }}>
          <div className="sellio-cel-ring" aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 999, border: `3px solid ${fg}` }} />
          <div className="sellio-cel-logo" style={{
            position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden', background: colors.background, color: colors.primary,
            display: 'grid', placeItems: 'center', fontSize: 48, fontWeight: 800, boxShadow: '0 18px 40px rgba(0,0,0,.25)',
          }}>
            {logoUrl ? <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name.trim().charAt(0).toUpperCase() || 'S')}
          </div>
        </div>
        <div className="sellio-cel-name" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, wordBreak: 'break-word' }}>{name}</div>
        <div className="sellio-cel-sub" style={{ fontSize: 16, marginTop: 10, opacity: 0.9 }}>{tx('Félicitations, votre boutique est prête')}</div>
        <div className="sellio-cel-sub" style={{ fontSize: 12, marginTop: 26, opacity: 0.7 }}>{tx('Touchez pour continuer')}</div>
      </div>
    </div>
  )
}
