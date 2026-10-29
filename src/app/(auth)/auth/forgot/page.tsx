'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, MessageCircle, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { apiPost, inputCls, primaryBtn } from '@/lib/auth-client'
import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'

import { tx } from '@/lib/i18n'
type Channel = 'whatsapp' | 'email'

export default function ForgotPage() {
  const supabase = createClient()
  const [channel, setChannel] = useState<Channel>('whatsapp')
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  async function sendCode() {
    setLoading(true)
    try {
      if (channel === 'whatsapp') {
        if (!phone.trim()) { toast.error(tx("Entrez votre numero")); return }
        const { res, data } = await apiPost('/api/auth/phone/request-otp', { phone })
        if (!res.ok || !data.ok) {
          if (data.error === 'invalid_phone') toast.error(tx("Numero invalide"))
          else if (data.error === 'rate_limited' || data.error === 'cooldown') {
            toast.error(tx("Reessayez dans {0}s", [data.retryAfterSeconds ?? 60])); setCooldown(data.retryAfterSeconds ?? 60)
          } else toast.error(tx("Echec d'envoi du code"))
          return
        }
        setCooldown(data.cooldownSeconds ?? 60)
        toast.success(tx("Code envoye sur WhatsApp"))
      } else {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error(tx("Email invalide")); return }
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
        if (error) { toast.error(tx("Aucun compte avec cet email")); return }
        setCooldown(60)
        toast.success(tx("Code envoye par email"))
      }
      setStep('reset')
    } finally { setLoading(false) }
  }

  async function resetPassword() {
    if (!/^\d{6}$/.test(code)) { toast.error(tx("Entrez le code a 6 chiffres")); return }
    if (password.length < 6) { toast.error(tx("Mot de passe min. 6 caracteres")); return }
    if (password !== password2) { toast.error(tx("Les mots de passe ne correspondent pas")); return }
    setLoading(true)
    try {
      if (channel === 'whatsapp') {
        const { res, data } = await apiPost('/api/auth/phone/verify-otp', { phone, code })
        if (res.ok && data.status === 'needs_signup') { toast.error(tx("Aucun compte avec ce numero")); return }
        if (!(res.ok && data.status === 'authenticated')) {
          if (data.error === 'invalid') toast.error(tx("Code incorrect ({0} essais restants)", [data.remainingAttempts ?? 0]))
          else if (data.error === 'expired') toast.error(tx("Code expire, redemandez-en un"))
          else if (data.error === 'locked') toast.error(tx("Trop de tentatives, redemandez un code"))
          else toast.error(tx("Verification echouee"))
          return
        }
        await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
      } else {
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
        if (error) { toast.error(tx("Code incorrect ou expire")); return }
      }
      const { error: upErr } = await supabase.auth.updateUser({ password })
      if (upErr) { toast.error(tx("Erreur, reessayez")); return }
      toast.success(tx("Mot de passe mis a jour"))
      window.location.href = '/orders'
    } finally { setLoading(false) }
  }

  const seg = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition ${active ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground'}`

  return (
    <AuthShell
      subtitle={tx("Reinitialiser votre mot de passe")}
      footer={<button type="button" onClick={() => { window.location.href = '/login' }} className="inline-flex items-center gap-1 font-medium text-brand hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> {tx("Retour a la connexion")}</button>}
    >
      {step === 'request' ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{tx("Recevoir le code de reinitialisation par :")}</p>
          <div className="flex rounded-lg border border-border bg-muted/40 p-1">
            <button type="button" onClick={() => setChannel('whatsapp')} className={seg(channel === 'whatsapp')}>
              <MessageCircle className="h-4 w-4" /> {tx("WhatsApp")}
            </button>
            <button type="button" onClick={() => setChannel('email')} className={seg(channel === 'email')}>
              <Mail className="h-4 w-4" /> {tx("Email")}
            </button>
          </div>
          {channel === 'whatsapp' ? (
            <input type="tel" placeholder={tx("Telephone du compte (06 ...)")} value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCode()} className={inputCls} />
          ) : (
            <input type="email" placeholder={tx("Email du compte")} value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCode()} className={inputCls} />
          )}
          <button onClick={sendCode} disabled={loading} className={primaryBtn}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tx("Envoyer le code")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button onClick={() => { setStep('request'); setCode('') }} className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {tx("Changer de methode")}
          </button>
          <p className="text-sm text-muted-foreground">
            {channel === 'whatsapp' ? tx("Code envoye sur WhatsApp au {0}", [phone]) : tx("Code envoye par email a {0}", [email])}
          </p>
          <input inputMode="numeric" maxLength={6} placeholder={tx("Code a 6 chiffres")} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={`${inputCls} text-center text-lg tracking-[0.3em]`} />
          <PasswordField value={password} onChange={setPassword} placeholder={tx("Nouveau mot de passe (min. 6)")} />
          <PasswordField value={password2} onChange={setPassword2} placeholder={tx("Confirmer le mot de passe")} onEnter={resetPassword} />
          <button onClick={resetPassword} disabled={loading} className={primaryBtn}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tx("Reinitialiser le mot de passe")}
          </button>
          <button onClick={sendCode} disabled={cooldown > 0 || loading}
            className="text-center text-xs text-brand transition disabled:text-muted-foreground">
            {cooldown > 0 ? tx("Renvoyer dans {0}s", [cooldown]) : tx("Renvoyer le code")}
          </button>
        </div>
      )}
    </AuthShell>
  )
}
