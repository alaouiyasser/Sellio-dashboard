'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { primaryBtn } from '@/lib/auth-client'
import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'

import { tx } from '@/lib/i18n'
export default function ResetPage() {
  const supabase = createClient()
  const [ready, setReady] = useState(false)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      try {
        const url = new URL(window.location.href)
        const tokenHash = url.searchParams.get('token_hash')
        const type = url.searchParams.get('type')
        const code = url.searchParams.get('code')
        if (tokenHash && type) {
          await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any }).catch(() => {})
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code).catch(() => {})
        }
      } catch {}
      const { data } = await supabase.auth.getSession()
      if (data.session) { setReady(true); setChecked(true); return }
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session) { setReady(true); setChecked(true) }
      })
      unsub = () => sub.subscription.unsubscribe()
      setTimeout(() => setChecked(true), 3000)
    })()
    return () => unsub()
  }, [])

  async function submit() {
    if (password.length < 6) { toast.error(tx("Mot de passe min. 6 caracteres")); return }
    if (password !== password2) { toast.error(tx("Les mots de passe ne correspondent pas")); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { toast.error(tx("Lien expire, recommencez")); return }
    toast.success(tx("Mot de passe mis a jour"))
    window.location.href = '/orders'
  }

  return (
    <AuthShell subtitle={tx("Choisissez un nouveau mot de passe")}>
      {ready ? (
        <div className="flex flex-col gap-3">
          <PasswordField value={password} onChange={setPassword} placeholder={tx("Nouveau mot de passe (min. 6)")} />
          <PasswordField value={password2} onChange={setPassword2} placeholder={tx("Confirmer le mot de passe")} onEnter={submit} />
          <button onClick={submit} disabled={loading} className={primaryBtn}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tx("Mettre a jour")}
          </button>
        </div>
      ) : !checked ? (
        <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">{tx("Lien invalide ou expire. Redemandez un lien depuis \"Mot de passe oublie\".")}</p>
      )}
    </AuthShell>
  )
}
