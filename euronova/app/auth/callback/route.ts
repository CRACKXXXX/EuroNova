import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { routing } from '@/i18n/routing';

interface PendingCookie {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: true | false | 'lax' | 'strict' | 'none';
    secure?: boolean;
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const currentLocale = (localeCookie && (routing.locales as readonly string[]).includes(localeCookie))
    ? localeCookie
    : routing.defaultLocale;

  // Retrieve destination from query param, fallback to persistent short-lived auth cookie, or default
  const authNextCookie = cookieStore.get('euronova_auth_next')?.value;
  const rawNext = requestUrl.searchParams.get('next') || authNextCookie || '/dashboard';

  // Sanitize next parameter to prevent open redirect vulnerabilities
  let sanitizedNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  // Strip leading locale if redundant in sanitizedNext so we get the pure subpath
  for (const loc of routing.locales) {
    if (sanitizedNext === `/${loc}`) {
      sanitizedNext = '/dashboard';
      break;
    } else if (sanitizedNext.startsWith(`/${loc}/`)) {
      sanitizedNext = sanitizedNext.slice(loc.length + 1);
      break;
    }
  }

  // Strictly forbid landing on root or landing pages; default to /dashboard
  if (sanitizedNext === '/' || sanitizedNext === '') {
    sanitizedNext = '/dashboard';
  }

  // Consistent origin resolution: keep the client on the exact origin that initiated OAuth
  const origin = requestUrl.origin;
  const destinationUrl = `${origin}/${currentLocale}${sanitizedNext}`;

  // Collector for cookies emitted by Supabase during exchangeCodeForSession or verifyOtp
  const pendingCookies: PendingCookie[] = [];

  if (code || (token_hash && type)) {
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
              pendingCookies.push({ name, value, options });
              try {
                cookieStore.set(name, value, {
                  ...options,
                  maxAge: 2592000,
                  path: '/',
                  sameSite: 'lax',
                  secure: process.env.NODE_ENV === 'production',
                });
              } catch {
                // Expected in Next.js 15 GET Route Handlers
              }
            });
          },
        },
      }
    );

    let authError: Error | null = null;
    let authUser = null;

    if (code) {
      const { error, data } = await supabase.auth.exchangeCodeForSession(code);
      authError = error;
      authUser = data?.user ?? null;
    } else if (token_hash && type) {
      const { error, data } = await supabase.auth.verifyOtp({ token_hash, type });
      authError = error;
      authUser = data?.user ?? null;
    }

    if (!authError && authUser) {
      try {
        const authRoleCookie = cookieStore.get('euronova_auth_role')?.value;
        const [{ data: youthData }, { data: orgData }] = await Promise.all([
          supabase.from('users_youth').select('id').eq('id', authUser.id).maybeSingle(),
          supabase.from('users_org').select('id').eq('id', authUser.id).maybeSingle(),
        ]);

        if (!youthData && !orgData) {
          if (authRoleCookie === 'org') {
            const randomPic = '9' + Math.floor(10000000 + Math.random() * 90000000).toString();
            await supabase.from('users_org').upsert({
              id: authUser.id,
              org_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'European Organization',
              pic_number: randomPic,
              country_hq: 'ES',
              is_verified: false,
            });
          } else {
            // Create default youth profile with required constraint fields satisfied
            await supabase.from('users_youth').upsert({
              id: authUser.id,
              full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'European Youth',
              birth_date: '2000-01-01',
              country_code: 'ES',
              is_rup_region: false,
              interests: [],
            });
          }
        }
      } catch (profileErr) {
        console.error("Profile check/creation error during OAuth callback:", profileErr);
      }

      const response = NextResponse.redirect(destinationUrl);

      // Copy existing incoming cookies
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

      // Explicitly set all cookies emitted by Supabase session exchange
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set({
          name,
          value,
          path: options?.path ?? '/',
          sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
          maxAge: options?.maxAge ?? 2592000,
          secure: process.env.NODE_ENV === 'production',
        });
      });

      // Erase temporary auth next and role cookies
      if (authNextCookie) {
        response.cookies.set({
          name: 'euronova_auth_next',
          value: '',
          path: '/',
          maxAge: 0,
        });
      }
      if (cookieStore.get('euronova_auth_role')?.value) {
        response.cookies.set({
          name: 'euronova_auth_role',
          value: '',
          path: '/',
          maxAge: 0,
        });
      }

      return response;
    } else {
      console.error("Auth callback error:", authError);
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

  pendingCookies.forEach(({ name, value, options }) => {
    errorResponse.cookies.set({
      name,
      value,
      path: options?.path ?? '/',
      sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
      maxAge: options?.maxAge ?? 2592000,
      secure: process.env.NODE_ENV === 'production',
    });
  });

  return errorResponse;
}
