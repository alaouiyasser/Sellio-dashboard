'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Globe, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { apiPost, inputCls, primaryBtn } from '@/lib/auth-client'
import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'

import { tx } from '@/lib/i18n'
import { PLAN_LABEL, PLAN_PRICE_DH, parsePlan, type Plan } from '@/lib/store-api'

const noSubscribe = () => () => {}

export default function SignupPage() {
  const supabase = createClient()
  const [formStep, setStep] = useState<'form' | 'otp'>('form')
  // ?plan=demarrage|croissance from the pricing page is kept and sent to the API. Without it we
  // ask whether the merchant already has a website (yes → Croissance, no → Démarrage).
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => null)
  const ready = search !== null
  const urlPlan = parsePlan(new URLSearchParams(search ?? '').get('plan'))
  const [picked, setPicked] = useState<Plan | null>(null)
  const [asking, setAsking] = useState(false)
  const plan = picked ?? urlPlan
  const step: 'site' | 'form' | 'otp' = !plan || asking ? 'site' : formStep
  function choosePlan(p: Plan) {
    setPicked(p); setAsking(false)
    const u = new URL(window.location.href)
    u.searchParams.set('plan', p)
    window.history.replaceState(null, '', u.toString())
  }
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

      const chosen: Plan = plan ?? 'croissance'
      const { res, data } = await apiPost(`/api/auth/phone/complete-signup?plan=${chosen}`, { phone, email, storeName: store, rememberDevice: true, plan: chosen })
      if (!(res.ok && data.status === 'authenticated')) {
        if (data.error === 'email_already_registered') toast.error(tx("Cet email a deja un compte"))
        else if (data.error === 'phone_already_registered') toast.error(tx("Ce numero a deja un compte"))
        else if (data.error === 'invalid_plan') { toast.error(tx("Plan inconnu, choisissez à nouveau")); setStep('form'); setAsking(true) }
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
      // No website → build the Sellio store; with a website → connect Shopify / YouCan / WooCommerce.
      window.location.href = chosen === 'demarrage' ? '/store' : '/onboarding'
    } finally { setLoading(false) }
  }

  return (
    <AuthShell
      subtitle={tx("Creez votre compte gratuitement")}
      footer={step !== 'otp'
        ? (<>{tx("Deja un compte ?")}{' '}
            <button type="button" onClick={() => { window.location.href = '/login' }}
              className="font-medium text-brand hover:underline">{tx("Se connecter")}</button></>)
        : undefined}
    >
      {!ready ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-brand" /></div>
      ) : step === 'site' ? (
        <div className="flex flex-col gap-3">
          <p className="text-center text-base font-semibold text-foreground">{tx("Vous avez déjà un site ?")}</p>
          <button type="button" onClick={() => choosePlan('croissance')}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-start transition hover:border-brand">
            <Globe className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <span>
              <span className="block text-sm font-semibold text-foreground">{tx("Oui, j'ai un site")}</span>
              <span className="block text-xs text-muted-foreground">{tx("Shopify, YouCan ou WooCommerce : vous le connectez à Sellio.")}</span>
            </span>
          </button>
          <button type="button" onClick={() => choosePlan('demarrage')}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-start transition hover:border-brand">
            <Store className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <span>
              <span className="block text-sm font-semibold text-foreground">{tx("Non, je crée ma boutique Sellio")}</span>
              <span className="block text-xs text-muted-foreground">{tx("Plan Démarrage proposé : inscription gratuite, 0 crédit au départ. Compte activé manuellement après un abonnement à notre Instagram et l’envoi de la capture sur WhatsApp, sans paiement. Ensuite {0} DH par commande livrée.", [PLAN_PRICE_DH])}</span>
            </span>
          </button>
        </div>
      ) : step === 'form' ? (
        <div className="flex flex-col gap-3">
          {plan && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{tx("Plan {0}", [tx(PLAN_LABEL[plan])])}</span>{tx(" : {0} DH par commande livrée", [PLAN_PRICE_DH])}
              </span>
              <button type="button" onClick={() => setAsking(true)} className="shrink-0 font-medium text-brand hover:underline">{tx("Changer")}</button>
            </div>
          )}
          {plan === 'demarrage' && (
            <p className="text-xs text-muted-foreground">{tx("Inscription gratuite, 0 crédit au départ. Pour activer votre compte : abonnez-vous à notre Instagram et envoyez la capture sur WhatsApp. Aucun paiement.")}</p>
          )}
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
