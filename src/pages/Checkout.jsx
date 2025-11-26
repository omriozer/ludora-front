import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Purchase } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Trash2,
  AlertCircle,
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Play,
  Video,
  FileText,
  Download,
  Gamepad2,
  Users,
  Calendar,
  Clock,
  Tag,
  Percent,
  Shield,
  X,
  RotateCcw,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import {
  getCartAndPendingPurchases,
  calculateTotalPrice,
  groupPurchasesByType,
  showPurchaseErrorToast,
  findProductForEntity
} from "@/utils/purchaseHelpers";
import paymentClient from "@/services/paymentClient";
import { createPayplusPaymentPage, apiRequest } from "@/services/apiClient";
import { toast } from "@/components/ui/use-toast";
import { useCart } from "@/contexts/CartContext";
import CouponInput from "@/components/CouponInput";
import couponClient from "@/services/couponClient";
import { clog, cerror } from "@/lib/utils";


export default function Checkout() {
  const navigate = useNavigate();
  const { removeFromCart } = useCart();
  const { currentUser, settings, isLoading: userLoading } = useUser();

  const [cartItems, setCartItems] = useState([]);
  const [cartItemProducts, setCartItemProducts] = useState({}); // Map of purchase.id -> Product
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // PaymentIntent state
  const [currentTransactionId, setCurrentTransactionId] = useState(null);

  // Coupon management
  const [appliedCoupons, setAppliedCoupons] = useState([]);

  // Pricing breakdown
  const [pricingBreakdown, setPricingBreakdown] = useState({
    subtotal: 0,
    discounts: 0,
    tax: 0,
    total: 0,
    appliedCoupons: []
  });

  // State for dynamic texts fetched from the database
  const [checkoutTexts, setCheckoutTexts] = useState({
    checkoutTitle: "עגלת קניות",
    emptyCart: "עגלת הקניות ריקה",
    emptyCartDescription: "אין פריטים בעגלת הקניות. לחצו כאן לחזרה לקטלוג",
    items: "פריטים",
    orderSummary: "סיכום הזמנה",
    subtotal: "סכום ביניים",
    total: "סכום כולל",
    proceedToPayment: "המשך לתשלום",
    securePayment: "תשלום מאובטח",
    removeItem: "הסר פריט",
    backToCatalog: "חזרה לקטלוג",
    processing: "מעבד תשלום...",
    payplusSecurePayment: "תשלום מאובטח באמצעות PayPlus"
  });

  // Load Product data for cart items
  const loadCartItemProducts = useCallback(async (cartPurchases) => {
    try {
      const productMap = {};

      // Fetch Product data for each cart item
      for (const purchase of cartPurchases) {
        try {
          const product = await findProductForEntity(
            purchase.purchasable_type,
            purchase.purchasable_id
          );
          if (product) {
            productMap[purchase.id] = product;
          }
        } catch (error) {
          cerror(`Error loading product for purchase ${purchase.id}:`, error);
          // Continue loading other products even if one fails
        }
      }

      setCartItemProducts(productMap);
    } catch (error) {
      cerror('Error loading cart item products:', error);
    }
  }, []);

  // Load checkout data
  const loadCheckoutData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check authentication using UserContext
      if (!currentUser) {
        setError('נדרשת התחברות לצפייה בעגלת הקניות');
        setIsLoading(false);
        return;
      }

      // User data and settings are now available from global UserContext
      const userId = currentUser.id;

      // Load cart and pending purchases (cart items + items in payment processing)
      const cartPurchases = await getCartAndPendingPurchases(userId);
      setCartItems(cartPurchases);

      // Load Product data for each cart item
      await loadCartItemProducts(cartPurchases);

      // Calculate pricing (only count 'cart' status items for checkout)
      const cartOnlyItems = cartPurchases.filter(item => item.payment_status === 'cart');
      calculatePricing(cartOnlyItems);

    } catch (err) {
      cerror('Error loading checkout data:', err);
      setError('שגיאה בטעינת נתוני העגלה');
    }

    setIsLoading(false);
  }, [currentUser, loadCartItemProducts]);

  // Calculate pricing breakdown with applied coupons
  const calculatePricing = (purchases, coupons = appliedCoupons) => {
    const subtotal = calculateTotalPrice(purchases);

    // Calculate total discounts from applied coupons
    const discounts = coupons.reduce((total, coupon) => {
      return total + (coupon.discountAmount || 0);
    }, 0);

    const tax = 0; // No tax for now
    const total = Math.max(0, subtotal - discounts + tax); // Ensure total doesn't go negative

    setPricingBreakdown({
      subtotal,
      discounts,
      tax,
      total,
      appliedCoupons: coupons
    });
  };

  useEffect(() => {
    if (!userLoading && currentUser) {
      loadCheckoutData();
    }
  }, [loadCheckoutData, userLoading, currentUser]);

  // REMOVED: Polling cleanup - no longer needed with immediate confirmation

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

          // CRITICAL: Handle PayPlus payment submission event
          if (data.event === 'pp_submitProcess' && data.value === true) {
            // Payment submission started - trigger status change to "pending"
            // This will start automatic polling since webhooks are disabled
            console.log('🚀 PayPlus payment submission detected - triggering pending status and polling');

            if (currentTransactionId) {
              try {
                // Call update-status API to trigger status change and polling
                await apiRequest('/payments/update-status', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    transaction_id: currentTransactionId,
                    status: 'pending'
                  })
                });

                // Update local cart state to show pending status
                const updatedCartItems = cartItems.map(item => {
                  if (item.id === currentTransactionId) {
                    return {
                      ...item,
                      payment_status: 'pending'
                    };
                  }
                  return item;
                });
                setCartItems(updatedCartItems);

                console.log('✅ Payment status updated to pending, polling started');
              } catch (error) {
                cerror('Error updating payment status to pending:', error);
              }
            }
            return; // Don't process other events if this was handled
          }

          if (data.type === 'payplus_payment_complete') {

            // Payment detected via immediate notification (no polling needed)

            // NEW: Notify API that payment was submitted (regardless of success/failure)
            if (currentTransactionId) {
              try {
                await apiRequest(`/payments/confirm/${currentTransactionId}`, {
                  method: 'POST'
                });
              } catch (confirmError) {
                cerror('Error sending payment confirmation to API:', confirmError);
                // Continue with normal flow even if confirmation fails
              }
            }

            if (data.status === 'success') {
              // Payment was successful - trigger success handler
              await handlePaymentSuccess();
            } else {
              // Payment failed/cancelled - just close modal
              handlePaymentModalClose();

              toast({
                title: "תשלום לא הושלם",
                description: "התשלום בוטל או נכשל. הפריטים נשמרו בעגלה.",
                variant: "destructive",
              });
            }
          }
        } catch (e) {
          // Silently ignore non-JSON messages
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

  // Remove item from cart
  const handleRemoveItem = async (purchaseId) => {
    try {
      // Get the purchase to check status
      const purchase = cartItems.find(item => item.id === purchaseId);

      if (purchase?.payment_status === 'pending') {
        toast({
          title: "לא ניתן להסיר",
          description: "לא ניתן להסיר פריט בעת תשלום. אנא המתן להשלמת התשלום.",
          variant: "destructive",
        });
        return;
      }

      // Delete the cart purchase (only 'cart' status items can be deleted)
      await Purchase.delete(purchaseId);

      // Remove from local state
      const updatedItems = cartItems.filter(item => item.id !== purchaseId);
      setCartItems(updatedItems);

      // Remove product data for this item
      setCartItemProducts(prevProducts => {
        const { [purchaseId]: removed, ...remaining } = prevProducts;
        return remaining;
      });

      // Notify cart context about the removal
      removeFromCart(purchaseId);

      // Recalculate pricing (only count 'cart' status items for payment)
      const cartOnlyItems = updatedItems.filter(item => item.payment_status === 'cart');
      calculatePricing(cartOnlyItems);

    } catch (error) {
      showPurchaseErrorToast(error, 'בהסרת הפריט');
    }
  };

  // Handle coupon application
  const handleCouponApplied = (couponData) => {
    try {
      const newCoupon = {
        code: couponData.couponCode,
        id: couponData.couponId,
        discountAmount: couponData.discountAmount,
        discountType: couponData.discountType,
        priority: couponData.priority,
        finalAmount: couponData.finalAmount
      };

      const updatedCoupons = [...appliedCoupons, newCoupon];
      setAppliedCoupons(updatedCoupons);

      // Recalculate pricing with new coupon (only cart items)
      const cartOnlyItems = cartItems.filter(item => item.payment_status === 'cart');
      calculatePricing(cartOnlyItems, updatedCoupons);

    } catch (error) {
      cerror('Error handling coupon application:', error);
      showPurchaseErrorToast(error, 'בהחלת הקופון');
    }
  };

  // Handle coupon removal
  const handleCouponRemoved = (couponToRemove) => {
    try {
      const updatedCoupons = appliedCoupons.filter(
        coupon => coupon.code !== couponToRemove.code
      );
      setAppliedCoupons(updatedCoupons);

      // Recalculate pricing without removed coupon
      calculatePricing(cartItems, updatedCoupons);

    } catch (error) {
      cerror('Error handling coupon removal:', error);
      showPurchaseErrorToast(error, 'בהסרת הקופון');
    }
  };

  // REMOVED: Polling functions - replaced by immediate PayPlus message handler

  // Proceed to payment using new PaymentIntent flow
  const handleProceedToPayment = async () => {
    // Only consider cart items (not pending items) for new payments
    const cartOnlyItems = cartItems.filter(item => item.payment_status === 'cart');

    if (cartOnlyItems.length === 0) {
      showPurchaseErrorToast('אין פריטים בעגלה זמינים לתשלום', 'בתשלום');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const paymentResponse = await createPayplusPaymentPage({
        cartItems: cartOnlyItems,
        frontendOrigin: 'cart'
      });

      if (paymentResponse.success && paymentResponse.paymentUrl) {
        // Set payment URL and transaction ID, then show modal
        setPaymentUrl(paymentResponse.paymentUrl);
        setCurrentTransactionId(paymentResponse.transactionId);
        setIsIframeLoading(true); // Reset loading state for new iframe
        setShowPaymentModal(true);
      } else {
        setIsProcessingPayment(false);
        toast({
          title: "שגיאה ביצירת תשלום",
          description: "לא ניתן היה ליצור דף תשלום. נסה שוב מאוחר יותר.",
          variant: "destructive"
        });
      }

    } catch (error) {
      cerror('PaymentIntent error:', error);
      setIsProcessingPayment(false);
      toast({
        title: "שגיאה בתשלום",
        description: "אירעה שגיאה בעת יצירת התשלום. נסה שוב מאוחר יותר.",
        variant: "destructive"
      });
    }
  };

  // Handle modal close
  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setIsProcessingPayment(false);
    setPaymentUrl('');
    setIsIframeLoading(true);

    // Clear transaction ID
    setCurrentTransactionId(null);
  };

  // Handle successful payment (clear cart and reload data)
  const handlePaymentSuccess = async () => {
    try {
      // Clear local cart state
      setCartItems([]);
      setCartItemProducts({});

      // Notify cart context to update
      cartItems.forEach(item => removeFromCart(item.id));

      // Recalculate pricing for empty cart
      calculatePricing([]);

      // Show success message
      toast({
        title: "תשלום הושלם בהצלחה!",
        description: "הפריטים נרכשו והוסרו מהעגלה",
        variant: "default",
      });

      // Close modal and clear state
      setShowPaymentModal(false);
      setIsProcessingPayment(false);
      setCurrentTransactionId(null);

      // Optionally reload checkout data to ensure sync
      setTimeout(() => {
        loadCheckoutData();
      }, 1000);

    } catch (error) {
      cerror('Error handling payment success:', error);
    }
  };

  // Get product type icon
  const getProductIcon = (type) => {
    switch (type) {
      case 'workshop':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'course':
        return <Video className="w-5 h-5 text-green-600" />;
      case 'file':
        return <FileText className="w-5 h-5 text-purple-600" />;
      case 'tool':
        return <Download className="w-5 h-5 text-orange-600" />;
      case 'game':
        return <Gamepad2 className="w-5 h-5 text-pink-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <LudoraLoadingSpinner
          message="טוען עגלת קניות..."
          status="loading"
          size="lg"
          theme="neon"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{error}</h2>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full px-8 py-3"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            {checkoutTexts.backToCatalog}
          </Button>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Back Button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-2xl px-6 py-3 shadow-sm backdrop-blur-sm border border-white/20"
            >
              <ArrowLeft className="w-5 h-5 ml-2" />
              חזור
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 text-right">{checkoutTexts.checkoutTitle}</h1>
          </div>

          {/* Empty Cart */}
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{checkoutTexts.emptyCart}</h2>
            <p className="text-gray-600 mb-8">{checkoutTexts.emptyCartDescription}</p>
            <Button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full px-8 py-3"
            >
              {checkoutTexts.backToCatalog}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-2xl px-6 py-3 shadow-sm backdrop-blur-sm border border-white/20"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 text-right">{checkoutTexts.checkoutTitle}</h1>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 backdrop-blur-xl shadow-xl shadow-blue-500/10 border-0 rounded-3xl overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl text-right">
                  <ShoppingCart className="w-6 h-6" />
                  {checkoutTexts.items} ({cartItems.length})
                  {cartItems.some(item => item.payment_status === 'pending') && (
                    <div className="text-sm text-yellow-600 font-normal">
                      • {cartItems.filter(item => item.payment_status === 'pending').length} בתהליך תשלום
                    </div>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {cartItems.map((purchase) => (
                  <div
                    key={purchase.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                      purchase.payment_status === 'pending'
                        ? 'bg-yellow-50 border-l-4 border-yellow-400'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {getProductIcon(purchase.purchasable_type)}
                    </div>

                    <div className="flex-1 text-right">
                      <h3 className="font-semibold text-gray-900">
                        {purchase.metadata?.product_title || 'מוצר לא ידוע'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {getProductTypeName(purchase.purchasable_type, 'singular')}
                      </p>
                      {/* Access Days Display */}
                      {cartItemProducts[purchase.id] && (
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-700 font-medium">
                            {cartItemProducts[purchase.id].access_days === null || cartItemProducts[purchase.id].access_days === undefined
                              ? 'גישה לכל החיים'
                              : `${cartItemProducts[purchase.id].access_days} ימים`}
                          </span>
                        </div>
                      )}

                      {/* Payment Status Badge */}
                      {purchase.payment_status && purchase.payment_status !== 'cart' && (
                        <div className="flex items-center gap-2 mt-2">
                          {purchase.payment_status === 'pending' ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  ממתין לאישור תשלום
                                </span>
                              </div>
                            </>
                          ) : purchase.payment_status === 'completed' ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              הושלם
                            </span>
                          ) : purchase.payment_status === 'refunded' ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              <RotateCcw className="w-3 h-3" />
                              הוחזר
                            </span>
                          ) : purchase.payment_status === 'abandoned' ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                              <AlertCircle className="w-3 h-3" />
                              נטוש
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="text-left">
                      <div className="text-lg font-bold text-blue-600">
                        ₪{purchase.payment_amount}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(purchase.id)}
                      disabled={purchase.payment_status === 'pending'}
                      className={`${
                        purchase.payment_status === 'pending'
                          ? 'text-gray-400 cursor-not-allowed hover:bg-transparent'
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
                      title={
                        purchase.payment_status === 'pending'
                          ? 'לא ניתן להסיר פריט בעת תשלום. אנא המתן להשלמת התשלום.'
                          : 'הסר מהעגלה'
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary - Takes 1 column */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Card className="bg-white/95 backdrop-blur-xl shadow-xl shadow-purple-500/10 border-0 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <CreditCard className="w-6 h-6" />
                    {checkoutTexts.orderSummary}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{checkoutTexts.subtotal}</span>
                      <span className="font-medium">₪{pricingBreakdown.subtotal.toFixed(2)}</span>
                    </div>

                    {pricingBreakdown.discounts > 0 && (
                      <div className="space-y-1">
                        {/* Individual coupon discounts */}
                        {appliedCoupons.map((coupon, index) => (
                          <div key={index} className="flex justify-between text-green-600">
                            <span className="text-sm">
                              קופון {coupon.code}
                              {coupon.discountType === 'percentage' && (
                                <span className="text-xs ml-1">({coupon.discountValue}%)</span>
                              )}
                            </span>
                            <span>-₪{coupon.discountAmount?.toFixed(2)}</span>
                          </div>
                        ))}

                        {/* Total discounts summary */}
                        {appliedCoupons.length > 1 && (
                          <div className="flex justify-between text-green-700 font-medium border-t border-green-200 pt-1">
                            <span>סה"כ הנחות</span>
                            <span>-₪{pricingBreakdown.discounts.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="border-t pt-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>{checkoutTexts.total}</span>
                        <span className="text-blue-600">₪{pricingBreakdown.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Coupon Input Section */}
                  <div className="border-t pt-4">
                    <CouponInput
                      cartItems={cartItems}
                      cartTotal={pricingBreakdown.subtotal}
                      userId={currentUser?.id}
                      onCouponApplied={handleCouponApplied}
                      onCouponRemoved={handleCouponRemoved}
                      appliedCoupons={appliedCoupons}
                      disabled={isProcessingPayment}
                      showSuggestions={true}
                    />
                  </div>


                  {/* Payment Button */}
                  <Button
                    onClick={handleProceedToPayment}
                    disabled={isProcessingPayment || cartItems.length === 0}
                    className="w-full text-lg font-bold py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    {isProcessingPayment ? (
                      <LudoraLoadingSpinner
                        message={checkoutTexts.processing}
                        status="loading"
                        size="sm"
                        theme="neon"
                        showParticles={false}
                      />
                    ) : (
                      <>
                        <CreditCard className="w-6 h-6 ml-3" />
                        {checkoutTexts.proceedToPayment} (₪{pricingBreakdown.total.toFixed(2)})
                      </>
                    )}
                  </Button>

                  {/* Security Badge */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-4 border-t">
                    <Shield className="w-4 h-4" />
                    {checkoutTexts.payplusSecurePayment}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* PayPlus Payment Modal - Iframe Only */}
      {showPaymentModal && paymentUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">תשלום מאובטח</h2>
                {currentTransactionId && (
                  <div className="text-xs text-gray-500 font-mono">
                    ID: {currentTransactionId.slice(-8)}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePaymentModalClose}
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
                title="PayPlus Payment"
                onLoad={() => {
                  setIsIframeLoading(false);
                }}
                onError={(e) => {
                  cerror('PayPlus iframe error:', e);
                  setIsIframeLoading(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}