import React, { useState, useEffect } from "react";
import { Purchase } from "@/services/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, CreditCard, Loader2, AlertCircle, User, Mail, Phone, Tag, Percent } from "lucide-react";
import { createPayplusPaymentPage } from "@/services/functions";
import { applyCoupon } from "@/services/functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCartPurchases } from "@/utils/purchaseHelpers";
import { ludlog, luderror } from '@/lib/ludlog';
import { config } from "@/config/environment";

export default function PaymentModal({ product, user, settings, isTestMode = (config.isDevelopment() || config.api.isLocalhost()), onClose }) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  
  const [finalPrice, setFinalPrice] = useState(product.price);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [showIframe, setShowIframe] = useState(false);
  const [error, setError] = useState(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    setCouponError('');
    
    try {
      const { data, error } = await applyCoupon({
        couponCode: couponCode.trim(),
        originalPrice: product.price,
        productType: product.product_type,
        category: product.category
      });
      
      if (error) {
        setCouponError(error);
        setAppliedCoupon(null);
        setFinalPrice(product.price);
        setDiscountAmount(0);
      } else {
        setAppliedCoupon(data.coupon);
        setFinalPrice(data.finalPrice);
        setDiscountAmount(data.discountAmount);
        setCouponError('');
      }
    } catch (error) {
      luderror.ui('Error applying coupon:', error);
      setCouponError('שגיאה בהפעלת הקופון');
    }
    
    setIsApplyingCoupon(false);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setFinalPrice(product.price);
    setDiscountAmount(0);
    setCouponError('');
  };

  const handlePayment = async () => {
    setIsCreatingPayment(true);
    setError(null);

    try {
      // Calculate access details based on product settings
      let purchasedAccessDays = null;
      let purchasedLifetimeAccess = false;

      // New clean logic: access_days = null means lifetime access
      purchasedLifetimeAccess = product.access_days === null || product.access_days === undefined;
      if (!purchasedLifetimeAccess) {
        purchasedAccessDays = product.access_days;
      }

      // Fallback to system defaults if needed
      if (purchasedAccessDays === undefined) {
        // Use system defaults based on product type
        if (product.product_type === 'workshop') {
          purchasedLifetimeAccess = settings.recording_lifetime_access || false;
          purchasedAccessDays = purchasedLifetimeAccess ? null : (settings.default_recording_access_days || 30);
        } else if (product.product_type === 'course') {
          purchasedLifetimeAccess = settings.course_lifetime_access || false;
          purchasedAccessDays = purchasedLifetimeAccess ? null : (settings.default_course_access_days || 365);
        } else if (product.product_type === 'tool') {
          purchasedLifetimeAccess = settings.tool_lifetime_access || false;
          purchasedAccessDays = purchasedLifetimeAccess ? null : (settings.default_tool_access_days || 365);
        }
      }

      // Calculate access expiration for new schema
      let accessExpiresAt = null;
      if (!purchasedLifetimeAccess && purchasedAccessDays && purchasedAccessDays > 0) {
        accessExpiresAt = new Date();
        accessExpiresAt.setDate(accessExpiresAt.getDate() + purchasedAccessDays);
      }

      // First, check if there's an existing cart purchase for this product
      const cartPurchases = await getCartPurchases(user.id);
      let existingCartPurchase = cartPurchases.find(p =>
        p.purchasable_type === product.product_type &&
        p.purchasable_id === (product.entity_id || product.id)
      );

      let purchase;

      if (existingCartPurchase) {
        // Update existing cart purchase with discount info but keep in cart status

        const updateData = {
          payment_amount: finalPrice,
          discount_amount: discountAmount,
          coupon_code: appliedCoupon?.code || null,
          access_expires_at: accessExpiresAt,
          metadata: {
            ...existingCartPurchase.metadata,
            environment: isTestMode ? 'test' : 'production',
            product_title: product.title,
            access_days: purchasedAccessDays,
            lifetime_access: purchasedLifetimeAccess,
            payment_preparation_at: new Date().toISOString()
          }
        };

        purchase = await Purchase.update(existingCartPurchase.id, updateData);
      } else {
        // Create new purchase record in cart status

        const purchaseData = {
          buyer_user_id: user.id,
          purchasable_type: product.product_type,
          purchasable_id: product.entity_id || product.id,
          payment_amount: finalPrice,
          original_price: product.price,
          discount_amount: discountAmount,
          coupon_code: appliedCoupon?.code || null,
          payment_status: 'cart', // Keep in cart status until PayPlus success
          access_expires_at: accessExpiresAt,
          metadata: {
            environment: isTestMode ? 'test' : 'production',
            product_title: product.title,
            access_days: purchasedAccessDays,
            lifetime_access: purchasedLifetimeAccess,
            created_via: 'direct_payment'
          }
        };

        purchase = await Purchase.create(purchaseData);
      }

      // Create PayPlus payment page - PaymentService will handle status transitions
      const paymentResponse = await createPayplusPaymentPage({
        purchaseIds: [purchase.id], // Use purchaseIds array for consistency
        amount: finalPrice,
        userId: user.id,
        environment: isTestMode ? 'test' : 'production',
        frontendOrigin: window.location.origin,
        appliedCoupons: appliedCoupon ? [appliedCoupon] : [],
        originalAmount: product.price,
        totalDiscount: discountAmount
      });

      if (paymentResponse.data?.success && paymentResponse.data?.payment_url) {
        setPaymentUrl(paymentResponse.data.payment_url);
        setShowIframe(true);
      } else {
        throw new Error(paymentResponse.data?.error || 'שגיאה ביצירת דף התשלום');
      }

    } catch (error) {
      luderror.payment('Payment error:', error);
      setError(error.message || 'שגיאה בעיבוד התשלום');
    }
    
    setIsCreatingPayment(false);
  };

  // Handle documented PayPlus iframe events for payment status transitions
  useEffect(() => {
    const handlePayPlusMessage = async (event) => {
      // Security: Verify origin if needed
      // TODO: Add PayPlus iframe origin validation

      if (!event.data || typeof event.data !== 'object') return;

      const { data } = event;

      try {
        // Handle documented PayPlus events
        switch (data.event || data.type) {
          case 'pp_submitProcess':
            if (data.value === true) {
              // Payment submission started - update status to pending
              try {
                const { Purchase } = await import('@/services/entities');
                const cartPurchases = await getCartPurchases(user.id);

                // Find purchases that should be updated to pending
                for (const purchase of cartPurchases) {
                  if (purchase.payment_status === 'cart') {
                    await Purchase.update(purchase.id, {
                      payment_status: 'pending',
                      metadata: {
                        ...purchase.metadata,
                        pending_started_at: new Date().toISOString(),
                        pending_source: 'pp_submitProcess_event'
                      }
                    });
                  }
                }
              } catch (error) {
                luderror.payment('PaymentModal: Error updating to pending status:', error);
              }
            }
            break;

          case 'pp_responseFromServer':
            // Transaction completed (success or failure)

            // Let webhook/polling handle the final status update
            // Just redirect to result page for user feedback
            const paymentResult = data.success ? 'success' : 'failed';
            window.location.href = `/PaymentResult?status=${paymentResult}&source=pp_responseFromServer`;
            break;

          case 'pp_paymentPageKilled':
          case 'pp_pageExpired':
            // Payment page closed or expired - keep purchases in cart status

            // Close iframe and keep purchases in cart for retry
            setShowIframe(false);
            break;

          default:
            // Unknown PayPlus event
            break;
        }
      } catch (error) {
        luderror.payment('PaymentModal: Error handling PayPlus event:', error);
      }
    };

    if (showIframe) {
      window.addEventListener('message', handlePayPlusMessage);
      return () => {
        window.removeEventListener('message', handlePayPlusMessage);
      };
    }
  }, [showIframe, user.id]);

  if (showIframe && paymentUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-50 mobile-safe-container">
        <div className="bg-white rounded-lg w-full max-w-4xl h-[95vh] sm:h-[90vh] flex flex-col mobile-safe-card">
          <div className="mobile-safe-flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
            <h2 className="text-base sm:text-xl font-semibold mobile-truncate flex-1 min-w-0">תשלום מאובטח</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Reset payment_in_progress when modal is closed
                const resetPaymentFlags = async () => {
                  try {
                    const { Purchase } = await import('@/services/entities');
                    const cartPurchases = await getCartPurchases(user.id);
                    const purchasesToReset = cartPurchases.filter(p => p.metadata?.payment_in_progress === true);

                    for (const purchase of purchasesToReset) {
                      await Purchase.update(purchase.id, {
                        metadata: {
                          ...purchase.metadata,
                          payment_in_progress: false,
                          payment_cancelled_at: new Date().toISOString()
                        }
                      });
                    }
                  } catch (error) {
                    luderror.payment('PaymentModal: Error resetting purchases on close:', error);
                  }
                };
                resetPaymentFlags();
                onClose();
              }}
              className="min-h-[44px] min-w-[44px] flex-shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <iframe
              src={paymentUrl}
              className="w-full h-full border-0"
              title="PayPlus Payment"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 mobile-safe-container" dir="rtl">
      <Card className="w-full max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto mobile-safe-card">
        <CardHeader className="mobile-padding sticky top-0 bg-white z-10 border-b">
          <div className="mobile-safe-flex items-center justify-between">
            <CardTitle className="mobile-safe-flex items-center gap-2 flex-1 min-w-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="mobile-truncate text-base sm:text-lg">אישור רכישה</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isCreatingPayment}
              className="min-h-[44px] min-w-[44px] flex-shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 mobile-padding">
          {error && (
            <Alert variant="destructive" className="mobile-safe-container">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <AlertDescription className="mobile-safe-text text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Product Summary */}
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg mobile-safe-container">
            <h3 className="font-semibold mb-2 text-sm sm:text-base mobile-truncate">{product.title}</h3>
            <div className="space-y-2 mobile-safe-container">
              <div className="mobile-safe-flex justify-between items-center text-sm sm:text-base">
                <span className="mobile-safe-text">מחיר מקורי:</span>
                <span className={discountAmount > 0 ? 'line-through text-gray-500 flex-shrink-0' : 'text-lg sm:text-xl font-bold text-blue-600 flex-shrink-0'}>
                  ₪{product.price}
                </span>
              </div>
              {discountAmount > 0 && (
                <>
                  <div className="mobile-safe-flex justify-between items-center text-green-600 text-sm sm:text-base">
                    <span className="mobile-safe-text">הנחה:</span>
                    <span className="flex-shrink-0">-₪{discountAmount}</span>
                  </div>
                  <div className="mobile-safe-flex justify-between items-center border-t pt-2">
                    <span className="font-semibold mobile-safe-text text-sm sm:text-base">מחיר סופי:</span>
                    <span className="text-lg sm:text-xl font-bold text-blue-600 flex-shrink-0">₪{finalPrice}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Test Mode Warning */}
          {isTestMode && (
            <Alert className="mobile-safe-container">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <AlertDescription className="mobile-safe-text text-sm">
                מצב בדיקה - לא יבוצע חיוב אמיתי
              </AlertDescription>
            </Alert>
          )}

          {/* User Information Display */}
          <div className="space-y-2 sm:space-y-3 mobile-safe-container">
            <h4 className="font-semibold text-sm sm:text-base mobile-safe-text">פרטי הרוכש:</h4>

            <div className="mobile-safe-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0 mobile-safe-text">
                <div className="font-medium text-sm sm:text-base mobile-truncate">{user.display_name || user.full_name}</div>
                <div className="text-xs sm:text-sm text-gray-600">שם מלא</div>
              </div>
            </div>

            <div className="mobile-safe-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0 mobile-safe-text">
                <div className="font-medium text-sm sm:text-base mobile-truncate">{user.email}</div>
                <div className="text-xs sm:text-sm text-gray-600">אימייל</div>
              </div>
            </div>

            {user.phone && (
              <div className="mobile-safe-flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0 mobile-safe-text">
                  <div className="font-medium text-sm sm:text-base mobile-truncate">{user.phone}</div>
                  <div className="text-xs sm:text-sm text-gray-600">טלפון</div>
                </div>
              </div>
            )}
          </div>

          {/* Coupon Section */}
          <div className="space-y-2 sm:space-y-3 mobile-safe-container">
            <Label className="mobile-safe-flex items-center gap-2 text-sm sm:text-base">
              <Tag className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="mobile-safe-text">קופון הנחה (אופציונלי)</span>
            </Label>
            
            {appliedCoupon ? (
              <div className="p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg mobile-safe-container">
                <div className="mobile-safe-flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0 mobile-safe-text">
                    <span className="font-medium text-green-800 text-sm sm:text-base mobile-truncate block">{appliedCoupon.name}</span>
                    <div className="text-xs sm:text-sm text-green-600">
                      {appliedCoupon.discount_type === 'percentage'
                        ? `${appliedCoupon.discount_value}% הנחה`
                        : `₪${appliedCoupon.discount_value} הנחה`
                      }
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveCoupon}
                    disabled={isCreatingPayment}
                    className="min-h-[44px] flex-shrink-0 text-xs sm:text-sm"
                  >
                    הסר
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mobile-safe-flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="הכנס קוד קופון"
                  disabled={isApplyingCoupon || isCreatingPayment}
                  className="flex-1 min-w-0 min-h-[44px] text-sm sm:text-base"
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || isApplyingCoupon || isCreatingPayment}
                  variant="outline"
                  className="min-h-[44px] min-w-[44px] flex-shrink-0"
                >
                  {isApplyingCoupon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Percent className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}

            {couponError && (
              <div className="text-xs sm:text-sm text-red-600 mobile-safe-text">{couponError}</div>
            )}
          </div>

          {/* Payment Button */}
          <div className="pt-3 sm:pt-4 mobile-safe-container">
            <Button
              onClick={handlePayment}
              disabled={isCreatingPayment}
              className="w-full min-h-[52px] bg-blue-600 hover:bg-blue-700 text-base sm:text-lg py-3 mobile-safe-flex items-center justify-center"
            >
              {isCreatingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 ml-2 animate-spin flex-shrink-0" />
                  <span className="mobile-safe-text">פותח דף תשלום...</span>
                </>
              ) : (
                <span className="mobile-safe-text">{`תשלום מאובטח ₪${finalPrice}`}</span>
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center mobile-safe-text">
            תשלום מאובטח באמצעות PayPlus
          </div>
        </CardContent>
      </Card>
    </div>
  );
}