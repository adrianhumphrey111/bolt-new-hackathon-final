import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { addEmailToMailchimp } from '../../../lib/mailchimp'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
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

    // Handle password recovery flow
    if (type === 'recovery') {
      return NextResponse.redirect(`${requestUrl.origin}/auth/reset-password`)
    }

    // Handle new user flow
    if (data?.user?.email) {
      try {
        // Check if this is a new user (created recently)
        const userCreatedAt = new Date(data.user.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - userCreatedAt.getTime();
        const isNewUser = timeDiff < 5 * 60 * 1000; // Created within last 5 minutes

        console.log('🔍 OAuth user info:', {
          email: data.user.email,
          userId: data.user.id,
          createdAt: data.user.created_at,
          isNewUser,
          timeDiff: `${timeDiff}ms`
        });

        if (isNewUser) {
          console.log('🔍 Adding new user to Mailchimp:', data.user.email);
          // Add to Mailchimp (don't block on this)
          addEmailToMailchimp(
            data.user.email,
            data.user.user_metadata?.full_name?.split(' ')[0] || data.user.user_metadata?.name?.split(' ')[0],
            data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || data.user.user_metadata?.name?.split(' ').slice(1).join(' '),
            ['New User', 'OAuth Signup']
          ).then(result => {
            if (result.success) {
              console.log('✅ Successfully added user to Mailchimp');
            } else {
              console.error('❌ Failed to add user to Mailchimp:', result.error);
            }
          }).catch(error => {
            console.error('❌ Mailchimp integration error:', error);
          });
          
          // For new OAuth users, always redirect to trial signup
          const isDevelopment = process.env.NODE_ENV === 'development' || requestUrl.hostname === 'localhost';
          const siteUrl = isDevelopment ? requestUrl.origin : (process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin);
          const trialRedirectUrl = `${siteUrl}/auth/trial-signup?email=${encodeURIComponent(data.user.email)}`;
          
          console.log('🚀 Redirecting new OAuth user to trial:', trialRedirectUrl);
          return NextResponse.redirect(trialRedirectUrl);
        }
      } catch (error) {
        console.error('❌ Error processing new user flow:', error);
        // Continue to normal flow if there's an error
      }
    }
  }

  // Use the request origin for development, or the configured site URL for production
  const isDevelopment = process.env.NODE_ENV === 'development' || requestUrl.hostname === 'localhost';
  const siteUrl = isDevelopment ? requestUrl.origin : (process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin);
  const redirectUrl = `${siteUrl}${next}`;
  
  console.log('🔄 Auth callback redirect:', {
    isDevelopment,
    hostname: requestUrl.hostname,
    origin: requestUrl.origin,
    siteUrl,
    redirectUrl
  });
    
  return NextResponse.redirect(redirectUrl)
}