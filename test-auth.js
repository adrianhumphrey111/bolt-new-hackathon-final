// Test authentication - run this in browser console while logged in

async function testAuthentication() {
  try {
    console.log('🔍 Testing authentication...');
    
    // Get current session
    const { createBrowserClient } = await import('@supabase/ssr');
    
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || window.__NEXT_DATA__.runtimeConfig?.public?.supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || window.__NEXT_DATA__.runtimeConfig?.public?.supabaseAnonKey
    );
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Session error:', error);
      return;
    }
    
    if (!session) {
      console.log('❌ No session found - you might not be logged in');
      return;
    }
    
    console.log('✅ Session found for:', session.user.email);
    console.log('🔑 Token length:', session.access_token.length);
    
    // Test AI sort API call
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
    
    console.log('🚀 Testing AI sort API...');
    
    const response = await fetch('/api/videos/ai-sort?project_id=test', {
      headers
    });
    
    console.log('📝 Response status:', response.status);
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (response.ok) {
      console.log('✅ AI Sort API working!');
    } else {
      console.log('❌ AI Sort API failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAuthentication();