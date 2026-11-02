import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { routing } from '@/i18n/routing';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // Sanitize next parameter to prevent open redirect vulnerabilities
  const rawNext = requestUrl.searchParams.get('next') ?? '/dashboard';
  const sanitizedNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  // Support Vercel reverse proxy / load balancer headers
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const origin = isLocalEnv
    ? requestUrl.origin
    : (forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin);

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const currentLocale = (localeCookie && (routing.locales as readonly string[]).includes(localeCookie))
    ? localeCookie
    : routing.defaultLocale;

  // Ensure target has locale prefix if not present (e.g., /dashboard -> /es/dashboard)
  const hasLocalePrefix = (routing.locales as readonly string[]).some((loc) =>
    sanitizedNext === `/${loc}` || sanitizedNext.startsWith(`/${loc}/`)
  );
  const targetPath = hasLocalePrefix ? sanitizedNext : `/${currentLocale}${sanitizedNext}`;
  const destinationUrl = `${origin}${targetPath}`;

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, {
                  ...options,
                  maxAge: 2592000,
                  path: '/',
                  sameSite: 'lax',
                  secure: process.env.NODE_ENV === 'production',
                });
              } catch {
                // Silently catch in server context
              }
            });
          },
        },
      }
    );

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      try {
        // Check if user has a profile, if not create a youth profile by default
        const [{ data: youthData }, { data: orgData }] = await Promise.all([
          supabase.from('users_youth').select('id').eq('id', data.user.id).maybeSingle(),
          supabase.from('users_org').select('id').eq('id', data.user.id).maybeSingle(),
        ]);

        if (!youthData && !orgData) {
          // Create default youth profile
          await supabase.from('users_youth').upsert({
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
            avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
          });
        }
      } catch (profileErr) {
        console.error("Profile check/creation error during OAuth callback:", profileErr);
      }

      // Fully await and verify session is active before redirecting
      await supabase.auth.getUser();

      const response = NextResponse.redirect(destinationUrl);

      // Explicitly set all cookies on the response object created via NextResponse.redirect
      cookieStore.getAll().forEach((cookie) => {
        response.cookies.set({
          name: cookie.name,
          value: cookie.value,
          path: '/',
          sameSite: 'lax',
          maxAge: 2592000,
          secure: process.env.NODE_ENV === 'production',
        });
      });

      return response;
    } else {
      console.error("Auth callback error:", error);
    }
  }

  // Return the user to login with instructions and preserve locale
  const errorTarget = `/${currentLocale}/login?error=oauth_error`;
  const errorDestinationUrl = `${origin}${errorTarget}`;
  const errorResponse = NextResponse.redirect(errorDestinationUrl);
  cookieStore.getAll().forEach((cookie) => {
    errorResponse.cookies.set({
      name: cookie.name,
      value: cookie.value,
      path: '/',
      sameSite: 'lax',
      maxAge: 2592000,
      secure: process.env.NODE_ENV === 'production',
    });
  });
  return errorResponse;
}
