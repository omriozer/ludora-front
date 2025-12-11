/**
 * Analytics Tracking System for Ludora Educational Platform
 * Integrated Google Analytics 4 and custom event tracking
 */

import { isDev, isProd } from './environment';

/**
 * Analytics Configuration
 */
const ANALYTICS_CONFIG = {
  // Google Analytics 4 Measurement ID from environment variables
  GA4_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX',

  // Enable/disable analytics based on environment and user consent
  enabled: isProd(),

  // Debug mode for development
  debug: isDev(),

  // Custom dimensions for educational platform
  customDimensions: {
    user_type: 'custom_parameter_1',     // teacher, student, admin
    portal: 'custom_parameter_2',        // teacher, student
    subscription_status: 'custom_parameter_3', // active, inactive, trial
    product_category: 'custom_parameter_4'     // game, file, workshop, etc.
  }
};

/**
 * Initialize Google Analytics 4
 */
export const initializeAnalytics = () => {
  if (!ANALYTICS_CONFIG.enabled) {
    console.log('📊 Analytics disabled in development mode');
    return;
  }

  try {
    // Load Google Analytics 4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.GA4_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', ANALYTICS_CONFIG.GA4_MEASUREMENT_ID, {
      debug_mode: ANALYTICS_CONFIG.debug,
      send_page_view: true,
      // Enhanced ecommerce and user tracking
      allow_enhanced_conversions: true,
      allow_google_signals: true,
      // Hebrew language support
      language: 'he',
      country: 'IL'
    });

    console.log('✅ Google Analytics 4 initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Google Analytics:', error);
  }
};

/**
 * Track page view with custom dimensions
 */
export const trackPageView = (pagePath, pageTitle, additionalData = {}) => {
  if (!window.gtag) return;

  // Detect current portal and user context
  const portal = window.location.hostname.includes('my.ludora') ? 'student' : 'teacher';
  const userType = detectUserType(); // Custom function to detect user type

  try {
    window.gtag('event', 'page_view', {
      page_title: pageTitle,
      page_location: window.location.href,
      page_path: pagePath,
      [ANALYTICS_CONFIG.customDimensions.portal]: portal,
      [ANALYTICS_CONFIG.customDimensions.user_type]: userType,
      ...additionalData
    });

    if (ANALYTICS_CONFIG.debug) {
      console.log('📊 Page view tracked:', { pagePath, pageTitle, portal, userType });
    }
  } catch (error) {
    console.warn('Failed to track page view:', error);
  }
};

/**
 * Track educational events specific to Ludora platform
 */
export const trackEducationalEvent = (eventName, eventData = {}) => {
  if (!window.gtag) return;

  const commonData = {
    event_category: 'educational_activity',
    [ANALYTICS_CONFIG.customDimensions.portal]: detectPortal(),
    [ANALYTICS_CONFIG.customDimensions.user_type]: detectUserType()
  };

  try {
    window.gtag('event', eventName, {
      ...commonData,
      ...eventData
    });

    if (ANALYTICS_CONFIG.debug) {
      console.log('📊 Educational event tracked:', eventName, eventData);
    }
  } catch (error) {
    console.warn('Failed to track educational event:', error);
  }
};

/**
 * Track product interactions (games, files, workshops, etc.)
 */
export const trackProductInteraction = (action, productType, productId, additionalData = {}) => {
  if (!window.gtag) return;

  const eventData = {
    event_category: 'product_interaction',
    product_type: productType,
    product_id: productId,
    action: action, // view, download, play, purchase, etc.
    [ANALYTICS_CONFIG.customDimensions.product_category]: productType,
    ...additionalData
  };

  trackEducationalEvent(`product_${action}`, eventData);
};

/**
 * Track enhanced ecommerce events for purchases
 */
export const trackPurchase = (transactionData) => {
  if (!window.gtag) return;

  try {
    const { transactionId, items, value, currency = 'ILS' } = transactionData;

    // Enhanced ecommerce purchase event
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.title,
        item_category: item.product_type,
        price: item.price,
        quantity: 1
      })),
      event_category: 'ecommerce',
      [ANALYTICS_CONFIG.customDimensions.user_type]: detectUserType()
    });

    if (ANALYTICS_CONFIG.debug) {
      console.log('📊 Purchase tracked:', transactionData);
    }
  } catch (error) {
    console.warn('Failed to track purchase:', error);
  }
};

/**
 * Track subscription events
 */
export const trackSubscription = (action, subscriptionData = {}) => {
  if (!window.gtag) return;

  const eventData = {
    event_category: 'subscription',
    subscription_action: action, // subscribe, cancel, renew, upgrade
    [ANALYTICS_CONFIG.customDimensions.subscription_status]: action,
    ...subscriptionData
  };

  trackEducationalEvent(`subscription_${action}`, eventData);
};

/**
 * Track game session events
 */
