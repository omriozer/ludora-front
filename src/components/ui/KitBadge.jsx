import React from 'react';
import { Package } from 'lucide-react';
import { isBundle, getBundleItemCount, getBundleCompositionLabel, getBundleComposition } from '@/lib/bundleUtils';

/**
 * KitBadge - Visual indicator for bundle products (קיט)
 *
 * Displays a badge with "קיט" text and composition info.
 * Used across product cards, details pages, and lists.
 *
 * @param {Object} product - Product object (checked with isBundle)
 * @param {string} variant - Display variant: 'default' | 'compact' | 'full'
 *   - default: Standard badge with count
 *   - compact: Icon only, minimal space
 *   - full: Badge with full composition text
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg'
 * @param {string} className - Additional CSS classes
 */
export default function KitBadge({
  product,
  variant = 'default',
  size = 'md',
  className = ''
}) {
  // Only render for bundle products
  if (!isBundle(product)) return null;

  const itemCount = getBundleItemCount(product);
  const composition = getBundleComposition(product);
  const compositionLabel = getBundleCompositionLabel(composition);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'px-1.5 py-0.5 text-xs',
      icon: 'w-3 h-3',
      gap: 'gap-1'
    },
    md: {
      container: 'px-2 py-1 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-1.5'
    },
    lg: {
      container: 'px-3 py-1.5 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2'
    }
  };

  const config = sizeConfig[size];

  // Variant: Compact (icon only)
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center justify-center ${config.container} rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-sm ${className}`}
        title={`קיט עם ${compositionLabel}`}
      >
        <Package className={config.icon} />
      </div>
    );
  }

  // Variant: Full (with composition text)
  if (variant === 'full') {
    return (
      <div
        className={`inline-flex items-center ${config.gap} ${config.container} rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-sm ${className}`}
      >
        <Package className={config.icon} />
        <span className="font-semibold">קיט</span>
        <span className="opacity-90">•</span>
        <span className="text-xs opacity-90">{compositionLabel}</span>
      </div>
    );
  }

  // Variant: Default (קיט with count)
  return (
    <div
      className={`inline-flex items-center ${config.gap} ${config.container} rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-sm ${className}`}
      title={compositionLabel}
    >
      <Package className={config.icon} />
      <span>קיט</span>
      <span className="opacity-90">•</span>
      <span className="font-semibold">{itemCount}</span>
    </div>
  );
}

/**
 * KitLabel - Text-only bundle label for inline display
 *
 * @param {Object} product - Product object
 * @param {boolean} showComposition - Include composition details
 */
export function KitLabel({ product, showComposition = false }) {
  if (!isBundle(product)) return null;

  const itemCount = getBundleItemCount(product);
  const compositionLabel = showComposition ? getBundleCompositionLabel(getBundleComposition(product)) : null;

  return (
    <span className="text-purple-600 font-medium">
      קיט ({itemCount} פריטים)
      {showComposition && compositionLabel && (
        <span className="text-gray-600 text-sm"> - {compositionLabel}</span>
      )}
    </span>
  );
}
