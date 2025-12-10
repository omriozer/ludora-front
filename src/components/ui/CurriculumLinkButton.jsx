import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { isAdmin } from '@/lib/userUtils';
import { useUser } from '@/contexts/UserContext';
import { isBundle } from '@/lib/bundleUtils';
import { ludlog } from '@/lib/ludlog';
import CurriculumLinkingModal from '@/components/CurriculumLinkingModal';

/**
 * CurriculumLinkButton - Reusable curriculum linking button component
 *
 * Shows a curriculum linking button for supported product types when user is admin.
 * Handles the modal state internally and provides callbacks for parent components.
 */
export default function CurriculumLinkButton({
  product,
  variant = 'default', // 'default' for ProductCard, 'table' for products table
  onLinksUpdated,
  className = '',
  size = 'sm',
  showText = false,
  ...buttonProps
}) {
  const { currentUser } = useUser();
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);

  // Check if curriculum linking is supported for this product type
  const supportsCurriculumLinking = () => {
    const supportedTypes = ['file', 'game', 'lesson_plan'];

    if (isBundle(product)) {
      // For bundles, check if any items support curriculum linking
      const bundleItems = product.type_attributes?.bundle_items || [];
      return bundleItems.some((item) => supportedTypes.includes(item.product_type));
    }

    return supportedTypes.includes(product.product_type);
  };

  // Only show for admin users and supported product types
  if (!isAdmin(currentUser) || !supportsCurriculumLinking()) {
    return null;
  }

  const handleCurriculumLink = (e) => {
    e.stopPropagation();
    e.preventDefault();

    ludlog.ui('Opening curriculum linking modal', {
      productId: product.id,
      productType: product.product_type
    });

    setShowCurriculumModal(true);
  };

  const handleCurriculumLinksUpdated = () => {
    ludlog.ui('Curriculum links updated for product', {
      productId: product.id,
      productType: product.product_type
    });

    // Call parent callback if provided
    if (onLinksUpdated) {
      onLinksUpdated();
    }
  };

  const handleModalClose = () => {
    setShowCurriculumModal(false);
  };

  // Get button styling based on variant
  const getButtonStyle = () => {
    switch (variant) {
      case 'table':
        return 'bg-green-500 hover:bg-green-600 text-white border-0';
      case 'default':
      default:
        return 'bg-green-500/95 backdrop-blur-sm text-white hover:bg-green-600 rounded-full shadow-lg transition-all duration-300';
    }
  };

  return (
    <>
      <Button
        variant={variant === 'table' ? 'default' : 'ghost'}
        size={size}
        onClick={handleCurriculumLink}
        className={`${getButtonStyle()} ${className}`}
        title="קישור לתכניות לימודים"
        {...buttonProps}
      >
        <BookOpen className="w-4 h-4" />
        {showText && <span className="mr-2">קישור לתכניות לימודים</span>}
      </Button>

      {/* Curriculum Linking Modal */}
      {showCurriculumModal && (
        <CurriculumLinkingModal
          isOpen={showCurriculumModal}
          onClose={handleModalClose}
          product={product}
          onLinksUpdated={handleCurriculumLinksUpdated}
        />
      )}
    </>
  );
}