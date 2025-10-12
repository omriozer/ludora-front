import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, Purchase } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  X
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import {
  getUserIdFromToken,
  requireAuthentication,
  getCartPurchases,
  calculateTotalPrice,
  groupPurchasesByType,
  showPurchaseErrorToast
} from "@/utils/purchaseHelpers";
import paymentClient from "@/services/paymentClient";
import { toast } from "@/components/ui/use-toast";
import { useCart } from "@/contexts/CartContext";
import CouponInput from "@/components/CouponInput";
import couponClient from "@/services/couponClient";
import { getApiBase } from "@/utils/api";


export default function Checkout() {
  const navigate = useNavigate();
  const { removeFromCart } = useCart();

  const [cartItems, setCartItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentEnvironment, setPaymentEnvironment] = useState('production');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

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

  // Load checkout data
  const loadCheckoutData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {

      // Check authentication
      if (!requireAuthentication(navigate, '/checkout')) {
        setIsLoading(false);
        return;
      }

      const userId = getUserIdFromToken();
      if (!userId) {
        setError('לא ניתן לזהות את המשתמש');
        setIsLoading(false);
        return;
      }

      // Load user data
      const user = await User.me();
      setCurrentUser(user);

      // Load settings
      const settingsData = await Settings.find();
      setSettings(settingsData.length > 0 ? settingsData[0] : {});

      // Load cart purchases (cart items)
      const cartPurchases = await getCartPurchases(userId);
      setCartItems(cartPurchases);

      // Calculate pricing
      calculatePricing(cartPurchases);

    } catch (err) {
      console.error('Error loading checkout data:', err);
      setError('שגיאה בטעינת נתוני העגלה');
    }

    setIsLoading(false);
  }, [navigate]);

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
    loadCheckoutData();
  }, [loadCheckoutData]);

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

      console.log('🎯 Checkout: Received message from PayPlus iframe:', event.data);

      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          console.log('🎯 Checkout: Parsed message data:', data);

          if (data.type === 'payplus_payment_complete') {
            console.log('🎯 Checkout: Payment completed via PostMessage with status:', data.status);

            // Payment detected via immediate notification (no polling needed)

            // NEW: Notify API that payment was submitted (regardless of success/failure)
            if (currentTransactionId) {
              try {
                console.log('📤 Checkout: Confirming payment submission to API for transaction:', currentTransactionId);

                const confirmResponse = await fetch(`${getApiBase()}/payments/confirm/${currentTransactionId}`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  }
                });

                if (confirmResponse.ok) {
                  console.log('✅ Checkout: Payment confirmation sent to API successfully');
                } else {
                  console.warn('⚠️ Checkout: Payment confirmation failed but continuing with flow');
                }

              } catch (confirmError) {
                console.error('❌ Checkout: Error sending payment confirmation to API:', confirmError);
                // Continue with normal flow even if confirmation fails
              }
            }

            if (data.status === 'success') {
              // Payment was successful - trigger success handler
              console.log('✅ PaymentIntent completed via PostMessage');
              await handlePaymentSuccess();
            } else {
              // Payment failed/cancelled - just close modal
              console.log('❌ PaymentIntent failed via PostMessage:', data.status);
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
      console.log('🎯 Checkout: Adding message listener for PayPlus iframe');
      window.addEventListener('message', handleMessage);
      return () => {
        console.log('🎯 Checkout: Removing message listener for PayPlus iframe');
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [showPaymentModal, paymentUrl]);

  // Remove item from cart
  const handleRemoveItem = async (purchaseId) => {
    try {
      // Delete the pending purchase
      await Purchase.delete(purchaseId);

      // Remove from local state
      const updatedItems = cartItems.filter(item => item.id !== purchaseId);
      setCartItems(updatedItems);

      // Notify cart context about the removal
      removeFromCart(purchaseId);

      // Recalculate pricing
      calculatePricing(updatedItems);

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

      // Recalculate pricing with new coupon
      calculatePricing(cartItems, updatedCoupons);

    } catch (error) {
      console.error('Error handling coupon application:', error);
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
      console.error('Error handling coupon removal:', error);
      showPurchaseErrorToast(error, 'בהסרת הקופון');
    }
  };

  // REMOVED: Polling functions - replaced by immediate PayPlus message handler

  // Proceed to payment using new PaymentIntent flow
  const handleProceedToPayment = async () => {
    if (cartItems.length === 0) {
      showPurchaseErrorToast('עגלת הקניות ריקה', 'בתשלום');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const userId = getUserIdFromToken();
      if (!userId) {
        throw new Error('לא ניתן לזהות את המשתמש');
      }

      // Prepare cart items with id and payment_amount
      const cartItemsForPayment = cartItems.map(item => ({
        id: item.id,
        payment_amount: parseFloat(item.payment_amount)
      }));

      // Create PaymentIntent using new Transaction-centric flow
      const paymentResponse = await paymentClient.createPaymentIntent({
        cartItems: cartItemsForPayment,
        userId,
        appliedCoupons: appliedCoupons.map(coupon => ({
          code: coupon.code,
          id: coupon.id,
          discountAmount: coupon.discountAmount,
          discountType: coupon.discountType
        })),
        environment: paymentEnvironment,
        frontendOrigin: window.location.origin
      });

      if (paymentResponse.success && paymentResponse.data) {
        const { transactionId, paymentUrl, totalAmount, status } = paymentResponse.data;

        console.log('🎯 PaymentIntent created:', { transactionId, totalAmount, status });

        // Store transaction ID for confirmation
        setCurrentTransactionId(transactionId);

        // Set payment URL and show modal with PayPlus iframe
        setPaymentUrl(paymentUrl);
        setShowPaymentModal(true);

        // Payment completion will be handled by PayPlus message handler

      } else {
        throw new Error('לא ניתן ליצור PaymentIntent');
      }

    } catch (error) {
      console.error('PaymentIntent error:', error);

      // Show user-friendly error message
      toast({
        title: "שגיאה בעיבוד התשלום",
        description: error.message || "אירעה שגיאה בעת יצירת דף התשלום. אנא נסו שוב.",
        variant: "destructive",
      });

      setIsProcessingPayment(false);
    }
  };

  // Handle modal close
  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setIsProcessingPayment(false);
    setPaymentUrl('');

    // Clear transaction ID
    setCurrentTransactionId(null);
  };

  // Handle successful payment (clear cart and reload data)
  const handlePaymentSuccess = async () => {
    try {
      // Clear local cart state
      setCartItems([]);

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
      console.error('Error handling payment success:', error);
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

  if (isLoading) {
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
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {cartItems.map((purchase) => (
                  <div key={purchase.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
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
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

                  {/* Admin Environment Toggle */}
                  {currentUser?.role === 'admin' && (
                    <div className="space-y-3 p-4 bg-orange-50 rounded-2xl border border-orange-200">
                      <Label className="text-sm font-medium text-orange-800 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        PayPlus Environment (Admin Only)
                      </Label>
                      <RadioGroup
                        value={paymentEnvironment}
                        onValueChange={setPaymentEnvironment}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="production" id="prod" />
                          <Label htmlFor="prod" className="text-sm cursor-pointer">
                            Production (Live payments)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="test" id="test" />
                          <Label htmlFor="test" className="text-sm cursor-pointer">
                            Test/Staging (Test payments)
                          </Label>
                        </div>
                      </RadioGroup>
                      <div className="text-xs text-orange-600">
                        {paymentEnvironment === 'production'
                          ? 'Real money transactions will be processed'
                          : 'Test mode - no real money will be charged'
                        }
                      </div>
                    </div>
                  )}

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
                        {currentUser?.role === 'admin' && (
                          <span className="text-xs opacity-80 mr-2">
                            [{paymentEnvironment === 'production' ? 'LIVE' : 'TEST'}]
                          </span>
                        )}
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
            <div className="flex-1">
              <iframe
                src={paymentUrl}
                className="w-full h-full border-0"
                title="PayPlus Payment"
                onLoad={() => console.log('🎯 Checkout: PayPlus iframe loaded successfully')}
                onError={(e) => console.error('🎯 Checkout: PayPlus iframe error:', e)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}