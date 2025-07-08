// Check if we're in production based on environment
export const isProduction = process.env.NODE_ENV === 'production' || process.env.STRIPE_SECRET_KEY?.includes('sk_live');

export const STRIPE_CONFIG = {
  products: {
    creator: {
      productId: isProduction 
        ? process.env.STRIPE_CREATOR_PRODUCT_ID!
        : process.env.STRIPE_CREATOR_PRODUCT_ID_TEST!,
      prices: {
        monthly: isProduction 
          ? process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID!
          : process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID_TEST!,
        annual: isProduction 
          ? process.env.STRIPE_CREATOR_ANNUAL_PRICE_ID!
          : process.env.STRIPE_CREATOR_ANNUAL_PRICE_ID_TEST!
      }
    },
    pro: {
      productId: isProduction 
        ? process.env.STRIPE_PRO_PRODUCT_ID!
        : process.env.STRIPE_PRO_PRODUCT_ID_TEST!,
      prices: {
        monthly: isProduction 
          ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID!
          : process.env.STRIPE_PRO_MONTHLY_PRICE_ID_TEST!,
        annual: isProduction 
          ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID!
          : process.env.STRIPE_PRO_ANNUAL_PRICE_ID_TEST!
      }
    },
    credits: {
      productId: isProduction 
        ? process.env.STRIPE_CREDITS_PRODUCT_ID!
        : process.env.STRIPE_CREDITS_PRODUCT_ID_TEST!,
      prices: {
        credits_100: isProduction 
          ? process.env.STRIPE_CREDITS_100_PRICE_ID!
          : process.env.STRIPE_CREDITS_100_PRICE_ID_TEST!,
        credits_500: isProduction 
          ? process.env.STRIPE_CREDITS_500_PRICE_ID!
          : process.env.STRIPE_CREDITS_500_PRICE_ID_TEST!,
        credits_1000: isProduction 
          ? process.env.STRIPE_CREDITS_1000_PRICE_ID!
          : process.env.STRIPE_CREDITS_1000_PRICE_ID_TEST!,
        credits_2500: isProduction 
          ? process.env.STRIPE_CREDITS_2500_PRICE_ID!
          : process.env.STRIPE_CREDITS_2500_PRICE_ID_TEST!
      }
    }
  },
  credits: {
    free_tier: 100,
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
        'Basic support',
        'Watermarked exports'
      ]
    },
    creator: {
      name: 'Creator',
      credits: 1000,
      price: 15,
      annual_price: 12,
      features: [
        '1,000 credits per month',
        '10 credits per video upload',
        '35 credits per AI generation', 
        '2 credits per AI chat',
        'Priority support',
        'No watermarks',
        '1080p exports'
      ]
    },
    pro: {
      name: 'Pro',
      credits: 5000,
      price: 49,
      annual_price: 42,
      features: [
        '5,000 credits per month',
        '10 credits per video upload',
        '35 credits per AI generation', 
        '2 credits per AI chat',
        'Priority support',
        'Advanced features',
        '4K exports',
        'Team collaboration'
      ]
    }
  },
  topups: {
    100: { 
      price: 8, 
      priceId: isProduction 
        ? process.env.STRIPE_CREDITS_100_PRICE_ID!
        : process.env.STRIPE_CREDITS_100_PRICE_ID_TEST!
    },
    500: { 
      price: 35, 
      priceId: isProduction 
        ? process.env.STRIPE_CREDITS_500_PRICE_ID!
        : process.env.STRIPE_CREDITS_500_PRICE_ID_TEST!
    },
    1000: { 
      price: 60, 
      priceId: isProduction 
        ? process.env.STRIPE_CREDITS_1000_PRICE_ID!
        : process.env.STRIPE_CREDITS_1000_PRICE_ID_TEST!
    },
    2500: { 
      price: 125, 
      priceId: isProduction 
        ? process.env.STRIPE_CREDITS_2500_PRICE_ID!
        : process.env.STRIPE_CREDITS_2500_PRICE_ID_TEST!
    }
  }
};