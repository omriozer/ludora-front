import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductTypeName } from "@/config/productTypes";
import { useToast } from "@/components/ui/use-toast";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import useSubscriptionState from "@/hooks/useSubscriptionState";
import { ludlog, luderror } from '@/lib/ludlog';
import {
  X,
  Crown,
  Star,
  Clock,
  Gift,
  AlertTriangle,
  Check,
  TrendingUp,
  Package,
  Calendar,
  Infinity
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Subscription Claim Modal - Allows users to claim products using their subscription allowance
 * Shows confirmation dialog with allowance status and product details
 */
export default function SubscriptionClaimModal({
  isOpen,
  onClose,
  currentUser,
  product,
  onClaimSuccess
}) {
  const { toast } = useToast();

  // Get subscription state and allowances
  const { summary, loading: subscriptionLoading, error: subscriptionError } = useSubscriptionState(currentUser);

  // Component state
  const [loading, setLoading] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [allowanceStatus, setAllowanceStatus] = useState(null);
  const [loadingAllowance, setLoadingAllowance] = useState(false);

  // Load allowance status when modal opens
  useEffect(() => {
    if (isOpen && product && currentUser && summary?.currentPlan) {
      loadAllowanceStatus();
    }
  }, [isOpen, product, currentUser, summary]);

  /**
   * Load current allowance status for the user
   */
  const loadAllowanceStatus = async () => {
    try {
      setLoadingAllowance(true);
      setClaimError(null);

      ludlog.ui('Loading allowance status for subscription claim', {
        userId: currentUser.id,
        productType: product.product_type,
        productId: product.id
      });

      // Call the subscription benefits API to get current allowances
      const response = await fetch('/api/subscriptions/benefits/my-allowances', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load allowance status: ${response.status} ${response.statusText}`);
      }

      const allowanceData = await response.json();
      setAllowanceStatus(allowanceData);

      ludlog.ui('Allowance status loaded successfully', allowanceData);

    } catch (error) {
      luderror.ui('Error loading allowance status:', error);
      setClaimError(error.message || 'Failed to load subscription allowance information');
    } finally {
      setLoadingAllowance(false);
    }
  };

  /**
   * Handle claiming the product via subscription
   */
  const handleClaimProduct = async () => {
    try {
      setLoading(true);
      setClaimError(null);

      ludlog.ui('Claiming product via subscription', {
        userId: currentUser.id,
        productType: product.product_type,
        productId: product.id,
        productTitle: product.title
      });

      // Call the subscription claim API
      const response = await fetch('/api/subscriptions/benefits/claim', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productType: product.product_type,
          productId: product.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Claim failed: ${response.status} ${response.statusText}`);
      }

      const claimResult = await response.json();

      ludlog.ui('Product claimed successfully', claimResult);

      // Show success message
      toast({
        variant: "default",
        title: "נתבע בהצלחה באמצעות המנוי! 🎉",
        description: `${product.title} נוסף לתוכן הזמין שלך באמצעות המנוי.`
      });

      // Close modal and trigger success callback
      onClose();

      if (onClaimSuccess) {
        onClaimSuccess(claimResult);
      }

    } catch (error) {
      luderror.ui('Error claiming product via subscription:', error);
      setClaimError(error.message || 'Failed to claim product via subscription');

      toast({
        variant: "destructive",
        title: "שגיאה בתביעה",
        description: error.message || 'לא הצלחנו לתבוע את המוצר. אנא נסה שוב.'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get the product type display name in Hebrew
   */
  const getProductTypeDisplayName = (productType) => {
    return getProductTypeName(productType, 'singular');
  };

  /**
   * Check if the product can be claimed based on allowance status
   */
  const canClaimProduct = () => {
    if (!allowanceStatus || !product) return false;

    const productType = product.product_type;
    const productAllowance = allowanceStatus.allowances?.[productType];

    if (!productAllowance) return false;

    // Check if unlimited or has remaining claims
    return productAllowance.unlimited || (productAllowance.remaining > 0);
  };

  /**
   * Get restriction message for product claiming
   */
  const getRestrictionMessage = () => {
    if (!allowanceStatus || !product) return null;

    const productType = product.product_type;
    const productAllowance = allowanceStatus.allowances?.[productType];

    if (!productAllowance) {
      return `${getProductTypeDisplayName(productType)} לא כלול במנוי הנוכחי שלך`;
    }

    if (!productAllowance.unlimited && productAllowance.remaining <= 0) {
      return `הגעת למגבלה החודשית של ${productAllowance.monthly_limit} ${getProductTypeDisplayName(productType)} במנוי הנוכחי`;
    }

    return null;
  };

  /**
   * Format the next reset date
   */
  const formatResetDate = (resetDate) => {
    if (!resetDate) return 'לא ידוע';

    const date = new Date(resetDate);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        hideCloseButton={false}
        dir="rtl"
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">תביעה באמצעות מנוי</h2>
                <p className="text-gray-600 text-sm">השתמש במנוי שלך כדי לקבל גישה למוצר</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Product Information */}
          {product && (
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg text-blue-900">{product.title}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-blue-700 border-blue-300">
                      {getProductTypeDisplayName(product.product_type)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {product.description && (
                <CardContent className="pt-0">
                  <p className="text-blue-800 text-sm leading-relaxed">
                    {product.description}
                  </p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Loading State */}
          {(subscriptionLoading || loadingAllowance) && (
            <div className="flex items-center justify-center py-12">
              <LudoraLoadingSpinner
                message="טוען נתוני מנוי..."
                status="loading"
                size="md"
                theme="neon"
                showParticles={false}
              />
            </div>
          )}

          {/* Error State */}
          {(subscriptionError || claimError) && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium">שגיאה בטעינת נתוני המנוי</p>
                    <p className="text-red-700 text-sm mt-1">
                      {subscriptionError || claimError}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Status & Allowances */}
          {allowanceStatus && !loadingAllowance && !subscriptionLoading && (
            <div className="space-y-4">
              {/* Current Plan */}
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-green-900">
                        {summary?.currentPlan?.name || 'מנוי פעיל'}
                      </CardTitle>
                      <Badge className="bg-green-500 text-white mt-1">
                        <Check className="w-3 h-3 ml-1" />
                        פעיל
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Allowance Status */}
              {product && allowanceStatus.allowances && (
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      סטטוס גבולות המנוי
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {Object.entries(allowanceStatus.allowances).map(([productType, allowance]) => {
                      const isCurrentProduct = productType === product.product_type;

                      return (
                        <div
                          key={productType}
                          className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                            isCurrentProduct
                              ? 'bg-blue-50 border-2 border-blue-200 ring-2 ring-blue-100'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              allowance.unlimited || allowance.remaining > 0
                                ? isCurrentProduct ? 'bg-blue-500' : 'bg-green-500'
                                : 'bg-gray-400'
                            }`}>
                              <Gift className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className={`font-medium ${
                                isCurrentProduct ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {getProductTypeDisplayName(productType)}
                                {isCurrentProduct && (
                                  <Badge className="mr-2 bg-blue-500 text-white text-xs">
                                    המוצר הנוכחי
                                  </Badge>
                                )}
                              </p>
                              <p className={`text-sm ${
                                isCurrentProduct ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                                {allowance.unlimited ? (
                                  <span className="flex items-center gap-1">
                                    <Infinity className="w-3 h-3" />
                                    בלתי מוגבל
                                  </span>
                                ) : (
                                  `${allowance.remaining} מתוך ${allowance.monthly_limit} נותרו`
                                )}
                              </p>
                            </div>
                          </div>

                          {!allowance.unlimited && (
                            <div className="text-left">
                              <div className={`text-sm ${
                                allowance.remaining > 0
                                  ? isCurrentProduct ? 'text-blue-700' : 'text-green-700'
                                  : 'text-red-600'
                              }`}>
                                {allowance.remaining > 0 ? (
                                  <span className="flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    זמין
                                  </span>
                                ) : (
                                  'מוגבל'
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Next Reset Date */}
                    {allowanceStatus.nextReset && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                        <Calendar className="w-4 h-4" />
                        <span>איפוס גבולות חודשיים: {formatResetDate(allowanceStatus.nextReset)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Restriction Warning */}
              {!canClaimProduct() && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <div>
                        <p className="text-orange-800 font-medium">לא ניתן לתבוע</p>
                        <p className="text-orange-700 text-sm mt-1">
                          {getRestrictionMessage()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              ביטול
            </Button>

            <Button
              onClick={handleClaimProduct}
              disabled={loading || !canClaimProduct() || loadingAllowance || subscriptionLoading}
              className={`flex-1 ${
                canClaimProduct()
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  תובע...
                </div>
              ) : canClaimProduct() ? (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  תבע באמצעות המנוי
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  לא זמין לתביעה
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>,
    document.body
  );
}