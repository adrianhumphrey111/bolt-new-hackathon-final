// Deployment Environment Configuration
// This file manages environment-specific settings for different deployments

const environments = {
  // Hackathon submission environment (frozen)
  hackathon: {
    name: 'Hackathon Submission',
    branch: 'hackathon-submission',
    domain: 'hackathon.remotion-timeline.com',
    apiUrl: process.env.NEXT_PUBLIC_HACKATHON_API_URL || 'https://api-hackathon.remotion-timeline.com',
    supabaseUrl: process.env.NEXT_PUBLIC_HACKATHON_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_HACKATHON_SUPABASE_ANON_KEY,
    stripePublicKey: process.env.NEXT_PUBLIC_HACKATHON_STRIPE_PUBLIC_KEY,
    features: {
      payments: false,
      analytics: false,
      advancedFeatures: false,
      userLimit: 100,
    },
  },

  // Development/Staging environment
  staging: {
    name: 'Staging',
    branch: 'development',
    domain: 'staging.your-startup-domain.com',
    apiUrl: process.env.NEXT_PUBLIC_STAGING_API_URL || 'https://api-staging.your-startup-domain.com',
    supabaseUrl: process.env.NEXT_PUBLIC_STAGING_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_STAGING_SUPABASE_ANON_KEY,
    stripePublicKey: process.env.NEXT_PUBLIC_STAGING_STRIPE_PUBLIC_KEY,
    features: {
      payments: true,
      analytics: true,
      advancedFeatures: true,
      userLimit: 1000,
    },
  },

  // Production environment (startup)
  production: {
    name: 'Production',
    branch: 'production',
    domain: 'www.your-startup-domain.com',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.your-startup-domain.com',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
    features: {
      payments: true,
      analytics: true,
      advancedFeatures: true,
      userLimit: null, // No limit
    },
  },

  // Local development
  development: {
    name: 'Development',
    branch: 'development',
    domain: 'localhost:3000',
    apiUrl: process.env.NEXT_PUBLIC_LOCAL_API_URL || 'http://localhost:3000/api',
    supabaseUrl: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY,
    stripePublicKey: process.env.NEXT_PUBLIC_LOCAL_STRIPE_PUBLIC_KEY,
    features: {
      payments: true,
      analytics: false,
      advancedFeatures: true,
      userLimit: null,
    },
  },
};

// Determine current environment based on domain or environment variable
function getCurrentEnvironment() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname.includes('hackathon')) {
      return 'hackathon';
    } else if (hostname.includes('staging')) {
      return 'staging';
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    } else {
      return 'production';
    }
  }
  
  // Server-side environment detection
  return process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
}

// Get configuration for current environment
export function getEnvironmentConfig() {
  const currentEnv = getCurrentEnvironment();
  return environments[currentEnv] || environments.development;
}

// Check if a feature is enabled in current environment
export function isFeatureEnabled(featureName) {
  const config = getEnvironmentConfig();
  return config.features[featureName] || false;
}

// Get environment-specific API endpoint
export function getApiEndpoint(endpoint) {
  const config = getEnvironmentConfig();
  return `${config.apiUrl}${endpoint}`;
}

// Environment-specific constants
export const ENV = {
  isHackathon: () => getCurrentEnvironment() === 'hackathon',
  isStaging: () => getCurrentEnvironment() === 'staging',
  isProduction: () => getCurrentEnvironment() === 'production',
  isDevelopment: () => getCurrentEnvironment() === 'development',
};

export default environments;