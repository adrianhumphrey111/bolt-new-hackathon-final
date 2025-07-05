import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { addEmailToMailchimp } from '../../../lib/mailchimp'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=callback_error&message=${encodeURIComponent(error.message)}`)
    }

    // Add user to Mailchimp if this is a new user
    if (data?.user?.email) {
      try {
        // Check if this is a new user (created recently)
        const userCreatedAt = new Date(data.user.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - userCreatedAt.getTime();
        const isNewUser = timeDiff < 5 * 60 * 1000; // Created within last 5 minutes

        if (isNewUser) {
          console.log('🔍 Adding new user to Mailchimp:', data.user.email);
          const mailchimpResult = await addEmailToMailchimp(
            data.user.email,
            data.user.user_metadata?.full_name?.split(' ')[0] || data.user.user_metadata?.name?.split(' ')[0],
            data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || data.user.user_metadata?.name?.split(' ').slice(1).join(' '),
            ['New User', 'OAuth Signup']
          );
          
          if (mailchimpResult.success) {
            console.log('✅ Successfully added user to Mailchimp');
          } else {
            console.error('❌ Failed to add user to Mailchimp:', mailchimpResult.error);
          }
        }
      } catch (mailchimpError) {
        console.error('❌ Mailchimp integration error during OAuth callback:', mailchimpError);
        // Don't fail the auth process if Mailchimp fails
      }
    }
  }

  // Force redirect to the correct domain for dashboard
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const redirectUrl = `${siteUrl}${next}`;
    
  return NextResponse.redirect(redirectUrl)
}