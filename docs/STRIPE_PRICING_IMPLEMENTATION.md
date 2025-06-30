# Stripe Credit-Based Pricing Implementation Proposal

## Overview
Implement a hybrid subscription + credit system where users pay a monthly/annual fee that includes credits, with automatic top-ups when they run out.

## Credit Cost Breakdown

### AI Operations & Credit Usage
1. **Video Upload**: 10 credits
   - 3 LLM calls for processing
   - 1 GPU inference call
   - Heavy computational load

2. **Generate with AI**: 15 credits
   - 6 LLM calls for generation
   - Complex processing pipeline

3. **AI Chat Message**: 2 credits per message
   - 1 LLM call per interaction
   - Lightweight operation

### Pricing Tiers
- **Pro Plan**: $100/month (or $85/month billed annually)
  - Includes 1,000 credits/month
  - Additional credits: $10 per 100 credits

### Credit Economics
- 1,000 credits allows approximately:
  - 100 video uploads, OR
  - 66 AI generations, OR
  - 500 chat messages
  - Most users will use a mix

## Technical Architecture

### 1. Stripe Setup

#### Products & Prices
```javascript
// Stripe Products Structure
const products = {
  subscription: {
    monthly: 'price_xxx_100_monthly',
    annual: 'price_xxx_85_annual'
  },
  credits: {
    topup_100: 'price_xxx_10_per_100_credits'
  }
};
```

#### Subscription Model
- Use Stripe Subscriptions for base plan
- Include 1,000 credits as subscription metadata
- Credits reset monthly

#### Credit Top-ups
- Use Stripe Payment Intents for one-time credit purchases
- Automatic charging when credits depleted
- Card on file via Stripe Customer payment methods

### 2. Database Schema

```sql
-- Users table extension
ALTER TABLE users ADD COLUMN 
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  subscription_tier VARCHAR(50);

-- Credits table
CREATE TABLE user_credits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  reset_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50), -- 'video_upload', 'ai_generate', 'ai_chat'
  credits_used INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  stripe_payment_intent_id VARCHAR(255),
  credits_amount INTEGER,
  price_paid DECIMAL(10,2),
  transaction_type VARCHAR(50), -- 'subscription', 'topup', 'manual'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. API Implementation

#### Middleware for Credit Checking
```typescript
// middleware/checkCredits.ts
export async function checkCredits(action: 'video_upload' | 'ai_generate' | 'ai_chat') {
  const creditCosts = {
    video_upload: 10,
    ai_generate: 15,
    ai_chat: 2
  };

  const requiredCredits = creditCosts[action];
  const userCredits = await getUserCredits(userId);
  
  if (userCredits.available < requiredCredits) {
    // Attempt auto top-up
    const topupSuccess = await attemptAutoTopup(userId, requiredCredits);
    
    if (!topupSuccess) {
      throw new Error('Insufficient credits');
    }
  }
  
  return { canProceed: true, creditsToDeduct: requiredCredits };
}
```

#### Usage Tracking
```typescript
// lib/usage-tracking.ts
export async function trackUsage(
  userId: string, 
  action: string, 
  creditsUsed: number,
  metadata?: any
) {
  // Log usage
  await db.usageLogs.create({
    userId,
    actionType: action,
    creditsUsed,
    metadata
  });
  
  // Update user credits
  await db.userCredits.update({
    where: { userId },
    data: {
      usedCredits: { increment: creditsUsed }
    }
  });
  
  // Check if user needs notification
  const remaining = await getRemainingCredits(userId);
  if (remaining < 50) {
    await sendLowCreditNotification(userId, remaining);
  }
}
```

### 4. Stripe Integration Flow

#### Subscription Creation
```typescript
// api/stripe/create-subscription.ts
export async function createSubscription(userId: string, priceId: string) {
  // Create or get Stripe customer
  const customer = await stripe.customers.create({
    metadata: { userId }
  });
  
  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      userId,
      credits_included: '1000'
    }
  });
  
  // Initialize user credits
  await initializeUserCredits(userId, 1000);
  
  return subscription;
}
```

#### Auto Top-up Implementation
```typescript
// lib/auto-topup.ts
export async function attemptAutoTopup(userId: string, requiredCredits: number) {
  const user = await getUser(userId);
  
  if (!user.stripeCustomerId || !user.autoTopupEnabled) {
    return false;
  }
  
  // Calculate credits needed (round up to nearest 100)
  const creditsToAdd = Math.ceil(requiredCredits / 100) * 100;
  const price = (creditsToAdd / 100) * 10; // $10 per 100 credits
  
  try {
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price * 100, // in cents
      currency: 'usd',
      customer: user.stripeCustomerId,
      payment_method: user.defaultPaymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        userId,
        creditsPurchased: creditsToAdd.toString()
      }
    });
    
    // Add credits to user account
    await addCredits(userId, creditsToAdd, paymentIntent.id);
    
    return true;
  } catch (error) {
    // Handle declined cards, etc.
    await notifyPaymentFailed(userId, error);
    return false;
  }
}
```

### 5. API Endpoints

#### Protected Endpoints with Credit Checks
```typescript
// api/timeline/upload-video.ts
export async function POST(req: Request) {
  const session = await getSession();
  
  // Check credits before processing
  await checkCredits('video_upload');
  
  // Process video upload
  const result = await processVideoUpload(req.body);
  
  // Track usage after successful processing
  await trackUsage(session.userId, 'video_upload', 10, {
    videoId: result.videoId
  });
  
  return NextResponse.json(result);
}

