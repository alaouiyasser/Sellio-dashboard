'use client'

import { authFetch } from '@/lib/api-fetch'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useParams, useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import { API_BASE } from '@/lib/auth-client'
import ShipPanel from '@/components/orders/ShipPanel'
import { shipFailed, SHIPPABLE_STATUSES, carrierName } from '@/lib/shipping-api'
import {
  ArrowLeft, User, Phone, Package, PackageCheck, Truck, Store, ShoppingBag,
  ExternalLink, Route, Inbox, MessageCircle, CheckCircle2, Bike, Warehouse,
  Home, XCircle, RotateCcw, Clock,
} from 'lucide-react'

const OLIVE = 'var(--brand)'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmée',   color: 'var(--success)',     bg: 'color-mix(in srgb, var(--success) 15%, transparent)' },
  pending:   { label: 'En attente',  color: 'var(--warning)',     bg: 'color-mix(in srgb, var(--warning) 15%, transparent)' },
  canceled:  { label: 'Annulée',     color: 'var(--destructive)', bg: 'color-mix(in srgb, var(--destructive) 15%, transparent)' },
  cancelled: { label: 'Annulée',     color: 'var(--destructive)', bg: 'color-mix(in srgb, var(--destructive) 15%, transparent)' },
  delivered: { label: 'Livrée',      color: 'var(--brand)',       bg: 'color-mix(in srgb, var(--brand) 15%, transparent)' },
  returned:  { label: 'Retournée',   color: 'var(--chart-2)',     bg: 'color-mix(in srgb, var(--chart-2) 15%, transparent)' },
  needs_merchant_confirm: { label: 'À confirmer', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 15%, transparent)' },
  // Customer said yes; Sellio is confirming the exact city/address with them on WhatsApp.
  awaiting_shipping_info: { label: 'Adresse en vérification', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
}

function deliveryStatusToStep(ds: string | null): number {
  if (!ds) return -1
  const s = ds.toLowerCase()
  if (/waiting|en attente|nouveau|pending/.test(s))           return 2
  if (/taken|pris en charge|pickup|collecté|ramassé/.test(s)) return 3
  if (/hub|transit|entrepôt|centre/.test(s))                  return 4
  if (/out.for|sortie|en livraison|en cours/.test(s))         return 5
  if (/delivered|livré(?!e\s+retour)|remis/.test(s))          return 6
  if (/failed|echec|tentative/.test(s))                       return 5
  if (/return|retour|renvoi/.test(s))                         return 7
  return -1
}

function buildTimeline(order: any) {
  const isCanceled = order.status === 'canceled' || order.status === 'cancelled'
  const isReturned = !!order.returned_at
  const deliveryStep = deliveryStatusToStep(order.delivery_status)

  const steps = [
    { id: 'received',  Icon: Inbox,         label: 'Commande reçue', sublabel: 'Nouvelle commande enregistrée', date: order.created_at, done: true, active: false },
    { id: 'whatsapp',  Icon: MessageCircle, label: 'Message WhatsApp envoyé', sublabel: 'En attente de confirmation client', date: null, done: order.status !== 'pending', active: order.status === 'pending' },
    { id: 'confirmed', Icon: CheckCircle2,  label: 'Confirmée par le client', sublabel: 'Client a confirmé la commande', date: order.confirmed_at, done: !!order.confirmed_at || order.status === 'delivered', active: false },
    { id: 'pickup',    Icon: PackageCheck,  label: 'Prise en charge par le livreur', sublabel: `Remise à ${order.delivery_provider ?? 'transporteur'}`, date: null, done: deliveryStep >= 3 || order.status === 'delivered', active: deliveryStep === 2 },
    { id: 'hub',       Icon: Warehouse,     label: 'Arrivée en hub / en transit', sublabel: 'Traitement dans l\'entrepôt du transporteur', date: null, done: deliveryStep >= 4 || order.status === 'delivered', active: deliveryStep === 3 },
    { id: 'outfordelivery', Icon: Bike,     label: 'En cours de livraison', sublabel: 'Livreur en route vers le client', date: order.out_for_delivery_at, done: !!order.out_for_delivery_at || order.status === 'delivered', active: deliveryStep === 5 && order.status !== 'delivered' },
    { id: 'delivered', Icon: Home,          label: 'Livrée au client', sublabel: 'Commande remise avec succès', date: order.delivered_at, done: order.status === 'delivered', active: false },
  ]

  if (isCanceled) {
    const cancelIdx = steps.findIndex(s => s.id === 'confirmed')
    steps.splice(cancelIdx, steps.length - cancelIdx, {
      id: 'canceled', Icon: XCircle, label: 'Annulée',
      sublabel: 'Commande annulée',
      date: order.cancelled_at ?? order.canceled_at, done: true, active: false,
    })
  }

  if (isReturned) {
    steps.push({
      id: 'returned', Icon: RotateCcw, label: 'Retournée',
      sublabel: order.returned_reason ?? 'Retour au vendeur',
      date: order.returned_at, done: true, active: false,
    })
  }

  return steps
}

function parseItems(items: any): any[] {
  if (Array.isArray(items)) return items
  if (typeof items === 'string') { try { return JSON.parse(items) } catch { return [] } }
  return []
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleString('fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const router  = useRouter()
  const supabase = createClient()
  const [order,   setOrder]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)

  async function deliveryAction(action: 'delivered' | 'returned' | 'refused' | 'in_delivery') {
    const labels: Record<string, string> = { delivered: 'Livré', returned: 'Retourné', refused: 'Refusé', in_delivery: 'Pris par le courrier' }
    if (!confirm(`Confirmer: ${labels[action]} ?`)) return
    setActionLoading(action)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await authFetch(`${API_BASE}/api/orders/${user.id}/${id}/delivery-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (json.success) { await fetchOrder() }
      else { alert('Erreur: ' + (json.error?.message ?? 'inconnue')) }
    } catch (e) {
      alert('Erreur réseau')
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => { fetchOrder() }, [id])

  async function fetchOrder() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setTenantId(user.id)
    const { data: o } = await supabase
      .from('orders').select('*')
      .eq('id', id).eq('tenant_id', user.id).single()
    setOrder(o)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Détail commande" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
    </div>
  )

  if (!order) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Introuvable" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => router.push('/orders')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: OLIVE, color: '#fff', border: 'none', cursor: 'pointer' }}><ArrowLeft size={15} /> Retour</button>
      </div>
    </div>
  )

  const s        = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['pending']
  const timeline = buildTimeline(order)
  const items    = parseItems(order.items)
  const isCanceled = order.status === 'canceled' || order.status === 'cancelled'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={`Commande #${order.id?.slice(0, 8)}`} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        <button onClick={() => router.push('/orders')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginBottom: 20, padding: '7px 14px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--card)',
          color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13,
        }}><ArrowLeft size={14} /> Retour aux commandes</button>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 20, alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Commande</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: OLIVE }}>#{order.id?.slice(0, 8)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{fmtDate(order.created_at)}</div>
                </div>
                <span style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                {order.source && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {order.source === 'shopify' ? <><ShoppingBag size={12} strokeWidth={2.2} /> Shopify</> : <><Store size={12} strokeWidth={2.2} /> YouCan</>}
                  </span>
                )}
                {order.delivery_provider && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <Truck size={12} strokeWidth={2.2} /> {carrierName(order.delivery_provider)}
                  </span>
                )}
                {order.delivery_tracking_code && (
                  <span title="Numéro de suivi" style={{ padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    {order.delivery_tracking_code}
                  </span>
                )}
                {order.delivery_status && !shipFailed(order) && (
                  <span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: 'color-mix(in srgb, var(--brand) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)', color: OLIVE }}>
                    {order.delivery_status}
                  </span>
                )}
                {shipFailed(order) && (
                  <span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: 'color-mix(in srgb, var(--destructive) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)', color: 'var(--destructive)' }}>
                    ⚠ Non envoyée au transporteur
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}><User size={15} strokeWidth={2.2} color="var(--brand)" /> Informations client</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Nom',       value: order.customer_name ?? '—' },
                  { label: 'Téléphone', value: order.customer_phone ?? '—' },
                  { label: 'Ville', value: (() => { try { const a = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address; return a?.city ?? a?.address ?? '—' } catch { return '—' } })() },
                  { label: 'Adresse', value: (() => { try { const a = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address; return a?.address ?? '—' } catch { return '—' } })() },
                  { label: 'Montant',   value: order.total_price ? `${Number(order.total_price).toLocaleString()} MAD` : '—' },
                ].map(f => (
                  <div key={f.label} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginTop: 14,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'color-mix(in srgb, var(--brand) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
                  color: OLIVE, textDecoration: 'none', fontSize: 13, fontWeight: 600,
                }}>
                  <ExternalLink size={15} strokeWidth={2.2} /> Suivre la livraison
                </a>
              )}

              {order.livreur_phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--chart-2) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--chart-2) 20%, transparent)', fontSize: 13, color: 'var(--chart-2)', fontWeight: 600 }}>
                  <Phone size={14} strokeWidth={2.2} /> Livreur: {order.livreur_phone}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}><Package size={15} strokeWidth={2.2} color="var(--brand)" /> Produits commandés</div>
                {items.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.productName ?? item.title ?? item.name ?? '—'}</div>
                      {(item.variantName ?? item.variant) && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Variante: {item.variantName ?? item.variant}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>x{item.quantity ?? 1}</div>
                      <div style={{ fontSize: 13, color: OLIVE, fontWeight: 700 }}>{item.unitPrice ?? item.price} MAD</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: OLIVE }}>Total: {Number(order.total_price).toLocaleString()} MAD</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 20px', position: 'sticky', top: 0 }}>
            {tenantId && SHIPPABLE_STATUSES.includes(order.status) && !order.delivery_tracking_code && (
              <ShipPanel tenantId={tenantId} order={order} onShipped={fetchOrder} />
            )}

            {order.delivery_conflict && (
              <div style={{ marginBottom: 20, padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--destructive)', marginBottom: 4 }}>🚩 Conflit détecté</div>
                <div style={{ fontSize: 12, color: 'var(--destructive)' }}>
                  Le client a confirmé la réception, mais un statut "retourné/refusé" avait été déclaré. Vérifiez cette commande.
                </div>
              </div>
            )}

            {['confirmed','awaiting_delivery_check','delivery_issue','pending','sent','in_delivery','needs_merchant_confirm'].includes(order.status) && (
              <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>📦 Statut de livraison</div>
                {order.out_for_delivery_at && order.status === 'in_delivery' && (() => {
                  const days = Math.floor((Date.now() - new Date(order.out_for_delivery_at).getTime()) / 86400000)
                  const late = days >= 5
                  return (
                    <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: late ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.1)',
                      color: late ? 'var(--destructive)' : '#3B82F6' }}>
                      🚚 Chez le courrier depuis {days === 0 ? "aujourd'hui" : `${days} jour${days > 1 ? 's' : ''}`}{late ? ' ⚠️ en retard' : ''}
                    </div>
                  )
                })()}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {order.status !== 'in_delivery' && (
                    <button onClick={() => deliveryAction('in_delivery')} disabled={actionLoading !== null}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', cursor: actionLoading ? 'wait' : 'pointer', background: 'var(--card)', color: '#3B82F6', fontSize: 13, fontWeight: 700, opacity: actionLoading && actionLoading !== 'in_delivery' ? 0.5 : 1 }}>
                      🚚 {actionLoading === 'in_delivery' ? '...' : 'Pris par le courrier'}
                    </button>
                  )}
                  <button onClick={() => deliveryAction('delivered')} disabled={actionLoading !== null}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, border: 'none', cursor: actionLoading ? 'wait' : 'pointer', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 700, opacity: actionLoading && actionLoading !== 'delivered' ? 0.5 : 1 }}>
                    <Home size={15} strokeWidth={2.4} /> {actionLoading === 'delivered' ? '...' : 'Livré'}
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => deliveryAction('returned')} disabled={actionLoading !== null}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', cursor: actionLoading ? 'wait' : 'pointer', background: 'var(--card)', color: 'var(--chart-2)', fontSize: 12, fontWeight: 700, opacity: actionLoading && actionLoading !== 'returned' ? 0.5 : 1 }}>
                      <RotateCcw size={14} strokeWidth={2.4} /> {actionLoading === 'returned' ? '...' : 'Retourné'}
                    </button>
                    <button onClick={() => deliveryAction('refused')} disabled={actionLoading !== null}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', cursor: actionLoading ? 'wait' : 'pointer', background: 'var(--card)', color: 'var(--destructive)', fontSize: 12, fontWeight: 700, opacity: actionLoading && actionLoading !== 'refused' ? 0.5 : 1 }}>
                      <XCircle size={14} strokeWidth={2.4} /> {actionLoading === 'refused' ? '...' : 'Refusé'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, marginBottom: 24, color: 'var(--text)' }}><Route size={15} strokeWidth={2.2} color="var(--brand)" /> Suivi de commande</div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 18, top: 0, bottom: 0, width: 2, background: 'var(--border)', zIndex: 0 }} />

              {timeline.map((step, i) => {
                const StepIcon = step.Icon
                return (
                  <div key={step.id} style={{ display: 'flex', gap: 16, marginBottom: i < timeline.length - 1 ? 24 : 0, position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: step.done ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : step.active ? 'color-mix(in srgb, var(--warning) 15%, transparent)' : 'var(--bg)',
                      border: step.done ? '2px solid color-mix(in srgb, var(--brand) 50%, transparent)' : step.active ? '2px solid color-mix(in srgb, var(--warning) 50%, transparent)' : '2px solid var(--border)',
                      color: step.done ? 'var(--brand)' : step.active ? 'var(--warning)' : 'var(--text-muted)',
                      opacity: !step.done && !step.active ? 0.5 : 1,
                    }}>
                      {step.active ? <Clock size={16} strokeWidth={2.2} /> : <StepIcon size={16} strokeWidth={2.2} />}
                    </div>

                    <div style={{ paddingTop: 4, opacity: !step.done && !step.active ? 0.45 : 1 }}>
                      <div style={{ fontSize: 13, fontWeight: step.done || step.active ? 600 : 400, color: step.done ? 'var(--text)' : step.active ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {step.label}
                        {step.active && (
                          <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', fontWeight: 700 }}>EN COURS</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{step.sublabel}</div>
                      {step.date && <div style={{ fontSize: 10, color: OLIVE, marginTop: 3, fontWeight: 600 }}>{fmtDate(step.date)}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
