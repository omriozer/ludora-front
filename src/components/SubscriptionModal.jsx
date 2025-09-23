import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SubscriptionPlan, User, PendingSubscription, SubscriptionHistory } from "@/services/entities";
import { processSubscriptionCallbacks } from "@/services/functions"; // This import is still used
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductTypeName } from "@/config/productTypes";
import {
  X,
  Crown,
  CreditCard,
  Play,
  Users,
  BarChart3,
  Infinity,
  Check,
  Star,
  Zap,
  Gift,
  Settings,
  Globe
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";

export default function SubscriptionModal({ isOpen, onClose, currentUser, onSubscriptionChange, isAutoOpened = false }) {
  const navigate = useNavigate();
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  // Confirmation dialog states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [planToCancel, setPlanToCancel] = useState(null);
  // Message / Toast state
  const [message, setMessage] = useState(null); // { type: 'success' | 'error' | 'warning', text: string }

  // New states for upgrade confirmation and environment selection
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [planToUpgrade, setPlanToUpgrade] = useState(null);
  const [upgradeConfirmResolve, setUpgradeConfirmResolve] = useState(null);

  const [showEnvironmentSelection, setShowEnvironmentSelection] = useState(false);
  const [environmentSelectionResolve, setEnvironmentSelectionResolve] = useState(null);

  // Ref for managing the interval ID
  const intervalRef = useRef(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000); // Clear message after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadSubscriptionPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const plans = await SubscriptionPlan.filter({ is_active: true }, 'sort_order');
      setSubscriptionPlans(plans);

      // Set current plan only if user actually has one
      if (currentUser?.current_subscription_plan_id) {
        const userPlan = plans.find((plan) => plan.id === currentUser.current_subscription_plan_id);
        setCurrentPlan(userPlan || null);
      } else {
        // No default plan - user must make a choice
        setCurrentPlan(null);
      }
    } catch (error) {
      console.error("Error loading subscription plans:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת תוכניות המנוי.' });
    }
    setIsLoading(false);
  }, [currentUser]);

  // Check if user has pending subscription
  const checkPendingSubscription = useCallback(async () => {
    if (!currentUser) return;

    console.log('[SUBSCRIPTION_MODAL] Checking payment status for user:', currentUser.email);

    // Clear any existing interval before starting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      // Check if user has pending subscription status
      if (currentUser.subscription_status === 'pending') {
        const lastUpdate = currentUser.subscription_status_updated_at ? new Date(currentUser.subscription_status_updated_at) : new Date();
        const now = new Date();
        const minutesElapsed = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);

        console.log(`[SUBSCRIPTION_MODAL] User has pending subscription - ${minutesElapsed} minutes elapsed`);

        if (minutesElapsed >= 5) {
          // More than 5 minutes - reset subscription data
          console.log('[SUBSCRIPTION_MODAL] Resetting expired pending subscription');

          await User.updateMyUserData({
            current_subscription_plan_id: null,
            subscription_status: 'free_plan',
            subscription_status_updated_at: now.toISOString(),
            payplus_subscription_uid: null
          });

          setPaymentInProgress(false);
          setPendingMessage('');

          // Reload user data
          const updatedUser = await User.me();
          if (onSubscriptionChange) {
            onSubscriptionChange(updatedUser);
          }

          // No need to clear interval, as it wouldn't have been set for an expired pending sub
          setMessage({ type: 'warning', text: 'תהליך התשלום לא הושלם בזמן. אנא נסה שוב.' });
          return;
        }

        // Still within 5 minutes - show processing message and start monitoring
        setPaymentInProgress(true);
        setPendingMessage(`התשלום שלך נמצא בתהליך עיבוד (${minutesElapsed} דקות)...`);

        const intervalId = setInterval(async () => {
          try {
            console.log('[SUBSCRIPTION_MODAL] Checking for processed subscription...');

            // Call the processing function
            await processSubscriptionCallbacks();

            // Check if subscription was processed
            const updatedUser = await User.me();
            if (updatedUser.subscription_status === 'active') {
              console.log('[SUBSCRIPTION_MODAL] Subscription processed successfully!');

              // Payment was processed!
              setPaymentInProgress(false);
              setPendingMessage('');
              if (intervalRef.current) { // Ensure we clear the specific interval instance
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }

              // Update parent component
              if (onSubscriptionChange) {
                onSubscriptionChange(updatedUser);
              }

              // Close modal
              onClose();

              // Show success message
              setMessage({ type: 'success', text: 'המנוי שלך אושר בהצלחה! הדף יתרענן כעת.' });
              setTimeout(() => window.location.reload() /* TODO: Consider if this reload is necessary */, 1000); // Reload page to reflect changes
            } else {
              // Update elapsed time message
              // Re-fetch user to ensure we get the absolute latest status_updated_at for message
              const currentPendingUser = await User.me();
              const newLastUpdate = currentPendingUser.subscription_status_updated_at ? new Date(currentPendingUser.subscription_status_updated_at) : lastUpdate;
              const newMinutesElapsed = Math.floor((new Date().getTime() - newLastUpdate.getTime()) / 60000);
              setPendingMessage(`התשלום שלך נמצא בתהליך עיבוד (${newMinutesElapsed} דקות)...`);
              console.log('[SUBSCRIPTION_MODAL] Subscription still pending...');

              // Check for timeout within the interval loop as well
              if (newMinutesElapsed >= 5) {
                console.log('[SUBSCRIPTION_MODAL] Subscription pending timeout - resetting from inside interval');
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                await User.updateMyUserData({
                  current_subscription_plan_id: null,
                  subscription_status: 'free_plan',
                  subscription_status_updated_at: new Date().toISOString(),
                  payplus_subscription_uid: null
                });
                setPaymentInProgress(false);
                setPendingMessage('');
                setMessage({ type: 'error', text: 'התשלום לא הושלם בזמן. אנא נסה שוב.' });
                setTimeout(() => window.location.reload() /* TODO: Consider if this reload is necessary */, 1000); // Reload page to reflect changes
              }
            }
          } catch (error) {
            console.error('Error processing subscription in interval:', error);
            setMessage({ type: 'error', text: 'שגיאה בעת בדיקת סטטוס תשלום.' });
          }
        }, 60000); // Check every minute

        intervalRef.current = intervalId; // Store the interval ID in the ref

      } else {
        // If no pending status, ensure states are reset and interval is cleared
        setPaymentInProgress(false);
        setPendingMessage('');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        console.log('No active pending subscriptions found on user object.');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setMessage({ type: 'error', text: 'שגיאה בבדיקת סטטוס תשלום.' });
    }
  }, [currentUser, onSubscriptionChange, onClose]);

  // useEffect for loading plans and checking pending status
  useEffect(() => {
    if (isOpen && currentUser) {
      loadSubscriptionPlans();
      checkPendingSubscription();
    }

    // Cleanup interval when component unmounts or isOpen changes to false
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, currentUser, loadSubscriptionPlans, checkPendingSubscription]);

  const formatPrice = (price) => {
    const num = Number(price);
    if (Number.isNaN(num)) return "—";
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(2);
  };

  const calculateDiscountedPrice = (plan) => {
    const price = Number(plan.price);
    const discountValue = Number(plan.discount_value);
    if (!plan.has_discount || !discountValue || price === 0 || Number.isNaN(price)) {
      return price;
    }
    let discountedPrice;
    if (plan.discount_type === 'percentage') {
      discountedPrice = Math.max(0, price - price * discountValue / 100);
    } else {
      discountedPrice = Math.max(0, price - discountValue);
    }
    return discountedPrice;
  };

  const getDiscountText = (plan) => {
    const price = Number(plan.price);
    const discountValue = Number(plan.discount_value);
    if (!plan.has_discount || !discountValue || Number.isNaN(price)) return '';
    if (plan.discount_type === 'percentage') {
      return `${discountValue}% הנחה`;
    } else { // Assuming 'amount' if not 'percentage'
      const percentage = price > 0 ? Math.round(discountValue / price * 100) : 0;
      return `${percentage}% הנחה`;
    }
  };

  const getBillingPeriodText = (billingPeriod) => {
    return billingPeriod === 'yearly' ? 'שנתי' : 'חודשי';
  };

  const getPeriodText = (billingPeriod) => {
    return billingPeriod === 'yearly' ? 'לשנה' : 'לחודש';
  };

  // Modified to return the payment URL instead of redirecting immediately
  const redirectToPaymentPage = async (plan, environment) => {
    try {
      console.log('Attempting to create PayPlus subscription page for plan:', plan.id);

      // Use dynamic import to call the function properly
      const { createPayplusSubscriptionPage } = await import('@/services/functions');
      
      const frontendOrigin = window.location.origin;
      
      const response = await createPayplusSubscriptionPage({
        subscriptionPlanId: plan.id,
        environment: environment,
        frontendOrigin: frontendOrigin
      });

      console.log('Payment page creation response:', response);

      if (response.data?.success) {
        // Return the payment URL
        return response.data.payment_url;
      } else {
        console.error('Failed to create payment page:', response);
        const errorMessage = response.data?.error || response.error || 'שגיאה לא ידועה';
        const details = response.data?.details ? ` (${response.data.details})` : '';
        throw new Error(`שגיאה ביצירת דף התשלום: ${errorMessage}${details}`);
      }
    } catch (error) {
      console.error("Error in redirectToPaymentPage:", error);
      throw error; // Re-throw to be caught by caller
    }
  };

  const handleSelectPlan = async (plan) => {
    // Don't allow new payments if payment is in progress or user has a pending status
    if (paymentInProgress || currentUser?.subscription_status === 'pending') {
      setMessage({ type: 'warning', text: 'יש לך תהליך תשלום פעיל. אנא המתן לסיום העיבוד או נסה שוב בעוד מספר דקות.' });
      return;
    }

    if (isSelecting) return;

    setIsSelecting(true);
    try {
      if (plan.price === 0) {
        // Free plan - handle subscription cancellation if needed
        if (currentUser?.payplus_subscription_uid && currentUser?.subscription_status === 'active') {
          // Show confirmation dialog instead of browser confirm
          setPlanToCancel(plan);
          setShowCancelConfirm(true);
          setIsSelecting(false); // Allow re-selection if they cancel the confirm
          return;
        }

        // Update to free plan directly
        await User.updateMyUserData({
          current_subscription_plan_id: plan.id,
          subscription_start_date: new Date().toISOString(),
          subscription_status: 'free_plan',
          subscription_status_updated_at: new Date().toISOString(),
          payplus_subscription_uid: null
        });

        // Record subscription history for the new free plan activation
        if (currentUser?.current_subscription_plan_id && currentUser.current_subscription_plan_id !== plan.id) {
          if (!currentUser?.payplus_subscription_uid && currentUser?.subscription_status !== 'active') {
             await recordSubscriptionHistory(currentUser, plan, 'downgraded');
          }
        } else {
          await recordSubscriptionHistory(currentUser, plan, 'started');
        }

        setCurrentPlan(plan);

        // Notify parent component
        if (onSubscriptionChange) {
          onSubscriptionChange(plan);
        }
        setMessage({ type: 'success', text: 'המנוי שלך עודכן בהצלחה למנוי חינם.' });
        // Close modal after successful selection
        setTimeout(() => {
          onClose();
        }, 1000);
        setIsSelecting(false);
      } else {
        // Paid plan - check if user has existing active subscription
        if (currentUser?.payplus_subscription_uid && currentUser?.subscription_status === 'active') {
          // Show confirmation dialog for upgrade
          const shouldUpgrade = await new Promise((resolve) => {
            setShowUpgradeConfirm(true);
            setUpgradeConfirmResolve(() => resolve);
            setPlanToUpgrade(plan);
          });
          
          if (!shouldUpgrade) {
            setIsSelecting(false);
            return;
          }

          try {
            // Determine environment for cancellation
            let environment = 'production'; // Default
            
            // If user is admin, show environment selection
            if (currentUser?.role === 'admin') {
              environment = await new Promise((resolve) => {
                setShowEnvironmentSelection(true);
                setEnvironmentSelectionResolve(() => resolve);
              });
              // If admin cancelled environment selection
              if (environment === null) {
                setIsSelecting(false);
                return;
              }
            }

            // Cancel existing PayPlus subscription - Use dynamic import
            const { cancelPayplusRecurringSubscription } = await import('@/services/functions');
            
            const cancelResult = await cancelPayplusRecurringSubscription({
              recurring_uid: currentUser.payplus_subscription_uid,
              environment: environment,
              reason: 'User upgraded to different plan'
            });

            if (!cancelResult.data?.success) {
              throw new Error(cancelResult.data?.error || 'Failed to cancel existing subscription in PayPlus');
            }

            // Record history for the old subscription being cancelled due to upgrade
            await recordSubscriptionHistory(currentUser, plan, 'cancelled');
            console.log('✅ Old PayPlus subscription cancelled due to upgrade.');
            setMessage({ type: 'success', text: 'המנוי הקודם בוטל בהצלחה. כעת תועבר למסך תשלום עבור המנוי החדש.' });

          } catch (error) {
            console.error('Error cancelling existing subscription:', error);
            setMessage({ type: 'error', text: 'שגיאה בביטול המנוי הקיים. אנא נסה שוב.' });
            setIsSelecting(false);
            return;
          }
        }

        // Record subscription history before starting new subscription
        if (currentUser?.current_subscription_plan_id) {
          const actionType = currentUser.current_subscription_plan_id !== plan.id ? 'upgraded' : 'started';
          await recordSubscriptionHistory(currentUser, plan, actionType);
        } else {
          await recordSubscriptionHistory(currentUser, plan, 'started');
        }

        // FIXED: Create payment page FIRST, only update user status if successful
        try {
          console.log('Creating payment page for plan:', plan.id);
          
          // Try to create payment page - determine environment
          let paymentEnvironment = 'production'; // Default for users
          
          // If user is admin, allow choosing environment
          if (currentUser?.role === 'admin') {
            paymentEnvironment = await new Promise((resolve) => {
              setShowEnvironmentSelection(true);
              setEnvironmentSelectionResolve(() => resolve);
            });
            // If admin cancelled environment selection
            if (paymentEnvironment === null) {
              setIsSelecting(false);
              return;
            }
          }

          const paymentUrl = await redirectToPaymentPage(plan, paymentEnvironment);
          
          // ONLY if redirectToPaymentPage succeeds (returns URL without throwing), update user to pending
          console.log('Payment page created successfully, updating user status to pending...');
          
          await User.updateMyUserData({
            current_subscription_plan_id: plan.id,
            subscription_status: 'pending',
            subscription_status_updated_at: new Date().toISOString()
          });

          console.log('User status updated to pending successfully');
          
          // Now, perform the actual redirect
          window.location.href = paymentUrl;

        } catch (error) {
          console.error('Error creating payment page:', error);
          // Don't update user status if payment page creation failed
          setMessage({ type: 'error', text: `שגיאה ביצירת דף התשלום: ${error.message}` });
          setIsSelecting(false);
          return;
        }
        // Note: setIsSelecting(false) is not needed here as page redirects
      }
    } catch (error) {
      console.error("Error selecting subscription plan:", error);
      setMessage({ type: 'error', text: 'שגיאה בבחירת תוכנית המנוי.' });
      setIsSelecting(false);
    }
    // No finally block needed - handled in catch and specific cases above
  };

  const handleCancelConfirm = async () => {
    if (!planToCancel) return;

    try {
      let environment = 'production'; // Default
      
      // If user is admin, show environment selection
      if (currentUser?.role === 'admin') {
        environment = await new Promise((resolve) => {
          setShowEnvironmentSelection(true);
          setEnvironmentSelectionResolve(() => resolve);
        });
        // If admin cancelled environment selection
        if (environment === null) {
          setShowCancelConfirm(false); // Close the initial confirmation dialog
          setPlanToCancel(null);
          return;
        }
      }

      // Cancel PayPlus recurring subscription - Use dynamic import
      const { cancelPayplusRecurringSubscription } = await import('@/services/functions');
      
      const cancelResult = await cancelPayplusRecurringSubscription({
        recurring_uid: currentUser.payplus_subscription_uid,
        environment: environment,
        reason: 'User switched to free plan'
      });

      if (cancelResult.data?.success) {
        console.log('✅ PayPlus subscription cancelled successfully');
        
        // Record subscription history for the cancelled paid subscription
        await recordSubscriptionHistory(currentUser, planToCancel, 'cancelled');
        
        // IMPORTANT: Don't switch to free plan immediately!
        // Keep current subscription active until end date, only remove PayPlus recurring
        await User.updateMyUserData({
          // Keep current plan and dates - only remove PayPal UID to prevent future charges
          payplus_subscription_uid: null,
          subscription_status_updated_at: new Date().toISOString()
        });

        // Update current plan display but keep the paid plan active
        const updatedUser = await User.me();

        // Notify parent component
        if (onSubscriptionChange) {
          onSubscriptionChange(updatedUser);
        }

        // Show success message explaining the cancellation behavior
        setMessage({ 
          type: 'success', 
          text: `המנוי שלך בוטל בהצלחה ולא יתחדש אוטומטי. המנוי הנוכחי יישאר פעיל עד ${currentUser.subscription_end_date ? new Date(currentUser.subscription_end_date).toLocaleDateString('he-IL') : 'מועד החיוב הבא'}, ואז יעבור אוטומטית למנוי החינם.` 
        });

        // Close modal after successful selection
        setTimeout(() => {
          onClose();
        }, 3000); // Give more time to read the message
      } else {
        console.error('❌ Failed to cancel PayPlus subscription:', cancelResult);
        const errorMessage = cancelResult.data?.error || cancelResult.error || 'שגיאה לא ידועה';
        setMessage({ type: 'error', text: `שגיאה בביטול המנוי ב-PayPlus: ${errorMessage}` });
      }
    } catch (error) {
      console.error('❌ Error cancelling subscription:', error);
      const errorMessage = error.message || 'שגיאה לא ידועה';
      setMessage({ type: 'error', text: `שגיאה בביטול המנוי: ${errorMessage}` });
    } finally {
      setShowCancelConfirm(false);
      setPlanToCancel(null);
    }
  };


  // Add function to record subscription history
  const recordSubscriptionHistory = async (user, newPlan, actionType) => {
    try {
      await SubscriptionHistory.create({
        user_id: user.id,
        subscription_plan_id: newPlan.id, // The ID of the plan involved in this action (e.g., the free plan chosen, or the new paid plan being bought)
        action_type: actionType, // 'started', 'upgraded', 'downgraded', 'cancelled'
        previous_plan_id: user.current_subscription_plan_id,
        start_date: new Date().toISOString(), // The date this action was initiated
        // For 'cancelled' action, end_date refers to when the *previous* subscription will expire
        // For 'started', 'upgraded', 'downgraded', end_date is generally null as the new plan is ongoing
        end_date: actionType === 'cancelled' && user.subscription_end_date ? user.subscription_end_date : null,
        purchased_price: newPlan.price, // Price of the new plan
        // This field represents the payplus_subscription_uid of the subscription *being acted upon*.
        // If cancelling, it's the old UID. If starting a new, it will be null for free or later updated by webhook for paid.
        payplus_subscription_uid: user.payplus_subscription_uid,
        notes: `${actionType} via subscription modal`
      });
    } catch (error) {
      console.error('Error recording subscription history:', error);
      setMessage({ type: 'error', text: 'שגיאה בתיעוד היסטוריית מנוי.' });
    }
  };

  const isCurrentPlan = (plan) => {
    // Only consider a plan "current" if the user explicitly has it set
    return currentPlan && currentPlan.id === plan.id;
  };

  return (
    <>
      {message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm w-full text-center ${
          message.type === 'success' ? 'bg-green-500' :
          message.type === 'error' ? 'bg-red-500' :
          'bg-yellow-500'}`}
        >
          {message.text}
        </div>
      )}

      {/* Main Modal - Full Screen */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-none w-screen h-screen max-h-none m-0 p-0 bg-white" dir="rtl">
          {paymentInProgress ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12 px-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">התשלום בעיבוד</h3>
                <p className="text-gray-600 mb-4">{pendingMessage}</p>
                <p className="text-sm text-gray-500">
                  אנחנו בודקים את סטטוס התשלום שלך. אנא אל תסגור את החלון.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
              <div className="min-h-full flex flex-col">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white py-8">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                          <Crown className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h1 className="text-4xl font-bold">בחר את תוכנית המנוי שלך</h1>
                          <p className="text-purple-100 text-lg mt-2">
                            בחר.י את כל ההטבות והאפשרויות שמתאימות לך
                          </p>
                        </div>
                      </div>

                      {/* Close button only if not auto-opened */}
                      {!isAutoOpened && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onClose}
                          className="text-white hover:bg-white/20 rounded-full w-12 h-12"
                        >
                          <X className="w-6 h-6" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 py-12">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">טוען תוכניות מנוי...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      {/* Current User's Subscription Summary */}
                      {currentPlan && ( // Only show if user has a current plan set
                        <div className="mb-8 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-center sm:text-right"> {/* Adjusted for RTL and flex layout */}
                            <p className="text-sm text-gray-600">המנוי הנוכחי שלך:</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                              {currentPlan.name}
                            </h3>
                          </div>
                          {currentUser.subscription_end_date && currentUser.subscription_status === 'active' && (
                            <div className="bg-white/70 p-3 rounded-lg text-center flex-shrink-0">
                              <div className="text-gray-500 text-sm mb-1">
                                {currentUser.payplus_subscription_uid ? 'מתחדש ב' : 'פג ב'}
                              </div>
                              <div className="font-semibold text-gray-900 text-lg">
                                {new Date(currentUser.subscription_end_date).toLocaleDateString('he-IL')}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* End Current User's Subscription Summary */}

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {subscriptionPlans.map((plan) => {
                          const discountedPrice = calculateDiscountedPrice(plan);
                          const hasDiscount = plan.has_discount && plan.discount_value && plan.price > 0;
                          const isCurrent = isCurrentPlan(plan);
                          const isFree = plan.price === 0;

                          return (
                            <Card key={plan.id} className={`relative group hover:shadow-2xl transition-all duration-500 border-2 ${
                              isCurrent ? 'border-green-500 bg-green-50/30 shadow-green-200/50' :
                              isFree ? 'border-blue-200 bg-blue-50/30 hover:border-blue-300' :
                              'border-purple-200 bg-white shadow-xl'} rounded-3xl overflow-hidden transform hover:scale-105`
                            }>

                                {/* Background gradient overlay - improved for free plan */}
                                <div className={`absolute inset-0 ${
                              isFree ? 'opacity-5 bg-gradient-to-br from-blue-400 to-teal-400' :
                              plan.plan_type === 'pro' ? 'opacity-5 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500' :
                              'opacity-5 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600'}`} />

                                {/* Premium badge */}
                                {plan.plan_type === 'pro' && (
                                  <div className="absolute -top-2 -right-2 w-20 h-20">
                                    <div className="absolute transform rotate-45 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold py-1 px-8 top-4 right-[-35px] shadow-lg">
                                      פרימיום
                                    </div>
                                  </div>
                                )}

                                {/* Current plan badge */}
                                {isCurrent && (
                                  <div className="absolute top-4 left-4 z-10">
                                    <Badge className="bg-green-500 text-white border-0 font-semibold">
                                      <Check className="w-3 h-3 ml-1" />
                                      המנוי הנוכחי שלך
                                    </Badge>
                                  </div>
                                )}

                                <CardHeader className="relative pb-4 pt-8">
                                  <div className="text-center">
                                    {isFree ? (
                                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <Gift className="w-8 h-8 text-white" />
                                      </div>
                                    ) : plan.plan_type === 'pro' ? (
                                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                                        <Crown className="w-8 h-8 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                                        <CreditCard className="w-8 h-8 text-white" />
                                      </div>
                                    )}

                                    <CardTitle className={`text-2xl font-bold mb-2 ${isFree ? 'text-blue-700' : 'text-gray-900'}`}>
                                      {plan.name}
                                    </CardTitle>

                                    <Badge variant="outline" className="text-sm">
                                      מנוי {getBillingPeriodText(plan.billing_period)}
                                    </Badge>

                                    <p className={`text-sm mt-3 leading-relaxed px-4 ${isFree ? 'text-blue-600' : 'text-gray-600'}`}>
                                      {plan.description}
                                    </p>
                                  </div>
                                </CardHeader>

                                <CardContent className="relative px-6">
                                  {/* Price */}
                                  <div className="text-center py-6 border-t border-gray-100">
                                    {hasDiscount && (
                                      <div className="mb-3">
                                        <Badge className="bg-green-500 text-white text-sm px-3 py-1 font-semibold">
                                          🎉 {getDiscountText(plan)}
                                        </Badge>
                                      </div>
                                    )}

                                    <div className="flex items-baseline justify-center gap-1 mb-2">
                                      {isFree ? (
                                        <span className="text-5xl font-bold text-blue-600">חינם</span>
                                      ) : (
                                        <>
                                          {hasDiscount && (
                                            <span className="text-xl text-gray-400 line-through ml-3">
                                              ₪{formatPrice(plan.price)}
                                            </span>
                                          )}
                                          <span className="text-xl text-gray-500">₪</span>
                                          <span className={`text-5xl font-bold ${hasDiscount ? 'text-green-600' : 'text-gray-900'}`}>
                                            {formatPrice(discountedPrice)}
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    {plan.price > 0 && (
                                      <div className={`text-lg ${isFree ? 'text-blue-500' : 'text-gray-500'}`}>
                                        {getPeriodText(plan.billing_period)}
                                      </div>
                                    )}

                                    {/* Discount validity */}
                                    {hasDiscount && plan.discount_valid_until && (
                                      <div className="text-xs text-green-600 mt-2 font-medium">
                                        ההנחה בתוקף עד: {new Date(plan.discount_valid_until).toLocaleDateString('he-IL')}
                                      </div>
                                    )}
                                  </div>

                                  {/* Benefits */}
                                  <div className="space-y-4 py-6 border-t border-gray-100">
                                    <h4 className={`font-semibold text-center mb-4 ${isFree ? 'text-blue-700' : 'text-gray-900'}`}>
                                      הטבות כלולות
                                    </h4>

                                    <div className="space-y-3">
                                      {/* Games Access */}
                                      <div className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                                        plan.benefits?.games_access?.enabled ?
                                        isFree ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-100' :
                                        'bg-gray-50 border border-gray-100 opacity-50'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          plan.benefits?.games_access?.enabled ?
                                          isFree ? 'bg-blue-500' : 'bg-green-500' :
                                          'bg-gray-300'}`}>
                                          <Play className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-medium flex items-center gap-2 ${
                                            plan.benefits?.games_access?.enabled ?
                                            isFree ? 'text-blue-800' : 'text-green-900' :
                                            'text-gray-600'}`}>
                                            גישה ל{getProductTypeName('game', 'plural')}
                                            {plan.benefits?.games_access?.unlimited && (
                                              <Infinity className={`w-4 h-4 mr-1 ${isFree ? 'text-blue-600' : 'text-green-600'}`} />
                                            )}
                                          </div>
                                          <div className={`text-sm mt-1 ${
                                            plan.benefits?.games_access?.enabled ?
                                            isFree ? 'text-blue-700' : 'text-green-700' :
                                            'text-gray-500'}`}>
                                            {plan.benefits?.games_access?.enabled ?
                                              plan.benefits?.games_access?.unlimited ?
                                                `גישה בלתי מוגבלת לכל ה${getProductTypeName('game', 'plural')}` :
                                                `עד ${plan.benefits?.games_access?.monthly_limit} ${getProductTypeName('game', 'plural')} בחודש` :
                                              'לא כלול במנוי זה'
                                            }
                                          </div>
                                        </div>
                                      </div>

                                      {/* Classroom Management */}
                                      <div className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                                        plan.benefits?.classroom_management?.enabled ?
                                        isFree ? 'bg-blue-50 border border-blue-200' : 'bg-blue-50 border border-blue-100' :
                                        'bg-gray-50 border border-gray-100 opacity-50'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          plan.benefits?.classroom_management?.enabled ?
                                          'bg-blue-500' : 'bg-gray-300'}`}>
                                          <Users className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-medium flex items-center gap-2 ${
                                            plan.benefits?.classroom_management?.enabled ? 'text-blue-900' : 'text-gray-600'}`}>
                                            ניהול כיתות
                                            {plan.benefits?.classroom_management?.unlimited_classrooms && (
                                              <Infinity className="w-4 h-4 mr-1 text-blue-600" />
                                            )}
                                          </div>
                                          <div className={`text-sm mt-1 ${
                                            plan.benefits?.classroom_management?.enabled ? 'text-blue-700' : 'text-gray-500'}`}>
                                            {plan.benefits?.classroom_management?.enabled ? (
                                              <>
                                                <div>
                                                  {plan.benefits?.classroom_management?.unlimited_classrooms ?
                                                    'כיתות ללא הגבלה' :
                                                    `עד ${plan.benefits?.classroom_management?.max_classrooms || 3} כיתות`
                                                  }
                                                </div>
                                                <div className="text-xs">
                                                  {plan.benefits?.classroom_management?.unlimited_students_per_classroom ?
                                                    'תלמידים ללא הגבלה בכיתה' :
                                                    `עד ${plan.benefits?.classroom_management?.max_students_per_classroom || 30} תלמידים בכיתה`
                                                  }
                                                </div>
                                                {plan.benefits?.classroom_management?.unlimited_total_students ? (
                                                  <div className="text-xs">תלמידים ללא הגבלה כללית</div>
                                                ) : (
                                                  plan.benefits?.classroom_management?.max_total_students !== undefined && 
                                                  plan.benefits?.classroom_management?.max_total_students !== null && (
                                                    <div className="text-xs">עד {plan.benefits?.classroom_management?.max_total_students} תלמידים סה"כ</div>
                                                  )
                                                )}
                                              </>
                                            ) : 'לא כלול במנוי זה'}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Reports Access */}
                                      <div className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                                        plan.benefits?.reports_access ?
                                        isFree ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-100' :
                                        'bg-gray-50 border border-gray-100 opacity-50'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          plan.benefits?.reports_access ?
                                          isFree ? 'bg-blue-500' : 'bg-purple-500' :
                                          'bg-gray-300'}`}>
                                          <BarChart3 className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-medium ${
                                            plan.benefits?.reports_access ?
                                            isFree ? 'text-blue-900' : 'text-purple-900' :
                                            'text-gray-600'}`}>
                                            צפיה בדוחות
                                          </div>
                                          <div className={`text-sm mt-1 ${
                                            plan.benefits?.reports_access ?
                                            isFree ? 'text-blue-700' : 'text-purple-700' :
                                            'text-gray-500'}`}>
                                            {plan.benefits?.reports_access ?
                                              'דוחות מפורטים על פעילות התלמידים' :
                                              'לא כלול במנוי זה'
                                            }
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Button */}
                                  <div className="pt-6 border-t border-gray-100">
                                    {isCurrent ? (
                                      <Button
                                        disabled
                                        className="w-full py-4 rounded-2xl bg-green-500 text-white text-lg font-semibold">
                                        <Check className="w-5 h-5 ml-2" />
                                        המנוי הנוכחי שלך
                                      </Button>
                                    ) : (
                                      <Button
                                        onClick={() => handleSelectPlan(plan)}
                                        disabled={isSelecting}
                                        className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all ${
                                          isFree ?
                                          'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white' :
                                          plan.plan_type === 'pro' ?
                                          'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900' :
                                          'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'} shadow-lg hover:shadow-xl transform hover:scale-105`}>
                                        {isSelecting ? (
                                          <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                                            מעדכן...
                                          </>
                                        ) : (
                                          <>
                                            <Star className="w-5 h-5 ml-2" />
                                            בחר תוכנית זו
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancellation Confirmation Dialog (for switching to free plan) */}
      <ConfirmationDialog
        isOpen={showCancelConfirm}
        onClose={() => {
          setShowCancelConfirm(false);
          setPlanToCancel(null);
        }}
        onConfirm={handleCancelConfirm}
        title="ביטול מנוי בתשלום"
        message={`אתה עובר ממנוי בתשלום למנוי חינם. זה יבטל את המנוי הנוכחי שלך.

המנוי יישאר פעיל עד ${currentUser?.subscription_end_date ? new Date(currentUser.subscription_end_date).toLocaleDateString('he-IL') : 'מועד החיוב הבא'}, ואז יעבור למנוי החינם.

האם אתה בטוח שברצונך להמשיך?`}
        confirmText="כן, בטל מנוי"
        cancelText="לא, השאר מנוי פעיל"
        variant="warning"
      />

      {/* Upgrade Confirmation Dialog (for switching from paid to paid plan) */}
      <ConfirmationDialog
        isOpen={showUpgradeConfirm}
        onClose={() => {
          if (upgradeConfirmResolve) {
            upgradeConfirmResolve(false); // User cancelled or closed the dialog
          }
          setShowUpgradeConfirm(false);
          setPlanToUpgrade(null);
          setUpgradeConfirmResolve(null);
        }}
        onConfirm={() => {
          if (upgradeConfirmResolve) {
            upgradeConfirmResolve(true); // User confirmed
          }
          setShowUpgradeConfirm(false);
          setPlanToUpgrade(null);
          setUpgradeConfirmResolve(null);
        }}
        title="מעבר למנוי חדש"
        message="אתה כבר במנוי פעיל. המעבר למנוי חדש יבטל את המנוי הנוכחי ויחיל את המנוי החדש מיידית.

האם ברצונך להמשיך?"
        confirmText="כן, המשך"
        cancelText="לא, חזור"
        variant="info"
      />

      {/* Environment Selection Dialog - Only for Admins */}
      <Dialog open={showEnvironmentSelection} onOpenChange={() => {
        if (environmentSelectionResolve) {
          environmentSelectionResolve(null); // Treat closing as cancellation
        }
        setShowEnvironmentSelection(false);
        setEnvironmentSelectionResolve(null);
      }}>
        <DialogContent className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-0" dir="rtl">
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">בחר סביבת PayPlus</h2>
              <p className="text-gray-600 text-sm">
                כמנהל, אתה יכול לבחור באיזו סביבה לבטל את המנוי
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <Button
                onClick={() => {
                  if (environmentSelectionResolve) {
                    environmentSelectionResolve('production');
                  }
                  setShowEnvironmentSelection(false);
                  setEnvironmentSelectionResolve(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl"
              >
                <Globe className="w-5 h-5 ml-2" />
                סביבת ייצור (Production)
              </Button>

              <Button
                onClick={() => {
                  if (environmentSelectionResolve) {
                    environmentSelectionResolve('test');
                  }
                  setShowEnvironmentSelection(false);
                  setEnvironmentSelectionResolve(null);
                }}
                variant="outline"
                className="w-full py-3 border-2 border-orange-200 hover:bg-orange-50 rounded-xl"
              >
                <Settings className="w-5 h-5 ml-2" />
                סביבת בדיקות (Test)
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                if (environmentSelectionResolve) {
                  environmentSelectionResolve(null); // Indicate cancellation
                  setEnvironmentSelectionResolve(null);
                }
                setShowEnvironmentSelection(false);
              }}
              className="w-full text-gray-500 hover:bg-gray-100"
            >
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