// api/timeline/generate-ai.ts
export async function POST(req: Request) {
  const session = await getSession();
  
  await checkCredits('ai_generate');
  
  const result = await generateWithAI(req.body);
  
  await trackUsage(session.userId, 'ai_generate', 15, {
    generationId: result.id
  });
  
  return NextResponse.json(result);
}

// api/timeline/chat.ts
export async function POST(req: Request) {
  const session = await getSession();
  
  await checkCredits('ai_chat');
  
  const response = await processAIChat(req.body);
  
  await trackUsage(session.userId, 'ai_chat', 2, {
    messageId: response.id
  });
  
  return NextResponse.json(response);
}
```

### 6. Webhook Handlers

```typescript
// api/webhooks/stripe.ts
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  
  switch (event.type) {
    case 'invoice.payment_succeeded':
      // Monthly subscription renewed - reset credits
      await resetMonthlyCredits(event.data.object.metadata.userId);
      break;
      
    case 'payment_intent.succeeded':
      // Credit top-up successful
      if (event.data.object.metadata.creditsPurchased) {
        await addCredits(
          event.data.object.metadata.userId,
          parseInt(event.data.object.metadata.creditsPurchased),
          event.data.object.id
        );
      }
      break;
      
    case 'customer.subscription.deleted':
      // Disable user access
      await disableUserAccess(event.data.object.metadata.userId);
      break;
  }
}
```

### 7. Frontend Implementation

#### Credit Display Component
```typescript
// components/CreditDisplay.tsx
export function CreditDisplay() {
  const { credits, loading } = useCredits();
  
  return (
    <div className="flex items-center gap-2">
      <span>{credits.available} / {credits.total} credits</span>
      {credits.available < 50 && (
        <Button size="sm" onClick={() => router.push('/billing')}>
          Top up
        </Button>
      )}
    </div>
  );
}
```

#### Paywall Component
```typescript
// components/Paywall.tsx
export function Paywall({ requiredCredits, action }) {
  return (
    <Dialog>
      <DialogContent>
        <h2>Insufficient Credits</h2>
        <p>This action requires {requiredCredits} credits.</p>
        <p>You currently have {userCredits} credits.</p>
        
        <div className="flex gap-2">
          <Button onClick={purchaseCredits}>
            Buy 100 credits for $10
          </Button>
          <Button onClick={() => router.push('/pricing')}>
            View Plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Implementation Timeline

1. **Week 1**: Database schema and Stripe product setup
2. **Week 2**: Core credit tracking and usage APIs
3. **Week 3**: Stripe integration (subscriptions, top-ups)
4. **Week 4**: Frontend components and paywall implementation
5. **Week 5**: Testing and edge case handling

## Key Considerations

1. **Grace Period**: Allow 10% credit overdraft to prevent bad UX
2. **Notifications**: Email users at 25% and 10% credits remaining
3. **Analytics**: Track credit usage patterns for pricing optimization
4. **Refunds**: Clear policy on unused credits (no refunds, but roll over for annual plans)
5. **Free Trial**: Consider 100 free credits for new users

## Security

1. Always verify credit availability server-side
2. Use idempotency keys for credit purchases
3. Implement rate limiting on expensive operations
4. Log all credit transactions for audit trail