// Function to upgrade current user to Pro
// Run this in the browser console while logged in

async function upgradeToProUser() {
  try {
    console.log('🚀 Upgrading current user to Pro...');
    
    const response = await fetch('/api/user/upgrade-to-pro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Include cookies for authentication
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS:', result.message);
      console.log('📊 Subscription Tier:', result.subscription_tier);
      console.log('🎯 Status:', result.subscription_status);
      console.log('💎 Credits:', result.credits);
      console.log('🔄 Please refresh the page to see changes');
      
      // Optional: Auto-refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
      return result;
    } else {
      console.error('❌ ERROR:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR:', error);
    return null;
  }
}

// Auto-run the function
upgradeToProUser();