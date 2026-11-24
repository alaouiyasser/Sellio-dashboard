'use client'
// "Messages automatiques": a welcome message in darija with the store link, where to paste it
// (WhatsApp Business greeting + away message, Meta Business Suite instant reply) and one link
// per product for quick replies. Nothing is sent by Sellio here: the merchant copies and pastes.
// One video per platform (NEXT_PUBLIC_GUIDE_VIDEO_WHATSAPP / NEXT_PUBLIC_GUIDE_VIDEO_META:
// YouTube link or .mp4/.webm file). No video configured → no video slot, the written steps show.
import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { productUrl, storeUrl, type Product } from '@/lib/store-api'
import { tx } from '@/lib/i18n'
import { CopyButton, card, chip, h2, input, muted } from './ui'

/** Welcome message: darija in Latin letters (as most customers write) or in Arabic letters. */
function welcome(script: 'latin' | 'arabic', name: string, link: string) {
  return script === 'latin'
    ? `Salam, merhba bik f ${name}!\nChouf ga3 les produits w les prix dyalna w commandi direct men hna :\n${link}\nL-khlass 3and l-livraison. W ila 3andek chi so2al, ana hna.`
    : `السلام عليكم، مرحبا بيك ف ${name}!\nشوف جميع المنتوجات والأثمنة ديالنا وكوموندي نيشان من هنا :\n${link}\nالخلاص عند التوصيل. وإلا عندك شي سؤال، أنا هنا.`
}
function away(script: 'latin' | 'arabic', link: string) {
  return script === 'latin'
    ? `Salam, chokran 3la l-message dyalek! Daba ma nqderch njaweb, ghadi nrj3 lik f a9rab wa9t.\nT9der tcommandi direct men hna: ${link}`
    : `السلام عليكم، شكرا على الميساج ديالك! دابا ما نقدرش نجاوب، غادي نرجع ليك ف أقرب وقت.\nتقدر تكوموندي نيشان من هنا: ${link}`
}

/** Guide videos, set at build time (Vercel env). Empty = not recorded yet. */
const GUIDE_VIDEOS = {
  whatsapp: (process.env.NEXT_PUBLIC_GUIDE_VIDEO_WHATSAPP ?? '').trim(),
  meta: (process.env.NEXT_PUBLIC_GUIDE_VIDEO_META ?? '').trim(),
}

/** YouTube (watch, youtu.be, shorts) → embed URL; a video file → null (played with <video>). */
export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null
}

/** The platform's video when there is one (written steps folded below it), else the steps. */
function Guide({ video, title, steps }: { video: string; title: string; steps: React.ReactNode }) {
  if (!/^https:\/\//.test(video)) return <>{steps}</>
  const embed = youtubeEmbed(video)
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, aspectRatio: embed ? '9 / 16' : undefined, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        {embed
          ? <iframe src={embed} title={title} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
          : <video src={video} controls playsInline preload="metadata" style={{ width: '100%', display: 'block' }} />}
      </div>
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer' }}>{tx('Voir les étapes écrites')}</summary>
        {steps}
      </details>
    </div>
  )
}

