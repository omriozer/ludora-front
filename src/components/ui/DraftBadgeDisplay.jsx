import React from 'react';
import { Crown } from 'lucide-react';
import { isDraft } from '@/lib/productAccessUtils';
import { isAdmin } from '@/lib/userUtils';

/**
 * DraftBadgeDisplay - Visual indicator for draft (unpublished) products
 *
 * Displays an orange badge with "טיוטה" text and crown icon.
 * Only visible to admin users when viewing unpublished products.
 * Used across product cards, details pages, and lists.
 *
 * @param {Object} product - Product object (checked with isDraft)
 * @param {Object} user - Current user object (checked with isAdmin)
 * @param {string} variant - Display variant: 'default' | 'compact' | 'full'
 *   - default: Standard badge with text and icon
 *   - compact: Icon only, minimal space
 *   - full: Badge with explanatory text
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg'
 * @param {string} className - Additional CSS classes
 */
export default function DraftBadgeDisplay({
  product,
  user,
  variant = 'default',
  size = 'md',
  className = ''
}) {
  // Only show for draft products when user is admin
  if (!isDraft(product) || !isAdmin(user)) return null;

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

  // Variant: Compact (crown icon only)
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center justify-center ${config.container} rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium shadow-sm ${className}`}
        title="טיוטה - גלוי למנהלים בלבד"
      >
        <Crown className={config.icon} />
      </div>
    );
  }

  // Variant: Full (with explanatory text)
  if (variant === 'full') {
    return (
      <div
        className={`inline-flex items-center ${config.gap} ${config.container} rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium shadow-sm ${className}`}
      >
        <Crown className={config.icon} />
        <span className="font-semibold">טיוטה</span>
        <span className="opacity-90">•</span>
        <span className="text-xs opacity-90">גלוי למנהלים</span>
      </div>
    );
  }

  // Variant: Default (טיוטה with crown icon)
  return (
    <div
      className={`inline-flex items-center ${config.gap} ${config.container} rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium shadow-sm ${className}`}
      title="טיוטה - גלוי למנהלים בלבד"
    >
      <Crown className={config.icon} />
      <span>טיוטה</span>
    </div>
  );
}

/**
 * DraftLabel - Text-only draft label for inline display
 *
 * @param {Object} product - Product object
 * @param {Object} user - Current user object
 * @param {boolean} showExplanation - Include explanation text
 */
export function DraftLabel({ product, user, showExplanation = false }) {
  if (!isDraft(product) || !isAdmin(user)) return null;

  return (
    <span className="text-orange-600 font-medium">
      טיוטה
      {showExplanation && (
        <span className="text-gray-600 text-sm"> - גלוי למנהלים בלבד</span>
      )}
    </span>
  );
}