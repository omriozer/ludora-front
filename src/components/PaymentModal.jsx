import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

export default function PaymentModal({ product, user, settings, isTestMode = (import.meta.env.VITE_API_BASE?.includes('localhost') || import.meta.env.DEV), onClose }) {
  const navigate = useNavigate();
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
      console.error('Error applying coupon:', error);
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
    console.log('🎯 PaymentModal: Starting payment process...');

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
        console.log('Found existing cart purchase, updating with discount info:', existingCartPurchase.id);

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
        console.log('No cart purchase found, creating new purchase in cart status');

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

      console.log('🎯 PaymentModal: Payment response received:', {
        success: paymentResponse.data?.success,
        hasPaymentUrl: !!paymentResponse.data?.payment_url,
        paymentUrl: paymentResponse.data?.payment_url
      });

      if (paymentResponse.data?.success && paymentResponse.data?.payment_url) {
        console.log('🎯 PaymentModal: Setting iframe to show with URL:', paymentResponse.data.payment_url);
        setPaymentUrl(paymentResponse.data.payment_url);
        setShowIframe(true);
      } else {
        throw new Error(paymentResponse.data?.error || 'שגיאה ביצירת דף התשלום');
      }

    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'שגיאה בעיבוד התשלום');
    }
    
    setIsCreatingPayment(false);
  };

  // Handle iframe messages from PayPlus
  useEffect(() => {
    const handleMessage = async (event) => {
      console.log('🎯 PaymentModal: Received message from iframe:', event.data);

      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          console.log('🎯 PaymentModal: Parsed message data:', data);

          if (data.type === 'payplus_payment_complete') {
            console.log('🎯 PaymentModal: Payment completed with status:', data.status);

            // Update purchases to pending status since payment was submitted
            if (data.status === 'success') {
              try {
                // Import Purchase here to avoid circular dependency
                const { Purchase } = await import('@/services/entities');

                // Get the cart purchases that are currently in payment
                const cartPurchases = await getCartPurchases(user.id);
                const purchasesToUpdate = cartPurchases.filter(p => p.metadata?.payment_in_progress === true);

                // Update them to pending status (waiting for webhook confirmation)
                for (const purchase of purchasesToUpdate) {
                  await Purchase.update(purchase.id, {
                    payment_status: 'pending',
                    metadata: {
                      ...purchase.metadata,
                      payment_submitted_at: new Date().toISOString(),
                      payment_in_progress: false
                    }
                  });
                }

                console.log(`🎯 PaymentModal: Updated ${purchasesToUpdate.length} purchases to pending status`);
              } catch (error) {
                console.error('🎯 PaymentModal: Error updating purchase status:', error);
              }
            } else {
              // Payment failed/cancelled - reset payment_in_progress flag
              try {
                const { Purchase } = await import('@/services/entities');
                const cartPurchases = await getCartPurchases(user.id);
                const purchasesToReset = cartPurchases.filter(p => p.metadata?.payment_in_progress === true);

                for (const purchase of purchasesToReset) {
                  await Purchase.update(purchase.id, {
                    metadata: {
                      ...purchase.metadata,
                      payment_in_progress: false,
                      payment_failed_at: new Date().toISOString()
                    }
                  });
                }

                console.log(`🎯 PaymentModal: Reset ${purchasesToReset.length} purchases after payment failure`);
              } catch (error) {
                console.error('🎯 PaymentModal: Error resetting purchase status:', error);
              }
            }

            // Redirect to results page
            window.location.href = `/PaymentResult?status=${data.status}&purchaseId=${data.purchaseId || data.orderNumber}`;
          }
        } catch (e) {
          console.log('🎯 PaymentModal: Message not JSON or not PayPlus message, ignoring');
        }
      }
    };

    if (showIframe) {
      console.log('🎯 PaymentModal: Adding message listener for iframe');
      window.addEventListener('message', handleMessage);
      return () => {
        console.log('🎯 PaymentModal: Removing message listener for iframe');
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [showIframe, user.id]);

  if (showIframe && paymentUrl) {
    console.log('🎯 PaymentModal: Rendering iframe with URL:', paymentUrl);
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">תשלום מאובטח</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                console.log('🎯 PaymentModal: Close button clicked, resetting payment_in_progress');
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
                    console.log(`🎯 PaymentModal: Reset ${purchasesToReset.length} purchases after modal close`);
                  } catch (error) {
                    console.error('🎯 PaymentModal: Error resetting purchases on close:', error);
                  }
                };
                resetPaymentFlags();
                onClose();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1">
            <iframe
              src={paymentUrl}
              className="w-full h-full border-0"
              title="PayPlus Payment"
              onLoad={() => console.log('🎯 PaymentModal: Iframe loaded successfully')}
              onError={(e) => console.error('🎯 PaymentModal: Iframe error:', e)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              אישור רכישה
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isCreatingPayment}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Product Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">{product.title}</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>מחיר מקורי:</span>
                <span className={discountAmount > 0 ? 'line-through text-gray-500' : 'text-xl font-bold text-blue-600'}>
                  ₪{product.price}
                </span>
              </div>
              {discountAmount > 0 && (
                <>
                  <div className="flex justify-between items-center text-green-600">
                    <span>הנחה:</span>
                    <span>-₪{discountAmount}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="font-semibold">מחיר סופי:</span>
                    <span className="text-xl font-bold text-blue-600">₪{finalPrice}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Test Mode Warning */}
          {isTestMode && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                מצב בדיקה - לא יבוצע חיוב אמיתי
              </AlertDescription>
            </Alert>
          )}

          {/* User Information Display */}
          <div className="space-y-3">
            <h4 className="font-semibold">פרטי הרוכש:</h4>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium">{user.display_name || user.full_name}</div>
                <div className="text-sm text-gray-600">שם מלא</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium">{user.email}</div>
                <div className="text-sm text-gray-600">אימייל</div>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Phone className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium">{user.phone}</div>
                  <div className="text-sm text-gray-600">טלפון</div>
                </div>
              </div>
            )}
          </div>

          {/* Coupon Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              קופון הנחה (אופציונלי)
            </Label>
            
            {appliedCoupon ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-green-800">{appliedCoupon.name}</span>
                    <div className="text-sm text-green-600">
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
                  >
                    הסר
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="הכנס קוד קופון"
                  disabled={isApplyingCoupon || isCreatingPayment}
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || isApplyingCoupon || isCreatingPayment}
                  variant="outline"
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
              <div className="text-sm text-red-600">{couponError}</div>
            )}
          </div>

          {/* Payment Button */}
          <div className="pt-4">
            <Button
              onClick={handlePayment}
              disabled={isCreatingPayment}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
            >
              {isCreatingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  פותח דף תשלום...
                </>
              ) : (
                `תשלום מאובטח ₪${finalPrice}`
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            תשלום מאובטח באמצעות PayPlus
          </div>
        </CardContent>
      </Card>
    </div>
  );
}