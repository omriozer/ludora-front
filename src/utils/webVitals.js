/**
 * Web Vitals Monitoring and Reporting for Ludora
 * Tracks Core Web Vitals metrics for SEO and performance optimization
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';
import { isDev, isProd } from './environment';

/**
 * Configuration for Web Vitals monitoring
 */
const WEB_VITALS_CONFIG = {
  // Only report metrics in production for real user monitoring
  enabled: isProd(),

  // Thresholds for metric classification (Google's standards)
  thresholds: {
    LCP: { good: 2500, needsImprovement: 4000 },  // Largest Contentful Paint (ms)
    INP: { good: 200, needsImprovement: 500 },     // Interaction to Next Paint (ms)
    CLS: { good: 0.1, needsImprovement: 0.25 },    // Cumulative Layout Shift
    FCP: { good: 1800, needsImprovement: 3000 },   // First Contentful Paint (ms)
    TTFB: { good: 800, needsImprovement: 1800 }    // Time to First Byte (ms)
  },

  // Sample rate for reporting (0.1 = 10% of users)
  sampleRate: 0.1,

  // Endpoint for reporting metrics (optional - for future analytics)
  reportingEndpoint: '/api/analytics/web-vitals'
};

/**
 * Classify metric performance based on Google's Core Web Vitals standards
 */
const classifyMetric = (name, value) => {
  const threshold = WEB_VITALS_CONFIG.thresholds[name];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
};

/**
 * Report metric to console and potentially to analytics endpoint
 */
const reportMetric = async (metric) => {
  const { name, value, rating, delta, id } = metric;
  const classification = classifyMetric(name, value);

  // Enhanced metric data for reporting
  const metricData = {
    name,
    value,
    rating,
    classification,
    delta,
    id,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    connectionType: navigator.connection?.effectiveType || 'unknown',
    // Portal detection for dual-portal analysis
    portal: window.location.hostname.includes('my.') ? 'student' : 'teacher'
  };

  // Console logging for development and debugging
  console.group(`📊 Core Web Vitals: ${name}`);
  console.log(`Value: ${value}ms (${classification})`);
  console.log(`Rating: ${rating}`);
  console.log(`Portal: ${metricData.portal}`);
  console.log(`URL: ${metricData.url}`);
  console.groupEnd();

  // Optional: Send to analytics endpoint (only in production with sampling)
  if (WEB_VITALS_CONFIG.enabled && Math.random() < WEB_VITALS_CONFIG.sampleRate) {
    try {
      // Note: This endpoint would need to be implemented in the backend
      await fetch(WEB_VITALS_CONFIG.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metricData),
        // Don't block page unload
        keepalive: true
      }).catch(() => {
        // Silently fail - metrics reporting should never break user experience
      });
    } catch (error) {
      // Silently fail - metrics reporting should never break user experience
    }
  }

  // Store in sessionStorage for debugging
  try {
    const existingMetrics = JSON.parse(sessionStorage.getItem('webVitalsMetrics') || '[]');
    existingMetrics.push(metricData);
    sessionStorage.setItem('webVitalsMetrics', JSON.stringify(existingMetrics.slice(-10))); // Keep last 10
  } catch (error) {
    // Silently fail if sessionStorage is not available
  }
};

/**
 * Initialize Web Vitals monitoring
 * Call this once when the app starts
 */
export const initWebVitals = () => {
  try {
    // Core Web Vitals (affects SEO ranking)
    onLCP(reportMetric);  // Largest Contentful Paint - loading performance
    onINP(reportMetric);  // Interaction to Next Paint - interactivity (replaces FID)
    onCLS(reportMetric);  // Cumulative Layout Shift - visual stability

    // Additional important metrics
    onFCP(reportMetric);  // First Contentful Paint - perceived loading
    onTTFB(reportMetric); // Time to First Byte - server response time

    console.log('🚀 Web Vitals monitoring initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Web Vitals monitoring:', error);
  }
};

/**
 * Get current Web Vitals metrics from sessionStorage
 * Useful for debugging and development
 */
export const getCurrentMetrics = () => {
  try {
    return JSON.parse(sessionStorage.getItem('webVitalsMetrics') || '[]');
  } catch (error) {
    return [];
  }
};

/**
 * Performance optimization hints based on current metrics
 */
export const getPerformanceHints = () => {
  const metrics = getCurrentMetrics();
  const hints = [];

  metrics.forEach(metric => {
    const { name, classification } = metric;

    if (classification === 'poor') {
      switch (name) {
        case 'LCP':
          hints.push({
            metric: 'LCP',
            issue: 'Slow loading of largest content element',
            suggestions: [
              'Optimize images with modern formats (WebP, AVIF)',
              'Implement image lazy loading',
              'Reduce server response times',
              'Use a CDN for static assets',
              'Preload critical resources'
            ]
          });
          break;
        case 'INP':
          hints.push({
            metric: 'INP',
            issue: 'Poor responsiveness to user interactions',
            suggestions: [
              'Reduce JavaScript bundle size',
              'Split code into smaller chunks',
              'Use web workers for heavy computations',
              'Defer non-critical JavaScript',
              'Optimize event handlers',
              'Reduce main thread blocking tasks'
            ]
          });
          break;
        case 'CLS':
          hints.push({
            metric: 'CLS',
            issue: 'Unexpected layout shifts',
            suggestions: [
              'Set explicit dimensions for images and videos',
              'Reserve space for dynamic content',
              'Avoid inserting content above existing content',
              'Use CSS aspect-ratio for responsive media',
              'Preload fonts to prevent layout shifts'
            ]
          });
          break;
      }
    }
  });

  return hints;
};

/**
 * Development utility to simulate slow loading conditions
 * Only available in development mode
 */
export const simulateSlowLoading = (delay = 2000) => {
  if (!isDev()) {
    console.warn('simulateSlowLoading is only available in development mode');
    return;
  }

  // Add artificial delay to test loading performance
  const style = document.createElement('style');
  style.textContent = `
    * {
      animation: slowLoad ${delay}ms linear;
    }
    @keyframes slowLoad {
      0% { opacity: 0; }
      99% { opacity: 0; }
      100% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  setTimeout(() => {
    document.head.removeChild(style);
  }, delay);
};

export default {
  initWebVitals,
  getCurrentMetrics,
  getPerformanceHints,
  simulateSlowLoading
};