// UTM Link Generator Utility

export interface UTMParams {
  utm_source: string;      // Traffic source (e.g., 'producthunt', 'reddit')
  utm_medium: string;      // Marketing medium (e.g., 'social', 'post', 'launch')
  utm_campaign: string;    // Campaign name (e.g., 'beta_launch', 'feature_announcement')
  utm_term?: string;       // Paid keywords (optional)
  utm_content?: string;    // Ad content/variant (optional)
}

export function generateUTMLink(baseUrl: string, utmParams: UTMParams): string {
  const url = new URL(baseUrl);
  
  // Add UTM parameters
  if (utmParams.utm_source) url.searchParams.set('utm_source', utmParams.utm_source);
  if (utmParams.utm_medium) url.searchParams.set('utm_medium', utmParams.utm_medium);
  if (utmParams.utm_campaign) url.searchParams.set('utm_campaign', utmParams.utm_campaign);
  if (utmParams.utm_term) url.searchParams.set('utm_term', utmParams.utm_term);
  if (utmParams.utm_content) url.searchParams.set('utm_content', utmParams.utm_content);
  
  return url.toString();
}

// Pre-configured campaign generators for your specific use cases
export const generateProductHuntLink = (baseUrl: string, campaign: string = 'ph_launch') => {
  return generateUTMLink(baseUrl, {
    utm_source: 'producthunt',
    utm_medium: 'social',
    utm_campaign: campaign,
    utm_content: 'ph_listing'
  });
};

export const generateRedditLink = (baseUrl: string, subreddit: string, campaign: string = 'reddit_post') => {
  return generateUTMLink(baseUrl, {
    utm_source: 'reddit',
    utm_medium: 'social',
    utm_campaign: campaign,
    utm_content: subreddit
  });
};

// Common tracking URLs for your app
export const getTrackingURLs = (baseUrl: string = 'https://tailorlabsai.com') => {
  return {
    // Product Hunt URLs
    productHunt: {
      main: generateProductHuntLink(baseUrl),
      signup: generateProductHuntLink(`${baseUrl}/auth/signup`, 'ph_signup'),
      features: generateProductHuntLink(`${baseUrl}/features`, 'ph_features'),
    },
    
    // Reddit URLs
    reddit: {
      main: generateRedditLink(baseUrl, 'general'),
      entrepreneurMain: generateRedditLink(baseUrl, 'entrepreneur', 'reddit_entrepreneur'),
      startupMain: generateRedditLink(baseUrl, 'startups', 'reddit_startups'),
      videoEditingMain: generateRedditLink(baseUrl, 'videoediting', 'reddit_videoediting'),
      aiMain: generateRedditLink(baseUrl, 'artificialintelligence', 'reddit_ai'),
      signup: generateRedditLink(`${baseUrl}/auth/signup`, 'general', 'reddit_signup'),
    },
  };
};

// Console helper to quickly generate URLs for campaigns
export const logTrackingURLs = (baseUrl?: string) => {
  const urls = getTrackingURLs(baseUrl);
  
  console.log('🔗 Product Hunt Tracking URLs:');
  console.log('Main page:', urls.productHunt.main);
  console.log('Signup page:', urls.productHunt.signup);
  console.log('Features page:', urls.productHunt.features);
  
  console.log('\n🔗 Reddit Tracking URLs:');
  console.log('Main (general):', urls.reddit.main);
  console.log('r/entrepreneur:', urls.reddit.entrepreneurMain);
  console.log('r/startups:', urls.reddit.startupMain);
  console.log('r/VideoEditing:', urls.reddit.videoEditingMain);
  console.log('r/artificial:', urls.reddit.aiMain);
  console.log('Signup page:', urls.reddit.signup);
  
  return urls;
};