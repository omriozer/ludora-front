# 📊 Ludora Analytics Setup Guide

## Overview

This guide covers the complete setup of the Ludora analytics system, including Google Analytics 4 integration, custom event tracking, and performance monitoring.

## 🚀 Quick Setup

### 1. Google Analytics 4 Configuration

**Create GA4 Property:**
1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property for Ludora
3. Get your Measurement ID (format: `G-XXXXXXXXXX`)

**Update Configuration:**
```javascript
// src/utils/analytics.js
const ANALYTICS_CONFIG = {
  GA4_MEASUREMENT_ID: 'G-YOUR-ACTUAL-ID', // Replace with your GA4 ID
  // ... rest of config
};
```

### 2. Initialize Analytics in App

**Add to your main App.jsx:**
```javascript
import { useEffect } from 'react';
import { initializeFullAnalytics } from './utils/analytics';

function App() {
  useEffect(() => {
    // Initialize analytics when app starts
    initializeFullAnalytics();
  }, []);

  // ... rest of your app
}
```

### 3. Use Analytics in Components

**Basic usage with the useAnalytics hook:**
```javascript
import { useAnalytics } from '@/hooks/useAnalytics';

function ProductPage({ product }) {
  const { track } = useAnalytics();

  const handleProductView = () => {
    track.product('view', product.product_type, product.id, {
      product_title: product.title,
      product_price: product.price
    });
  };

  // Component automatically tracks page views
}
```

## 📈 Analytics Features

### 1. Automatic Tracking

**✅ Already Implemented:**
- **Page Views**: Auto-tracked on route changes
- **Core Web Vitals**: Performance metrics (LCP, INP, CLS, FCP, TTFB)
- **User Sessions**: Portal detection (teacher vs student)
- **Error Tracking**: Failed API calls and errors

### 2. Educational Platform Events

**Product Interactions:**
```javascript
const { track } = useAnalytics();

// Track product views
track.product('view', 'game', gameId);

// Track downloads
track.fileInteraction('download', {
  fileId: file.id,
  fileType: file.file_type,
  size: file.size
});

// Track game sessions
track.gameSession('start', {
  gameId: game.id,
  playersCount: 4,
  difficulty: 'medium'
});
```

**Purchase Tracking:**
```javascript
// Enhanced ecommerce tracking
track.purchase({
  transactionId: 'txn_123',
  value: 49.90,
  currency: 'ILS',
  items: [
    {
      id: 'game_123',
      title: 'Math Quiz Game',
      product_type: 'game',
      price: 49.90
    }
  ]
});
```

**Subscription Events:**
```javascript
// Track subscription lifecycle
track.subscription('subscribe', {
  plan_name: 'Premium',
  plan_price: 99.90,
  billing_period: 'monthly'
});

track.subscription('cancel', {
  cancellation_reason: 'user_initiated'
});
```

### 3. Advanced Tracking Hooks

**Component Performance:**
```javascript
import { usePerformanceTracking } from '@/hooks/useAnalytics';

function HeavyComponent() {
  const { startTiming, endTiming } = usePerformanceTracking('heavy_component');

  useEffect(() => {
    startTiming();
    // ... do heavy work
    endTiming({ complexity: 'high' });
  }, []);
}
```

**Form Tracking:**
```javascript
import { useFormTracking } from '@/hooks/useAnalytics';

function CreateGameForm() {
  const {
    trackFormStart,
    trackFormSubmit,
    trackFormFieldError
  } = useFormTracking('create_game');

  useEffect(() => {
    trackFormStart();
  }, []);

  const handleSubmit = async (data) => {
    try {
      await createGame(data);
      trackFormSubmit(true);
    } catch (error) {
      trackFormSubmit(false, [error.message]);
    }
  };
}
```

**Search Tracking:**
```javascript
import { useSearchTracking } from '@/hooks/useAnalytics';

function SearchComponent() {
  const { trackSearchStart, trackSearchResults } = useSearchTracking();

  const handleSearch = async (query) => {
    trackSearchStart(query, { page: 'catalog' });

    const startTime = Date.now();
    const results = await searchProducts(query);
    const loadTime = Date.now() - startTime;

    trackSearchResults(query, results, filters, loadTime);
  };
}
```

## 🎯 Custom Events for Ludora Platform

### Educational Engagement Events

```javascript
// Track learning progress
track.educational('lesson_completed', {
  lesson_id: lessonId,
  completion_time_minutes: 25,
  score: 85
});

// Track collaboration
track.educational('classroom_activity', {
  activity_type: 'group_project',
  participants_count: 4,
  duration_minutes: 45
});

// Track content creation
track.educational('content_created', {
  content_type: 'lesson_plan',
  complexity: 'intermediate',
  estimated_duration: 60
});
```

### Platform-Specific Events

