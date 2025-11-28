import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Game, Purchase, User, Workshop, Course, File, Tool, Product, Transaction } from "@/services/entities";
import { apiRequest } from "@/services/apiClient";
import { purchaseUtils } from "@/utils/api.js";
import { ludlog, luderror } from '@/lib/ludlog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Download,
  Play,
  Calendar,
  Clock,
  FileText,
  Gamepad2
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import { useUser } from "@/contexts/UserContext";
import { toast } from "@/components/ui/use-toast";
import { usePaymentPageStatusCheck } from '@/hooks/usePaymentPageStatusCheck';

export default function PaymentResult() {
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const [status, setStatus] = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [item, setItem] = useState(null); // Changed from 'product' to 'item'
  const [itemType, setItemType] = useState('product'); // 'product' or 'game'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFree, setIsFree] = useState(false);
  const [autoRedirectSeconds, setAutoRedirectSeconds] = useState(null);
  const [productId, setProductId] = useState(null);
  const [totalPurchases, setTotalPurchases] = useState(1);
  const [isMultiProduct, setIsMultiProduct] = useState(false);

  // Payment page status checking - check for pending payments and handle abandoned pages
  const paymentStatus = usePaymentPageStatusCheck({
    enabled: true,
    showToasts: true, // Show user notifications about payment status changes
    onStatusUpdate: (update) => {
      ludlog.payment('PaymentResult: Payment status update received:', { data: update });

      // Reload payment result when status changes are detected
      if (update.type === 'continue_polling' && update.count > 0) {
        ludlog.payment('PaymentResult: Reloading payment result due to status update');
        loadPaymentResult();
      }

      // Handle reverted payments
      if (update.type === 'reverted_to_cart') {
        ludlog.payment('PaymentResult: Payment reverted to cart', { data: { action: 'redirectingToCheckout' } });
        setTimeout(() => {
          navigate('/checkout');
        }, 2000); // Give time for toast to show
      }
    }
  });

  useEffect(() => {
    loadPaymentResult();
  }, []);

  // Auto redirect effect
  useEffect(() => {
    if (status === 'success' && purchase && item && !isLoading) {
      // Start 10 second countdown for auto redirect
      setAutoRedirectSeconds(10);

      const countdownInterval = setInterval(() => {
        setAutoRedirectSeconds(prev => {
          if (prev === 1) {
            handleAutoRedirect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [status, purchase, item, isLoading, navigate]);

  const handleAutoRedirect = async () => {
    try {
      // Check if this is part of a multi-product transaction
      if (purchase?.transaction_id) {
        // Find all purchases with the same transaction_id
        const relatedPurchases = await Purchase.filter({
          transaction_id: purchase.transaction_id
        });

        if (relatedPurchases && relatedPurchases.length > 1) {
          // Multiple products - redirect to account page
          navigate('/account');
          return;
        }
      }

      // Single product - redirect to product details page
      const redirectProductId = productId || purchase.product_id;
      if (redirectProductId) {
        navigate(getProductDetailsUrl(redirectProductId));
      } else {
        // Fallback to account page if no product ID found
        navigate('/account');
      }
    } catch (err) {
      luderror.navigation('Error determining redirect destination', err);
      // Fallback to account page on error
      navigate('/account');
    }
  };

  const findProductId = async (entityType, entityId) => {
    try {
      // Search for Product with matching product_type and entity_id
      const products = await Product.filter({
        product_type: entityType,
        entity_id: entityId
      });

      if (products && products.length > 0) {
        const foundProductId = products[0].id;
        setProductId(foundProductId);
      }
    } catch (err) {
      luderror.api('Error finding Product ID', err, { entityType, entityId });
    }
  };

  const loadPaymentResult = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);

      // Check for PayPlus parameters first
      const transactionUid = urlParams.get('transaction_uid');
      const pageRequestUid = urlParams.get('page_request_uid');

      // Fallback to original parameters
      const paymentStatus = urlParams.get('status');
      const orderNumber = urlParams.get('order');
      const type = urlParams.get('type'); // 'game' or undefined (defaults to 'product')
      const freeParam = urlParams.get('free'); // 'true' if free item

      let finalStatus = paymentStatus;
      let finalOrderNumber = orderNumber;

      // Handle PayPlus redirect parameters
      if (pageRequestUid) {
        try {
          // Find transaction by PayPlus payment_page_request_uid
          let transactions;
          try {
            transactions = await Transaction.filter({
              payment_page_request_uid: pageRequestUid
            });
          } catch (transactionApiError) {
            throw transactionApiError; // Re-throw to trigger outer catch
          }

          if (transactions && transactions.length > 0) {
            const transactionData = transactions[0];
            finalOrderNumber = transactionData.id;

            // Check if this is a subscription payment
            const isSubscriptionPayment = transactionData.metadata?.subscription_id ||
                                          transactionData.metadata?.transaction_type === 'subscription_payment';

            if (isSubscriptionPayment) {
              ludlog.payment('PaymentResult: Detected subscription payment transaction:', {
                subscriptionId: transactionData.metadata?.subscription_id,
                transactionType: transactionData.metadata?.transaction_type
              });

              // Handle subscription payment flow
              try {
                const subscriptionId = transactionData.metadata.subscription_id;
                const subscription = await apiRequest(`/subscriptions/${subscriptionId}`);

                if (subscription && subscription.success && subscription.data) {
                  const subscriptionData = subscription.data;
                  ludlog.payment('PaymentResult: Loaded subscription data:', {
                    subscriptionId: subscriptionData.id,
                    status: subscriptionData.status
                  });

                  // Load subscription plan details via API
                  const subscriptionPlan = await apiRequest(`/subscriptions/plans/${subscriptionData.subscription_plan_id}`);

                  const planData = subscriptionPlan?.success ? subscriptionPlan.data : null;

                  // Set up subscription-specific display
                  setPurchase({
                    id: subscriptionData.id,
                    payment_amount: subscriptionData.monthly_price,
                    payment_status: subscriptionData.status,
                    transaction_id: transactionData.id,
                    metadata: {
                      ...transactionData.metadata,
                      subscription_type: 'subscription'
                    }
                  });

                  setItem({
                    id: subscriptionData.id,
                    title: planData?.name || 'מינוי פרימיום',
                    short_description: planData?.description || 'גישה למכללת לודורא',
                    product_type: 'subscription',
                    subscription_plan: planData,
                    subscription: subscriptionData
                  });

                  setItemType('subscription');

                  // Set status based on subscription status
                  if (subscriptionData.status === 'active') {
                    finalStatus = 'success';
                  } else if (subscriptionData.status === 'failed') {
                    finalStatus = 'failure';
                  } else if (subscriptionData.status === 'pending') {
                    finalStatus = transactionUid ? 'success' : 'pending';
                  } else {
                    finalStatus = 'unknown';
                  }

                  ludlog.payment('PaymentResult: Subscription payment setup complete:', {
                    subscriptionId: subscriptionData.id,
                    status: finalStatus,
                    planName: planData?.name
                  });

                  setIsLoading(false);
                  return; // Exit early for subscription payments
                }
              } catch (subscriptionError) {
                luderror.payment('PaymentResult: Error loading subscription data:', subscriptionError);
                // Fall back to regular transaction processing
              }
            }

            // Use payment_status field, not status field
            const actualStatus = transactionData.payment_status || transactionData.status;

            // CRITICAL: PayPlus redirect detected - set purchases to pending and trigger polling
            if (transactionUid && actualStatus === 'pending') {
              // Payment redirect detected - user came back from PayPlus
              ludlog.payment('🔍 PayPlus redirect detected, setting purchases to pending for transaction:', transactionData.id);

              try {
                const { apiRequest } = await import('@/services/apiClient');

                // STEP 1: Set all related purchases to 'pending' status to protect from deletion
                const relatedPurchases = await Purchase.filter({
                  transaction_id: transactionData.id
                });

                ludlog.payment(`📝 Found ${relatedPurchases.length} purchases to set as pending`);

                for (const purchase of relatedPurchases) {
                  await Purchase.update(purchase.id, {
                    payment_status: 'pending',
                    metadata: {
                      ...purchase.metadata,
                      pending_started_at: new Date().toISOString(),
                      pending_source: 'payplus_redirect',
                      payplus_page_request_uid: pageRequestUid
                    }
                  });
                  ludlog.payment(`✅ Purchase ${purchase.id} set to pending status`);
                }

                // STEP 2: Trigger polling to check actual PayPlus payment page status
                const pollResult = await apiRequest(`/api/payments/transaction-status/${transactionData.id}`, {
                  method: 'GET'
                });

                ludlog.payment('✅ Polling triggered successfully:', pollResult);

                // Set status based on polling result
                if (pollResult.poll_result?.success && pollResult.poll_result?.status === 'completed') {
                  finalStatus = 'success';
                } else if (pollResult.poll_result?.status === 'failed') {
                  finalStatus = 'failure';
                } else {
                  // Still pending, might need more time
                  finalStatus = 'pending';
                }
              } catch (pollError) {
                luderror.payment('Failed to set pending status or trigger polling', pollError);
                // Fallback to assuming success if redirect happened
                finalStatus = 'success';
              }
            } else {
              // Use existing transaction status
              const statusMap = {
                'completed': 'success',
                'failed': 'failure',
                'cancelled': 'cancel',
                'pending': transactionUid ? 'success' : 'pending'
              };

              finalStatus = statusMap[actualStatus] || 'unknown';
            }

            // Set the transaction as our order number for later lookup
            finalOrderNumber = transactionData.id;
          } else {
            finalStatus = transactionUid ? 'success' : 'unknown';
          }
        } catch (searchError) {
          finalStatus = transactionUid ? 'success' : 'unknown';
        }
      }

      setStatus(finalStatus);
      setItemType(type === 'game' ? 'game' : 'product');
      setIsFree(freeParam === 'true');

      // Current user is already available from global state via useUser()

      if (finalOrderNumber) {
        // Find purchase by transaction_id, transaction_uid, or purchase ID
        try {
          let purchases = [];

          ludlog.payment('PaymentResult: Searching for purchases with order number:', { data: finalOrderNumber });

          // First try to find by transaction_id (for new Transaction-based lookups)
          if (finalOrderNumber.startsWith('txn_')) {
            try {
              purchases = await Purchase.filter({
                transaction_id: finalOrderNumber
              });
              ludlog.payment('PaymentResult: Found purchases by transaction_id:', { data: purchases.length });
            } catch (txnError) {
              luderror.payment('PaymentResult: Error searching by transaction_id:', null, { context: txnError });
            }
          }

          // If not found, try by transaction_uid in metadata (legacy)
          if (purchases.length === 0) {
            try {
              purchases = await Purchase.filter({
                metadata: { transaction_uid: finalOrderNumber }
              });
              ludlog.payment('PaymentResult: Found purchases by transaction_uid:', { data: purchases.length });
            } catch (metadataError) {
              luderror.payment('PaymentResult: Error searching by metadata transaction_uid:', metadataError);
            }
          }

          // If not found and finalOrderNumber looks like a purchase ID, try direct ID lookup
          if (purchases.length === 0 && finalOrderNumber.startsWith('pur_')) {
            try {
              purchases = await Purchase.filter({ id: finalOrderNumber });
              ludlog.payment('PaymentResult: Found purchases by direct ID:', { data: purchases.length });
            } catch (directError) {
              luderror.payment('PaymentResult: Error searching by direct ID:', directError);
            }
          }
          
          if (purchases.length > 0) {
            // Track multi-product transaction state
            setTotalPurchases(purchases.length);
            setIsMultiProduct(purchases.length > 1);

            const purchaseData = purchases[0];
            setPurchase(purchaseData);

            // Load the associated item (product or game)
            // Handle both new polymorphic and legacy purchase structures
            if (purchaseData.purchasable_type && purchaseData.purchasable_id) {
              // New polymorphic structure
              try {
                let itemData = null;
                const entityType = purchaseData.purchasable_type;
                const entityId = purchaseData.purchasable_id;

                ludlog.payment('PaymentResult: Loading item data for:', { data: { entityType, entityId } });

                switch (entityType) {
                  case 'workshop':
                    itemData = await Workshop.findById(entityId);
                    break;
                  case 'course':
                    itemData = await Course.findById(entityId);
                    break;
                  case 'file':
                    itemData = await File.findById(entityId);
                    break;
                  case 'tool':
                    itemData = await Tool.findById(entityId);
                    break;
                  case 'game':
                    itemData = await Game.findById(entityId);
                    break;
                  default:
                    luderror.payment('PaymentResult: Unknown entity type:', entityType);
                    // Don't throw error - just set a placeholder
                    itemData = {
                      id: entityId,
                      title: `${entityType} (${entityId})`,
                      short_description: 'פרטי המוצר זמינים בחשבון שלך'
                    };
                }

                if (itemData) {
                  setItem(itemData);
                  setItemType(entityType);
                  ludlog.payment('PaymentResult: Item loaded successfully:', { data: itemData.title });

                  // Find the corresponding Product ID (non-blocking)
                  try {
                    await findProductId(entityType, entityId);
                  } catch (productIdError) {
                    luderror.payment('PaymentResult: Error finding product ID (non-critical):', productIdError);
                  }
                } else {
                  luderror.payment('PaymentResult: No item data returned for:', null, { context: { entityType, entityId } });
                  // Don't set error - payment was successful, just item details missing
                }
              } catch (itemError) {
                luderror.payment('PaymentResult: Error loading item:', itemError, { context: { entityType, entityId } });
                // Don't break the flow - payment was successful
                setItem({
                  title: 'מוצר שנרכש',
                  short_description: 'פרטי המוצר זמינים בחשבון שלך'
                });
              }
            } else if (purchaseData.product_id) {
              // Legacy structure - try different entities
              try {
                let itemData;
                if (type === 'game') {
                  itemData = await Game.findById(purchaseData.product_id);
                } else {
                  // Default to workshop for legacy product_id
                  itemData = await Workshop.findById(purchaseData.product_id);
                  setItemType('workshop');
                }
                setItem(itemData);
              } catch (itemError) {
                luderror.payment('Error loading legacy item', itemError, { productId: purchaseData.product_id, type });
                // Try Game as fallback for legacy data
                try {
                  const fallbackItem = await Game.findById(purchaseData.product_id);
                  setItem(fallbackItem);
                  setItemType('game');
                } catch (fallbackError) {
                  luderror.payment('Fallback Game lookup also failed', fallbackError, { productId: purchaseData.product_id });
                  setError('לא ניתן לטעון את פרטי המוצר');
                }
              }
            }
          } else {
            luderror.payment('PaymentResult: Purchase not found for order:', { finalOrderNumber });
            // For PayPlus redirects, don't show error if we have transaction_uid (payment likely successful)
            if (transactionUid && finalStatus === 'success') {
              ludlog.payment('PaymentResult: Payment successful but purchase not found yet - may be processing');
              setItem({
                title: 'תשלום הושלם בהצלחה',
                short_description: 'המוצר יופיע בחשבון שלך בקרוב'
              });
            } else {
              setError('רכישה לא נמצאה');
            }
          }
        } catch (purchaseError) {
          luderror.payment('PaymentResult: Error finding purchase:', purchaseError, { context: { finalOrderNumber } });
          // For PayPlus redirects, be more forgiving with errors if payment seemed successful
          if (transactionUid && finalStatus === 'success') {
            ludlog.payment('PaymentResult: Payment successful but purchase lookup failed - may be processing');
            setItem({
              title: 'תשלום הושלם בהצלחה',
              short_description: 'המוצר יופיע בחשבון שלך בקרוב'
            });
          } else {
            setError('שגיאה בחיפוש הרכישה');
          }
        }
      } else {
        // No order number at all
        luderror.payment('PaymentResult: No order number found in URL parameters');
        if (finalStatus === 'success') {
          ludlog.payment('PaymentResult: Success status without order number - showing generic success');
          setItem({
            title: 'תשלום הושלם בהצלחה',
            short_description: 'המוצר יופיע בחשבון שלך בקרוב'
          });
        } else {
          setError('חסרים פרמטרי תשלום');
        }
      }

    } catch (err) {
      luderror.payment('PaymentResult: Error loading payment result:', err);

      // Check if we have any indicators that payment was successful
      const urlParams = new URLSearchParams(window.location.search);
      const transactionUid = urlParams.get('transaction_uid');
      const paymentStatus = urlParams.get('status');

      if (transactionUid || paymentStatus === 'success') {
        // Payment seems successful - show optimistic message instead of error
        ludlog.payment('PaymentResult: Error occurred but payment indicators suggest success');
        setStatus('success');
        setItem({
          title: 'תשלום הושלם בהצלחה',
          short_description: 'המוצר יופיע בחשבון שלך בקרוב. אם יש בעיה, פנה לתמיכה.'
        });
      } else {
        // No success indicators - show error
        setError('שגיאה בטעינת תוצאות התשלום');
      }
    }
    
    setIsLoading(false);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />;
      case 'failure':
        return <XCircle className="w-16 h-16 text-red-500 mx-auto" />;
      case 'cancel':
        return <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-gray-500 mx-auto" />;
    }
  };

  const getStatusTitle = () => {
    if (isFree) {
      if (itemType === 'subscription') {
        return status === 'success' ? 'המינוי החינם הופעל בהצלחה!' : 'שגיאה בהפעלת המינוי החינם';
      }
      return status === 'success' ? 'קיבלת גישה חינם בהצלחה!' : 'שגיאה בקבלת הגישה החינם';
    }

    switch (status) {
      case 'success':
        if (itemType === 'subscription') {
          return 'המינוי הופעל בהצלחה!';
        }
        return 'התשלום הושלם בהצלחה!';
      case 'failure':
        if (itemType === 'subscription') {
          return 'תשלום המינוי נכשל';
        }
        return 'התשלום נכשל';
      case 'cancel':
        if (itemType === 'subscription') {
          return 'תשלום המינוי בוטל';
        }
        return 'התשלום בוטל';
      case 'pending':
        if (itemType === 'subscription') {
          return 'ממתין לאישור תשלום המינוי';
        }
        return 'ממתין לאישור תשלום';
      default:
        if (itemType === 'subscription') {
          return 'מצב תשלום המינוי לא ידוע';
        }
        return 'מצב תשלום לא ידוע';
    }
  };

  const getStatusMessage = () => {
    if (isFree && status === 'success') {
      if (itemType === 'subscription') {
        return 'המינוי החינם הופעל בהצלחה! תוכל לגשת לכל התכנים עכשיו.';
      } else if (itemType === 'game') {
        return `ה${getProductTypeName('game', 'singular')} נוסף ל${getProductTypeName('game', 'plural')} שלך. תוכל להתחיל לשחק עכשיו!`;
      } else {
        return 'המוצר נוסף לחשבון שלך. תוכל לגשת אליו עכשיו!';
      }
    }

    switch (status) {
      case 'success':
        if (itemType === 'subscription') {
          return 'תודה על הרישום! המינוי פעיל עכשיו ותוכל לגשת לכל התכנים.';
        } else if (isMultiProduct) {
          return `תודה על הרכישה! ${totalPurchases} מוצרים זמינים עכשיו בחשבון שלך.`;
        }
        return 'תודה על הרכישה! המוצר זמין עכשיו בחשבון שלך.';
      case 'failure':
        if (itemType === 'subscription') {
          return 'תשלום המינוי לא הושלם. אנא נסה שוב או פנה לתמיכה.';
        }
        return 'התשלום לא הושלם. אנא נסה שוב או פנה לתמיכה.';
      case 'cancel':
        if (itemType === 'subscription') {
          return 'ביטלת את תשלום המינוי. תוכל לנסות שוב בכל עת.';
        }
        return 'ביטלת את התשלום. תוכל לנסות שוב בכל עת.';
      case 'pending':
        if (itemType === 'subscription') {
          return 'תשלום המינוי מתבצע כעת. המינוי יופעל ברגע שהתשלום יאושר.';
        }
        return 'התשלום מתבצע כעת. המוצר יהיה זמין ברגע שהתשלום יאושר.';
      default:
        if (itemType === 'subscription') {
          return 'מצב תשלום המינוי לא ברור. אנא פנה לתמיכה.';
        }
        return 'מצב התשלום לא ברור. אנא פנה לתמיכה.';
    }
  };

  const getItemIcon = () => {
    if (itemType === 'subscription') {
      return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    }

    if (itemType === 'game') {
      return <Gamepad2 className="w-5 h-5 text-purple-600" />;
    }

    if (!item) return <FileText className="w-5 h-5 text-gray-600" />;

    switch (item.product_type) {
      case 'subscription':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'workshop':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'course':
        return <Play className="w-5 h-5 text-green-600" />;
      case 'file':
        return <FileText className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getProductDetailsUrl = (productId) => {
    return `/product-details?product=${productId}`
  }

  const getActionButton = () => {
    if (status !== 'success') {
      return (
        <Button
          onClick={() => navigate("/")}
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה לדף הבית
        </Button>
      );
    }

    if (itemType === 'subscription') {
      return (
        <div className="space-y-3">
          <Button
            onClick={() => navigate("/account")}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="w-4 h-4 ml-2" />
            לניהול המינוי
          </Button>
          <Button
            onClick={() => navigate("/catalog")}
            className="w-full"
            variant="outline"
          >
            <FileText className="w-4 h-4 ml-2" />
            גישה לתכנים
          </Button>
        </div>
      );
    }

    if (itemType === 'game') {
      return (
        <div className="space-y-3">
          <Button
            onClick={() => navigate("/games")}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Gamepad2 className="w-4 h-4 ml-2" />
            לכל ה{getProductTypeName('game', 'plural')}
          </Button>
          {item && (
            <Button 
              onClick={() => navigate(`/launcher?game=${item.id}`)}
              className="w-full"
              variant="outline"
            >
              <Play className="w-4 h-4 ml-2" />
              שחק עכשיו
            </Button>
          )}
        </div>
      );
    }

    // For products
    if (!item) {
      return (
        <Button
          onClick={() => navigate("/account")}
          className="w-full"
        >
          לחשבון שלי
        </Button>
      );
    }

    const buttons = [];

    // Add "View Product Details" button first for all product types
    const viewProductId = productId || purchase.product_id;
    if (viewProductId) {
      buttons.push(
        <Button
          key="view-product"
          onClick={() => navigate(getProductDetailsUrl(viewProductId))}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <FileText className="w-4 h-4 ml-2" />
          צפה בפרטי המוצר
        </Button>
      );
    }

    // Add product-specific action
    if (item.product_type === 'workshop') {
      buttons.push(
        <Button
          key="catalog"
          onClick={() => navigate("/games")}
          className="w-full"
          variant="outline"
        >
          <Calendar className="w-4 h-4 ml-2" />
          ל{getProductTypeName('workshop', 'plural')} שלי
        </Button>
      );
    } else if (item.product_type === 'course') {
      buttons.push(
        <Button
          key="courses"
          onClick={() => navigate("/courses")}
          className="w-full"
          variant="outline"
        >
          <Play className="w-4 h-4 ml-2" />
          ל{getProductTypeName('course', 'plural')} שלי
        </Button>
      );

      if (item.course_modules && item.course_modules.length > 0) {
        buttons.push(
          <Button
            key="start-course"
            onClick={() => navigate(`/course?course=${item.id}`)}
            className="w-full"
            variant="outline"
          >
            <Play className="w-4 h-4 ml-2" />
            התחל את ה{getProductTypeName('course', 'singular')}
          </Button>
        );
      }
    } else if (item.product_type === PRODUCT_TYPES.file.key) {
      buttons.push(
        <Button
          key={PRODUCT_TYPES.file.key}
          onClick={() => navigate(PRODUCT_TYPES.file.url)}
          className="w-full"
          variant="outline"
        >
          <FileText className="w-4 h-4 ml-2" />
          ל{getProductTypeName('file', 'plural')} שלי
        </Button>
      );

      if (item.file_url) {
        buttons.push(
          <Button
            key="download"
            onClick={() => window.open(item.file_url, '_blank')}
            className="w-full"
            variant="outline"
          >
            <Download className="w-4 h-4 ml-2" />
            הורד עכשיו
          </Button>
        );
      }
    }

    // Add general account button
    buttons.push(
      <Button
        key="account"
        onClick={() => navigate("/account")}
        className="w-full"
        variant="outline"
      >
        לחשבון שלי
      </Button>
    );

    return <div className="space-y-3">{buttons}</div>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען תוצאות...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            {getStatusIcon()}
            <CardTitle className={`text-2xl mt-4 ${
              status === 'success' ? 'text-green-700' : 
              status === 'failure' ? 'text-red-700' : 
              'text-yellow-700'
            }`}>
              {getStatusTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-gray-600 text-lg">
              {getStatusMessage()}
            </p>

            {autoRedirectSeconds > 0 && status === 'success' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800 text-sm">
                  עובר לעמוד המוצר בעוד {autoRedirectSeconds} שניות...
                </p>
                <Button
                  onClick={() => setAutoRedirectSeconds(null)}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 mt-2"
                >
                  בטל מעבר אוטומטי
                </Button>
              </div>
            )}

            {item && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {getItemIcon()}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      {isMultiProduct && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          1 מתוך {totalPurchases}
                        </span>
                      )}
                    </div>
                    {item.short_description && (
                      <p className="text-sm text-gray-600 mt-1">{item.short_description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {itemType === 'subscription' ? (
                        <>
                          {isFree ? (
                            <span className="text-green-600 font-medium">מינוי חינם</span>
                          ) : purchase && (
                            <span>₪{purchase.payment_amount} לחודש</span>
                          )}
                          {item.subscription && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle className="w-3 h-3" />
                              {item.subscription.status === 'active' ? 'מינוי פעיל' :
                               item.subscription.status === 'pending' ? 'ממתין לאישור' :
                               'מינוי לא פעיל'}
                            </span>
                          )}
                          {item.subscription && item.subscription.next_billing_date && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Clock className="w-3 h-3" />
                              חיוב הבא: {format(new Date(item.subscription.next_billing_date), 'dd/MM/yyyy', { locale: he })}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {isFree ? (
                            <span className="text-green-600 font-medium">חינם</span>
                          ) : purchase && (
                            <span>₪{purchase.payment_amount}</span>
                          )}
                          {purchase && !purchaseUtils.hasLifetimeAccess(purchase) && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Clock className="w-3 h-3" />
                              גישה עד: {purchaseUtils.formatAccessExpiry(purchase)}
                            </span>
                          )}
                          {purchase && purchaseUtils.hasLifetimeAccess(purchase) && (
                            <span className="text-green-600 font-medium">גישה לכל החיים</span>
                          )}
                          {itemType === 'product' && item.product_type === 'workshop' && item.scheduled_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(item.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {isMultiProduct && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <p className="text-sm text-blue-800">
                          <strong>רכישה מרובת מוצרים:</strong> זהו אחד מ-{totalPurchases} המוצרים שרכשת. לצפייה בכל המוצרים עבור לחשבון שלך.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {purchase && (
              <div className="text-center text-sm text-gray-500">
                מספר עסקה: #{purchase.metadata?.transaction_uid || purchase.id}
              </div>
            )}

            <div className="pt-4">
              {getActionButton()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}