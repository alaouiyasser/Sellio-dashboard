import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { STORE_HOST_HEADER, storeSlugFromHost } from '@/lib/storefront-host'

const PUBLIC_PREFIXES = ['/login', '/signup', '/auth', '/storefront']

export async function proxy(request: NextRequest) {
  // <slug>.sellioagency.store → the public store. No auth, no Supabase: buyers have no session.
  const slug = storeSlugFromHost(request.headers.get('host'))
  if (slug) {
    const url = request.nextUrl.clone()
    url.pathname = `/storefront/${slug}${request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname}`
    const headers = new Headers(request.headers)
    headers.set(STORE_HOST_HEADER, '1')
    return NextResponse.rewrite(url, { request: { headers } })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/orders', request.url))
  }

  return supabaseResponse
}

export const config = {
  // storefront-api: the store pages' POST /s/<slug>/orders (next.config.ts rewrite), on every host.
  matcher: ['/((?!api|webhook|storefront-api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/|apple-icon|icon.svg).*)'],
}