```javascript
// Portal switching
track.custom('portal_switch', {
  from_portal: 'teacher',
  to_portal: 'student',
  user_role: 'teacher'
});

// Feature usage
track.custom('feature_usage', {
  feature_name: 'bundle_creator',
  usage_duration_seconds: 180,
  items_added: 3
});

// Error reporting
track.custom('error_encountered', {
  error_type: 'api_timeout',
  error_context: 'game_loading',
  user_action: 'retry_attempted'
});
```

## 🔒 Privacy and Compliance

### GDPR Compliance

**Consent Management:**
```javascript
import { updateAnalyticsConsent } from '@/utils/analytics';

// Update consent based on user preference
const handleConsentUpdate = (consentGranted) => {
  updateAnalyticsConsent(consentGranted);

  // Store consent preference
  localStorage.setItem('analytics_consent', consentGranted);
};
```

**Data Configuration:**
- **No personal data** in events (no names, emails, IDs)
- **Anonymous user tracking** only
- **Educational focus** - no advertising tracking
- **Israeli privacy law** compliance

### Development vs Production

```javascript
// Development: Analytics disabled, debug logging enabled
// Production: Analytics enabled, optimized for performance

const ANALYTICS_CONFIG = {
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development'
};
```

## 📊 Google Analytics 4 Configuration

### Custom Dimensions Setup

**In GA4 Admin:**
1. Go to Configure → Custom Definitions
2. Add custom dimensions:
   - `user_type` (teacher, student, admin)
   - `portal` (teacher, student)
   - `subscription_status` (active, inactive, trial)
   - `product_category` (game, file, workshop, course)

### Enhanced Ecommerce Setup

**Enable Enhanced Ecommerce:**
1. Go to Configure → Data Streams
2. Select your web stream
3. Enable Enhanced measurements
4. Configure ecommerce events

### Goals and Conversions

**Key Conversion Events:**
- `purchase` - Product purchases
- `subscription_subscribe` - New subscriptions
- `game_complete` - Game completion
- `file_download` - File downloads
- `form_submit` - Contact/registration forms

## 🚀 Advanced Implementation

### Custom Event Pipeline

```javascript
// Create custom tracking for specific Ludora workflows
const trackCompleteWorkflow = (workflowName, steps) => {
  track.custom('workflow_completed', {
    workflow_name: workflowName,
    steps_completed: steps.length,
    total_duration_seconds: steps.reduce((sum, step) => sum + step.duration, 0),
    success_rate: steps.filter(s => s.success).length / steps.length
  });
};
```

### Real-time Dashboard Integration

```javascript
// Send analytics data to internal dashboard
const sendToInternalDashboard = (eventData) => {
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    }).catch(() => {
      // Fail silently
    });
  }
};
```

### A/B Testing Integration

```javascript
// Track A/B test variations
track.custom('ab_test_view', {
  test_name: 'checkout_button_color',
  variation: 'blue_variant',
  user_segment: 'returning_user'
});
```

## 🔧 Debugging and Monitoring

### Development Debugging

```javascript
// Check Web Vitals metrics
import { getCurrentMetrics, getPerformanceHints } from '@/utils/webVitals';

console.log('Current metrics:', getCurrentMetrics());
console.log('Performance hints:', getPerformanceHints());

// Check analytics events in console (development only)
// All events are logged to console when debug: true
```

### Production Monitoring

```javascript
// Monitor analytics health
const checkAnalyticsHealth = () => {
  return {
    ga4_loaded: typeof window.gtag === 'function',
    consent_status: localStorage.getItem('analytics_consent'),
    events_sent: sessionStorage.getItem('analytics_events_count') || 0
  };
};
```

### Error Handling

```javascript
// All tracking functions include error handling
// Failed tracking never breaks user experience
try {
  track.product('view', 'game', gameId);
} catch (error) {
  console.warn('Analytics tracking failed:', error);
  // User experience continues normally
}
```

## ✅ Implementation Checklist

### Pre-Launch
- [ ] Replace GA4_MEASUREMENT_ID with actual ID
- [ ] Test analytics in development mode
- [ ] Verify custom dimensions in GA4
- [ ] Set up conversion goals
- [ ] Configure enhanced ecommerce

### Launch Day
- [ ] Enable analytics in production
- [ ] Monitor real-time reports
- [ ] Verify event tracking is working
- [ ] Check Web Vitals integration
- [ ] Test purchase tracking

### Post-Launch
- [ ] Set up custom GA4 reports
- [ ] Monitor performance impact
- [ ] Analyze user behavior patterns
- [ ] Optimize based on insights
- [ ] Regular privacy compliance review

## 📚 Resources

- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Enhanced Ecommerce Setup](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [GDPR Compliance for Analytics](https://support.google.com/analytics/answer/7686480)

---

**🎯 Result: Complete analytics tracking system for educational platform with privacy compliance and performance monitoring.**