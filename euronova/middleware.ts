import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  // Primero, dejamos que next-intl haga el match de rutas de idioma y devuelva la respuesta base
  let response = intlMiddleware(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Extraer el path quitando el locale (ej: /es/dashboard -> /dashboard)
  const pathname = request.nextUrl.pathname
  const localeRegex = new RegExp(`^/(${routing.locales.join('|')})`)
  const pathWithoutLocale = pathname.replace(localeRegex, '') || '/'

  if (!user && pathWithoutLocale.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = `/${routing.defaultLocale}/login` // Redirigir al login en el idioma por defecto
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ]
}
