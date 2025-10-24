import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { SubscriptionPlan, User, PendingSubscription, SubscriptionHistory } from "@/services/entities";
import { createPayplusPaymentPage } from "@/services/apiClient"; // Unified function
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductTypeName } from "@/config/productTypes";
import { useToast } from "@/components/ui/use-toast";
import PayPlusEnvironmentSelector from "@/components/PayPlusEnvironmentSelector";
import paymentClient from "@/services/paymentClient";
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
  Gift
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";

export default function SubscriptionModal({ isOpen, onClose, currentUser, onSubscriptionChange, isAutoOpened = false }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  // Confirmation dialog states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [planToCancel, setPlanToCancel] = useState(null);

  // New states for upgrade confirmation and environment selection
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [planToUpgrade, setPlanToUpgrade] = useState(null);
  const [upgradeConfirmResolve, setUpgradeConfirmResolve] = useState(null);

  const [paymentEnvironment, setPaymentEnvironment] = useState('production');

  // Payment modal states (using Portal)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);

  // Ref for managing the interval ID
  const intervalRef = useRef(null);

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
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת תוכניות המנוי",
        description: "אנא נסה שוב או פנה לתמיכה"
      });
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
            console.log('[SUBSCRIPTION_MODAL] Checking for processed subscription...');

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
              toast({
                variant: "default",
                title: "המנוי שלך אושר בהצלחה!",
                description: "הדף יתרענן כעת כדי לעדכן את הנתונים"
              });
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
                toast({
                  variant: "destructive",
                  title: "התשלום לא הושלם בזמן",
                  description: "אנא נסה שוב או פנה לתמיכה"
                });
                setTimeout(() => window.location.reload() /* TODO: Consider if this reload is necessary */, 1000); // Reload page to reflect changes
              }
            }
          } catch (error) {
            console.error('Error processing subscription in interval:', error);
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
        console.log('No active pending subscriptions found on user object.');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בבדיקת סטטוס תשלום",
        description: "אנא נסה שוב או פנה לתמיכה"
      });
    }
  }, [currentUser, onSubscriptionChange, onClose]);

  // Handle iframe messages from PayPlus (enhanced with better logging and immediate feedback)
  useEffect(() => {
    const handleMessage = async (event) => {
      // Log ALL messages for debugging
      console.log('🎯 SubscriptionModal: Raw message received:', {
        origin: event.origin,
        data: event.data,
        source: event.source
      });

      // Filter out non-PayPlus messages (React DevTools, etc.)
      if (!event.data ||
          event.data.source === 'react-devtools-bridge' ||
          event.data.source === 'react-devtools-content-script' ||
          event.data.source === 'react-devtools-inject-script') {
        console.log('🎯 SubscriptionModal: Filtered out non-PayPlus message');
        return;
      }

      console.log('🎯 SubscriptionModal: Processing potential PayPlus message:', event.data);

      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          console.log('🎯 SubscriptionModal: Parsed message data:', data);

          if (data.type === 'payplus_payment_complete') {
            console.log('🎯 SubscriptionModal: Payment completed via PostMessage with status:', data.status);

            if (data.status === 'success') {
              // Payment was successful - provide immediate feedback like checkout
              console.log('✅ Subscription payment completed via PostMessage - providing immediate feedback');
              await handleSubscriptionPaymentSuccessImmediate();
            } else {
              // Payment failed/cancelled - close modal and show message
              console.log('❌ Subscription payment failed via PostMessage:', data.status);
              handlePaymentModalClose();

              toast({
                variant: "destructive",
                title: "תשלום לא הושלם",
                description: "התשלום בוטל או נכשל. אנא נסה שוב."
              });
            }
          } else {
            console.log('🎯 SubscriptionModal: Message type not recognized:', data.type);
          }
        } catch (e) {
          console.log('🎯 SubscriptionModal: Failed to parse message as JSON:', e.message);
          return;
        }
      } else {
        console.log('🎯 SubscriptionModal: Message data is not a string:', typeof event.data);
      }
    };

    if (showPaymentModal && paymentUrl) {
      console.log('🎯 SubscriptionModal: Adding message listener for PayPlus iframe');
      window.addEventListener('message', handleMessage);
      return () => {
        console.log('🎯 SubscriptionModal: Removing message listener for PayPlus iframe');
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [showPaymentModal, paymentUrl]);

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


  const handleSelectPlan = async (plan) => {
    // Don't allow new payments if payment is in progress or user has a pending status
    if (paymentInProgress || currentUser?.subscription_status === 'pending') {
      toast({
        variant: "destructive",
        title: "תהליך תשלום פעיל",
        description: "יש לך תהליך תשלום פעיל. אנא המתן לסיום העיבוד או נסה שוב בעוד מספר דקות."
      });
      return;
    }

    if (isSelecting) return;

    setIsSelecting(true);
    try {
      // Debug: Log plan details to understand the issue
      console.log('🔍 Plan selection debug:', {
        planId: plan.id,
        planName: plan.name,
        planPrice: plan.price,
        planPriceType: typeof plan.price,
        planPriceNumber: Number(plan.price),
        planType: plan.plan_type
      });

      // Robust free plan detection - check multiple conditions
      const isFreeplan = (
        Number(plan.price) === 0 ||
        plan.price === '0' ||
        plan.plan_type === 'free' ||
        plan.price === null ||
        plan.price === undefined
      );

      if (isFreeplan) {
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

        // Get updated user data and notify parent component
        if (onSubscriptionChange) {
          const updatedUser = await User.me();
          onSubscriptionChange(updatedUser);
        }
        toast({
          variant: "default",
          title: "המנוי עודכן בהצלחה",
          description: "המנוי שלך עודכן בהצלחה למנוי חינם"
        });
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
            // Use the selected environment from the PayPlus environment selector
            const environment = paymentEnvironment;

            // Record history for the old subscription being cancelled due to upgrade
            await recordSubscriptionHistory(currentUser, plan, 'cancelled');
            console.log('✅ Old subscription marked for cancellation due to upgrade.');
            toast({
              variant: "default",
              title: "מעבר למנוי חדש",
              description: "כעת תועבר למסך תשלום עבור המנוי החדש"
            });

          } catch (error) {
            console.error('Error cancelling existing subscription:', error);
            toast({
              variant: "destructive",
              title: "שגיאה בביטול המנוי הקיים",
              description: "אנא נסה שוב או פנה לתמיכה"
            });
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

        // Use new purchase system for subscription plans
        try {
          console.log('Creating subscription purchase for plan:', plan.id);

          // Create subscription purchase using new API
          const result = await paymentClient.createPurchase('subscription', plan.id, {
            product_title: plan.name,
            source: 'SubscriptionModal'
          });

          if (result.success) {
            const { data } = result;
            const isCompleted = data.completed || data.purchase?.payment_status === 'completed';
            const isFreeItem = data.isFree;

            if (isCompleted || isFreeItem) {
              // Free subscription - completed immediately
              toast({
                variant: "default",
                title: "המנוי עודכן בהצלחה",
                description: `${plan.name} הוגדר כמנוי שלך`
              });

              // Update current plan
              setCurrentPlan(plan);

              // Get updated user data and notify parent component
              if (onSubscriptionChange) {
                const updatedUser = await User.me();
                onSubscriptionChange(updatedUser);
              }

              // Close modal after successful selection
              setTimeout(() => {
                onClose();
              }, 1000);
              setIsSelecting(false);
            } else {
              // Paid subscription - needs payment (redirect to checkout)
              toast({
                variant: "default",
                title: "מנוי נוסף לעגלה",
                description: `${plan.name} נוסף לעגלת הקניות. תועבר למסך התשלום.`
              });

              // Close modal and redirect to checkout
              onClose();
              navigate('/checkout');
              setIsSelecting(false);
            }
          } else if (result.canUpdate) {
            // Subscription already in cart - ask user if they want to update
            const shouldUpdate = window.confirm(
              `יש כבר מנוי בעגלת הקניות. האם ברצונך להחליף אותו ב${plan.name}?`
            );

            if (shouldUpdate && result.existingPurchaseId) {
              try {
                const updateResult = await paymentClient.updateCartSubscription(
                  result.existingPurchaseId,
                  plan.id
                );

                if (updateResult.success) {
                  const isCompleted = updateResult.data.completed || updateResult.data.purchase?.payment_status === 'completed';
                  const isFreeItem = updateResult.data.isFree;

                  if (isCompleted || isFreeItem) {
                    // Free subscription - completed immediately
                    toast({
                      variant: "default",
                      title: "המנוי עודכן בהצלחה",
                      description: `${plan.name} הוגדר כמנוי שלך`
                    });

                    // Update current plan
                    setCurrentPlan(plan);

                    // Get updated user data and notify parent component
                    if (onSubscriptionChange) {
                      const updatedUser = await User.me();
                      onSubscriptionChange(updatedUser);
                    }

                    // Close modal
                    setTimeout(() => {
                      onClose();
                    }, 1000);
                    setIsSelecting(false);
                  } else {
                    // Paid subscription - redirect to checkout
                    toast({
                      variant: "default",
                      title: "מנוי עודכן בעגלה",
                      description: `המנוי בעגלה עודכן ל${plan.name}. תועבר למסך התשלום.`
                    });

                    onClose();
                    navigate('/checkout');
                    setIsSelecting(false);
                  }
                } else {
                  throw new Error(updateResult.error || 'שגיאה בעדכון המנוי');
                }
              } catch (updateError) {
                console.error('Error updating cart subscription:', updateError);
                toast({
                  variant: "destructive",
                  title: "שגיאה בעדכון המנוי",
                  description: updateError.message || "אנא נסה שוב או פנה לתמיכה"
                });
              }
            }
          } else {
            throw new Error(result.error || 'שגיאה ביצירת רכישת המנוי');
          }

        } catch (error) {
          console.error('Error creating subscription purchase:', error);
          toast({
            variant: "destructive",
            title: "שגיאה בבחירת המנוי",
            description: error.message || "אנא נסה שוב או פנה לתמיכה"
          });
          setIsSelecting(false);
          return;
        }
        // Note: setIsSelecting(false) is not needed here as page redirects
      }
    } catch (error) {
      console.error("Error selecting subscription plan:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בבחירת תוכנית המנוי",
        description: "אנא נסה שוב או פנה לתמיכה"
      });
      setIsSelecting(false);
    }
    // No finally block needed - handled in catch and specific cases above
  };

  const handleCancelConfirm = async () => {
    if (!planToCancel) return;

    try {
      // Use the selected environment from the PayPlus environment selector
      const environment = paymentEnvironment;

      console.log('✅ Subscription marked for cancellation');
        
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
      console.error('❌ Error cancelling subscription:', error);
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
    console.log('🎯 SubscriptionModal: Closing payment modal and cleaning up state');
    setShowPaymentModal(false);
    setIsSelecting(false);
    setPaymentUrl('');
    setSelectedPlanForPayment(null);

    // Show message about cancelled payment
    toast({
      variant: "default",
      title: "תשלום בוטל",
      description: "התשלום בוטל. ניתן לנסות שוב בכל עת."
    });

    // Main subscription modal will automatically reappear due to the condition change
    console.log('🎯 SubscriptionModal: Main modal will reappear automatically');
  };

  // Handle successful subscription payment with immediate feedback (like checkout)
  const handleSubscriptionPaymentSuccessImmediate = async () => {
    try {
      console.log('🎯 SubscriptionModal: Processing successful subscription payment with immediate feedback');

      // Close payment modal immediately
      setShowPaymentModal(false);
      setPaymentUrl('');
      setIsSelecting(false);

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
          console.log('🎯 SubscriptionModal: Starting background subscription processing');

          // Set user to pending status
          await User.updateMyUserData({
            current_subscription_plan_id: selectedPlanForPayment?.id,
            subscription_status: 'pending',
            subscription_status_updated_at: new Date().toISOString()
          });

          // Process subscription activation in background
          await checkPendingSubscription();

          // Refresh user data to reflect changes
          const updatedUser = await User.me();
          if (onSubscriptionChange) {
            onSubscriptionChange(updatedUser);
          }

          console.log('🎯 SubscriptionModal: Background subscription processing completed');
        } catch (error) {
          console.error('Error in background subscription processing:', error);
          // Show another toast for backend issues, but don't block user
          toast({
            variant: "destructive",
            title: "בעיה בעדכון המנוי",
            description: "התשלום הושלם אך יכול להיות שצריך לרענן את הדף לראות את השינויים"
          });
        }
      }, 500); // Brief delay to let the success message show

    } catch (error) {
      console.error('Error handling immediate subscription payment success:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון המנוי",
        description: "התשלום הושלם אך יש בעיה בעדכון המנוי. אנא פנה לתמיכה."
      });
    }
  };

  // Handle successful subscription payment (original polling-based approach)
  const handleSubscriptionPaymentSuccess = async () => {
    try {
      console.log('🎯 SubscriptionModal: Processing successful subscription payment');

      // NOW set user to pending status since payment was confirmed
      console.log('🎯 SubscriptionModal: Setting user status to pending after payment confirmation');
      await User.updateMyUserData({
        current_subscription_plan_id: selectedPlanForPayment?.id,
        subscription_status: 'pending',
        subscription_status_updated_at: new Date().toISOString()
      });

      // Close payment modal
      handlePaymentModalClose();

      // Show success message
      toast({
        variant: "default",
        title: "תשלום הושלם בהצלחה!",
        description: "המנוי שלך מתעדכן כעת..."
      });

      // Start monitoring for subscription activation
      // The existing checkPendingSubscription function will handle the polling
      await checkPendingSubscription();

      // Close the subscription modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error handling subscription payment success:', error);
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
      console.error('Error recording subscription history:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בתיעוד היסטוריית מנוי",
        description: "פעולת המנוי הצליחה אך יכול להיות שלא נרשמה בהיסטוריה"
      });
    }
  };

  const isCurrentPlan = (plan) => {
    // Only consider a plan "current" if the user explicitly has it set
    return currentPlan && currentPlan.id === plan.id;
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

                {/* PayPlus Environment Selector */}
                <div className="bg-white border-b border-gray-200 py-6">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <PayPlusEnvironmentSelector
                      value={paymentEnvironment}
                      onChange={setPaymentEnvironment}
                      user={currentUser}
                      disabled={isSelecting || paymentInProgress}
                    />
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
                          // Use same robust free plan detection as in handleSelectPlan
                          const isFree = (
                            Number(plan.price) === 0 ||
                            plan.price === '0' ||
                            plan.plan_type === 'free' ||
                            plan.price === null ||
                            plan.price === undefined
                          );

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


      {/* PayPlus Payment Modal - Portal to document root to avoid z-index conflicts */}
      {showPaymentModal && paymentUrl && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 100000, backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={(e) => {
            // Close modal if clicking on backdrop
            if (e.target === e.currentTarget) {
              console.log('🎯 SubscriptionModal: Backdrop click detected, closing payment modal');
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
            <div className="flex-1">
              <iframe
                src={paymentUrl}
                className="w-full h-full border-0"
                title="PayPlus Subscription Payment"
                onLoad={() => console.log('🎯 SubscriptionModal: PayPlus iframe loaded successfully')}
                onError={(e) => console.error('🎯 SubscriptionModal: PayPlus iframe error:', e)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
