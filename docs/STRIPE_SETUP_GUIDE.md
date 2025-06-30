# Stripe Credit System Setup Guide

## Overview
This guide walks through setting up the Stripe credit-based pricing system for the Remotion Timeline app.

## 1. Database Migration
Run the migration to create the credit tracking tables:
```sql
-- Apply the migration at: supabase/migrations/20250630000001_add_credit_system.sql
```

## 2. Stripe Configuration

### Products Created
1. **Pro Subscription** (prod_SalqnkQFkHK6LB)
   - Monthly: $100/month (price_1RfaJfCORCusVQOFCKHa1zro)
   - Annual: $85/month billed annually (price_1RfaJlCORCusVQOFgZVE7kXi)
   - Includes 1,000 credits per month

2. **Credit Top-up** (prod_SalrD9AaHSc5rJ)
   - 100 credits for $10 (price_1RfaJyCORCusVQOFMWAALXjW)

### Environment Variables
Add these to your `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_OPENAI_API_KEY=sk-...
```

### Webhook Setup
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `payment_intent.succeeded`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## 3. Credit System Implementation

### Credit Costs
- Video Upload & Analysis: 10 credits
- AI Timeline Generation: 15 credits
- AI Chat Message: 2 credits per message

### API Endpoints Protected
1. `/api/timeline/[projectId]/chat` - AI chat (2 credits)
2. `/api/videos/[videoId]/reanalyze` - Video analysis (10 credits)
3. `/api/timeline/[projectId]/generate-edl-async` - AI generation (15 credits)

### New API Endpoints
1. `/api/stripe/create-checkout` - Create subscription checkout
2. `/api/stripe/topup-credits` - Purchase additional credits
3. `/api/credits/balance` - Get user's credit balance
4. `/api/webhooks/stripe` - Stripe webhook handler

## 4. Frontend Integration

### Components
1. **CreditDisplay** - Shows user's credit balance
   ```tsx
   import { CreditDisplay } from '@/components/CreditDisplay';
   
   // In your header/nav
   <CreditDisplay className="ml-4" />
   ```

2. **PaywallModal** - Shows when user lacks credits
   ```tsx
   import { PaywallModal } from '@/components/PaywallModal';
   
   <PaywallModal
     isOpen={showPaywall}
     onClose={() => setShowPaywall(false)}
     requiredCredits={15}
     availableCredits={5}
     action="ai_generate"
   />
   ```

### Error Handling
When an API returns 402 (Payment Required):
```tsx
const response = await fetch('/api/timeline/chat', {
  method: 'POST',
  // ... headers and body
});

if (response.status === 402) {
  const data = await response.json();
  // Show paywall with data.creditsRequired and data.creditsAvailable
}
```

## 5. Testing

### Test Credit Flow
1. Create a test user
2. Subscribe via `/pricing` page
3. Verify 1,000 credits added
4. Use features to consume credits
5. Test top-up when credits are low

### Test Stripe Webhooks
Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Test Cards
- Success: `4242 4242 4242 4242`
- Requires auth: `4000 0027 6000 3184`
- Declined: `4000 0000 0000 0002`

## 6. Monitoring

### Track Usage
Query usage patterns:
```sql
-- Daily usage by action type
SELECT 
  DATE(created_at) as date,
  action_type,
  COUNT(*) as action_count,
  SUM(credits_used) as total_credits
FROM usage_logs
GROUP BY DATE(created_at), action_type
ORDER BY date DESC;
```

### Monitor Credit Balance
```sql
-- Users with low credits
SELECT 
  u.email,
  uc.total_credits - uc.used_credits as remaining_credits
FROM user_credits uc
JOIN auth.users u ON u.id = uc.user_id
WHERE uc.total_credits - uc.used_credits < 50;
```

## 7. Production Checklist
- [ ] Set up production Stripe account
- [ ] Configure production webhook endpoint
- [ ] Update environment variables
- [ ] Test subscription flow end-to-end
- [ ] Monitor initial user credit usage
- [ ] Set up alerts for failed payments
- [ ] Create customer support docs