export default function MessagesStep({ storeName, slug, products }: { storeName: string; slug: string; products: Product[] }) {
  const [script, setScript] = useState<'latin' | 'arabic'>('latin')
  const link = storeUrl(slug)
  const [msg, setMsg] = useState<string | null>(null)
  const welcomeText = msg ?? welcome(script, storeName, link)
  const awayText = away(script, link)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={h2}>{tx('Messages automatiques')}</h2>
        <p style={muted}>{tx('Quand un client vous écrit, il reçoit tout de suite le lien de votre boutique. Copiez ces messages dans WhatsApp Business et Meta Business Suite.')}</p>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'var(--text)' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', textAlign: 'start' }}>
              <th style={th}>{tx('Message')}</th>
              <th style={th}>{tx('Quand est-il envoyé ?')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdName}>{tx('Message de bienvenue')}</td>
              <td style={td}>{tx('Envoyé automatiquement par VOTRE WhatsApp Business (pas par Sellio), quand un client vous écrit pour la 1re fois ou après 14 jours sans message. Il accueille le client et donne le lien de la boutique.')}</td>
            </tr>
            <tr>
              <td style={tdName}>{tx('Message d’absence')}</td>
              <td style={td}>{tx('Envoyé automatiquement par VOTRE WhatsApp Business (pas par Sellio) quand un client écrit en dehors des heures que vous choisissez (par exemple la nuit), ou tout le temps si vous choisissez « Toujours ». Il dit que vous répondez plus tard et donne le lien pour commander tout de suite.')}</td>
            </tr>
            <tr>
              <td style={tdName}>{tx('Réponse instantanée (Instagram et Messenger)')}</td>
              <td style={td}>{tx('Envoyée automatiquement par Instagram et Messenger (pas par Sellio), une seule fois, à une personne qui vous écrit pour la 1re fois.')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: 14, borderRadius: 12, border: '1px solid var(--brand)', background: 'color-mix(in srgb, var(--brand) 8%, transparent)' }}>
        <Lightbulb size={18} style={{ flexShrink: 0, color: 'var(--brand)', marginTop: 1 }} aria-hidden />
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
          <strong>{tx('Réglage conseillé')}</strong>
          <div>{tx('Message de bienvenue : toujours activé.')}</div>
          <div>{tx('Message d’absence : facultatif, seulement la nuit.')}</div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <strong style={{ fontSize: 14, color: 'var(--text)' }}>{tx('Message de bienvenue')}</strong>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={chip(script === 'latin')} onClick={() => { setScript('latin'); setMsg(null) }}>{tx('Lettres latines')}</button>
            <button type="button" style={chip(script === 'arabic')} onClick={() => { setScript('arabic'); setMsg(null) }}>{tx('Lettres arabes')}</button>
          </div>
        </div>
        <textarea value={welcomeText} onChange={(e) => setMsg(e.target.value)} rows={5} dir={script === 'arabic' ? 'rtl' : 'ltr'}
          style={{ ...input, resize: 'vertical', fontSize: 14, lineHeight: 1.5 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <CopyButton text={welcomeText} label={tx('Copier le message de bienvenue')} />
          <CopyButton text={link} label={tx('Copier le lien de la boutique')} />
        </div>
      </div>

      <div style={card}>
        <strong style={{ fontSize: 14, color: 'var(--text)' }}>{tx('WhatsApp Business')}</strong>
        <Guide video={GUIDE_VIDEOS.whatsapp} title={tx('WhatsApp Business')} steps={
          <ol style={ol}>
            <li>{tx('Ouvrez WhatsApp Business → Paramètres → Outils professionnels.')}</li>
            <li>{tx('Message de bienvenue : activez-le, collez le message ci-dessus, enregistrez.')}</li>
            <li>{tx('Message d’absence : activez-le, choisissez « Toujours envoyer » ou « En dehors des heures d’ouverture », collez le message ci-dessous.')}</li>
            <li>{tx('Réponses rapides : créez un raccourci par produit (ex : /parfum1) avec son lien, plus bas.')}</li>
          </ol>
        } />
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{tx('Message d’absence')}</span>
          <textarea readOnly value={awayText} rows={3} dir={script === 'arabic' ? 'rtl' : 'ltr'} style={{ ...input, marginTop: 6, resize: 'vertical' }} />
          <div style={{ marginTop: 8 }}><CopyButton text={awayText} label={tx('Copier le message d’absence')} /></div>
        </div>
      </div>

      <div style={card}>
        <strong style={{ fontSize: 14, color: 'var(--text)' }}>{tx('Instagram et Messenger (Meta Business Suite)')}</strong>
        <Guide video={GUIDE_VIDEOS.meta} title={tx('Instagram et Messenger (Meta Business Suite)')} steps={
          <ol style={ol}>
            <li>{tx('Ouvrez Meta Business Suite → Boîte de réception → Automatisations.')}</li>
            <li>{tx('Choisissez « Réponse instantanée » et activez-la pour Instagram et Messenger.')}</li>
            <li>{tx('Collez le message de bienvenue, puis enregistrez.')}</li>
          </ol>
        } />
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{tx('Réponse instantanée')}</span>
          <textarea readOnly value={welcomeText} rows={4} dir={script === 'arabic' ? 'rtl' : 'ltr'} style={{ ...input, marginTop: 6, resize: 'vertical' }} />
          <div style={{ marginTop: 8 }}><CopyButton text={welcomeText} label={tx('Copier la réponse instantanée')} /></div>
        </div>
      </div>

      <div style={card}>
        <strong style={{ fontSize: 14, color: 'var(--text)' }}>{tx('Un lien par produit (réponses rapides)')}</strong>
        <p style={{ ...muted, fontSize: 12, margin: '4px 0 10px' }}>{tx('Quand un client demande un produit, envoyez son lien : il voit la photo, le prix et commande directement.')}</p>
        {products.length === 0 ? (
          <p style={{ ...muted, fontSize: 12 }}>{tx('Ajoutez des produits pour avoir leurs liens.')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map((p) => {
              const u = productUrl(slug, p.slug)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--border)' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                    <div dir="ltr" style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u}</div>
                  </div>
                  <CopyButton text={u} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', fontSize: 12, fontWeight: 700, textAlign: 'start', color: 'var(--text-muted)' }
const td: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid var(--border)', verticalAlign: 'top', lineHeight: 1.5 }
const tdName: React.CSSProperties = { ...td, fontWeight: 700, width: '28%' }
const ol: React.CSSProperties = { margin: '8px 0 0', paddingInlineStart: 20, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }
