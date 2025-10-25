import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/services/apiClient';
import SubscriptionBusinessLogic from '@/services/SubscriptionBusinessLogic';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

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

  /**
   * Load subscription plans from dedicated subscription API
   */
  const loadPlans = useCallback(async () => {
    try {
      clog('Loading subscription plans...');
      const response = await apiRequest('/subscriptions/plans');

      if (response && response.success && response.data) {
        const activePlans = response.data;
        clog('Loaded subscription plans:', activePlans.length);
        return activePlans;
      }

      cerror('Invalid plans response:', response);
      return [];
    } catch (error) {
      cerror('Failed to load subscription plans:', error);
      throw new Error('שגיאה בטעינת תוכניות המנוי');
    }
  }, []);

  /**
   * Load user purchases from API
   */
  const loadPurchases = useCallback(async () => {
    if (!user?.id) return [];

    try {
      clog('Loading user purchases for user ID:', user.id);
      const response = await apiRequest(`/entities/purchase?buyer_user_id=${user.id}`);

      if (response && Array.isArray(response)) {
        clog('Loaded user purchases:', response.length);
        clog('Purchase details:', response.map(p => ({
          id: p.id,
          purchasable_id: p.purchasable_id,
          purchasable_type: p.purchasable_type,
          payment_status: p.payment_status,
          status: p.status
        })));
        return response;
      }

      cerror('Invalid purchases response:', response);
      return [];
    } catch (error) {
      cerror('Failed to load user purchases:', error);
      // Don't throw here - purchases might not exist for new users
      return [];
    }
  }, [user?.id]);

  /**
   * Load user subscriptions from dedicated subscription API
   */
  const loadSubscriptions = useCallback(async () => {
    if (!user?.id) return [];

    try {
      clog('Loading user subscriptions for user ID:', user.id);
      const response = await apiRequest('/subscriptions/user');

      if (response && response.success && response.data) {
        const subscriptions = response.data.subscriptions || [];
        clog('Loaded user subscriptions:', subscriptions.length);
        clog('Subscription details:', subscriptions.map(s => ({
          id: s.id,
          subscription_plan_id: s.subscription_plan_id,
          status: s.status,
          created_at: s.created_at
        })));
        return subscriptions;
      }

      cerror('Invalid subscriptions response:', response);
      return [];
    } catch (error) {
      cerror('Failed to load user subscriptions:', error);
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

      clog('Subscription state initialized:', summary);
    } catch (error) {
      cerror('Failed to initialize subscription data:', error);
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

      clog('Plan selection evaluated:', actionDecision);
      return actionDecision;
    } catch (error) {
      cerror('Failed to evaluate plan selection:', error);
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
        clog('Executing subscription payment via subscription API');

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
          // Refresh subscription data to show pending subscription
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
            // Refresh data and show success
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
      cerror('Failed to execute subscription action:', error);
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
      cerror('Failed to cancel pending subscription:', error);
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
      cerror('Failed to cancel pending switch:', error);
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
        return 'המשך תשלום';
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
  }, [isCurrentPlan, subscriptionState.summary, user, subscriptionState.purchases, subscriptionState.plans, subscriptionState.subscriptions]);

  // Initialize data on mount and user change
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  return {
    // State
    ...subscriptionState,
    ...actionState,

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