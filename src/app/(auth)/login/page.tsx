'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { apiPost, inputCls, primaryBtn } from '@/lib/auth-client'
import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export default function LoginPage() {
  const supabase = createClient()
  const [restoring, setRestoring] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/auth/reset'
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      if (window.location.hash.includes('type=recovery')) { return }
      try {
        const { res, data } = await apiPost('/api/auth/session/restore', {})
        if (!cancel && res.ok && data?.status === 'authenticated') {
          await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
          window.location.href = '/orders'
          return
        }
      } catch {}
      if (!cancel) setRestoring(false)
    })()
    return () => { cancel = true }
  }, [])

  async function googleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) toast.error(error.message)
  }

  async function emailLogin() {
    if (!email || !password) { toast.error('Remplissez email et mot de passe'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) toast.error('Email ou mot de passe incorrect')
    else window.location.href = '/orders'
    setLoading(false)
  }

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <AuthShell
      subtitle="Connectez-vous a votre dashboard"
      footer={
        <>Pas encore de compte ?{' '}
          <button type="button" onClick={() => { window.location.href = '/signup' }}
            className="font-medium text-brand hover:underline">Creer un compte</button>
        </>
      }
    >
      <button onClick={googleLogin}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/50">
        <GoogleIcon /> Continuer avec Google
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        <PasswordField value={password} onChange={setPassword} placeholder="Mot de passe" onEnter={emailLogin} />
        <div className="flex justify-end">
          <button type="button" onClick={() => { window.location.href = '/auth/forgot' }}
            className="text-xs text-muted-foreground transition hover:text-brand">Mot de passe oublie ?</button>
        </div>
        <button onClick={emailLogin} disabled={loading} className={`${primaryBtn} mt-1`}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Se connecter'}
        </button>
      </div>
    </AuthShell>
  )
}
