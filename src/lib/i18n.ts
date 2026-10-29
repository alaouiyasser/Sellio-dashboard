// UI text by its French wording: tx('Commandes') → "Orders" in English, French when missing.
// `{0}` placeholders: tx('{0} commandes', [n]). The locale is set by LanguageProvider, which
// re-mounts the app on change, so tx() can be called anywhere (render, toasts, handlers).
import en from '../../messages/ui/en.json'
import ar from '../../messages/ui/ar.json'
import es from '../../messages/ui/es.json'

export type Locale = 'fr' | 'en' | 'ar' | 'es'
const DICT: Record<Exclude<Locale, 'fr'>, Record<string, string>> = { en, ar, es }
let current: Locale = 'fr'

export const setTxLocale = (l: Locale) => { current = l }
export const txLocale = () => current
/** Number/date formatting locale for the current language. */
export const intlLocale = () => (current === 'ar' ? 'ar-MA' : current === 'en' ? 'en-GB' : current === 'es' ? 'es-ES' : 'fr-MA')

export function tx(fr: string, vars?: (string | number | null | undefined)[]): string {
  const base = current === 'fr' ? fr : (DICT[current]?.[fr] ?? fr)
  return vars ? base.replace(/\{(\d+)\}/g, (_, i) => String(vars[Number(i)] ?? '')) : base
}
