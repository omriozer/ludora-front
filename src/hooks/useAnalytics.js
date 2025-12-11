/**
 * React Hook for Analytics Integration
 * Provides easy access to analytics functions in React components
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
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
  updateAnalyticsConsent
} from '../utils/analytics';

/**
 * Main analytics hook
 */
export const useAnalytics = () => {
  const location = useLocation();
  const lastTrackedPath = useRef(null);

  // Auto-track page views when route changes
  useEffect(() => {
    const currentPath = location.pathname + location.search;

    // Only track if path actually changed
    if (lastTrackedPath.current !== currentPath) {
      const pageTitle = document.title;

      trackPageView(currentPath, pageTitle, {
        referrer: lastTrackedPath.current,
        search_params: location.search,
        hash: location.hash
      });

      lastTrackedPath.current = currentPath;
    }
  }, [location.pathname, location.search, location.hash]);

  // Wrapped tracking functions with error handling
  const track = {
    // Educational events
    educational: useCallback((eventName, data = {}) => {
      try {
        trackEducationalEvent(eventName, data);
      } catch (error) {
        console.warn('Analytics tracking failed:', error);
      }
    }, []),

    // Product interactions
    product: useCallback((action, productType, productId, data = {}) => {
      try {
        trackProductInteraction(action, productType, productId, data);
      } catch (error) {
        console.warn('Product tracking failed:', error);
      }
    }, []),

    // Purchase events
    purchase: useCallback((transactionData) => {
      try {
        trackPurchase(transactionData);
      } catch (error) {
        console.warn('Purchase tracking failed:', error);
      }
    }, []),

    // Subscription events
    subscription: useCallback((action, data = {}) => {
      try {
        trackSubscription(action, data);
      } catch (error) {
        console.warn('Subscription tracking failed:', error);
      }
    }, []),

    // Game session events
    gameSession: useCallback((action, gameData = {}) => {
      try {
        trackGameSession(action, gameData);
      } catch (error) {
        console.warn('Game session tracking failed:', error);
      }
    }, []),

    // File interaction events
    fileInteraction: useCallback((action, fileData = {}) => {
      try {
        trackFileInteraction(action, fileData);
      } catch (error) {
        console.warn('File interaction tracking failed:', error);
      }
    }, []),

    // Search events
    search: useCallback((query, results, filters = {}) => {
      try {
        trackSearch(query, results, filters);
      } catch (error) {
        console.warn('Search tracking failed:', error);
      }
    }, []),

    // Engagement metrics
    engagement: useCallback((metricName, value, context = {}) => {
      try {
        trackEngagement(metricName, value, context);
      } catch (error) {
        console.warn('Engagement tracking failed:', error);
      }
    }, []),

    // Custom events
    custom: useCallback((eventName, data = {}) => {
      try {
        trackCustomEvent(eventName, data);
      } catch (error) {
        console.warn('Custom event tracking failed:', error);
      }
    }, []),

    // Update consent
    updateConsent: useCallback((consentGranted) => {
      try {
        updateAnalyticsConsent(consentGranted);
      } catch (error) {
        console.warn('Consent update failed:', error);
      }
    }, [])
  };

  return { track };
};

/**
 * Hook for tracking component mount/unmount times
 */
export const useComponentTracking = (componentName, additionalData = {}) => {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    // Track component mount
    trackCustomEvent('component_mount', {
      component_name: componentName,
      mount_time: mountTime.current,
      ...additionalData
    });

    // Track component unmount and duration
    return () => {
      const duration = Date.now() - mountTime.current;
      trackCustomEvent('component_unmount', {
        component_name: componentName,
        duration_ms: duration,
        ...additionalData
      });
    };
  }, [componentName, additionalData]);
};

/**
 * Hook for tracking user interactions within a component
 */
export const useInteractionTracking = (componentName) => {
  const trackInteraction = useCallback((actionName, interactionData = {}) => {
    trackCustomEvent('user_interaction', {
      component_name: componentName,
      action_name: actionName,
      timestamp: Date.now(),
      ...interactionData
    });
  }, [componentName]);

  return { trackInteraction };
};

/**
 * Hook for tracking form submissions and validations
 */
export const useFormTracking = (formName) => {
  const { track } = useAnalytics();

  const trackFormStart = useCallback(() => {
    track.custom('form_start', {
      form_name: formName,
      started_at: Date.now()
    });
  }, [track, formName]);

  const trackFormSubmit = useCallback((success, errors = []) => {
    track.custom('form_submit', {
      form_name: formName,
      success: success,
      error_count: errors.length,
      errors: errors.join(', '),
      submitted_at: Date.now()
    });
  }, [track, formName]);

  const trackFormFieldError = useCallback((fieldName, errorMessage) => {
    track.custom('form_field_error', {
      form_name: formName,
      field_name: fieldName,
      error_message: errorMessage,
      timestamp: Date.now()
    });
  }, [track, formName]);

  const trackFormAbandonment = useCallback((completedFields) => {
    track.custom('form_abandonment', {
      form_name: formName,
      completed_fields: completedFields.length,
      fields_completed: completedFields.join(', '),
      abandoned_at: Date.now()
    });
  }, [track, formName]);

  return {
    trackFormStart,
    trackFormSubmit,
    trackFormFieldError,
    trackFormAbandonment
  };
};

/**
 * Hook for tracking performance and loading times
 */
export const usePerformanceTracking = (featureName) => {
  const startTime = useRef(null);

  const startTiming = useCallback(() => {
    startTime.current = Date.now();
  }, []);

  const endTiming = useCallback((additionalData = {}) => {
    if (startTime.current) {
      const duration = Date.now() - startTime.current;
      trackCustomEvent('performance_timing', {
        feature_name: featureName,
        duration_ms: duration,
        ...additionalData
      });
      startTime.current = null;
    }
  }, [featureName]);

  return { startTiming, endTiming };
};

/**
 * Hook for tracking search and filter usage
 */
export const useSearchTracking = () => {
  const { track } = useAnalytics();

  const trackSearchStart = useCallback((query, context = {}) => {
    track.custom('search_start', {
      query: query,
      query_length: query.length,
      search_context: context,
      started_at: Date.now()
    });
  }, [track]);

  const trackSearchResults = useCallback((query, results, filters = {}, loadTime) => {
    track.search(query, results, filters);

    // Additional detailed tracking
    track.custom('search_results', {
      query: query,
      results_count: results.length,
      load_time_ms: loadTime,
      has_results: results.length > 0,
      applied_filters: Object.keys(filters).filter(key => filters[key] !== 'all' && filters[key] !== '').length,
      timestamp: Date.now()
    });
  }, [track]);

  const trackFilterApplication = useCallback((filterType, filterValue, resultsCount) => {
    track.custom('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue,
      results_after_filter: resultsCount,
      timestamp: Date.now()
    });
  }, [track]);

  return {
    trackSearchStart,
    trackSearchResults,
    trackFilterApplication
  };
};

export default useAnalytics;