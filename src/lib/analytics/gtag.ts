// Google Analytics 4 configuration and tracking functions
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      target: string,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Initialize Google Analytics
export const initGA = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics Measurement ID not found');
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Track page views
export const trackPageView = (url: string, title?: string) => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;
  
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
    page_title: title,
  });
};

// Track custom events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (!window.gtag) return;
  
  window.gtag('event', eventName, {
    event_category: 'engagement',
    event_label: eventName,
    ...parameters,
  });
};

// User authentication events
export const trackUserSignUp = (method: string) => {
  trackEvent('sign_up', {
    method,
    event_category: 'authentication',
  });
};

export const trackUserLogin = (method: string) => {
  trackEvent('login', {
    method,
    event_category: 'authentication',
  });
};

// Video processing events
export const trackVideoUpload = (fileSize: number, format: string, success: boolean) => {
  trackEvent('video_upload', {
    event_category: 'video_processing',
    file_size: fileSize,
    file_format: format,
    success,
  });
};

export const trackVideoProcessingComplete = (
  videoId: string,
  processingTime: number,
  success: boolean
) => {
  trackEvent('video_processing_complete', {
    event_category: 'video_processing',
    video_id: videoId,
    processing_time: processingTime,
    success,
  });
};

// AI feature events
export const trackAIChatInteraction = (queryType: string, success: boolean) => {
  trackEvent('ai_chat_interaction', {
    event_category: 'ai_features',
    query_type: queryType,
    success,
  });
};

export const trackContentRemovalSuggestion = (accepted: boolean, contentType: string) => {
  trackEvent('content_removal_suggestion', {
    event_category: 'ai_features',
    accepted,
    content_type: contentType,
  });
};

// Timeline editing events
export const trackTimelineOperation = (
  operation: string,
  success: boolean,
  duration?: number
) => {
  trackEvent('timeline_operation', {
    event_category: 'timeline_editing',
    operation,
    success,
    duration,
  });
};

// Export and rendering events
export const trackVideoExport = (
  format: string,
  quality: string,
  duration: number,
  success: boolean
) => {
  trackEvent('video_export', {
    event_category: 'export',
    export_format: format,
    quality,
    duration,
    success,
  });
};

// Conversion and business events
export const trackSubscription = (planType: string, value: number) => {
  trackEvent('purchase', {
    event_category: 'ecommerce',
    transaction_id: Date.now().toString(),
    value,
    currency: 'USD',
    item_name: planType,
  });
};

export const trackPaywallInteraction = (action: string, feature: string) => {
  trackEvent('paywall_interaction', {
    event_category: 'conversion',
    action, // 'shown', 'upgrade_clicked', 'dismissed'
    feature,
  });
};

// Project and session events
export const trackProjectCreated = (projectType?: string) => {
  trackEvent('project_created', {
    event_category: 'project_management',
    project_type: projectType,
  });
};

export const trackProjectOpened = (projectId: string, videoCount: number) => {
  trackEvent('project_opened', {
    event_category: 'project_management',
    project_id: projectId,
    video_count: videoCount,
  });
};

// Error tracking
export const trackError = (errorType: string, errorMessage: string, context?: string) => {
  trackEvent('error_occurred', {
    event_category: 'errors',
    error_type: errorType,
    error_message: errorMessage.substring(0, 100), // Truncate for privacy
    context,
  });
};

// Feature discovery and help
export const trackFeatureDiscovered = (featureName: string, discoveryMethod: string) => {
  trackEvent('feature_discovered', {
    event_category: 'feature_adoption',
    feature_name: featureName,
    discovery_method: discoveryMethod,
  });
};

export const trackHelpUsage = (helpType: string, helpItem: string) => {
  trackEvent('help_usage', {
    event_category: 'support',
    help_type: helpType,
    help_item: helpItem,
  });
};

// UTM and traffic source tracking
export const getUTMParameters = () => {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return {
    utm_source: urlParams.get('utm_source'),
    utm_medium: urlParams.get('utm_medium'),
    utm_campaign: urlParams.get('utm_campaign'),
    utm_term: urlParams.get('utm_term'),
    utm_content: urlParams.get('utm_content'),
    ref: urlParams.get('ref'), // Alternative referrer parameter
  };
};

export const trackTrafficSource = () => {
  const utmParams = getUTMParameters();
  
  if (!utmParams) return;
  
  // Track UTM parameters if they exist
  if (utmParams.utm_source || utmParams.utm_medium || utmParams.utm_campaign) {
    trackEvent('traffic_source', {
      event_category: 'acquisition',
      utm_source: utmParams.utm_source || 'unknown',
      utm_medium: utmParams.utm_medium || 'unknown',
      utm_campaign: utmParams.utm_campaign || 'unknown',
      utm_term: utmParams.utm_term || '',
      utm_content: utmParams.utm_content || '',
      ref: utmParams.ref || '',
      page_location: window.location.href,
    });
    
    console.log('📊 Traffic source tracked:', utmParams);
  }
};

export const trackSignupSource = (method: string) => {
  const utmParams = getUTMParameters();
  
  trackEvent('sign_up_with_source', {
    event_category: 'authentication',
    method,
    utm_source: utmParams?.utm_source || 'direct',
    utm_medium: utmParams?.utm_medium || 'none',
    utm_campaign: utmParams?.utm_campaign || 'none',
    ref: utmParams?.ref || '',
  });
  
  console.log('📊 Signup source tracked:', { method, ...utmParams });
};

export const trackConversionSource = (conversionType: string, value?: number) => {
  const utmParams = getUTMParameters();
  
  trackEvent('conversion_with_source', {
    event_category: 'conversion',
    conversion_type: conversionType,
    value: value || 0,
    utm_source: utmParams?.utm_source || 'direct',
    utm_medium: utmParams?.utm_medium || 'none',
    utm_campaign: utmParams?.utm_campaign || 'none',
    ref: utmParams?.ref || '',
  });
  
  console.log('📊 Conversion source tracked:', { conversionType, value, ...utmParams });
};