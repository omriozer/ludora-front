/**
 * Protected Flow Utilities
 *
 * Detects when user is in a critical flow (like purchasing) that should NOT be
 * interrupted by onboarding or other redirects.
 *
 * When a user logs in during a protected flow:
 * 1. They complete their intended action (e.g., purchase)
 * 2. THEN onboarding appears (on next navigation)
 */

import { clog } from '@/lib/utils';

// Storage key for deferred onboarding
const DEFERRED_ONBOARDING_KEY = 'ludora_deferred_onboarding';
const DEFERRED_ONBOARDING_TIMESTAMP_KEY = 'ludora_deferred_onboarding_timestamp';

// Maximum age for deferred onboarding (30 minutes)
const MAX_DEFERRED_AGE_MS = 30 * 60 * 1000;

/**
 * Routes that represent protected flows where onboarding should be deferred
 * These are critical user flows that should not be interrupted
 */
const PROTECTED_ROUTES = [
  // Purchase and checkout flows
  '/checkout',
  '/payment-result',

  // Product details page (user may be trying to purchase)
  '/product-details',

  // Subscription flows
  '/subscription',
];

/**
 * Route patterns (regex) for dynamic protected routes
 */
const PROTECTED_ROUTE_PATTERNS = [
  // PayPlus payment flows
  /^\/payplus/i,

  // Product purchase with ID patterns
  /^\/products\/.*\/purchase/i,

  // Course/workshop purchase flows
  /^\/course\/.*\/purchase/i,
  /^\/workshop\/.*\/purchase/i,
];

/**
 * Check if a path is a protected flow that should not be interrupted
 * @param {string} pathname - Current route pathname
 * @returns {boolean} True if user is in a protected flow
 */
export function isProtectedFlow(pathname) {
  if (!pathname) return false;

  // Check exact route matches (fast path)
  const isExactMatch = PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route)
  );

  if (isExactMatch) {
    return true;
  }

  // Check pattern matches (slower, only if exact match fails)
  const isPatternMatch = PROTECTED_ROUTE_PATTERNS.some(pattern =>
    pattern.test(pathname)
  );

  return isPatternMatch;
}

/**
 * Check if URL has purchase intent query parameters
 * @param {string} search - URL search string (query params)
 * @returns {boolean} True if purchase intent detected
 */
export function hasPurchaseIntent(search) {
  if (!search) return false;

  const params = new URLSearchParams(search);

  // Common purchase intent parameters
  const purchaseParams = [
    'purchase',
    'buy',
    'checkout',
    'addToCart',
    'subscribe',
    'payment',
  ];

  return purchaseParams.some(param => params.has(param) || params.get('action') === param);
}

/**
 * Defer onboarding for the current session
 * Called when user logs in during a protected flow
 */
export function deferOnboarding() {
  try {
    sessionStorage.setItem(DEFERRED_ONBOARDING_KEY, 'true');
    sessionStorage.setItem(DEFERRED_ONBOARDING_TIMESTAMP_KEY, Date.now().toString());
    clog('[ProtectedFlow] Onboarding deferred');
  } catch (error) {
    // Session storage may not be available in some contexts
    console.warn('[ProtectedFlow] Could not defer onboarding:', error);
  }
}

/**
 * Clear deferred onboarding flag
 * Called after onboarding has been shown or user navigates away from protected flow
 */
export function clearDeferredOnboarding() {
  try {
    sessionStorage.removeItem(DEFERRED_ONBOARDING_KEY);
    sessionStorage.removeItem(DEFERRED_ONBOARDING_TIMESTAMP_KEY);
    clog('[ProtectedFlow] Deferred onboarding cleared');
  } catch (error) {
    // Session storage may not be available in some contexts
    console.warn('[ProtectedFlow] Could not clear deferred onboarding:', error);
  }
}

/**
 * Check if onboarding is currently deferred
 * @returns {boolean} True if onboarding is deferred and not expired
 */
export function isOnboardingDeferred() {
  try {
    const isDeferred = sessionStorage.getItem(DEFERRED_ONBOARDING_KEY) === 'true';

    if (!isDeferred) return false;

    // Check if the deferral has expired
    const timestampStr = sessionStorage.getItem(DEFERRED_ONBOARDING_TIMESTAMP_KEY);
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      const age = Date.now() - timestamp;

      if (age > MAX_DEFERRED_AGE_MS) {
        clog('[ProtectedFlow] Deferred onboarding expired');
        clearDeferredOnboarding();
        return false;
      }
    }

    return true;
  } catch {
    // Session storage may not be available in some contexts
    return false;
  }
}

/**
 * Combined check for whether onboarding should be shown now
 * Returns false if user is in protected flow OR onboarding is deferred
 *
 * @param {string} pathname - Current route pathname
 * @param {string} search - URL search string (query params)
 * @returns {boolean} True if onboarding should be shown now
 */
export function shouldShowOnboardingNow(pathname, search = '') {
  // Check if in protected flow
  if (isProtectedFlow(pathname)) {
    clog('[ProtectedFlow] In protected flow - deferring onboarding');
    return false;
  }

  // Check if has purchase intent
  if (hasPurchaseIntent(search)) {
    clog('[ProtectedFlow] Purchase intent detected - deferring onboarding');
    return false;
  }

  // Check if onboarding was explicitly deferred
  if (isOnboardingDeferred()) {
    // Clear the deferral now since we're checking outside protected flow
    // This means onboarding WILL show on this check
    clearDeferredOnboarding();
    clog('[ProtectedFlow] Deferred onboarding - will show now');
    return true;
  }

  return true;
}

/**
 * Mark that user has completed a protected flow
 * This can trigger showing deferred onboarding on next navigation
 */
export function markProtectedFlowComplete() {
  // If onboarding was deferred, it will show on next non-protected route
  // The deferral flag stays set until shouldShowOnboardingNow is called
  clog('[ProtectedFlow] Protected flow completed');
}
