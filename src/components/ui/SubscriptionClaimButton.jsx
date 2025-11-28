import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubscriptionClaimModal from "@/components/subscription/SubscriptionClaimModal";
import useSubscriptionState from "@/hooks/useSubscriptionState";
import { useUser } from "@/contexts/UserContext";
import { ludlog, luderror } from '@/lib/ludlog';
import {
  Crown,
  Star,
  Infinity,
  Clock,
  Zap,
  CheckCircle
} from "lucide-react";

/**
 * Subscription Claim Button - Shows claim via subscription option when eligible
 * Integrates with the subscription allowance system and shows confirmation modal
 */
export default function SubscriptionClaimButton({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  onClaimSuccess,
  variant = 'default' // 'default', 'secondary', 'compact'
}) {
  const { currentUser } = useUser();
  const { summary, loading: subscriptionLoading } = useSubscriptionState(currentUser);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [allowanceInfo, setAllowanceInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check eligibility when component mounts or dependencies change
  useEffect(() => {
    if (currentUser && product && summary?.currentPlan) {
      checkEligibility();
    } else {
      setIsEligible(false);
    }
  }, [currentUser, product, summary]);

  /**
   * Check if user is eligible to claim this product via subscription
   */
  const checkEligibility = async () => {
    try {
      setLoading(true);

      ludlog.ui('Checking subscription claim eligibility', {
        userId: currentUser.id,
        productType: product.product_type,
        productId: product.id
      });

      // Check if user has active subscription
      if (!summary?.currentPlan || !summary?.isActive) {
        setIsEligible(false);
        return;
      }

      // Get current allowance status
      const response = await fetch('/api/subscriptions/benefits/my-allowances', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        ludlog.ui('Failed to fetch allowances, assuming not eligible');
        setIsEligible(false);
        return;
      }

      const allowanceData = await response.json();
      const productTypeAllowance = allowanceData.allowances?.[product.product_type];

      if (!productTypeAllowance) {
        setIsEligible(false);
        return;
      }

      // Check if user can claim (unlimited or has remaining claims)
      const canClaim = productTypeAllowance.unlimited || (productTypeAllowance.remaining > 0);

      setIsEligible(canClaim);
      setAllowanceInfo(productTypeAllowance);

      ludlog.ui('Subscription eligibility check completed', {
        eligible: canClaim,
        allowance: productTypeAllowance
      });

    } catch (error) {
      luderror.ui('Error checking subscription eligibility:', error);
      setIsEligible(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle successful claim
   */
  const handleClaimSuccess = (claimResult) => {
    ludlog.ui('Product claimed successfully via subscription', claimResult);

    if (onClaimSuccess) {
      onClaimSuccess(claimResult);
    }

    // Refresh eligibility status
    checkEligibility();
  };

  /**
   * Get button text based on allowance status
   */
  const getButtonText = () => {
    if (loading || subscriptionLoading) {
      return 'בדיקה...';
    }

    if (!allowanceInfo) {
      return 'תבע עם המנוי';
    }

    if (allowanceInfo.unlimited) {
      return variant === 'compact' ? 'תבע' : 'תבע באמצעות מנוי פרימיום';
    }

    const remaining = allowanceInfo.remaining;
    if (variant === 'compact') {
      return `תבע (${remaining} נותרו)`;
    }

    return remaining === 1
      ? 'תבע באמצעות מנוי (נותר 1)'
      : `תבע באמצעות מנוי (${remaining} נותרו)`;
  };

  /**
   * Get icon based on allowance status
   */
  const getIcon = () => {
    if (loading || subscriptionLoading) {
      return Clock;
    }

    if (!allowanceInfo) {
      return Crown;
    }

    if (allowanceInfo.unlimited) {
      return Star;
    }

    return allowanceInfo.remaining > 0 ? Crown : Clock;
  };

  /**
   * Get button styling based on variant and allowance status
   */
  const getButtonStyling = () => {
    if (!isEligible || loading) {
      return 'bg-gray-300 hover:bg-gray-400 text-gray-600 cursor-not-allowed';
    }

    if (allowanceInfo?.unlimited) {
      return variant === 'secondary'
        ? 'bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 border border-purple-300'
        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl';
    }

    const remaining = allowanceInfo?.remaining || 0;
    if (remaining <= 1) {
      return variant === 'secondary'
        ? 'bg-gradient-to-r from-orange-100 to-red-100 hover:from-orange-200 hover:to-red-200 text-orange-700 border border-orange-300'
        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl';
    }

    return variant === 'secondary'
      ? 'bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-300'
      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl';
  };

  // Don't show button if not eligible
  if (!isEligible && !loading) {
    return null;
  }

  const IconComponent = getIcon();

  return (
    <>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          if (isEligible && !loading) {
            setShowClaimModal(true);
          }
        }}
        disabled={!isEligible || loading || subscriptionLoading}
        className={`
          group relative overflow-hidden font-medium rounded-lg
          transform hover:scale-105 transition-all duration-300
          ${getButtonStyling()}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        size={size}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <IconComponent className={`${
            size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
          }`} />
          <span>{getButtonText()}</span>
          {allowanceInfo?.unlimited && (
            <Badge className="bg-white/20 text-current text-xs">
              <Infinity className="w-3 h-3 ml-1" />
              פרימיום
            </Badge>
          )}
        </span>

        {/* Animated background effect */}
        {isEligible && !loading && (
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        )}
      </Button>

      {/* Claim Modal */}
      <SubscriptionClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        currentUser={currentUser}
        product={product}
        onClaimSuccess={handleClaimSuccess}
      />
    </>
  );
}