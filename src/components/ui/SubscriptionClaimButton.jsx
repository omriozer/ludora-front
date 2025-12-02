import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubscriptionClaimModal from "@/components/subscription/SubscriptionClaimModal";
import { useUser } from "@/contexts/UserContext";
import { useAccessState } from '@/contexts/AccessStateContext';
import { ludlog } from '@/lib/ludlog';
import { isBundle } from '@/lib/bundleUtils';
import {
  Crown,
  Star,
  Infinity,
  Clock,
  Zap,
  CheckCircle,
  Package
} from "lucide-react";

/**
 * Subscription Claim Button - Shows claim via subscription option when eligible
 * Uses server-provided access information instead of client-side eligibility checking
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
  const { getProduct, claimProduct } = useAccessState();

  const [showClaimModal, setShowClaimModal] = useState(false);

  // Get product with embedded access information from AccessStateContext
  const productWithAccess = getProduct(product.id) || product;
  const access = productWithAccess.access || {};

  /**
   * Handle successful claim
   */
  const handleClaimSuccess = async (claimResult) => {
    ludlog.ui('Product claimed successfully via subscription', claimResult);

    if (onClaimSuccess) {
      onClaimSuccess(claimResult);
    }

    // Close modal - the AccessStateContext will handle updating the state
    setShowClaimModal(false);
  };

  /**
   * Handle claim button click
   */
  const handleClaimClick = async () => {
    try {
      setShowClaimModal(true);
    } catch (error) {
      ludlog.ui('Error opening claim modal:', error);
    }
  };

  /**
   * Get button text based on server-provided access info
   */
  const getButtonText = () => {
    if (isBundle(product)) {
      if (variant === 'compact') {
        return 'תבע קיט';
      }
      return 'תבע קיט באמצעות מנוי';
    }

    const remaining = access.remainingAllowances;
    if (access.allowanceType?.isLimited === false) {
      return variant === 'compact' ? 'תבע' : 'תבע באמצעות מנוי פרימיום';
    }

    if (variant === 'compact') {
      return `תבע (${remaining || 0} נותרו)`;
    }

    return remaining === 1
      ? 'תבע באמצעות מנוי (נותר 1)'
      : `תבע באמצעות מנוי (${remaining || 0} נותרו)`;
  };

  /**
   * Get icon based on access info
   */
  const getIcon = () => {
    if (isBundle(product)) {
      return Package;
    }

    if (access.allowanceType?.isLimited === false) {
      return Star;
    }

    return (access.remainingAllowances || 0) > 0 ? Crown : Clock;
  };

  /**
   * Get button styling based on variant and allowance status
   */
  const getButtonStyling = () => {
    if (!access.canClaim) {
      return 'bg-gray-300 hover:bg-gray-400 text-gray-600 cursor-not-allowed';
    }

    // Handle bundle products - use purple-indigo gradient for bundles
    if (isBundle(product)) {
      return variant === 'secondary'
        ? 'bg-gradient-to-r from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200 text-purple-700 border border-purple-300'
        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl';
    }

    // Handle products with unlimited allowance
    if (access.allowanceType?.isLimited === false) {
      return variant === 'secondary'
        ? 'bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 border border-purple-300'
        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl';
    }

    // Handle products with limited allowance
    const remaining = access.remainingAllowances || 0;
    if (remaining <= 1) {
      return variant === 'secondary'
        ? 'bg-gradient-to-r from-orange-100 to-red-100 hover:from-orange-200 hover:to-red-200 text-orange-700 border border-orange-300'
        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl';
    }

    return variant === 'secondary'
      ? 'bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-300'
      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl';
  };

  // Don't show button if user can't claim via subscription
  if (!access.canClaim) {
    return null;
  }

  const IconComponent = getIcon();

  return (
    <>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleClaimClick();
        }}
        disabled={!access.canClaim}
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
          {access.allowanceType?.isLimited === false && (
            <Badge className="bg-white/20 text-current text-xs">
              <Infinity className="w-3 h-3 ml-1" />
              פרימיום
            </Badge>
          )}
        </span>

        {/* Animated background effect */}
        {access.canClaim && (
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