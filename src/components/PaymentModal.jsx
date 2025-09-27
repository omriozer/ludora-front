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

export default function PaymentModal({ product, user, settings, isTestMode = true, onClose }) {
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

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `EDU-${timestamp.slice(-6)}${random}`;
  };

  const handlePayment = async () => {
    setIsCreatingPayment(true);
    setError(null);

    try {
      // Calculate access details based on product settings
      let purchasedAccessDays = null;
      let purchasedLifetimeAccess = false;

      if (product.is_lifetime_access !== null) {
        purchasedLifetimeAccess = product.is_lifetime_access;
        if (!purchasedLifetimeAccess) {
          purchasedAccessDays = product.access_days;
        }
      } else {
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

      // Create purchase record with new schema
      const orderNumber = generateOrderNumber();

      // Calculate access expiration for new schema
      let accessExpiresAt = null;
      if (!purchasedLifetimeAccess && purchasedAccessDays && purchasedAccessDays > 0) {
        accessExpiresAt = new Date();
        accessExpiresAt.setDate(accessExpiresAt.getDate() + purchasedAccessDays);
      }

      const purchaseData = {
        order_number: orderNumber,
        buyer_user_id: user.id, // Use user ID instead of email/name/phone
        purchasable_type: product.product_type, // New polymorphic structure
        purchasable_id: product.entity_id || product.id, // Entity ID for polymorphic reference
        payment_amount: finalPrice,
        original_price: product.price,
        discount_amount: discountAmount,
        coupon_code: appliedCoupon?.code || null,
        payment_status: 'pending',
        access_expires_at: accessExpiresAt, // New access control field
        metadata: {
          environment: isTestMode ? 'test' : 'production',
          product_title: product.title,
          access_days: purchasedAccessDays,
          lifetime_access: purchasedLifetimeAccess
        }
      };

      const purchase = await Purchase.create(purchaseData);

      // Create PayPlus payment page
      const paymentResponse = await createPayplusPaymentPage({
        purchaseId: purchase.id,
        environment: isTestMode ? 'test' : 'production',
        frontendOrigin: window.location.origin
      });

      if (paymentResponse.data?.success && paymentResponse.data?.payment_url) {
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
    const handleMessage = (event) => {
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'payplus_payment_complete') {
            // Payment completed, redirect to results page
            window.location.href = `/PaymentResult?status=${data.status}&purchaseId=${data.purchaseId || data.orderNumber}`;  // Updated for new schema
          }
        } catch (e) {
          // Not a PayPlus message, ignore
        }
      }
    };

    if (showIframe) {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [showIframe]);

  if (showIframe && paymentUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">תשלום מאובטח</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1">
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