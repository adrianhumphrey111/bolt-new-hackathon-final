const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function grantProTrial(email, durationDays = 30) {
  try {
    console.log(`Granting ${durationDays}-day pro trial to ${email}...`);

    // Find user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users.users.find(u => u.email === email);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    console.log(`Found user: ${user.id}`);

    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);

    // Update user profile with pro subscription
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        subscription_status: 'active',
        subscription_tier: 'pro',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) throw profileError;
    console.log('✓ Updated profile with pro subscription');

    // Grant pro credits (5000)
    const { error: creditsError } = await supabase
      .rpc('reset_monthly_credits', {
        p_user_id: user.id,
        p_credits_amount: 5000
      });

    if (creditsError) throw creditsError;
    console.log('✓ Granted 5000 pro credits');

    // Log the trial grant
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        credits_amount: 5000,
        transaction_type: 'bonus',
        created_at: new Date().toISOString()
      });

    if (transactionError) throw transactionError;
    console.log('✓ Logged trial transaction');

    console.log(`\n🎉 Successfully granted ${durationDays}-day pro trial to ${email}`);
    console.log(`• User ID: ${user.id}`);
    console.log(`• Credits: 5000`);
    console.log(`• Expires: ${expirationDate.toLocaleDateString()}`);
    console.log(`• Status: Active Pro Subscription`);

  } catch (error) {
    console.error('Error granting pro trial:', error);
    process.exit(1);
  }
}

// Run the script
const email = process.argv[2] || 'nikola.nika.kotlarikova@gmail.com';
const days = parseInt(process.argv[3]) || 30;

grantProTrial(email, days).then(() => {
  console.log('\nScript completed successfully!');
  process.exit(0);
});