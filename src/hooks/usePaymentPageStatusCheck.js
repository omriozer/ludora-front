import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/services/apiClient';
import { Purchase } from '@/services/entities';
import { toast } from '@/components/ui/use-toast';
import ludlog from '@/lib/ludlog';

// GLOBAL REQUEST DEDUPLICATION: Prevent multiple simultaneous calls to same API
let globalRequestPromise = null;
let globalRequestTime = 0;

// DEBOUNCING: Prevent rapid-fire calls
let debounceTimer = null;

/**
 * usePaymentPageStatusCheck - React hook for checking PayPlus payment page status
 *
 * This hook automatically checks for pending purchases and determines if their
 * associated PayPlus payment pages were abandoned or if payment was attempted.
 *
 * Actions taken:
 * - If page abandoned → reverts purchases to 'cart' status
 * - If payment attempted → continues with transaction polling
 *
 * Used by: MyAccount, Checkout, Product pages, etc.
 */
export const usePaymentPageStatusCheck = (options = {}) => {
  const {
    enabled = true, // Whether to run the check
    onStatusUpdate = null, // Callback when payment status changes
    checkInterval = null, // Optional interval for periodic checking
    showToasts = true // Whether to show user notifications
  } = options;

  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusSummary, setStatusSummary] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Check payment page status for user's pending payments (DEBOUNCED & DEDUPLICATED)
   */
  const checkPaymentPageStatus = useCallback(async () => {
    if (!enabled || isChecking) {
      return;
    }

    // DEBOUNCING: Clear any existing timer and set new one
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    return new Promise((resolve, reject) => {
      debounceTimer = setTimeout(async () => {
        try {
          // GLOBAL DEDUPLICATION: Check if request is already in progress
          const now = Date.now();
          if (globalRequestPromise && (now - globalRequestTime) < 5000) {
            ludlog.payment('🔍 usePaymentPageStatusCheck: Using existing API request (deduplication)');
            const result = await globalRequestPromise;
            resolve(result);
            return;
          }

          setIsChecking(true);
          setError(null);

          ludlog.payment('🔍 usePaymentPageStatusCheck: Starting new payment page status check...');

          // Create new global request
          globalRequestTime = now;
          globalRequestPromise = apiRequest('/payments/check-payment-page-status', {
            method: 'POST'
          });

          const response = await globalRequestPromise;

          // Clear global request after completion
          globalRequestPromise = null;

          setStatusSummary(response.summary);
          setPendingCount(response.summary.total_pending);
          setLastCheckTime(new Date());

          // Handle results and provide user feedback - use current refs to avoid stale closures
          if (response.summary.reverted_to_cart > 0) {
            if (showToastsRef.current) {
              toast({
                title: "עגלת קניות עודכנה",
                description: `${response.summary.reverted_to_cart} פריטים הוחזרו לעגלה לאחר ביטול תשלום`,
                variant: "default"
              });
            }

            // Notify parent component about status update
            if (onStatusUpdateRef.current) {
              onStatusUpdateRef.current({
                type: 'reverted_to_cart',
                count: response.summary.reverted_to_cart,
                summary: response.summary
              });
            }
          }

          if (response.summary.continue_polling > 0) {
            if (onStatusUpdateRef.current) {
              onStatusUpdateRef.current({
                type: 'continue_polling',
                count: response.summary.continue_polling,
                summary: response.summary
              });
            }
          }

          if (response.summary.errors > 0) {
            
          }

          setIsChecking(false);
          resolve(response);

        } catch (err) {
          // Clear global request on error
          globalRequestPromise = null;

          console.error('❌ Error checking payment page status:', err);
          setError(err.message);
          setIsChecking(false);

          // Handle rate limiting gracefully
          if (err.response?.status === 429) {
            if (showToastsRef.current) {
              toast({
                title: "בדיקת תשלום מוגבלת זמנית",
                description: "יותר מדי בדיקות - ננסה שוב בקרוב",
                variant: "default"
              });
            }
          } else {
            if (showToastsRef.current) {
              toast({
                title: "שגיאה בבדיקת סטטוס תשלום",
                description: "לא ניתן לבדוק את סטטוס התשלומים הממתינים",
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
   * Get user's current pending purchases count
   */
  const getPendingPurchasesCount = useCallback(async () => {
    try {
      const pendingPurchases = await Purchase.filter({
        payment_status: 'pending'
      });

      const count = pendingPurchases?.length || 0;
      setPendingCount(count);
      return count;
    } catch (err) {
      console.error('❌ Error getting pending purchases count:', err);
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
      getPendingPurchasesCount().then((count) => {
        // Only run page status check if there are pending purchases
        if (count > 0) {
          ludlog.payment(`📝 Found ${count} pending purchases, checking page status...`);
          checkPaymentPageStatus();
        } else {
          ludlog.payment('📭 No pending purchases found, skipping page status check');
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
        getPendingPurchasesCount().then((count) => {
          if (count > 0) {
            checkPaymentPageStatus();
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
    checkPaymentPageStatus,
    getPendingPurchasesCount,

    // Computed values
    hasPendingPayments: pendingCount > 0,
    hasRecentlyChecked: lastCheckTime && (Date.now() - lastCheckTime.getTime()) < 60000, // Within last minute
  };
};

export default usePaymentPageStatusCheck;