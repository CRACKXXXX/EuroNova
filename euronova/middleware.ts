import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  // Primero, dejamos que next-intl haga el match de rutas de idioma y devuelva la respuesta base
  const response = intlMiddleware(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              maxAge: options?.maxAge ?? 60 * 60 * 24 * 30, // 30-day persistent session
              path: options?.path ?? '/',
              sameSite: options?.sameSite ?? 'lax',
            })
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Extraer el path quitando el locale con delimitador de frontera seguro (ej: /es/dashboard -> /dashboard)
  const pathname = request.nextUrl.pathname
  const localeRegex = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`)
  const localeMatch = pathname.match(localeRegex)
  const currentLocale = localeMatch ? localeMatch[1] : routing.defaultLocale
  const pathWithoutLocale = pathname.replace(localeRegex, '') || '/'

  // Helper para propagar cookies acumuladas durante redirecciones de autenticación
  const createRedirectResponse = (targetUrl: URL) => {
    const redirectResponse = NextResponse.redirect(targetUrl)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // Interceptar si llega un query param ?code= en la raíz (ej. si Supabase redirige al Site URL root)
  const codeParam = request.nextUrl.searchParams.get('code')
  if (codeParam && (pathWithoutLocale === '/' || pathname === '/')) {
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.searchParams.set('code', codeParam)
    callbackUrl.searchParams.set('next', '/dashboard')
    return createRedirectResponse(callbackUrl)
  }

  // Lista estricta y blindada de rutas públicas accesibles sin autenticación
  const isPublicRoute =
    pathWithoutLocale === '/' ||
    pathWithoutLocale.startsWith('/login') ||
    pathWithoutLocale.startsWith('/signup') ||
    pathWithoutLocale.startsWith('/support') ||
    pathWithoutLocale.startsWith('/legal')

  // Redirección inquebrantable si no hay usuario autenticado intentando acceder a rutas protegidas
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = `/${currentLocale}/login`
    url.searchParams.set('next', pathname)
    return createRedirectResponse(url)
  }

  // Si el usuario ya está autenticado e intenta ir a la raíz pública (/ o /{locale}) o a login/signup,
  // enviarlo inmediatamente al dashboard
  if (user && (pathWithoutLocale === '/' || pathWithoutLocale.startsWith('/login') || pathWithoutLocale.startsWith('/signup'))) {
    const url = request.nextUrl.clone()
    url.pathname = `/${currentLocale}/dashboard`
    url.search = ''
    return createRedirectResponse(url)
  }

  return response
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|auth|.*\\..*).*)',
  ]
}
