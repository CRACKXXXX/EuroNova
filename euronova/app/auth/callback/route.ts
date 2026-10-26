import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Sanitize next parameter to prevent open redirect vulnerabilities
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if user has a profile, if not create a youth profile by default
      const [{ data: youthData }, { data: orgData }] = await Promise.all([
        supabase.from('users_youth').select('id').eq('id', data.user.id).single(),
        supabase.from('users_org').select('id').eq('id', data.user.id).single(),
      ]);
      
      if (!youthData && !orgData) {
        // Create default youth profile
        await supabase.from('users_youth').upsert({ id: data.user.id, full_name: data.user.user_metadata?.full_name || null })
      }
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error("Auth callback error:", error)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=oauth_error`)
}
