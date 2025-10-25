import { apiRequest } from './apiClient';
import { clog, cerror } from '@/lib/utils';

/**
 * SubscriptionBusinessLogic - Service for handling subscription plan decisions and business logic
 * Extracts complex subscription logic from UI components for better separation of concerns
 */
export class SubscriptionBusinessLogic {

  /**
   * Subscription action types
   */
  static ACTION_TYPES = {
    UPGRADE: 'upgrade',
    DOWNGRADE: 'downgrade',
    LATERAL_MOVE: 'lateral_move',
    NEW_SUBSCRIPTION: 'new_subscription',
    REACTIVATE: 'reactivate',
    NO_CHANGE: 'no_change',
    REPLACE_PENDING: 'replace_pending',
    RETRY_PAYMENT: 'retry_payment',
    CANCEL_PENDING_DOWNGRADE: 'cancel_pending_downgrade',
    CANCEL_PENDING_SUBSCRIPTION: 'cancel_pending_subscription'
  };

  /**
   * Compare two subscription plans and determine the relationship
   * @param {Object} currentPlan - Current user's plan
   * @param {Object} targetPlan - Plan user wants to switch to
   * @returns {Object} Comparison result with action type and details
   */
  static comparePlans(currentPlan, targetPlan) {
    if (!currentPlan) {
      return {
        actionType: this.ACTION_TYPES.NEW_SUBSCRIPTION,
        requiresPayment: targetPlan.price > 0,
        priceChange: targetPlan.price,
        message: 'תוכנית חדשה'
      };
    }

    if (currentPlan.id === targetPlan.id) {
      return {
        actionType: this.ACTION_TYPES.NO_CHANGE,
        requiresPayment: false,
        priceChange: 0,
        message: 'זוהי התוכנית הנוכחית שלך'
      };
    }

    const priceDiff = targetPlan.price - currentPlan.price;

    if (priceDiff > 0) {
      return {
        actionType: this.ACTION_TYPES.UPGRADE,
        requiresPayment: true,
        priceChange: priceDiff,
        message: `שדרוג תוכנית - תוספת של ₪${priceDiff}`
      };
    } else if (priceDiff < 0) {
      return {
        actionType: this.ACTION_TYPES.DOWNGRADE,
        requiresPayment: false,
        priceChange: priceDiff,
        message: `הורדת תוכנית - חיסכון של ₪${Math.abs(priceDiff)}`
      };
    } else {
      return {
        actionType: this.ACTION_TYPES.LATERAL_MOVE,
        requiresPayment: false,
        priceChange: 0,
        message: 'החלפת תוכנית באותו מחיר'
      };
    }
  }

