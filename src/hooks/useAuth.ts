'use client'

import { useState, useEffect, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClientSupabaseClient } from '../lib/supabase/client'
import { trackUserLogin, trackUserSignUp, trackSignupSource } from '../lib/analytics/gtag'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })

  const supabase = createClientSupabaseClient()

  const refreshAuth = useCallback(async () => {
    try {
      console.log('🔄 Refreshing auth state...')
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        throw sessionError
      }

      console.log('✅ Auth state refreshed:', { 
        hasUser: !!session?.user, 
        userId: session?.user?.id,
        email: session?.user?.email 
      })

      setAuthState({
        user: session?.user || null,
        session: session,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('❌ Auth refresh error:', error)
      setAuthState({
        user: null,
        session: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      })
    }
  }, [supabase])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      setAuthState({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      })

      // Track successful login
      trackUserLogin('email')

      return { success: true, user: data.user }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }, [supabase])

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }

      console.log('🔐 Signup response:', { user: data.user, session: data.session });

      // With email verification disabled, user should be immediately authenticated
      if (!data.session) {
        throw new Error('Expected session after signup but none received');
      }

      setAuthState({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      })

      // Add user to Mailchimp for email signups (non-blocking)
      if (data.user?.email) {
        // Don't await this - let it run in background
        fetch('/api/mailchimp/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.user.email,
            tags: ['New User', 'Email Signup']
          })
        }).then(response => {
          if (response.ok) {
            console.log('✅ Successfully added email signup to Mailchimp');
          } else {
            response.json().then(errorData => {
              console.warn('⚠️ Failed to add email signup to Mailchimp:', errorData);
            }).catch(() => {
              console.warn('⚠️ Failed to add email signup to Mailchimp (response not JSON)');
            });
          }
        }).catch(mailchimpError => {
          console.warn('⚠️ Mailchimp integration error during email signup:', mailchimpError);
          // Don't fail the signup process if Mailchimp fails
        });
      }

      // Track successful signup with source
      trackUserSignUp('email')
      trackSignupSource('email')

      return { 
        success: true, 
        user: data.user,
        message: 'Account created and logged in successfully!'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }

      setAuthState({
        user: null,
        session: null,
        loading: false,
        error: null,
      })

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }, [supabase])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    try {
      // Use the current origin for localhost development, configured URL for production
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUrl = isDevelopment 
        ? `${window.location.origin}/auth/callback`
        : (process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` : `${window.location.origin}/auth/callback`);
      
      console.log('🔄 OAuth redirect URL:', {
        provider,
        isDevelopment,
        hostname: window.location.hostname,
        origin: window.location.origin,
        redirectUrl
      });
        
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) {
        throw error
      }

      // Track successful OAuth login with source
      trackUserLogin(provider)
      trackSignupSource(provider)

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OAuth sign in failed'
      setAuthState(prev => ({
        ...prev,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }, [supabase])

  // Initialize auth state and set up listener
  useEffect(() => {
    refreshAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        setAuthState({
          user: session?.user || null,
          session: session,
          loading: false,
          error: null,
        })
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, refreshAuth])

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    refreshAuth,
    isAuthenticated: !!authState.user,
    userId: authState.user?.id || null,
  }
}