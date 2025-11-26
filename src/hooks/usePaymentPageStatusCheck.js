import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/services/apiClient';
import { Purchase } from '@/services/entities';
import { toast } from '@/components/ui/use-toast';

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
   * Check payment page status for user's pending payments
   */
  const checkPaymentPageStatus = useCallback(async () => {
    if (!enabled || isChecking) {
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      console.log('🔍 usePaymentPageStatusCheck: Checking payment page status...');

      // Call our payment page status API
      const response = await apiRequest('/api/payments/check-payment-page-status', {
        method: 'POST'
      });

      console.log('✅ Payment page status check completed:', response.summary);

      setStatusSummary(response.summary);
      setPendingCount(response.summary.total_pending);
      setLastCheckTime(new Date());

      // Handle results and provide user feedback
      if (response.summary.reverted_to_cart > 0) {
        if (showToasts) {
          toast({
            title: "עגלת קניות עודכנה",
            description: `${response.summary.reverted_to_cart} פריטים הוחזרו לעגלה לאחר ביטול תשלום`,
            variant: "default"
          });
        }

        // Notify parent component about status update
        if (onStatusUpdate) {
          onStatusUpdate({
            type: 'reverted_to_cart',
            count: response.summary.reverted_to_cart,
            summary: response.summary
          });
        }
      }

      if (response.summary.continue_polling > 0) {
        console.log(`💳 ${response.summary.continue_polling} payments are being processed, continuing monitoring`);

        if (onStatusUpdate) {
          onStatusUpdate({
            type: 'continue_polling',
            count: response.summary.continue_polling,
            summary: response.summary
          });
        }
      }

      if (response.summary.errors > 0) {
        console.warn(`⚠️ ${response.summary.errors} payment status checks had errors`);
      }

      return response;

    } catch (err) {
      console.error('❌ Error checking payment page status:', err);
      setError(err.message);

      if (showToasts) {
        toast({
          title: "שגיאה בבדיקת סטטוס תשלום",
          description: "לא ניתן לבדוק את סטטוס התשלומים הממתינים",
          variant: "destructive"
        });
      }

      throw err;
    } finally {
      setIsChecking(false);
    }
  }, [enabled, isChecking, onStatusUpdate, showToasts]);

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

  // Run initial check on mount
  useEffect(() => {
    if (enabled) {
      // First get pending count quickly
      getPendingPurchasesCount().then((count) => {
        // Only run page status check if there are pending purchases
        if (count > 0) {
          console.log(`📝 Found ${count} pending purchases, checking page status...`);
          checkPaymentPageStatus();
        } else {
          console.log('📭 No pending purchases found, skipping page status check');
          setPendingCount(0);
          setLastCheckTime(new Date());
        }
      });
    }
  }, [enabled, checkPaymentPageStatus, getPendingPurchasesCount]);

  // Set up interval checking if requested
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
  }, [enabled, checkInterval, checkPaymentPageStatus, getPendingPurchasesCount]);

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