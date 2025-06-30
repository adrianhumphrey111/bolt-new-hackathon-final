export const STRIPE_CONFIG = {
  products: {
    subscription: {
      productId: 'prod_SalqnkQFkHK6LB',
      prices: {
        monthly: 'price_1RfaJfCORCusVQOFCKHa1zro',
        annual: 'price_1RfaJlCORCusVQOFgZVE7kXi'
      }
    },
    credits: {
      productId: 'prod_SalrD9AaHSc5rJ',
      prices: {
        topup_100: 'price_1RfaJyCORCusVQOFMWAALXjW'
      }
    }
  },
  credits: {
    free_tier: 100,
    included_monthly: 1000,
    costs: {
      video_upload: 10,
      ai_generate: 35,
      ai_chat: 2
    }
  },
  tiers: {
    free: {
      name: 'Free',
      credits: 100,
      price: 0,
      features: [
        '100 free credits',
        '10 credits per video upload',
        '35 credits per AI generation',
        '2 credits per AI chat',
        'Basic support'
      ]
    },
    pro: {
      name: 'Pro',
      credits: 1000,
      price: 29.99,
      features: [
        '1,000 credits per month',
        '10 credits per video upload',
        '35 credits per AI generation', 
        '2 credits per AI chat',
        'Priority support',
        'Advanced features'
      ]
    }
  }
};