// Direct Supabase upgrade function - run this in browser console
// This bypasses API auth issues by using Supabase client directly

async function upgradeToProDirect() {
  try {
    console.log('🚀 Starting direct Pro upgrade...');
    
    // Create Supabase client using the same config as your app
    const { createBrowserClient } = await import('@supabase/ssr');
    
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || window.__NEXT_DATA__.runtimeConfig.public.supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || window.__NEXT_DATA__.runtimeConfig.public.supabaseAnonKey
    );
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Not logged in:', userError);
      return null;
    }
    
    console.log('👤 Current user:', user.email);
    
    // Update profile to Pro
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: user.user_metadata?.preferred_username || user.email?.split('@')[0],
        full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        subscription_tier: 'pro',
        subscription_status: 'active',
        stripe_customer_id: 'dev_customer_' + user.id,
        stripe_subscription_id: 'dev_subscription_' + user.id,
      });

    if (profileError) {
      console.error('❌ Profile update error:', profileError);
      return null;
    }
    
    console.log('✅ Profile updated to Pro!');
    
    // Update credits to Pro tier (1000)
    const { error: creditsError } = await supabase
      .from('user_credits')
      .upsert({
        user_id: user.id,
        total_credits: 1000,
        used_credits: 0,
        last_reset: new Date().toISOString(),
      });

    if (creditsError) {
      console.log('⚠️ Credits update error (non-critical):', creditsError);
    } else {
      console.log('💎 Credits reset to 1000!');
    }
    
    // Verify the update
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();
      
    console.log('📊 New subscription status:', profile);
    console.log('🎉 SUCCESS! Refreshing page in 2 seconds...');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
    return profile;
    
  } catch (error) {
    console.error('❌ Upgrade failed:', error);
    return null;
  }
}

// Alternative: Simple copy-paste version that doesn't require imports
async function quickUpgradeToPro() {
  try {
    // Get Supabase URL and anon key from the page
    const scripts = Array.from(document.scripts);
    const nextDataScript = scripts.find(s => s.id === '__NEXT_DATA__');
    const nextData = JSON.parse(nextDataScript?.textContent || '{}');
    
    const supabaseUrl = nextData.runtimeConfig?.public?.supabaseUrl || 
                       nextData.props?.pageProps?.__NEXT_PUBLIC_SUPABASE_URL ||
                       'YOUR_SUPABASE_URL'; // Replace if needed
                       
    const supabaseAnonKey = nextData.runtimeConfig?.public?.supabaseAnonKey || 
                           nextData.props?.pageProps?.__NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                           'YOUR_SUPABASE_ANON_KEY'; // Replace if needed
    
    console.log('🔧 Using Supabase URL:', supabaseUrl);
    
    // Make direct REST API calls to Supabase
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${localStorage.getItem('sb-auth-token') || localStorage.getItem(`sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`)}`,
      }
    });
    
    const user = await authResponse.json();
    
    if (!user.id) {
      console.error('❌ Not logged in or invalid token');
      return;
    }
    
    console.log('👤 Found user:', user.email);
    
    // Update profile
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${localStorage.getItem('sb-auth-token') || localStorage.getItem(`sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`)}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: user.id,
        subscription_tier: 'pro',
        subscription_status: 'active',
        stripe_customer_id: 'dev_customer_' + user.id,
        stripe_subscription_id: 'dev_subscription_' + user.id,
      })
    });
    
    if (profileResponse.ok) {
      console.log('✅ Profile upgraded to Pro!');
    }
    
    // Update credits
    const creditsResponse = await fetch(`${supabaseUrl}/rest/v1/user_credits?user_id=eq.${user.id}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${localStorage.getItem('sb-auth-token') || localStorage.getItem(`sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`)}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: user.id,
        total_credits: 1000,
        used_credits: 0,
        last_reset: new Date().toISOString(),
      })
    });
    
    if (creditsResponse.ok) {
      console.log('💎 Credits reset to 1000!');
    }
    
    console.log('🎉 SUCCESS! Refreshing page in 2 seconds...');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the quick version automatically
quickUpgradeToPro();