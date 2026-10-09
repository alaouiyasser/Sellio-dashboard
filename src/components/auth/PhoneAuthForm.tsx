'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { apiPost, inputCls, primaryBtn } from '@/lib/auth-client'

type Step = 'phone' | 'otp' | 'signup'

export function PhoneAuthForm({
  loginDest = '/orders',
  signupDest = '/onboarding',
}: {
  loginDest?: string
  signupDest?: string
}) {
  const supabase = createClient()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('phone')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [suEmail, setSuEmail] = useState('')
  const [suStore, setSuStore] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  async function finishAuth(data: any, dest: string) {
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    window.location.href = dest
  }

  async function requestOtp() {
    if (!phone.trim()) { toast.error('Entrez votre numéro'); return }
    setLoading(true)
    try {
      const { res, data } = await apiPost('/api/auth/phone/request-otp', { phone })
      if (!res.ok || !data.ok) {
        if (data.error === 'rate_limited' || data.error === 'cooldown') {
          toast.error(`Réessayez dans ${data.retryAfterSeconds ?? 60}s`)
          setCooldown(data.retryAfterSeconds ?? 60)
        } else if (data.error === 'invalid_phone') toast.error('Numéro invalide')
        else toast.error("Échec d'envoi du code")
        return
      }
      setStep('otp')
      setCooldown(data.cooldownSeconds ?? 60)
      toast.success('Code envoyé sur WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(code)) { toast.error('Entrez le code à 6 chiffres'); return }
    setLoading(true)
    try {
      const { res, data } = await apiPost('/api/auth/phone/verify-otp', {
        phone, code, rememberDevice: remember,
      })
      if (res.ok && data.status === 'authenticated') { await finishAuth(data, loginDest); return }
      if (res.ok && data.status === 'needs_signup') {
        setStep('signup')
        toast.info('Nouveau compte — complétez vos infos')
        return
      }
      if (data.error === 'invalid') toast.error(`Code incorrect (${data.remainingAttempts ?? 0} essais restants)`)
      else if (data.error === 'expired') toast.error('Code expiré, redemandez-en un')
      else if (data.error === 'locked') toast.error('Trop de tentatives, redemandez un code')
      else toast.error('Vérification échouée')
    } finally {
      setLoading(false)
    }
  }

  async function completeSignup() {
    if (suStore.trim().length < 2) { toast.error('Nom de boutique requis'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suEmail)) { toast.error('Email invalide'); return }
    setLoading(true)
    try {
      const { res, data } = await apiPost('/api/auth/phone/complete-signup', {
        phone, email: suEmail, storeName: suStore, rememberDevice: remember,
      })
      if (res.ok && data.status === 'authenticated') {
        toast.success('Compte créé 🎉')
        await finishAuth(data, signupDest)
        return
      }
      if (data.error === 'email_already_registered') toast.error('Cet email a déjà un compte')
      else if (data.error === 'phone_already_registered') toast.error('Ce numéro a déjà un compte')
      else if (data.error === 'phone_not_verified') { toast.error('Session expirée, recommencez'); setStep('phone'); setCode('') }
      else toast.error('Création échouée')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'phone') {
    return (
      <div className="flex flex-col gap-3">
        <input type="tel" placeholder="06 12 34 56 78" value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && requestOtp()} className={inputCls} />
        <button onClick={requestOtp} disabled={loading} className={primaryBtn}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Recevoir le code'}
        </button>
        <p className="text-center text-xs text-muted-foreground">Un code WhatsApp vous sera envoyé</p>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => { setStep('phone'); setCode('') }}
          className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Changer de numéro
        </button>
        <input inputMode="numeric" maxLength={6} placeholder="Code à 6 chiffres" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
          className={`${inputCls} text-center text-lg tracking-[0.3em]`} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--brand)]" />
          Se souvenir de cet appareil
        </label>
        <button onClick={verifyOtp} disabled={loading} className={primaryBtn}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Vérifier'}
        </button>
        <button onClick={requestOtp} disabled={cooldown > 0 || loading}
          className="text-center text-xs text-brand transition disabled:text-muted-foreground">
          {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : 'Renvoyer le code'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-brand/5 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand" /> Numéro vérifié — créez votre compte
      </div>
      <input placeholder="Nom de votre boutique" value={suStore}
        onChange={(e) => setSuStore(e.target.value)} className={inputCls} />
      <input type="email" placeholder="Email" value={suEmail}
        onChange={(e) => setSuEmail(e.target.value)} className={inputCls} />
      <button onClick={completeSignup} disabled={loading} className={primaryBtn}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer mon compte'}
      </button>
    </div>
  )
}
