// Every date the merchant sees is Casablanca time, whatever the browser's zone or tz data.
//
// Why a fixed offset and not `timeZone: 'Africa/Casablanca'`: the tz data shipped inside
// browsers and Node (ICU, tzdata 2026a) still puts Casablanca at UTC+1, while Morocco and the
// carriers are on UTC+0 (macOS, already updated, says +00). Formatting with the browser's
// zone or with the IANA name therefore showed every time 1 h late, and pushed orders placed
// between 23:00 and midnight onto the next day. Same rule as the API's tracking page
// (TRACKING_UTC_OFFSET_MIN). If Morocco moves its clock again, change NEXT_PUBLIC_MA_UTC_OFFSET_MIN.
import { intlLocale } from './i18n'

/** Casablanca's offset from UTC, in minutes (whole hours). */
export const MA_OFFSET_MIN = Math.round((Number(process.env.NEXT_PUBLIC_MA_UTC_OFFSET_MIN ?? 0) || 0) / 60) * 60
/** IANA zone with that offset (Etc/GMT signs are inverted: Etc/GMT-1 is UTC+1). */
export const MA_TZ = MA_OFFSET_MIN === 0 ? 'UTC' : `Etc/GMT${MA_OFFSET_MIN > 0 ? '-' : '+'}${Math.abs(MA_OFFSET_MIN) / 60}`

const OFF = MA_OFFSET_MIN * 60_000
type DateIn = Date | string | number

/** Casablanca wall clock of an instant. Month is 0-based, dow 0 = Sunday. */
export function maParts(v: DateIn) {
  const s = new Date(new Date(v).getTime() + OFF)
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate(), h: s.getUTCHours(), dow: s.getUTCDay() }
}
/** The instant of Casablanca midnight on that day (month 0-based, days may overflow). */
export const maMidnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d) - OFF)
/** "YYYY-MM-DD" of an instant, in Casablanca. */
export function maDay(v: DateIn) {
  const p = maParts(v)
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}
/** Casablanca midnight of a "YYYY-MM-DD" day, or null. */
export function maDayStart(day: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  return m ? maMidnight(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/**
 * A day-only value ("2026-11-24", a DATE column) as a Date to format with these helpers.
 * Noon UTC: never crosses a day, whatever the offset.
 */
export const dayOnly = (day: string) => new Date(`${day.slice(0, 10)}T12:00:00Z`)

const opts = (o?: Intl.DateTimeFormatOptions) => ({ ...o, timeZone: MA_TZ })
export const fmtDate = (v: DateIn, o?: Intl.DateTimeFormatOptions, locale = intlLocale()) => new Date(v).toLocaleDateString(locale, opts(o))
export const fmtTime = (v: DateIn, o: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }, locale = intlLocale()) => new Date(v).toLocaleTimeString(locale, opts(o))
export const fmtDateTime = (v: DateIn, o?: Intl.DateTimeFormatOptions, locale = intlLocale()) => new Date(v).toLocaleString(locale, opts(o))
