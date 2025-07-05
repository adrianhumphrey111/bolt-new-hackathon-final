"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAuthContext } from './AuthProvider';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function AuthTokenHandler() {
  const router = useRouter();
  const { refreshAuth } = useAuthContext();

  useEffect(() => {
    const handleAuthTokens = async () => {
      // Check if we have auth tokens in the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('token_type');

      if (accessToken && refreshToken && tokenType === 'bearer') {
        console.log('🔑 Auth tokens found in URL, setting session...');
        
        try {
          // Set impersonation flag in sessionStorage
          sessionStorage.setItem('isImpersonating', 'true');
          
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            return;
          }

          if (data.session) {
            console.log('✅ Session set successfully for user:', data.session.user.email);
            
            // Clean up the URL by removing the hash
            const cleanUrl = window.location.pathname + window.location.search;
            window.history.replaceState({}, document.title, cleanUrl);
            
            // Refresh auth context instead of reloading the page
            await refreshAuth();
          }
        } catch (error) {
          console.error('Error processing auth tokens:', error);
        }
      }
    };

    // Run the handler
    handleAuthTokens();
  }, [router, refreshAuth]);

  // This component doesn't render anything
  return null;
}