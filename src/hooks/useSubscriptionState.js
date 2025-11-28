import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/services/apiClient';
import SubscriptionBusinessLogic from '@/services/SubscriptionBusinessLogic';
import { ludlog, luderror } from '@/lib/ludlog';
import { toast } from '@/components/ui/use-toast';
import { useSubscriptionPaymentStatusCheck } from '@/hooks/useSubscriptionPaymentStatusCheck';

// Global cache for subscription data to prevent duplicate API calls
// Uses data-driven invalidation (no time-based expiration)
const subscriptionCache = {
  plans: { data: null, dataVersion: null },
  purchases: new Map(), // userId -> { data, dataVersion }
  subscriptions: new Map() // userId -> { data, dataVersion }
};

// Helper function to clear subscription caches (data-driven invalidation)
export const clearSubscriptionCache = (userId = null) => {
  subscriptionCache.plans = { data: null, dataVersion: null };
  if (userId) {
    subscriptionCache.purchases.delete(userId);
    subscriptionCache.subscriptions.delete(userId);
  } else {
    subscriptionCache.purchases.clear();
    subscriptionCache.subscriptions.clear();
  }
};

/**
 * useSubscriptionState - React hook for managing subscription state and actions
 * Integrates with SubscriptionBusinessLogic for business decisions
 */
