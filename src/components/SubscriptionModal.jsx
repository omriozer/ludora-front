import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductTypeName } from "@/config/productTypes";
import { useToast } from "@/components/ui/use-toast";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import useSubscriptionState from "@/hooks/useSubscriptionState";
import SubscriptionBusinessLogic from "@/services/SubscriptionBusinessLogic";
import { User, SubscriptionHistory } from "@/services/entities";
import { ludlog, luderror } from '@/lib/ludlog';
import {
  X,
  Crown,
  CreditCard,
  Play,
  FileText,
  BookOpen,
  Users,
  BarChart3,
  Infinity,
  Check,
  Star,
  Gift,
  AlertTriangle,
  Calendar,
  Clock
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";

export default function SubscriptionModal({ isOpen, onClose, currentUser, onSubscriptionChange, isAutoOpened = false }) {
  const { toast } = useToast();

  // Use the new subscription state hook
  const {
    plans,
    summary,
    loading,
    error,
    processing,
    evaluatePlanSelection,
    executeSubscriptionAction,
    cancelPendingSwitch,
    cancelPendingSubscription,
    isCurrentPlan,
    isPlanDisabled,
    getPlanButtonText
  } = useSubscriptionState(currentUser);

  // Legacy payment states - kept for compatibility with existing payment modal
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  // Payment modal states (using Portal)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // Pending plan switch management
  const [showPendingSwitchDialog, setShowPendingSwitchDialog] = useState(false);
  const [showReplacePendingDialog, setShowReplacePendingDialog] = useState(false);
  const [replacePendingDecision, setReplacePendingDecision] = useState(null);

  // Cancel pending downgrade management
  const [showCancelPendingDowngradeDialog, setShowCancelPendingDowngradeDialog] = useState(false);
  const [cancelPendingDowngradeDecision, setCancelPendingDowngradeDecision] = useState(null);

  // Legacy confirmation dialog states - kept for backward compatibility
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [planToCancel, setPlanToCancel] = useState(null);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [upgradeConfirmResolve, setUpgradeConfirmResolve] = useState(null);

  // Ref for managing the interval ID
  const intervalRef = useRef(null);


  // Check if user has pending subscription
  const checkPendingSubscription = useCallback(async () => {
    if (!currentUser) return;


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

        if (minutesElapsed >= 5) {
          // More than 5 minutes - reset subscription data

          await User.updateMyUserData({
            current_subscription_plan_id: null,
            subscription_status: 'free_plan',
            subscription_status_updated_at: now.toISOString(),
            payplus_subscription_uid: null
          });

          setPaymentInProgress(false);
          setPendingMessage('');

          // Reload user data using the callback
          if (onSubscriptionChange) {
            onSubscriptionChange(); // Let parent handle user refresh
          }

          // No need to clear interval, as it wouldn't have been set for an expired pending sub
          toast({
            variant: "destructive",
            title: "תהליך התשלום לא הושלם",
            description: "תהליך התשלום לא הושלם בזמן. אנא נסה שוב."
          });
          return;
        }

        // Still within 5 minutes - show processing message and start monitoring
        setPaymentInProgress(true);
        setPendingMessage(`התשלום שלך נמצא בתהליך עיבוד (${minutesElapsed} דקות)...`);

        const intervalId = setInterval(async () => {
          try {

            // Check if subscription was processed via callback
            // Note: This should ideally be handled by webhook, but keeping for backwards compatibility
            if (currentUser?.subscription_status === 'active') {

              // Payment was processed!
              setPaymentInProgress(false);
              setPendingMessage('');
              if (intervalRef.current) { // Ensure we clear the specific interval instance
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }

              // Update parent component
              if (onSubscriptionChange) {
                onSubscriptionChange();
              }

              // Close modal
              onClose();

              // Show success message
              toast({
                variant: "default",
                title: "המנוי שלך אושר בהצלחה!",
                description: "הדף יתרענן כעת כדי לעדכן את הנתונים"
              });
              setTimeout(() => window.location.reload() /* TODO: Consider if this reload is necessary */, 1000); // Reload page to reflect changes
            } else {
              // Update elapsed time message using current user state
              const newLastUpdate = currentUser?.subscription_status_updated_at ? new Date(currentUser.subscription_status_updated_at) : lastUpdate;
              const newMinutesElapsed = Math.floor((new Date().getTime() - newLastUpdate.getTime()) / 60000);
              setPendingMessage(`התשלום שלך נמצא בתהליך עיבוד (${newMinutesElapsed} דקות)...`);

              // Check for timeout within the interval loop as well
              if (newMinutesElapsed >= 5) {
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
                toast({
                  variant: "destructive",
                  title: "התשלום לא הושלם בזמן",
                  description: "אנא נסה שוב או פנה לתמיכה"
                });
                setTimeout(() => window.location.reload() /* TODO: Consider if this reload is necessary */, 1000); // Reload page to reflect changes
              }
            }
          } catch (error) {
            luderror.payment('Error processing subscription in interval:', error);
            toast({
              variant: "destructive",
              title: "שגיאה בבדיקת סטטוס תשלום",
              description: "אנא נסה שוב או פנה לתמיכה"
            });
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
      }
    } catch (error) {
      luderror.payment('Error checking payment status:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בבדיקת סטטוס תשלום",
        description: "אנא נסה שוב או פנה לתמיכה"
      });
    }
  }, [currentUser, onSubscriptionChange, onClose]);

  // Handle iframe messages from PayPlus
  useEffect(() => {
    const handleMessage = async (event) => {
      // Filter out non-PayPlus messages (React DevTools, etc.)
      if (!event.data ||
          event.data.source === 'react-devtools-bridge' ||
          event.data.source === 'react-devtools-content-script' ||
          event.data.source === 'react-devtools-inject-script') {
        return;
      }

      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'payplus_payment_complete') {
            if (data.status === 'success') {
              await handleSubscriptionPaymentSuccessImmediate();
            } else {
              handlePaymentModalClose();

              toast({
                variant: "destructive",
                title: "תשלום לא הושלם",
                description: "התשלום בוטל או נכשל. אנא נסה שוב."
              });
            }
          }
        } catch (e) {
          return;
        }
      }
    };

    if (showPaymentModal && paymentUrl) {
      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [showPaymentModal, paymentUrl]);

  // useEffect for checking pending status (plans are loaded by useSubscriptionState hook)
  useEffect(() => {
    if (isOpen && currentUser) {
      checkPendingSubscription();
    }

    // Cleanup interval when component unmounts or isOpen changes to false
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, currentUser, checkPendingSubscription]);

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


  /**
   * Simplified plan selection handler using business logic service
   */
  const handleSelectPlan = async (plan) => {
    try {
      ludlog.ui('Plan selected:', { data: plan.name });

      // Evaluate the plan selection using business logic
      const decision = evaluatePlanSelection(plan);

      if (!decision) {
        return; // Error already handled in evaluatePlanSelection
      }

      // Show message for blocked actions
      if (!decision.canProceed) {
        if (decision.reason === 'pending_switch') {
          setShowPendingSwitchDialog(true);
          return;
        }

        if (decision.reason === 'current_plan') {
          toast({
            variant: "info",
            title: "המנוי הנוכחי שלך",
            description: decision.message
          });
          return;
        }

        toast({
          variant: "destructive",
          title: "לא ניתן לבחור תוכנית",
          description: decision.message
        });
        return;
      }

      // Handle replace pending scenario - ask for confirmation
      if (decision.actionType === SubscriptionBusinessLogic.ACTION_TYPES.REPLACE_PENDING) {
        setReplacePendingDecision(decision);
        setShowReplacePendingDialog(true);
        return; // Wait for user confirmation
      }

      // Handle cancel pending downgrade scenario - ask for confirmation
      if (decision.actionType === SubscriptionBusinessLogic.ACTION_TYPES.CANCEL_PENDING_DOWNGRADE) {
        setCancelPendingDowngradeDecision(decision);
        setShowCancelPendingDowngradeDialog(true);
        return; // Wait for user confirmation
      }

      // Execute the subscription action
      const result = await executeSubscriptionAction(decision);

      if (result?.success) {
        if (result.requiresPayment) {
          // Handle payment redirect - open payment modal
          setSelectedPlanForPayment(plan);
          setPaymentUrl(result.paymentUrl);
          setIsIframeLoading(true);
          setShowPaymentModal(true);
        } else {
          // Direct change completed - refresh and close
          if (onSubscriptionChange) {
            setTimeout(() => {
              onSubscriptionChange(currentUser);
              onClose();
            }, 1000);
          }
        }
      }

    } catch (error) {
      luderror.ui('Error in plan selection:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בבחירת תוכנית",
        description: error.message || "אנא נסה שוב או פנה לתמיכה"
      });
    }
  };

  /**
   * Handle canceling pending plan switch
   */
  const handleCancelPendingSwitch = async () => {
    try {
      const success = await cancelPendingSwitch();
      if (success) {
        setShowPendingSwitchDialog(false);
        if (onSubscriptionChange) {
          onSubscriptionChange(currentUser);
        }
      }
    } catch (error) {
      luderror.ui('Error canceling pending switch:', error);
    }
  };

  /**
   * Handle confirming replace pending subscription
   */
  const handleConfirmReplacePending = async () => {
    if (!replacePendingDecision) return;

    try {
      setShowReplacePendingDialog(false);
      setReplacePendingDecision(null);

      // Execute the subscription action
      const result = await executeSubscriptionAction(replacePendingDecision);

      if (result?.success) {
        if (result.requiresPayment) {
          // Handle payment redirect - open payment modal
          setSelectedPlanForPayment(replacePendingDecision.targetPlan);
          setPaymentUrl(result.paymentUrl);
          setIsIframeLoading(true);
          setShowPaymentModal(true);
        } else {
          // Direct change completed - refresh and close
          if (onSubscriptionChange) {
            setTimeout(() => {
              onSubscriptionChange(currentUser);
              onClose();
            }, 1000);
          }
        }
      }
    } catch (error) {
      luderror.payment('Error in replace pending subscription:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בהחלפת תוכנית ממתינה",
        description: error.message || "אנא נסה שוב או פנה לתמיכה"
      });
    }
  };

  /**
   * Handle confirming cancel pending downgrade to free plan
   */
  const handleConfirmCancelPendingDowngrade = async () => {
    if (!cancelPendingDowngradeDecision) return;

    try {
      setShowCancelPendingDowngradeDialog(false);
      setCancelPendingDowngradeDecision(null);

      // Execute the subscription action (this will cancel pending and activate free plan)
      const result = await executeSubscriptionAction(cancelPendingDowngradeDecision);

      if (result?.success) {
        // This should be a direct change (no payment required for free plan)
        toast({
          variant: "default",
          title: "המנוי עודכן בהצלחה",
          description: "המנוי הממתין בוטל והמנוי החינם הופעל"
        });

        // Refresh and close
        if (onSubscriptionChange) {
          setTimeout(() => {
            onSubscriptionChange(currentUser);
            onClose();
          }, 1000);
        }
      }
    } catch (error) {
      luderror.ui('Error in cancel pending downgrade:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בביטול המנוי הממתין",
        description: error.message || "אנא נסה שוב או פנה לתמיכה"
      });
    }
  };

  const handleCancelConfirm = async () => {
    if (!planToCancel) return;

    try {
        
        // Record subscription history for the cancelled paid subscription
        await recordSubscriptionHistory(currentUser, planToCancel, 'cancelled');

        // IMPORTANT: Don't switch to free plan immediately!
        // Keep current subscription active until end date, only remove PayPlus recurring
        await User.updateMyUserData({
          // Keep current plan and dates - only remove PayPal UID to prevent future charges
          payplus_subscription_uid: null,
          subscription_status_updated_at: new Date().toISOString()
        });

        // Notify parent component to refresh user data
        if (onSubscriptionChange) {
          onSubscriptionChange();
        }

        // Show success message explaining the cancellation behavior
        toast({
          variant: "default",
          title: "המנוי בוטל בהצלחה",
          description: `המנוי שלך בוטל בהצלחה ולא יתחדש אוטומטי. המנוי הנוכחי יישאר פעיל עד ${currentUser.subscription_end_date ? new Date(currentUser.subscription_end_date).toLocaleDateString('he-IL') : 'מועד החיוב הבא'}, ואז יעבור אוטומטית למנוי החינם.`
        });

        // Close modal after successful selection
        setTimeout(() => {
          onClose();
        }, 3000); // Give more time to read the message
    } catch (error) {
      luderror.payment('Error cancelling subscription:', error);
      const errorMessage = error.message || 'שגיאה לא ידועה';
      toast({
        variant: "destructive",
        title: "שגיאה בביטול המנוי",
        description: errorMessage
      });
    } finally {
      setShowCancelConfirm(false);
      setPlanToCancel(null);
    }
  };

  // Handle payment modal close
  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setPaymentUrl('');
    setSelectedPlanForPayment(null);
    setIsIframeLoading(true); // Reset loading state for next time

    // Show message about cancelled payment
    toast({
      variant: "default",
      title: "תשלום בוטל",
      description: "התשלום בוטל. ניתן לנסות שוב בכל עת."
    });
  };

  // Handle successful subscription payment with immediate feedback (like checkout)
  const handleSubscriptionPaymentSuccessImmediate = async () => {
    try {
      // Close payment modal immediately
      setShowPaymentModal(false);
      setPaymentUrl('');

      // Show immediate success message
      toast({
        variant: "default",
        title: "תשלום הושלם בהצלחה!",
        description: "המנוי שלך מתעדכן. הדף יתרענן בקרוב..."
      });

      // Close the subscription modal immediately (like checkout)
      onClose();

      // Do backend processing asynchronously without blocking user
      setTimeout(async () => {
        try {
          // Set user to pending status
          await User.updateMyUserData({
            current_subscription_plan_id: selectedPlanForPayment?.id,
            subscription_status: 'pending',
            subscription_status_updated_at: new Date().toISOString()
          });

          // Process subscription activation in background
          await checkPendingSubscription();

          // Refresh user data to reflect changes
          if (onSubscriptionChange) {
            onSubscriptionChange();
          }
        } catch (error) {
          luderror.payment('Error in background subscription processing:', error);
          // Show another toast for backend issues, but don't block user
          toast({
            variant: "destructive",
            title: "בעיה בעדכון המנוי",
            description: "התשלום הושלם אך יכול להיות שצריך לרענן את הדף לראות את השינויים"
          });
        }
      }, 500); // Brief delay to let the success message show

    } catch (error) {
      luderror.payment('Error handling immediate subscription payment success:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון המנוי",
        description: "התשלום הושלם אך יש בעיה בעדכון המנוי. אנא פנה לתמיכה."
      });
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
      luderror.payment('Error recording subscription history:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בתיעוד היסטוריית מנוי",
        description: "פעולת המנוי הצליחה אך יכול להיות שלא נרשמה בהיסטוריה"
      });
    }
  };


  return (
    <>
      {/* Main Modal - Full Screen - Hide when payment modal is open */}
      <Dialog open={isOpen && !showPaymentModal} onOpenChange={onClose}>
        <DialogContent className="max-w-none w-screen h-screen max-h-none m-0 p-0 bg-white" hideCloseButton={true} dir="rtl">
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
                          className="text-white hover:bg-white/20 rounded-full w-12 h-12 relative"
                        >
                          <X className="w-6 h-6 text-white" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>


                {/* Main Content */}
                <div className="flex-1 py-12">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">טוען תוכניות מנוי...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center text-red-600">
                        <p className="text-lg font-semibold">שגיאה בטעינת נתוני המנוי</p>
                        <p className="text-sm mt-2">{error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      {/* Current User's Subscription Summary */}
                      {summary?.currentPlan && (
                        <div className="mb-8 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-center sm:text-right">
                            <p className="text-sm text-gray-600">המנוי הנוכחי שלך:</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                              {summary.currentPlan.name}
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

                      {/* Pending Plan Switch Alert */}
                      {summary?.hasPendingSwitch && summary?.pendingSwitch && (
                        <div className="mb-8 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-300">
                          <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-yellow-600" />
                            <h3 className="text-xl font-bold text-yellow-900">החלפת תוכנית ממתינה</h3>
                          </div>
                          <p className="text-yellow-800 mb-4">
                            יש לך החלפת תוכנית ממתינה. בטל אותה כדי לבחור תוכנית חדשה.
                          </p>
                          <Button
                            onClick={() => setShowPendingSwitchDialog(true)}
                            variant="outline"
                            className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
                          >
                            <Calendar className="w-4 h-4 ml-2" />
                            נהל החלפה ממתינה
                          </Button>
                        </div>
                      )}

                      {/* Cancel Pending Subscription Alert - Show when user has both active and pending */}
                      {summary?.hasActivePlusPending && (() => {
                        // Find the pending subscription to display its details
                        const pendingSubscriptions = summary?.subscriptions?.filter(sub => sub.status === 'pending') || [];
                        const pendingSubscription = pendingSubscriptions[0];
                        const pendingPlan = plans?.find(p => p.id === pendingSubscription?.subscription_plan_id);

                        if (pendingSubscription && pendingPlan) {
                          return (
                            <div className="mb-8 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-red-50 to-pink-50 border border-red-300">
                              <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                                <h3 className="text-xl font-bold text-red-900">מנוי ממתין לתשלום</h3>
                              </div>
                              <p className="text-red-800 mb-4">
                                יש לך מנוי ממתין ל{pendingPlan.name} בנוסף למנוי הפעיל. ניתן לבטל את המנוי הממתין.
                              </p>
                              <Button
                                onClick={() => cancelPendingSubscription(pendingSubscription.id)}
                                disabled={processing}
                                variant="outline"
                                className="border-red-400 text-red-700 hover:bg-red-100"
                              >
                                {processing ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent ml-2" />
                                    מבטל...
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4 ml-2" />
                                    בטל מנוי ממתין
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {plans.map((plan) => {
                          const discountedPrice = calculateDiscountedPrice(plan);
                          const hasDiscount = plan.has_discount && plan.discount_value && plan.price > 0;
                          const isCurrent = isCurrentPlan(plan);
                          // Use same robust free plan detection as in handleSelectPlan
                          const isFree = (
                            Number(plan.price) === 0 ||
                            plan.price === '0' ||
                            plan.plan_type === 'free' ||
                            plan.price === null ||
                            plan.price === undefined
                          );

                          // Check if this plan has a pending payment that needs completion
                          const hasPendingPayment = (() => {
                            try {
                              const actionDecision = SubscriptionBusinessLogic.determineSubscriptionAction(
                                currentUser,
                                plan,
                                summary?.purchases || [],
                                plans,
                                summary?.subscriptions || []
                              );

                              const isPendingPayment = actionDecision?.actionType === SubscriptionBusinessLogic.ACTION_TYPES.RETRY_PAYMENT;

                              return isPendingPayment;
                            } catch (error) {
                              luderror.payment('Error checking pending payment:', error);
                              return false;
                            }
                          })();

                          return (
                            <Card key={plan.id} className={`relative group hover:shadow-2xl transition-all duration-500 border-2 ${
                              isCurrent ? 'border-green-500 bg-green-50/30 shadow-green-200/50' :
                              hasPendingPayment ? 'border-orange-400 bg-orange-50/50 shadow-orange-200/50 ring-2 ring-orange-200' :
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

                                {/* Pending payment badge */}
                                {hasPendingPayment && (
                                  <div className="absolute top-4 left-4 z-10">
                                    <Badge className="bg-orange-500 text-white border-0 font-semibold animate-pulse">
                                      <Clock className="w-3 h-3 ml-1" />
                                      תשלום ממתין
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
                                        <span className="text-5xl font-bold text-blue-600">חינם!</span>
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
                                      <div className={`flex items-start gap-5 p-5 rounded-xl transition-all ${
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

                                      {/* Files Access */}
                                      <div className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                                        plan.benefits?.files_access?.enabled ?
                                        isFree ? 'bg-blue-50 border border-blue-200' : 'bg-orange-50 border border-orange-100' :
                                        'bg-gray-50 border border-gray-100 opacity-50'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          plan.benefits?.files_access?.enabled ?
                                          isFree ? 'bg-blue-500' : 'bg-orange-500' :
                                          'bg-gray-300'}`}>
                                          <FileText className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-medium flex items-center gap-2 ${
                                            plan.benefits?.files_access?.enabled ?
                                            isFree ? 'text-blue-800' : 'text-orange-900' :
                                            'text-gray-600'}`}>
                                            {`גישה ל${getProductTypeName('file', 'plural')}`}
                                            {plan.benefits?.files_access?.unlimited && (
                                              <Infinity className={`w-4 h-4 mr-1 ${isFree ? 'text-blue-600' : 'text-orange-600'}`} />
                                            )}
                                          </div>
                                          <div className={`text-sm mt-1 ${
                                            plan.benefits?.files_access?.enabled ?
                                            isFree ? 'text-blue-700' : 'text-orange-700' :
                                            'text-gray-500'}`}>
                                            {plan.benefits?.files_access?.enabled ?
                                              plan.benefits?.files_access?.unlimited ?
                                                `גישה בלתי מוגבלת לכל ה${getProductTypeName('file', 'plural')}` :
                                                `עד ${plan.benefits?.files_access?.monthly_limit} ${getProductTypeName('file', 'plural')} בחודש` :
                                              'לא כלול במנוי זה'
                                            }
                                          </div>
                                        </div>
                                      </div>

                                      {/* Lesson Plans Access */}
                                      <div className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                                        plan.benefits?.lesson_plans_access?.enabled ?
                                        isFree ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-100' :
                                        'bg-gray-50 border border-gray-100 opacity-50'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          plan.benefits?.lesson_plans_access?.enabled ?
                                          isFree ? 'bg-blue-500' : 'bg-green-500' :
                                          'bg-gray-300'}`}>
                                          <BookOpen className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-medium flex items-center gap-2 ${
                                            plan.benefits?.lesson_plans_access?.enabled ?
                                            isFree ? 'text-blue-800' : 'text-green-900' :
                                            'text-gray-600'}`}>
                                            {`גישה ל${getProductTypeName('lesson_plan', 'plural')}`}
                                            {plan.benefits?.lesson_plans_access?.unlimited && (
                                              <Infinity className={`w-4 h-4 mr-1 ${isFree ? 'text-blue-600' : 'text-green-600'}`} />
                                            )}
                                          </div>
                                          <div className={`text-sm mt-1 ${
                                            plan.benefits?.lesson_plans_access?.enabled ?
                                            isFree ? 'text-blue-700' : 'text-green-700' :
                                            'text-gray-500'}`}>
                                            {plan.benefits?.lesson_plans_access?.enabled ?
                                              plan.benefits?.lesson_plans_access?.unlimited ?
                                                `גישה בלתי מוגבלת לכל ה${getProductTypeName('lesson_plan', 'plural')}` :
                                                `עד ${plan.benefits?.lesson_plans_access?.monthly_limit} ${getProductTypeName('lesson_plan', 'plural')} בחודש` :
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
                                        disabled={isPlanDisabled(plan) || processing}
                                        className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all ${
                                          isPlanDisabled(plan) ?
                                          'bg-gray-300 text-gray-500 cursor-not-allowed' :
                                          hasPendingPayment ?
                                          'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white animate-pulse shadow-lg ring-2 ring-orange-300' :
                                          isFree ?
                                          'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white' :
                                          plan.plan_type === 'pro' ?
                                          'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900' :
                                          'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'} shadow-lg hover:shadow-xl transform hover:scale-105`}>
                                        {processing ? (
                                          <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                                            מעבד...
                                          </>
                                        ) : (
                                          <>
                                            {hasPendingPayment ? (
                                              <Clock className="w-5 h-5 ml-2" />
                                            ) : (
                                              <Star className="w-5 h-5 ml-2" />
                                            )}
                                            {getPlanButtonText(plan)}
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
          setUpgradeConfirmResolve(null);
        }}
        onConfirm={() => {
          if (upgradeConfirmResolve) {
            upgradeConfirmResolve(true); // User confirmed
          }
          setShowUpgradeConfirm(false);
          setUpgradeConfirmResolve(null);
        }}
        title="מעבר למנוי חדש"
        message="אתה כבר במנוי פעיל. המעבר למנוי חדש יבטל את המנוי הנוכחי ויחיל את המנוי החדש מיידית.

האם ברצונך להמשיך?"
        confirmText="כן, המשך"
        cancelText="לא, חזור"
        variant="info"
      />

      {/* Pending Plan Switch Management Dialog */}
      <ConfirmationDialog
        isOpen={showPendingSwitchDialog}
        onClose={() => setShowPendingSwitchDialog(false)}
        onConfirm={handleCancelPendingSwitch}
        title="החלפת תוכנית ממתינה"
        message={`יש לך החלפת תוכנית ממתינה${summary?.pendingSwitch ? ` ל${summary.pendingSwitch.plan?.name || 'תוכנית לא זוהתה'}` : ''}.

כדי לבחור תוכנית חדשה, תחילה עליך לבטל את החלפת התוכנית הממתינה.

האם ברצונך לבטל את החלפת התוכנית הממתינה?`}
        confirmText="כן, בטל החלפה ממתינה"
        cancelText="לא, השאר כמו שזה"
        variant="warning"
      />

      {/* Replace Pending Plan Dialog */}
      <ConfirmationDialog
        isOpen={showReplacePendingDialog}
        onClose={() => {
          setShowReplacePendingDialog(false);
          setReplacePendingDecision(null);
        }}
        onConfirm={handleConfirmReplacePending}
        title="החלפת תוכנית ממתינה"
        message={replacePendingDecision?.message || 'האם ברצונך להחליף את התוכנית הממתינה?'}
        confirmText="כן, החלף תוכנית"
        cancelText="לא, בטל"
        variant="info"
      />

      {/* Cancel Pending Downgrade Dialog */}
      <ConfirmationDialog
        isOpen={showCancelPendingDowngradeDialog}
        onClose={() => {
          setShowCancelPendingDowngradeDialog(false);
          setCancelPendingDowngradeDecision(null);
        }}
        onConfirm={handleConfirmCancelPendingDowngrade}
        title="ביטול מנוי ממתין ומעבר למנוי חינם"
        message={cancelPendingDowngradeDecision?.message || 'האם ברצונך לבטל את המנוי הממתין ולעבור למנוי החינם?'}
        confirmText="כן, בטל ועבור למנוי חינם"
        cancelText="לא, השאר מנוי ממתין"
        variant="warning"
      />


      {/* PayPlus Payment Modal - Portal to document root to avoid z-index conflicts */}
      {showPaymentModal && paymentUrl && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 100000, backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={(e) => {
            // Close modal if clicking on backdrop
            if (e.target === e.currentTarget) {
              handlePaymentModalClose();
            }
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">תשלום מנוי מאובטח</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePaymentModalClose}
                className="relative z-10 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 relative">
              {/* Loading Spinner Overlay */}
              {isIframeLoading && (
                <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
                  <LudoraLoadingSpinner
                    message="טוען דף תשלום..."
                    status="loading"
                    size="lg"
                    theme="neon"
                    showParticles={true}
                  />
                </div>
              )}

              {/* PayPlus Iframe */}
              <iframe
                src={paymentUrl}
                className="w-full h-full border-0"
                title="PayPlus Subscription Payment"
                onLoad={() => {
                  setIsIframeLoading(false);
                }}
                onError={(e) => {
                  luderror.payment('PayPlus iframe error:', e);
                  setIsIframeLoading(false);
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
