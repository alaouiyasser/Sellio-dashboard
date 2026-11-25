// Visual tokens of the three store themes. Shared by the wizard's phone preview
// (components/store/PhonePreview.tsx) and the public store (app/storefront), so both look the same.
import type { ThemeId } from './store-api'

export interface ThemeTokens {
  radius: number; imgRadius: number; btnWeight: number; btnSize: number; btnPad: string; upper: boolean; heroPad: string; h1: number
}

/** Phone preview sizes (300 px wide mockup). */
export const THEME: Record<ThemeId, ThemeTokens> = {
  impact: { radius: 10, imgRadius: 10, btnWeight: 900, btnSize: 13, btnPad: '13px 10px', upper: true, heroPad: '18px 14px 20px', h1: 24 },
  essentiel: { radius: 8, imgRadius: 6, btnWeight: 600, btnSize: 12, btnPad: '10px 10px', upper: false, heroPad: '16px 14px', h1: 18 },
  elegance: { radius: 0, imgRadius: 0, btnWeight: 400, btnSize: 11, btnPad: '11px 10px', upper: true, heroPad: '14px 16px 22px', h1: 21 },
}

/** Same themes at web-page size (the public store). */
export const WEB_THEME: Record<ThemeId, ThemeTokens> = {
  impact: { radius: 12, imgRadius: 12, btnWeight: 900, btnSize: 16, btnPad: '16px 22px', upper: true, heroPad: '48px 20px 56px', h1: 44 },
  essentiel: { radius: 10, imgRadius: 8, btnWeight: 600, btnSize: 15, btnPad: '13px 20px', upper: false, heroPad: '40px 20px', h1: 34 },
  elegance: { radius: 0, imgRadius: 0, btnWeight: 400, btnSize: 13, btnPad: '15px 26px', upper: true, heroPad: '40px 20px 56px', h1: 40 },
}

/** Black or white text on a colour, whichever reads better. */
export function readable(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#111' : '#fff'
}