  /**
   * Determine what action should be taken when user selects a plan
   * @param {Object} user - Current user object
   * @param {Object} targetPlan - Plan user wants to select
   * @param {Array} userPurchases - User's purchase history
   * @param {Array} availablePlans - All available plans for matching current plan
   * @param {Array} userSubscriptions - User's subscriptions from Subscription table (optional)
   * @returns {Object} Action decision with type and metadata
   */
  static determineSubscriptionAction(user, targetPlan, userPurchases = [], availablePlans = [], userSubscriptions = []) {
    clog('=== DETERMINING SUBSCRIPTION ACTION ===');
    clog('User:', user?.email);
    clog('Target plan:', targetPlan?.name, 'ID:', targetPlan?.id);
    clog('User purchases count:', userPurchases?.length);
    clog('Available plans count:', availablePlans?.length);
    clog('User subscriptions count:', userSubscriptions?.length);

    const currentSubscription = this.getCurrentActiveSubscription(userPurchases);
    const pendingSwitchToDifferentPlan = this.hasPendingPlanSwitchToDifferentPlan(userPurchases, targetPlan.id);

    // Check both purchases and subscriptions for pending payments
    const pendingSubscriptionForSamePlan = this.getPendingSubscriptionForSamePlan(userPurchases, targetPlan.id);
    const pendingSubscriptionFromSubscriptions = this.getPendingSubscriptionForSamePlanFromSubscriptions(userSubscriptions, targetPlan.id);

    // Use subscription table data if available, otherwise fall back to purchases
    const actualPendingSubscription = pendingSubscriptionFromSubscriptions || pendingSubscriptionForSamePlan;

    // Find the current plan object from available plans
    let currentPlan = null;
    if (currentSubscription) {
      currentPlan = availablePlans.find(plan =>
        plan.id === currentSubscription.purchasable_id
      ) || null;
    }

    clog('Determining subscription action:', {
      currentSubscription,
      currentPlan: currentPlan?.name,
      targetPlan: targetPlan.name,
      pendingSwitchToDifferentPlan,
      pendingSubscriptionForSamePlan: !!pendingSubscriptionForSamePlan,
      pendingSubscriptionFromSubscriptions: !!pendingSubscriptionFromSubscriptions,
      actualPendingSubscription: !!actualPendingSubscription
    });

    // Check if user has a pending subscription for the SAME plan (retry payment scenario)
    if (actualPendingSubscription) {
      return {
        actionType: this.ACTION_TYPES.RETRY_PAYMENT,
        reason: 'pending_payment_same_plan',
        message: `יש לך תשלום ממתין עבור ${targetPlan.name}. לחץ כדי להמשיך את התשלום.`,
        requiresPayment: true,
        canProceed: true,
        needsPaymentPage: true,
        autoExecute: false,
        pendingSubscription: actualPendingSubscription,
        currentSubscription,
        currentPlan,
        targetPlan
      };
    }

    // If there's a pending plan switch to a DIFFERENT plan, check if it's a downgrade to free
    if (pendingSwitchToDifferentPlan) {
      const pendingSwitch = this.getPendingPlanSwitch(userPurchases);
      const comparison = this.comparePlans(currentPlan, targetPlan);

      // Special case: User has pending PAID subscription but wants to downgrade to FREE
      const pendingSubscription = this.getPendingSubscriptionForDifferentPlan(userPurchases, targetPlan.id);
      const isDowngradeToFree = targetPlan.price === 0 && pendingSubscription && pendingSubscription.price > 0;

      if (isDowngradeToFree) {
        return {
          actionType: this.ACTION_TYPES.CANCEL_PENDING_DOWNGRADE,
          reason: 'cancel_pending_downgrade_to_free',
          message: `יש לך תשלום ממתין עבור מנוי בתשלום. האם ברצונך לבטל אותו ולעבור למנוי החינם?`,
          requiresPayment: false,
          canProceed: true,
          needsPaymentPage: false,
          autoExecute: false, // Always require confirmation
          pendingSwitchToCancel: pendingSwitch,
          currentSubscription,
          currentPlan,
          targetPlan
        };
      }

      return {
        ...comparison,
        actionType: 'replace_pending',
        reason: 'pending_switch_different',
        message: `יש לך החלפת תוכנית ממתינה. האם ברצונך לבטל אותה ולעבור ל${targetPlan.name}?`,
        requiresPayment: comparison.requiresPayment,
        canProceed: true,
        needsPaymentPage: this.shouldOpenPaymentPage(comparison, targetPlan),
        autoExecute: false, // Always require confirmation for replacement
        pendingSwitchToCancel: pendingSwitch,
        currentSubscription,
        currentPlan,
        targetPlan
      };
    }

    const comparison = this.comparePlans(currentPlan, targetPlan);

    // Block if trying to select current plan (only if it's truly active/completed)
    if (comparison.actionType === this.ACTION_TYPES.NO_CHANGE) {
      return {
        ...comparison,
        canProceed: false,
        reason: 'current_plan'
      };
    }

    // Determine if payment is needed or if it's an auto-action
    const needsPaymentPage = this.shouldOpenPaymentPage(comparison, targetPlan);

    return {
      ...comparison,
      canProceed: true,
      needsPaymentPage,
      autoExecute: !needsPaymentPage,
      currentSubscription,
      currentPlan,
      targetPlan
    };
  }

  /**
   * Check if action requires opening payment page vs auto-execution
   * @param {Object} comparison - Plan comparison result
   * @param {Object} targetPlan - Target plan object
   * @returns {boolean} Whether to open payment page
   */
  static shouldOpenPaymentPage(comparison, targetPlan) {
    // Free plans don't need payment page
    if (targetPlan.price === 0) {
      return false;
    }

    // Upgrades and new paid subscriptions need payment
    if (comparison.actionType === this.ACTION_TYPES.UPGRADE ||
        comparison.actionType === this.ACTION_TYPES.NEW_SUBSCRIPTION) {
      return comparison.requiresPayment;
    }

    // Downgrades and lateral moves can be auto-executed
    return false;
  }

