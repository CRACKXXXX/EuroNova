import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // We don't use locale in next, we can just redirect to dashboard and middleware will prefix it
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if user has a profile, if not create a youth profile by default
      const { data: youthData } = await supabase.from('users_youth').select('id').eq('id', data.user.id).single()
      const { data: orgData } = await supabase.from('users_org').select('id').eq('id', data.user.id).single()
      
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
