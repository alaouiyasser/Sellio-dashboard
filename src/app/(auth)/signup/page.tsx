'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { apiPost, inputCls, primaryBtn } from '@/lib/auth-client'
import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'

import { tx } from '@/lib/i18n'
export default function SignupPage() {
  const supabase = createClient()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const [name, setName] = useState('')
  const [store, setStore] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  function validForm(): string | null {
    if (!name.trim()) return 'Entrez votre nom et prenom'
    if (store.trim().length < 2) return 'Nom de boutique requis'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalide'
    if (!phone.trim()) return 'Entrez votre numero'
    if (password.length < 6) return 'Mot de passe min. 6 caracteres'
    if (password !== password2) return 'Les mots de passe ne correspondent pas'
    return null
  }

  async function sendOtp() {
    const err = validForm()
    if (err) { toast.error(err); return }
    setLoading(true)
    try {
      const { res, data } = await apiPost('/api/auth/phone/request-otp', { phone })
      if (!res.ok || !data.ok) {
        if (data.error === 'invalid_phone') toast.error(tx("Numero invalide"))
        else if (data.error === 'rate_limited' || data.error === 'cooldown') {
          toast.error(tx("Reessayez dans {0}s", [data.retryAfterSeconds ?? 60])); setCooldown(data.retryAfterSeconds ?? 60)
        } else toast.error(tx("Impossible d'envoyer le code WhatsApp pour le moment. Reessayez dans quelques minutes."))
        return
      }
      setStep('otp'); setCooldown(data.cooldownSeconds ?? 60)
      toast.success(tx("Code envoye sur WhatsApp"))
    } finally { setLoading(false) }
  }

  async function verifyAndCreate() {
    if (!/^\d{6}$/.test(code)) { toast.error(tx("Entrez le code a 6 chiffres")); return }
    setLoading(true)
    try {
      const v = await apiPost('/api/auth/phone/verify-otp', { phone, code })
      if (v.res.ok && v.data.status === 'authenticated') { toast.error(tx("Ce numero a deja un compte")); return }
      if (!(v.res.ok && v.data.status === 'needs_signup')) {
        if (v.data.error === 'invalid') toast.error(tx("Code incorrect ({0} essais restants)", [v.data.remainingAttempts ?? 0]))
        else if (v.data.error === 'expired') toast.error(tx("Code expire, redemandez-en un"))
        else toast.error(tx("Verification echouee"))
        return
      }

      const { res, data } = await apiPost('/api/auth/phone/complete-signup', { phone, email, storeName: store, rememberDevice: true })
      if (!(res.ok && data.status === 'authenticated')) {
        if (data.error === 'email_already_registered') toast.error(tx("Cet email a deja un compte"))
        else if (data.error === 'phone_already_registered') toast.error(tx("Ce numero a deja un compte"))
        else toast.error(tx("Creation echouee"))
        return
      }

      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
      await supabase.auth.updateUser({ password })
      const { data: u } = await supabase.auth.getUser()
      if (u.user) {
        // City, niche, source and volume are asked once, in onboarding step 1.
        await supabase.from('tenants').update({ owner_name: name.trim() }).eq('id', u.user.id)
      }

      toast.success(tx("Compte cree"))
      window.location.href = '/onboarding'
    } finally { setLoading(false) }
  }

  return (
    <AuthShell
      subtitle={tx("Creez votre compte gratuitement")}
      footer={step === 'form'
        ? (<>{tx("Deja un compte ?")}{' '}
            <button type="button" onClick={() => { window.location.href = '/login' }}
              className="font-medium text-brand hover:underline">{tx("Se connecter")}</button></>)
        : undefined}
    >
      {step === 'form' ? (
        <div className="flex flex-col gap-3">
          <input autoComplete="name" placeholder={tx("Nom et prenom")} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          <input autoComplete="organization" placeholder={tx("Nom de la boutique")} value={store} onChange={(e) => setStore(e.target.value)} className={inputCls} />
          <input type="email" autoComplete="email" placeholder={tx("Email")} value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          <input type="tel" autoComplete="tel" placeholder={tx("Telephone (06 ...)")} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          <PasswordField value={password} onChange={setPassword} placeholder={tx("Mot de passe (min. 6)")} autoComplete="new-password" />
          <PasswordField value={password2} onChange={setPassword2} placeholder={tx("Confirmer le mot de passe")} autoComplete="new-password" />
          <button onClick={sendOtp} disabled={loading} className={primaryBtn}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tx("Continuer")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button onClick={() => { setStep('form'); setCode('') }} className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {tx("Modifier mes infos")}
          </button>
          <p className="text-sm text-muted-foreground">{tx("Un code a ete envoye sur WhatsApp au")} {phone}</p>
          <input inputMode="numeric" maxLength={6} placeholder={tx("Code a 6 chiffres")} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && verifyAndCreate()}
            className={`${inputCls} text-center text-lg tracking-[0.3em]`} />
          <button onClick={verifyAndCreate} disabled={loading} className={primaryBtn}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tx("Verifier et creer mon compte")}
          </button>
          <button onClick={sendOtp} disabled={cooldown > 0 || loading}
            className="text-center text-xs text-brand transition disabled:text-muted-foreground">
            {cooldown > 0 ? tx("Renvoyer dans {0}s", [cooldown]) : tx("Renvoyer le code")}
          </button>
        </div>
      )}
    </AuthShell>
  )
}
