import { txLocale } from './i18n'
// Reading an order row the same way on every page (Supabase rows hold JSON as text or objects).

export function parseJson<T = any>(v: unknown): T | null {
  if (v == null) return null
  if (typeof v === 'string') { try { return JSON.parse(v) as T } catch { return null } }
  return v as T
}

/** One name per real city (API's city_canonical: « tanja », « طنجة » → Tanger), else the city as typed. */
export function orderCity(o: { shipping_address?: unknown; city?: string | null }): string {
  const a = parseJson<Record<string, any>>(o.shipping_address)
  return String(a?.city_canonical ?? a?.city ?? o.city ?? '').trim()
}

export function orderItems(o: { items?: unknown }): any[] {
  const i = parseJson<any[]>(o.items)
  return Array.isArray(i) ? i : []
}

/** Product name: the API writes productName; older rows / other stores used title or name. */
export const itemName = (i: any): string => String(i?.productName ?? i?.title ?? i?.name ?? '').trim() || 'Produit'

export const ORDER_STATUS: Record<string, { label: Record<string, string>; bg: string; color: string }> = {
  confirmed: { label: { fr: 'Confirmé',   en: 'Confirmed', ar: 'مؤكد',         es: 'Confirmado'  }, bg: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' },
  pending:   { label: { fr: 'En attente', en: 'Pending',   ar: 'قيد الانتظار', es: 'Pendiente'   }, bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  cancelled: { label: { fr: 'Annulé',     en: 'Cancelled', ar: 'ملغي',         es: 'Cancelado'   }, bg: 'rgba(239,68,68,0.15)',  color: '#EF4444' },
  delivered: { label: { fr: 'Livré',      en: 'Delivered', ar: 'مسلم',         es: 'Entregado'   }, bg: 'color-mix(in srgb, var(--brand) 15%, transparent)', color: 'var(--brand)' },
 awaiting_delivery_check: { label: { fr: 'En attente confirmation', en: 'Awaiting confirmation', ar: 'في انتظار التأكيد', es: 'Esperando confirmación' }, bg: 'rgba(99,102,241,0.15)', color: '#6366F1' },
 delivery_issue: { label: { fr: 'Problème livraison', en: 'Delivery issue', ar: 'مشكل التوصيل', es: 'Problema entrega' }, bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
  needs_merchant_confirm: { label: { fr: 'À confirmer', en: 'To confirm', ar: 'خاص تأكيد', es: 'Por confirmar' }, bg: 'rgba(245,158,11,0.2)', color: '#F59E0B' },
  awaiting_upsell: { label: { fr: 'Offre proposée', en: 'Offer sent', ar: 'عرض مقترح', es: 'Oferta enviada' }, bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6' },
  awaiting_shipping_info: { label: { fr: 'Adresse en vérification', en: 'Checking address', ar: 'كنتأكدو من العنوان', es: 'Verificando dirección' }, bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
  modified:  { label: { fr: 'Modifié',    en: 'Modified',  ar: 'معدل',         es: 'Modificado'  }, bg: 'rgba(99,102,241,0.15)', color: '#6366F1' },
  sent:      { label: { fr: 'En attente', en: 'Pending',   ar: 'قيد الانتظار', es: 'Pendiente'   }, bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  canceled:  { label: { fr: 'Annulé',     en: 'Cancelled', ar: 'ملغي',         es: 'Cancelado'   }, bg: 'rgba(239,68,68,0.15)',  color: '#EF4444' },
  returned:  { label: { fr: 'Retourné',   en: 'Returned',  ar: 'مرتجع',        es: 'Devuelto'    }, bg: 'rgba(249,115,22,0.15)', color: '#F97316' },
  in_delivery: { label: { fr: 'En livraison', en: 'In delivery', ar: 'جاري التوصيل', es: 'En reparto' }, bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
  delivery_unconfirmed: { label: { fr: 'Non confirmé', en: 'Unconfirmed', ar: 'غير مؤكد', es: 'Sin confirmar' }, bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
}

export const statusLabel = (status: string, locale: string = txLocale()) => {
  const s = ORDER_STATUS[status] ?? ORDER_STATUS.pending!
  return { label: s.label[locale] ?? s.label.fr!, bg: s.bg, color: s.color }
}
