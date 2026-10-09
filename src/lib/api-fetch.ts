import { createClient } from './supabase'

let client: ReturnType<typeof createClient> | null = null

/**
 * fetch() for Sellio API calls: attaches the Supabase access token
 * (`Authorization: Bearer …`). The API no longer trusts a tenantId in the URL
 * on its own — every dashboard → API call must go through this.
 * getSession() refreshes an expired token automatically.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  client ??= createClient()
  const { data } = await client.auth.getSession()
  const token = data.session?.access_token

  const headers = new Headers(init.headers)
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

  return fetch(input, { credentials: 'include', ...init, headers })
}