  /**
   * Get current active subscription from purchases
   * @param {Array} purchases - User's purchase history
   * @returns {Object|null} Current active subscription or null
   */
  static getCurrentActiveSubscription(purchases = []) {
    return purchases.find(purchase =>
      purchase.purchasable_type === 'subscription' &&
      purchase.payment_status === 'completed' &&
      (!purchase.access_expires_at || new Date(purchase.access_expires_at) > new Date())
    );
  }

  /**
   * Check if user has a pending plan switch
   * @param {Array} purchases - User's purchase history
   * @returns {boolean} Whether there's a pending switch
   */
  static hasPendingPlanSwitch(purchases = []) {
    return purchases.some(purchase =>
      purchase.payment_status === 'pending' ||
      purchase.status === 'pending_switch'
    );
  }

  /**
   * Check if user has a pending plan switch to a DIFFERENT plan than the target
   * @param {Array} purchases - User's purchase history
   * @param {string} targetPlanId - The plan ID user wants to select
   * @returns {boolean} Whether there's a pending switch to a different plan
   */
  static hasPendingPlanSwitchToDifferentPlan(purchases = [], targetPlanId) {
    return purchases.some(purchase =>
      (purchase.payment_status === 'pending' || purchase.status === 'pending_switch') &&
      purchase.purchasable_type === 'subscription' &&
      purchase.purchasable_id !== targetPlanId
    );
  }

  /**
   * Check if user has a pending subscription for the SAME plan as the target
   * @param {Array} purchases - User's purchase history
   * @param {string} targetPlanId - The plan ID user wants to select
   * @returns {Object|null} Pending subscription for the same plan or null
   */
  static getPendingSubscriptionForSamePlan(purchases = [], targetPlanId) {
    clog('Checking for pending subscription for same plan:', targetPlanId);
    clog('All purchases:', purchases);

    const pendingSubscription = purchases.find(purchase =>
      (purchase.payment_status === 'pending' || purchase.status === 'pending_switch') &&
      purchase.purchasable_type === 'subscription' &&
      purchase.purchasable_id === targetPlanId
    );

    clog('Found pending subscription for same plan:', pendingSubscription);
    return pendingSubscription;
  }

  /**
   * Check if user has a pending subscription for the SAME plan as the target (from Subscription table)
   * @param {Array} subscriptions - User's subscriptions from Subscription table
   * @param {string} targetPlanId - The plan ID user wants to select
   * @returns {Object|null} Pending subscription for the same plan or null
   */
  static getPendingSubscriptionForSamePlanFromSubscriptions(subscriptions = [], targetPlanId) {
    clog('Checking for pending subscription for same plan (from subscriptions table):', targetPlanId);
    clog('All subscriptions:', subscriptions);

    const pendingSubscription = subscriptions.find(subscription =>
      subscription.status === 'pending' &&
      subscription.subscription_plan_id === targetPlanId
    );

    clog('Found pending subscription for same plan (from subscriptions):', pendingSubscription);
    return pendingSubscription;
  }

  /**
   * Get pending subscription for a DIFFERENT plan than the target (used for downgrade scenarios)
   * @param {Array} purchases - User's purchase history
   * @param {string} targetPlanId - The plan ID user wants to select
   * @returns {Object|null} Pending subscription for a different plan or null
   */
  static getPendingSubscriptionForDifferentPlan(purchases = [], targetPlanId) {
    clog('Checking for pending subscription for different plan. Target:', targetPlanId);
    clog('All purchases:', purchases);

    const pendingSubscription = purchases.find(purchase =>
      (purchase.payment_status === 'pending' || purchase.status === 'pending_switch') &&
      purchase.purchasable_type === 'subscription' &&
      purchase.purchasable_id !== targetPlanId
    );

    clog('Found pending subscription for different plan:', pendingSubscription);
    return pendingSubscription;
  }

  /**
   * Get pending plan switch details
   * @param {Array} purchases - User's purchase history
   * @returns {Object|null} Pending switch details or null
   */
  static getPendingPlanSwitch(purchases = []) {
    return purchases.find(purchase =>
      purchase.payment_status === 'pending' ||
      purchase.status === 'pending_switch'
    );
  }

