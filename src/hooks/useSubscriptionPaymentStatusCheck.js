import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/services/apiClient';
import { toast } from '@/components/ui/use-toast';
import { ludlog, luderror } from '@/lib/ludlog';

// GLOBAL REQUEST DEDUPLICATION: Prevent multiple simultaneous calls to same API
let globalSubscriptionRequestPromise = null;
let globalSubscriptionRequestTime = 0;

// DEBOUNCING: Prevent rapid-fire calls
let subscriptionDebounceTimer = null;

/**
 * useSubscriptionPaymentStatusCheck - React hook for checking subscription payment status
 *
 * This hook automatically checks for pending subscriptions and determines if their
 * associated PayPlus payment pages were abandoned or if payment was attempted.
 *
 * Actions taken:
 * - If page abandoned → cancels pending subscription
 * - If payment completed → activates subscription
 * - If payment failed → cancels subscription
 *
 * Used by: PaymentResult, layouts, subscription pages, etc.
 */
export const useSubscriptionPaymentStatusCheck = (options = {}) => {
  const {
    enabled = true, // Whether to run the check
    onStatusUpdate = null, // Callback when subscription status changes
    checkInterval = null, // Optional interval for periodic checking
    showToasts = true // Whether to show user notifications
  } = options;

  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusSummary, setStatusSummary] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Check subscription payment status for user's pending subscriptions (DEBOUNCED & DEDUPLICATED)
   */
  const checkSubscriptionPaymentStatus = useCallback(async () => {
    if (!enabled || isChecking) {
      return;
    }

    // DEBOUNCING: Clear any existing timer and set new one
    if (subscriptionDebounceTimer) {
      clearTimeout(subscriptionDebounceTimer);
    }

    return new Promise((resolve, reject) => {
      subscriptionDebounceTimer = setTimeout(async () => {
        try {
          // GLOBAL DEDUPLICATION: Check if request is already in progress
          const now = Date.now();
          if (globalSubscriptionRequestPromise && (now - globalSubscriptionRequestTime) < 5000) {
            ludlog.payment('🔍 useSubscriptionPaymentStatusCheck: Using existing API request (deduplication)');
            const result = await globalSubscriptionRequestPromise;
            resolve(result);
            return;
          }

          setIsChecking(true);
          setError(null);

          ludlog.payment('🔍 useSubscriptionPaymentStatusCheck: Starting new subscription payment status check...');

          // Create new global request
          globalSubscriptionRequestTime = now;
          globalSubscriptionRequestPromise = apiRequest('/subscriptions/check-payment-status', {
            method: 'POST'
          });

          const response = await globalSubscriptionRequestPromise;

          // Clear global request after completion
          globalSubscriptionRequestPromise = null;

          setStatusSummary(response.summary);
          setPendingCount(response.summary.total_pending);
          setLastCheckTime(new Date());

          // Handle results and provide user feedback - use current refs to avoid stale closures
          if (response.summary.activated > 0) {
            if (showToastsRef.current) {
              toast({
                title: "המנוי הופעל בהצלחה",
                description: `${response.summary.activated} מנוי${response.summary.activated > 1 ? 'ים' : ''} הופעל${response.summary.activated > 1 ? 'ו' : ''} לאחר תשלום מוצלח`,
                variant: "default"
              });
            }

            // Notify parent component about status update
            if (onStatusUpdateRef.current) {
              onStatusUpdateRef.current({
                type: 'subscription_activated',
                count: response.summary.activated,
                summary: response.summary
              });
            }
          }

          if (response.summary.cancelled > 0) {
            if (showToastsRef.current) {
              toast({
                title: "מנוי בוטל",
                description: `${response.summary.cancelled} מנוי${response.summary.cancelled > 1 ? 'ים' : ''} בוטל${response.summary.cancelled > 1 ? 'ו' : ''} לאחר ביטול תשלום`,
                variant: "default"
              });
            }

            // Notify parent component about status update
            if (onStatusUpdateRef.current) {
              onStatusUpdateRef.current({
                type: 'subscription_cancelled',
                count: response.summary.cancelled,
                summary: response.summary
              });
            }
          }

          if (response.summary.errors > 0) {
            ludlog.payment('⚠️ Some subscription status checks had errors', {
              errorCount: response.summary.errors
            });
          }

          setIsChecking(false);
          resolve(response);

        } catch (err) {
          // Clear global request on error
          globalSubscriptionRequestPromise = null;

          luderror.payment('Error checking subscription payment status', err);
          setError(err.message);
          setIsChecking(false);

          // Handle rate limiting gracefully
          if (err.response?.status === 429) {
            if (showToastsRef.current) {
              toast({
                title: "בדיקת מנוי מוגבלת זמנית",
                description: "יותר מדי בדיקות - ננסה שוב בקרוב",
                variant: "default"
              });
            }
          } else {
            if (showToastsRef.current) {
              toast({
                title: "שגיאה בבדיקת סטטוס מנוי",
                description: "לא ניתן לבדוק את סטטוס המנויים הממתינים",
                variant: "destructive"
              });
            }
          }

          reject(err);
        }
      }, 2000); // 2 second debounce delay
    });
  }, [enabled]); // FIX: Removed callback dependencies to prevent infinite loops

  /**
   * Get user's current pending subscriptions count
   */
  const getPendingSubscriptionsCount = useCallback(async () => {
    try {
      // Get user subscriptions and count pending ones
      const response = await apiRequest('/subscriptions/user');
      const subscriptions = response.data?.subscriptions || [];

      const pendingCount = subscriptions.filter(sub => sub.status === 'pending').length;
      setPendingCount(pendingCount);
      return pendingCount;
    } catch (err) {
      luderror.payment('Error getting pending subscriptions count', err);
      return 0;
    }
  }, []);

  // Use refs to avoid dependency issues
  const enabledRef = useRef(enabled);
  const onStatusUpdateRef = useRef(onStatusUpdate);
  const showToastsRef = useRef(showToasts);

  // Update refs when props change
  useEffect(() => {
    enabledRef.current = enabled;
    onStatusUpdateRef.current = onStatusUpdate;
    showToastsRef.current = showToasts;
  }, [enabled, onStatusUpdate, showToasts]);

  // Run initial check on mount (FIXED: No function dependencies)
  useEffect(() => {
    if (enabled) {
      // First get pending count quickly
      getPendingSubscriptionsCount().then((count) => {
        // Only run payment status check if there are pending subscriptions
        if (count > 0) {
          ludlog.payment(`📝 Found ${count} pending subscription(s), checking payment status...`);
          checkSubscriptionPaymentStatus();
        } else {
          ludlog.payment('📭 No pending subscriptions found, skipping payment status check');
          setPendingCount(0);
          setLastCheckTime(new Date());
        }
      });
    }
  }, [enabled]); // FIXED: Only depend on enabled, not functions

  // Set up interval checking if requested (FIXED: No function dependencies)
  useEffect(() => {
    if (enabled && checkInterval && checkInterval > 0) {
      const intervalId = setInterval(() => {
        getPendingSubscriptionsCount().then((count) => {
          if (count > 0) {
            checkSubscriptionPaymentStatus();
          }
        });
      }, checkInterval);

      return () => clearInterval(intervalId);
    }
  }, [enabled, checkInterval]); // FIXED: Only depend on primitive values, not functions

  return {
    // State
    isChecking,
    pendingCount,
    lastCheckTime,
    statusSummary,
    error,

    // Actions
    checkSubscriptionPaymentStatus,
    getPendingSubscriptionsCount,

    // Computed values
    hasPendingSubscriptions: pendingCount > 0,
    hasRecentlyChecked: lastCheckTime && (Date.now() - lastCheckTime.getTime()) < 60000, // Within last minute
  };
};

export default useSubscriptionPaymentStatusCheck;