export const trackGameSession = (action, gameData = {}) => {
  if (!window.gtag) return;

  const eventData = {
    event_category: 'game_session',
    game_action: action, // start, complete, quit, pause
    game_id: gameData.gameId,
    game_title: gameData.title,
    session_duration: gameData.duration,
    players_count: gameData.playersCount,
    ...gameData
  };

  trackEducationalEvent(`game_${action}`, eventData);
};

/**
 * Track file downloads and interactions
 */
export const trackFileInteraction = (action, fileData = {}) => {
  if (!window.gtag) return;

  const eventData = {
    event_category: 'file_interaction',
    file_action: action, // download, preview, view
    file_id: fileData.fileId,
    file_title: fileData.title,
    file_type: fileData.fileType,
    file_size: fileData.size,
    ...fileData
  };

  trackEducationalEvent(`file_${action}`, eventData);
};

/**
 * Track search and discovery events
 */
export const trackSearch = (query, results, filters = {}) => {
  if (!window.gtag) return;

  const eventData = {
    search_term: query,
    results_count: results.length,
    event_category: 'search',
    applied_filters: Object.keys(filters).length,
    filter_details: JSON.stringify(filters)
  };

  trackEducationalEvent('search', eventData);
};

/**
 * Track user engagement metrics
 */
export const trackEngagement = (metricName, value, context = {}) => {
  if (!window.gtag) return;

  const eventData = {
    event_category: 'user_engagement',
    metric_name: metricName,
    metric_value: value,
    engagement_context: context.page || window.location.pathname,
    ...context
  };

  trackEducationalEvent('engagement_metric', eventData);
};

/**
 * Track performance metrics integration with Web Vitals
 */
export const trackPerformanceMetric = (metricData) => {
  if (!window.gtag) return;

  const { name, value, rating, classification, portal } = metricData;

  try {
    window.gtag('event', 'web_vitals', {
      event_category: 'performance',
      metric_name: name,
      metric_value: Math.round(value),
      metric_rating: rating,
      metric_classification: classification,
      portal: portal,
      custom_metric: true
    });
  } catch (error) {
    console.warn('Failed to track performance metric:', error);
  }
};

/**
 * Helper function to detect current portal
 */
const detectPortal = () => {
  return window.location.hostname.includes('my.ludora') ? 'student' : 'teacher';
};

/**
 * Helper function to detect user type
 * This should be integrated with your authentication system
 */
const detectUserType = () => {
  // TODO: Integrate with actual user context
  // This is a placeholder - you should get this from your user context/auth system
  try {
    const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return userData.role || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

/**
 * Custom event tracking for educational platform specific actions
 */
export const trackCustomEvent = (eventName, eventData = {}) => {
  if (!window.gtag) return;

  try {
    window.gtag('event', eventName, {
      event_category: 'custom',
      [ANALYTICS_CONFIG.customDimensions.portal]: detectPortal(),
      [ANALYTICS_CONFIG.customDimensions.user_type]: detectUserType(),
      timestamp: Date.now(),
      ...eventData
    });

    if (ANALYTICS_CONFIG.debug) {
      console.log('📊 Custom event tracked:', eventName, eventData);
    }
  } catch (error) {
    console.warn('Failed to track custom event:', error);
  }
};

/**
 * Initialize analytics with Web Vitals integration
 */
export const initializeFullAnalytics = () => {
  // Initialize Google Analytics
  initializeAnalytics();

  // Initialize Web Vitals monitoring with analytics integration
  import('./webVitals').then(({ initWebVitals }) => {
    // Override the reportMetric function to include analytics tracking
    const originalConsoleLog = console.log;
    initWebVitals();

    // Listen for Web Vitals metrics and send to analytics
    const originalReportMetric = window.reportMetric;
    if (originalReportMetric) {
      window.reportMetric = (metric) => {
        originalReportMetric(metric);
        trackPerformanceMetric(metric);
      };
    }
  });

  // Track initial page view
  trackPageView(window.location.pathname, document.title);

  if (ANALYTICS_CONFIG.debug) {
    console.log('🚀 Full analytics system initialized');
  }
};

/**
 * Consent management for GDPR compliance
 */
export const updateAnalyticsConsent = (consentGranted) => {
  if (!window.gtag) return;

  window.gtag('consent', 'update', {
    analytics_storage: consentGranted ? 'granted' : 'denied',
    ad_storage: 'denied' // Educational platform - no ads
  });

  if (ANALYTICS_CONFIG.debug) {
    console.log('📊 Analytics consent updated:', consentGranted);
  }
};

export default {
  initializeAnalytics,
  initializeFullAnalytics,
  trackPageView,
  trackEducationalEvent,
  trackProductInteraction,
  trackPurchase,
  trackSubscription,
  trackGameSession,
  trackFileInteraction,
  trackSearch,
  trackEngagement,
  trackCustomEvent,
  updateAnalyticsConsent,
  ANALYTICS_CONFIG
};