export function useSubscriptionState(user) {
  const [subscriptionState, setSubscriptionState] = useState({
    plans: [],
    purchases: [],
    subscriptions: [], // Add subscriptions data
    loading: true,
    summary: null,
    error: null
  });

  const [actionState, setActionState] = useState({
    processing: false,
    selectedPlan: null,
    actionDecision: null
  });

  // State for tracking if we need to refresh after payment status updates
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Subscription payment status checking - automatically locks/unlocks subscription changes
  const subscriptionPaymentStatus = useSubscriptionPaymentStatusCheck({
    enabled: !!user?.id, // Only enabled when user is authenticated
    showToasts: false, // Don't show toasts here since it's background checking
    onStatusUpdate: useCallback((update) => {
      ludlog.payment('useSubscriptionState: Subscription payment status update:', { data: update });

      if (update.type === 'subscription_activated') {
        // Unlock subscription changes when subscription is activated
        setActionState(prev => ({ ...prev, processing: false }));

        // Clear cache and trigger refresh
        clearSubscriptionCache(user?.id);
        setNeedsRefresh(true);

        ludlog.payment('✅ Subscription activated - unlocked subscription changes');
      } else if (update.type === 'subscription_cancelled') {
        // Unlock subscription changes when subscription payment is cancelled/failed
        setActionState(prev => ({ ...prev, processing: false }));

        // Clear cache and trigger refresh
        clearSubscriptionCache(user?.id);
        setNeedsRefresh(true);

        ludlog.payment('✅ Subscription payment cancelled - unlocked subscription changes');
      }
    }, [user?.id]),
    checkInterval: 30000 // Check every 30 seconds for pending subscription payments
  });

  // Lock subscription changes when there are pending subscription payments being checked
  useEffect(() => {
    if (subscriptionPaymentStatus.isChecking && subscriptionPaymentStatus.pendingCount > 0) {
      // Lock subscription changes while checking payment status
      setActionState(prev => ({
        ...prev,
        processing: true
      }));
      ludlog.payment('🔒 Locked subscription changes - checking pending subscription payments');
    }
  }, [subscriptionPaymentStatus.isChecking, subscriptionPaymentStatus.pendingCount]);

  /**
   * Load subscription plans from dedicated subscription API (with caching)
   */
  const loadPlans = useCallback(async () => {
    try {
      // Check cache first - only invalidate on explicit cache clearing
      const plansCache = subscriptionCache.plans;

      if (plansCache.data) {
        ludlog.payment('✅ Using cached subscription plans');
        return plansCache.data;
      }

      ludlog.payment('🔄 Loading subscription plans from API...');
      const response = await apiRequest('/subscriptions/plans');

      if (response && response.success && response.data) {
        const activePlans = response.data;

        // Update cache with current data (no expiration)
        subscriptionCache.plans = {
          data: activePlans,
          dataVersion: Date.now() // Simple version for cache debugging
        };

        ludlog.payment('✅ Subscription plans loaded and cached:', { data: activePlans.length });
        return activePlans;
      }

      luderror.api('Invalid plans response:', response);
      return [];
    } catch (error) {
      luderror.payment('Failed to load subscription plans:', error);
      throw new Error('שגיאה בטעינת תוכניות המנוי');
    }
  }, []);

  /**
   * Load user purchases from API (with caching)
   */
  const loadPurchases = useCallback(async () => {
    if (!user?.id) return [];

    try {
      // Check cache first - only invalidate on explicit cache clearing
      const userId = user.id;
      const userCacheEntry = subscriptionCache.purchases.get(userId);

      if (userCacheEntry?.data) {
        ludlog.payment('✅ Using cached user purchases for user', { data: userId });
        return userCacheEntry.data;
      }

      ludlog.payment('🔄 Loading user purchases from API for user ID:', { data: userId });
      const response = await apiRequest(`/entities/purchase?buyer_user_id=${user.id}`);

      if (response && Array.isArray(response)) {
        // Update cache with current data (no expiration)
        subscriptionCache.purchases.set(userId, {
          data: response,
          dataVersion: Date.now() // Simple version for cache debugging
        });

        ludlog.payment('✅ User purchases loaded and cached:', { data: response.length });
        return response;
      }

      luderror.payment('Invalid purchases response:', response);
      return [];
    } catch (error) {
      luderror.payment('Failed to load user purchases:', error);
      // Don't throw here - purchases might not exist for new users
      return [];
    }
  }, [user?.id]);

  /**
   * Load user subscriptions from dedicated subscription API (with caching)
   */
  const loadSubscriptions = useCallback(async () => {
    if (!user?.id) return [];

    try {
      // Check cache first - only invalidate on explicit cache clearing
      const userId = user.id;
      const userCacheEntry = subscriptionCache.subscriptions.get(userId);

      if (userCacheEntry?.data) {
        ludlog.payment('✅ Using cached user subscriptions for user', { data: userId });
        return userCacheEntry.data;
      }

      ludlog.payment('🔄 Loading user subscriptions from API for user ID:', { data: userId });
      const response = await apiRequest('/subscriptions/user');

      if (response && response.success && response.data) {
        const subscriptions = response.data.subscriptions || [];

        // Update cache with current data (no expiration)
        subscriptionCache.subscriptions.set(userId, {
          data: subscriptions,
          dataVersion: Date.now() // Simple version for cache debugging
        });

        ludlog.payment('✅ User subscriptions loaded and cached:', { data: subscriptions.length });
        return subscriptions;
      }

      luderror.payment('Invalid subscriptions response:', response);
      return [];
    } catch (error) {
      luderror.payment('Failed to load user subscriptions:', error);
      // Don't throw here - subscriptions might not exist for new users
      return [];
    }
  }, [user?.id]);

  /**
   * Initialize subscription data
   */
  const initializeData = useCallback(async () => {
    if (!user?.id) {
      setSubscriptionState(prev => ({
        ...prev,
        loading: false,
        error: 'משתמש לא מזוהה'
      }));
      return;
    }

    try {
      setSubscriptionState(prev => ({ ...prev, loading: true, error: null }));

      const [plans, purchases, subscriptions] = await Promise.all([
        loadPlans(),
        loadPurchases(),
        loadSubscriptions()
      ]);

      const summary = SubscriptionBusinessLogic.getSubscriptionSummary(purchases, plans, subscriptions);

      setSubscriptionState({
        plans,
        purchases,
        subscriptions,
        summary,
        loading: false,
        error: null
      });

      ludlog.payment('Subscription state initialized:', { data: summary });
    } catch (error) {
      luderror.payment('Failed to initialize subscription data:', error);
      setSubscriptionState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'שגיאה בטעינת נתוני המנוי'
      }));
    }
  }, [user?.id, loadPlans, loadPurchases, loadSubscriptions]);

  /**
   * Evaluate plan selection and determine action
   */
  const evaluatePlanSelection = useCallback((targetPlan) => {
    try {
      const actionDecision = SubscriptionBusinessLogic.determineSubscriptionAction(
        user,
        targetPlan,
        subscriptionState.purchases,
        subscriptionState.plans,
        subscriptionState.subscriptions
      );

      setActionState({
        processing: false,
        selectedPlan: targetPlan,
        actionDecision
      });

      ludlog.general('Plan selection evaluated:', { data: actionDecision });
      return actionDecision;
    } catch (error) {
      luderror.validation('Failed to evaluate plan selection:', error);
      toast({
        title: "שגיאה בהערכת התוכנית",
        description: "אירעה שגיאה בהערכת בחירת התוכנית",
        variant: "destructive"
      });
      return null;
    }
  }, [user, subscriptionState.purchases, subscriptionState.plans, subscriptionState.subscriptions]);

  /**
   * Execute subscription action using dedicated subscription API
   */
  const executeSubscriptionAction = useCallback(async (actionDecision = null) => {
    const decision = actionDecision || actionState.actionDecision;

    if (!decision) {
      toast({
        title: "שגיאה",
        description: "לא נבחרה פעולה לביצוע",
        variant: "destructive"
      });
      return false;
    }

    try {
      setActionState(prev => ({ ...prev, processing: true }));

      // For subscription payments, use the new subscription API
      if (decision.needsPaymentPage) {
        ludlog.payment('Executing subscription payment via subscription API');

        // Check if this is a retry payment
        const isRetry = decision.actionType === SubscriptionBusinessLogic.ACTION_TYPES.RETRY_PAYMENT;

        const result = await apiRequest('/subscriptions/create-payment', {
          method: 'POST',
          body: JSON.stringify({
            subscriptionPlanId: decision.targetPlan.id,
            environment: 'production', // TODO: Get from environment
            isRetry
          })
        });

        if (result.success) {
          // Clear cache and refresh subscription data to show pending subscription
          clearSubscriptionCache(user?.id);
          await initializeData();

          return {
            success: true,
            requiresPayment: true,
            paymentUrl: result.paymentUrl,
            subscriptionId: result.subscriptionId,
            transactionId: result.transactionId,
            isRetry
          };
        } else {
          throw new Error(result.error || 'Failed to create subscription payment');
        }
      } else {
        // For direct changes (free plans, downgrades), still use business logic
        const result = await SubscriptionBusinessLogic.executeSubscriptionAction(decision);

        if (result.success) {
          if (result.type === 'direct_change') {
            // Clear cache and refresh data and show success
            clearSubscriptionCache(user?.id);
            await initializeData();
            toast({
              title: "התוכנית שונתה",
              description: result.message,
              variant: "default"
            });
            return { success: true, requiresPayment: false };
          }
        }
      }

      return { success: false };
    } catch (error) {
      luderror.payment('Failed to execute subscription action:', error);
      toast({
        title: "שגיאה בביצוע הפעולה",
        description: error.message || "אירעה שגיאה בעת ביצוע הפעולה",
        variant: "destructive"
      });
      return false;
    } finally {
      setActionState(prev => ({ ...prev, processing: false }));
    }
  }, [actionState.actionDecision, initializeData]);

  /**
   * Cancel pending subscription by ID
   */
  const cancelPendingSubscription = useCallback(async (subscriptionId) => {
    if (!subscriptionId) {
      toast({
        title: "שגיאה",
        description: "מזהה מנוי לא תקין",
        variant: "destructive"
      });
      return false;
    }

    try {
      setActionState(prev => ({ ...prev, processing: true }));

      const result = await SubscriptionBusinessLogic.cancelPendingSubscription(subscriptionId);

      if (result.success) {
        await initializeData();
        toast({
          title: "המנוי בוטל",
          description: result.message,
          variant: "default"
        });
        return true;
      }

      return false;
    } catch (error) {
      luderror.payment('Failed to cancel pending subscription:', error);
      toast({
        title: "שגיאה בביטול המנוי",
        description: error.message || "אירעה שגיאה בעת ביטול המנוי הממתין",
        variant: "destructive"
      });
      return false;
    } finally {
      setActionState(prev => ({ ...prev, processing: false }));
    }
  }, [initializeData]);

  /**
   * Cancel pending plan switch
   */
  const cancelPendingSwitch = useCallback(async () => {
    const pendingSwitch = subscriptionState.summary?.pendingSwitch;

    if (!pendingSwitch) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה החלפת תוכנית ממתינה",
        variant: "destructive"
      });
      return false;
    }

    try {
      setActionState(prev => ({ ...prev, processing: true }));

      const result = await SubscriptionBusinessLogic.cancelPendingPlanSwitch(pendingSwitch);

      if (result.success) {
        await initializeData();
        toast({
          title: "החלפת התוכנית בוטלה",
          description: result.message,
          variant: "default"
        });
        return true;
      }

      return false;
    } catch (error) {
      luderror.validation('Failed to cancel pending switch:', error);
      toast({
        title: "שגיאה בביטול החלפת התוכנית",
        description: error.message || "אירעה שגיאה בעת ביטול החלפת התוכנית",
        variant: "destructive"
      });
      return false;
    } finally {
      setActionState(prev => ({ ...prev, processing: false }));
    }
  }, [subscriptionState.summary?.pendingSwitch, initializeData]);

  /**
   * Reset action state
   */
  const resetActionState = useCallback(() => {
    setActionState({
      processing: false,
      selectedPlan: null,
      actionDecision: null
    });
  }, []);

  /**
   * Check if plan is current user's plan
   */
  const isCurrentPlan = useCallback((plan) => {
    return subscriptionState.summary?.currentPlan?.id === plan.id;
  }, [subscriptionState.summary?.currentPlan]);

  /**
   * Check if plan selection is disabled
   */
  const isPlanDisabled = useCallback((plan) => {
    // Disable current plan
    if (isCurrentPlan(plan)) return true;

    // No longer disable plans when there's a pending switch - allow replacement
    return false;
  }, [isCurrentPlan]);

  /**
   * Get plan button text based on state
   */
  const getPlanButtonText = useCallback((plan) => {
    if (isCurrentPlan(plan)) {
      return 'התוכנית הנוכחית';
    }

    // Check if user has an active pending subscription for this plan
    const hasPendingSubscriptionForPlan = subscriptionState.subscriptions?.some(sub =>
      sub.subscription_plan_id === plan.id && sub.status === 'pending'
    );

    // If there's a pending subscription, show waiting status like one-time purchases
    if (hasPendingSubscriptionForPlan) {
      return 'ממתין לאישור תשלום';
    }

    // Always evaluate the action for each plan to get the most accurate button text
    const actionDecision = SubscriptionBusinessLogic.determineSubscriptionAction(
      user,
      plan,
      subscriptionState.purchases,
      subscriptionState.plans,
      subscriptionState.subscriptions
    );

    // Handle specific action types
    switch (actionDecision.actionType) {
      case SubscriptionBusinessLogic.ACTION_TYPES.RETRY_PAYMENT:
        return 'ממתין לאישור תשלום'; // Match one-time purchase UX
      case SubscriptionBusinessLogic.ACTION_TYPES.REPLACE_PENDING:
        return 'החלף תוכנית ממתינה';
      case SubscriptionBusinessLogic.ACTION_TYPES.CANCEL_PENDING_DOWNGRADE:
        return 'בטל ועבור למנוי חינם';
      case SubscriptionBusinessLogic.ACTION_TYPES.UPGRADE:
        return 'שדרג תוכנית';
      case SubscriptionBusinessLogic.ACTION_TYPES.DOWNGRADE:
        return 'הורד תוכנית';
      case SubscriptionBusinessLogic.ACTION_TYPES.NEW_SUBSCRIPTION:
        return plan.price > 0 ? 'רכישת מנוי' : 'התחל חינם';
      default:
        return 'בחר תוכנית';
    }
  }, [isCurrentPlan, subscriptionState.summary, subscriptionState.subscriptions, user, subscriptionState.purchases, subscriptionState.plans]);

  // Initialize data on mount and user change
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Handle refresh trigger from subscription payment status updates
  useEffect(() => {
    if (needsRefresh) {
      ludlog.payment('🔄 Refreshing subscription data after payment status update');

      // Small delay to ensure backend has processed the subscription status change
      const refreshTimeout = setTimeout(() => {
        initializeData();
        setNeedsRefresh(false);
      }, 1000);

      return () => clearTimeout(refreshTimeout);
    }
  }, [needsRefresh, initializeData]);

  return {
    // State
    ...subscriptionState,
    ...actionState,

    // Payment status checking state
    paymentStatusChecking: {
      isChecking: subscriptionPaymentStatus.isChecking,
      pendingCount: subscriptionPaymentStatus.pendingCount,
      lastCheckTime: subscriptionPaymentStatus.lastCheckTime,
      statusSummary: subscriptionPaymentStatus.statusSummary,
      error: subscriptionPaymentStatus.error
    },

    // Actions
    evaluatePlanSelection,
    executeSubscriptionAction,
    cancelPendingSubscription,
    cancelPendingSwitch,
    resetActionState,
    refreshData: initializeData,

    // Utilities
    isCurrentPlan,
    isPlanDisabled,
    getPlanButtonText
  };
}

export default useSubscriptionState;