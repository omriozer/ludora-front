import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tag,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Gift,
  Percent
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import couponClient from '@/services/couponClient';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * CouponInput Component
 * Handles coupon code input, validation, and management in checkout
 */
export default function CouponInput({
  cartItems = [],
  cartTotal = 0,
  userId,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupons = [],
  disabled = false,
  showSuggestions = true
}) {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [suggestedCoupons, setSuggestedCoupons] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);

  // Load suggested coupons when component mounts or cart changes
  useEffect(() => {
    if (showSuggestions && cartItems.length > 0 && cartTotal > 0) {
      loadSuggestedCoupons();
    }
  }, [cartItems.length, cartTotal, showSuggestions]);

  /**
   * Load suggested public coupons for the current cart
   */
  const loadSuggestedCoupons = async () => {
    try {
      setIsLoadingSuggestions(true);

      const formattedCartItems = couponClient.formatCartItemsForAPI(cartItems);

      const response = await couponClient.getApplicableCoupons({
        userId,
        cartItems: formattedCartItems,
        cartTotal
      });

      if (response.success && response.data.applicable_coupons) {
        const availableCoupons = response.data.applicable_coupons.filter(
          coupon => !appliedCoupons.some(applied => applied.code === coupon.code)
        );

        setSuggestedCoupons(availableCoupons);

        if (availableCoupons.length > 0) {
          setShowSuggestionsPanel(true);
        }
      }
    } catch (error) {
      luderror.ui('Error loading suggested coupons:', error);
      // Don't show error toast for suggestions - it's not critical
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  /**
   * Apply a coupon code
   */
  const handleApplyCoupon = async (codeToApply = couponCode) => {
    if (!codeToApply.trim()) {
      setValidationError('אנא הזינו קוד קופון');
      return;
    }

    // Check if coupon is already applied
    if (appliedCoupons.some(coupon => coupon.code === codeToApply)) {
      setValidationError('קופון זה כבר הוחל');
      return;
    }

    try {
      setIsValidating(true);
      setValidationError('');

      const formattedCartItems = couponClient.formatCartItemsForAPI(cartItems);

      const response = await couponClient.applyCoupon({
        couponCode: codeToApply,
        userId,
        cartItems: formattedCartItems,
        cartTotal
      });

      if (response.success && response.data) {
        // Call parent callback with coupon data
        onCouponApplied(response.data);

        // Clear input and close suggestions
        setCouponCode('');
        setShowSuggestionsPanel(false);

        // Show success message
        toast({
          title: "קופון הוחל בהצלחה!",
          description: `חסכתם ₪${response.data.discountAmount.toFixed(2)}`,
          variant: "default"
        });

        // Reload suggestions to remove the applied coupon
        if (showSuggestions) {
          loadSuggestedCoupons();
        }

      } else {
        throw new Error(response.message || 'שגיאה ביישום הקופון');
      }

    } catch (error) {
      luderror.ui('Error applying coupon:', error);
      setValidationError(error.message || 'שגיאה ביישום הקופון');

      toast({
        title: "שגיאה ביישום קופון",
        description: error.message || 'נסו שוב מאוחר יותר',
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Remove an applied coupon
   */
  const handleRemoveCoupon = (couponToRemove) => {
    try {
      onCouponRemoved(couponToRemove);

      toast({
        title: "קופון הוסר",
        description: `קופון ${couponToRemove.code} הוסר מההזמנה`,
        variant: "default"
      });

      // Reload suggestions as this coupon is now available again
      if (showSuggestions) {
        loadSuggestedCoupons();
      }

    } catch (error) {
      luderror.ui('Error removing coupon:', error);
      toast({
        title: "שגיאה בהסרת קופון",
        description: 'נסו שוב מאוחר יותר',
        variant: "destructive"
      });
    }
  };

  /**
   * Apply a suggested coupon
   */
  const handleApplySuggestedCoupon = (suggestedCoupon) => {
    handleApplyCoupon(suggestedCoupon.code);
  };

  /**
   * Handle input key press
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyCoupon();
    }
  };

  return (
    <div className="space-y-4">
      {/* Coupon Input Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium">קופון הנחה</h3>
          </div>

          <div className="space-y-3">
            {/* Input Field */}
            <div className="flex gap-2">
              <Input
                placeholder="הזינו קוד קופון"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setValidationError('');
                }}
                onKeyPress={handleKeyPress}
                disabled={disabled || isValidating}
                className="text-left"
                dir="ltr"
              />
              <Button
                onClick={() => handleApplyCoupon()}
                disabled={disabled || isValidating || !couponCode.trim()}
                size="sm"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "החל"
                )}
              </Button>
            </div>

            {/* Validation Error */}
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Applied Coupons Display */}
      {appliedCoupons.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-medium">קופונים פעילים</h3>
            </div>

            <div className="space-y-2">
              {appliedCoupons.map((coupon, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <Badge variant="success" className="bg-green-100 text-green-800">
                      {coupon.code}
                    </Badge>
                    <div className="text-sm">
                      <div className="font-medium text-green-700">
                        חסכון: ₪{coupon.discountAmount?.toFixed(2)}
                      </div>
                      {coupon.discountType === 'percentage' && (
                        <div className="text-green-600 flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {coupon.discountValue}% הנחה
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCoupon(coupon)}
                    disabled={disabled}
                    className="text-green-700 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Coupons Panel */}
      {showSuggestions && showSuggestionsPanel && suggestedCoupons.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-800">קופונים זמינים עבורכם</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestionsPanel(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="ml-2 text-blue-700">טוען קופונים...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestedCoupons.slice(0, 3).map((suggestedCoupon, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-blue-300 text-blue-700">
                        {suggestedCoupon.code}
                      </Badge>
                      <div className="text-sm">
                        <div className="font-medium text-blue-800">
                          חסכו ₪{suggestedCoupon.potential_discount?.toFixed(2)}
                        </div>
                        {suggestedCoupon.description && (
                          <div className="text-blue-600 text-xs">
                            {suggestedCoupon.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplySuggestedCoupon(suggestedCoupon)}
                      disabled={disabled || isValidating}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      החל
                    </Button>
                  </div>
                ))}

                {suggestedCoupons.length > 3 && (
                  <div className="text-center text-sm text-blue-600 mt-2">
                    ועוד {suggestedCoupons.length - 3} קופונים זמינים
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}