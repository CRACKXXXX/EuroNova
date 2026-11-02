import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { routing } from '@/i18n/routing';

interface TrackedCookie {
  name: string;
  value: string;
  options: {
    path?: string;
    maxAge?: number;
    domain?: string;
    sameSite?: 'lax' | 'strict' | 'none';
    secure?: boolean;
    httpOnly?: boolean;
  };
}

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
    const trackedCookies: TrackedCookie[] = [];

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
                });
              } catch {
                // Silently catch if in non-writable context
              }
              const sameSiteVal: 'lax' | 'strict' | 'none' =
                typeof options?.sameSite === 'string'
                  ? (options.sameSite.toLowerCase() as 'lax' | 'strict' | 'none')
                  : 'lax';

              trackedCookies.push({
                name,
                value,
                options: {
                  ...options,
                  maxAge: 2592000,
                  path: '/',
                  sameSite: sameSiteVal,
                  secure: process.env.NODE_ENV === 'production',
                },
              });
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

      // Return a 200 HTML response with meta-refresh and script redirect.
      // This forces Chromium / Safari on Vercel to commit all Set-Cookie directives into persistent storage
      // prior to executing navigation, entirely eliminating the double-login race condition.
      const htmlBody = `<!DOCTYPE html>
<html lang="${currentLocale}">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${destinationUrl}">
  <title>Authenticating | EuroNova</title>
  <style>
    body {
      background-color: #08090E;
      color: #00E5FF;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      text-align: center;
      padding: 2.5rem;
      border-radius: 1.25rem;
      background: #111420;
      border: 1px solid #1E2640;
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.9), 0 0 25px rgba(0, 229, 255, 0.2);
      max-width: 420px;
      margin: 1rem;
    }
    h2 { margin: 0 0 0.5rem 0; font-size: 1.25rem; color: #FFFFFF; }
    p { color: #9CA3AF; font-size: 0.875rem; margin: 0 0 1.25rem 0; }
    a { color: #6366F1; font-size: 0.875rem; text-decoration: underline; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Connecting to EuroNova...</h2>
    <p>Session authenticated. Synchronizing orbital protocols...</p>
    <a href="${destinationUrl}">Proceed to Dashboard</a>
  </div>
  <script>
    window.location.replace(${JSON.stringify(destinationUrl)});
  </script>
</body>
</html>`;

      const response = new NextResponse(htmlBody, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      // Explicitly inject all tracked session cookies and all cookies from cookieStore.getAll()
      // into this HTML response using response.cookies.set() with path: '/', sameSite: 'lax', and maxAge: 2592000
      trackedCookies.forEach(({ name, value }) => {
        response.cookies.set(name, value, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 2592000,
        });
      });

      cookieStore.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 2592000,
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
    errorResponse.cookies.set(cookie.name, cookie.value, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2592000,
    });
  });
  return errorResponse;
}