  /**
   * Execute subscription plan change
   * @param {Object} actionDecision - Decision from determineSubscriptionAction
   * @returns {Promise<Object>} Result of the action
   */
  static async executeSubscriptionAction(actionDecision) {
    try {
      clog('Executing subscription action:', actionDecision);

      if (!actionDecision.canProceed) {
        throw new Error(actionDecision.message || 'לא ניתן לבצע פעולה זו');
      }

      // Handle replace pending scenario - cancel existing pending subscription first
      if (actionDecision.actionType === this.ACTION_TYPES.REPLACE_PENDING && actionDecision.pendingSwitchToCancel) {
        clog('Cancelling existing pending switch before proceeding...');
        const cancelResult = await this.cancelPendingPlanSwitch(actionDecision.pendingSwitchToCancel);

        if (!cancelResult.success) {
          throw new Error('לא ניתן לבטל את החלפת התוכנית הקיימת');
        }

        clog('Existing pending switch cancelled, proceeding with new selection...');
      }

      if (actionDecision.needsPaymentPage) {
        return await this.createPaymentProcess(actionDecision);
      } else {
        return await this.executeDirectPlanChange(actionDecision);
      }
    } catch (error) {
      cerror('Failed to execute subscription action:', error);
      throw error;
    }
  }

  /**
   * Create payment process for subscription changes requiring payment
   * @param {Object} actionDecision - Action decision with payment details
   * @returns {Promise<Object>} Payment process result
   */
  static async createPaymentProcess(actionDecision) {
    try {
      const paymentData = {
        subscriptionPlanId: actionDecision.targetPlan.id,
        actionType: actionDecision.actionType,
        upgradeFrom: actionDecision.currentSubscription?.plan?.id || null
      };

      // For retry payments, include the existing pending subscription ID
      if (actionDecision.actionType === this.ACTION_TYPES.RETRY_PAYMENT && actionDecision.pendingSubscription) {
        paymentData.existingSubscriptionId = actionDecision.pendingSubscription.id;
        paymentData.retryPayment = true;
      }

      const response = await apiRequest('/payments/createSubscriptionPayment', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      clog('Payment process created:', response);

      if (response.success) {
        if (response.data?.isFree && response.data?.completed) {
          // Free subscription completed immediately
          return {
            success: true,
            type: 'direct_change',
            message: 'המנוי עודכן בהצלחה!'
          };
        } else if (response.paymentUrl) {
          // Paid subscription - redirect to payment
          return {
            success: true,
            type: 'payment_redirect',
            paymentUrl: response.paymentUrl,
            subscriptionId: response.subscriptionId,
            transactionId: response.transactionId,
            message: 'מעביר לתשלום...'
          };
        } else {
          throw new Error('לא התקבל URL לתשלום');
        }
      } else {
        throw new Error(response.error || 'שגיאה ביצירת המנוי');
      }
    } catch (error) {
      cerror('Failed to create payment process:', error);
      throw new Error('שגיאה ביצירת תהליך התשלום');
    }
  }

  /**
   * Execute direct plan change (no payment required)
   * @param {Object} actionDecision - Action decision for direct change
   * @returns {Promise<Object>} Direct change result
   */
  static async executeDirectPlanChange(actionDecision) {
    try {
      // Handle cancel pending downgrade scenario - cancel existing pending subscription first
      if (actionDecision.actionType === this.ACTION_TYPES.CANCEL_PENDING_DOWNGRADE && actionDecision.pendingSwitchToCancel) {
        clog('Cancelling existing pending switch for downgrade to free plan...');
        const cancelResult = await this.cancelPendingPlanSwitch(actionDecision.pendingSwitchToCancel);

        if (!cancelResult.success) {
          throw new Error('לא ניתן לבטל את המנוי הממתין');
        }

        clog('Existing pending switch cancelled, proceeding with free plan activation...');
      }

      const changeData = {
        subscriptionPlanId: actionDecision.targetPlan.id,
        actionType: actionDecision.actionType,
        fromPlanId: actionDecision.currentSubscription?.plan?.id || null
      };

      const response = await apiRequest('/subscriptions/change-plan', {
        method: 'POST',
        body: JSON.stringify(changeData)
      });

      clog('Direct plan change executed:', response);
      return {
        success: true,
        type: 'direct_change',
        message: actionDecision.actionType === this.ACTION_TYPES.CANCEL_PENDING_DOWNGRADE ?
          'המנוי הממתין בוטל והמנוי החינם הופעל בהצלחה!' :
          'התוכנית שונתה בהצלחה!'
      };
    } catch (error) {
      cerror('Failed to execute direct plan change:', error);
      throw new Error('שגיאה בשינוי התוכנית');
    }
  }

  /**
   * Cancel pending plan switch
   * @param {Object} pendingSwitch - Pending switch object to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  static async cancelPendingPlanSwitch(pendingSwitch) {
    try {
      const response = await apiRequest(`/subscriptions/cancel-pending/${pendingSwitch.id}`, {
        method: 'POST'
      });

      clog('Pending plan switch cancelled:', response);
      return {
        success: true,
        message: 'החלפת התוכנית הממתינה בוטלה'
      };
    } catch (error) {
      cerror('Failed to cancel pending plan switch:', error);
      throw new Error('שגיאה בביטול החלפת התוכנית');
    }
  }

  /**
   * Get all pending subscriptions from subscription table
   * @param {Array} subscriptions - User's subscriptions from subscription table
   * @returns {Array} Array of pending subscriptions
   */
  static getPendingSubscriptionsFromTable(subscriptions = []) {
    return subscriptions.filter(subscription => subscription.status === 'pending');
  }

  /**
   * Check if user has any pending subscriptions (active + pending scenario)
   * @param {Array} subscriptions - User's subscriptions from subscription table
   * @returns {boolean} Whether user has pending subscriptions while having active subscription
   */
  static hasActivePlusPendingSubscriptions(subscriptions = []) {
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    const pendingSubscriptions = subscriptions.filter(sub => sub.status === 'pending');

    return activeSubscriptions.length > 0 && pendingSubscriptions.length > 0;
  }

  /**
   * Cancel a pending subscription by ID
   * @param {string} subscriptionId - Subscription ID to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  static async cancelPendingSubscription(subscriptionId) {
    try {
      clog('Cancelling pending subscription:', subscriptionId);

      const response = await apiRequest(`/subscriptions/cancel-pending/${subscriptionId}`, {
        method: 'POST'
      });

      clog('Pending subscription cancelled:', response);
      return {
        success: true,
        message: 'המנוי הממתין בוטל בהצלחה'
      };
    } catch (error) {
      cerror('Failed to cancel pending subscription:', error);
      throw new Error('שגיאה בביטול המנוי הממתין');
    }
  }

  /**
   * Get subscription plan summary for display
   * @param {Array} purchases - User's purchases
   * @param {Array} plans - Available plans
   * @param {Array} subscriptions - User's subscriptions from subscription table (optional)
   * @returns {Object} Subscription summary
   */
  static getSubscriptionSummary(purchases = [], plans = [], subscriptions = []) {
    // First check for active subscription in new subscription system
    const activeSubscriptionFromTable = subscriptions.find(sub => sub.status === 'active');

    // Fall back to old purchase system if no active subscription found
    const currentSubscriptionFromPurchases = this.getCurrentActiveSubscription(purchases);

    // Use subscription table data if available, otherwise fall back to purchases
    const currentSubscription = activeSubscriptionFromTable || currentSubscriptionFromPurchases;

    const pendingSwitch = this.getPendingPlanSwitch(purchases);

    // Find the current plan object from the plans array
    let currentPlan = null;
    if (currentSubscription) {
      if (activeSubscriptionFromTable) {
        // For subscription table data, use subscription_plan_id
        currentPlan = plans.find(plan =>
          plan.id === activeSubscriptionFromTable.subscription_plan_id
        ) || null;
      } else if (currentSubscriptionFromPurchases) {
        // For purchase data, use purchasable_id
        currentPlan = plans.find(plan =>
          plan.id === currentSubscriptionFromPurchases.purchasable_id
        ) || null;
      }
    }

    // Check for pending subscriptions from subscription table
    const pendingSubscriptions = this.getPendingSubscriptionsFromTable(subscriptions);
    const hasActivePlusPending = this.hasActivePlusPendingSubscriptions(subscriptions);

    // Get detailed pending subscription info
    const pendingSubscriptionDetails = pendingSubscriptions.map(pendingSub => {
      const pendingPlan = plans.find(plan => plan.id === pendingSub.subscription_plan_id);
      return {
        ...pendingSub,
        plan: pendingPlan
      };
    });

    return {
      currentPlan,
      hasActiveSubscription: !!currentSubscription,
      pendingSwitch,
      hasPendingSwitch: !!pendingSwitch,
      availablePlans: plans,
      canChangePlan: !pendingSwitch,
      // New pending subscription info
      pendingSubscriptions: pendingSubscriptionDetails,
      hasPendingSubscriptions: pendingSubscriptions.length > 0,
      hasActivePlusPending,
      // Add debugging info
      activeSubscriptionSource: activeSubscriptionFromTable ? 'subscription_table' : 'purchases'
    };
  }
}

export default SubscriptionBusinessLogic;