import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatPriceWithDiscount } from '@/lib/utils';
import { cn } from '@/lib/utils';

/**
 * Unified price display component
 * @param {number} originalPrice - The original price
 * @param {number|null} discount - The discount percentage (0-100) or null for no discount
 * @param {boolean} showDiscount - Whether to show the discount information (default: true)
 * @param {string} className - Additional CSS classes
 * @param {string} size - Size variant: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {string} variant - Style variant: 'badge', 'text', 'gradient' (default: 'badge')
 */
export default function PriceDisplayTag({
  originalPrice,
  discount = null,
  showDiscount = true,
  className = '',
  size = 'md',
  variant = 'badge'
}) {
  const priceInfo = formatPriceWithDiscount(originalPrice, discount);

  // Size classes
  const sizeClasses = {
    sm: {
      text: 'text-sm',
      badge: 'text-xs px-2 py-0.5',
      originalText: 'text-xs',
      discountBadge: 'text-xs px-1.5 py-0.5'
    },
    md: {
      text: 'text-base',
      badge: 'text-sm px-3 py-1',
      originalText: 'text-sm',
      discountBadge: 'text-xs px-2 py-0.5'
    },
    lg: {
      text: 'text-lg',
      badge: 'text-base px-4 py-1.5',
      originalText: 'text-base',
      discountBadge: 'text-sm px-2 py-1'
    },
    xl: {
      text: 'text-2xl',
      badge: 'text-lg px-5 py-2',
      originalText: 'text-lg',
      discountBadge: 'text-base px-3 py-1'
    }
  };

  const sizes = sizeClasses[size] || sizeClasses.md;

  // Free price display
  if (priceInfo.isFree) {
    if (variant === 'badge') {
      return (
        <Badge className={cn(
          'bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full shadow-md',
          sizes.badge,
          className
        )}>
          חינם!
        </Badge>
      );
    }
    if (variant === 'gradient') {
      return (
        <span className={cn(
          'font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent',
          sizes.text,
          className
        )}>
          חינם!
        </span>
      );
    }
    return (
      <span className={cn(
        'font-bold text-green-600',
        sizes.text,
        className
      )}>
        חינם!
      </span>
    );
  }

  // Regular price with optional discount
  if (variant === 'badge') {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        <Badge className={cn(
          'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full shadow-md',
          sizes.badge
        )}>
          ₪{priceInfo.display.replace(' ₪', '')}
        </Badge>
        {priceInfo.isDiscounted && showDiscount && (
          <>
            <span className={cn('text-gray-500 line-through', sizes.originalText)}>
              ₪{priceInfo.originalPrice}
            </span>
            <Badge className={cn(
              'bg-red-100 text-red-700 font-semibold rounded-full',
              sizes.discountBadge
            )}>
              חסכון {priceInfo.discountPercent}%
            </Badge>
          </>
        )}
      </div>
    );
  }

  if (variant === 'gradient') {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        <span className={cn(
          'font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent',
          sizes.text
        )}>
          ₪{priceInfo.display.replace(' ₪', '')}
        </span>
        {priceInfo.isDiscounted && showDiscount && (
          <>
            <span className={cn('text-gray-500 line-through', sizes.originalText)}>
              ₪{priceInfo.originalPrice}
            </span>
            <span className={cn('text-red-600 font-semibold', sizes.discountBadge)}>
              חסכון {priceInfo.discountPercent}%
            </span>
          </>
        )}
      </div>
    );
  }

  // Default text variant
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <span className={cn('font-bold text-blue-600', sizes.text)}>
        ₪{priceInfo.display.replace(' ₪', '')}
      </span>
      {priceInfo.isDiscounted && showDiscount && (
        <>
          <span className={cn('text-gray-500 line-through', sizes.originalText)}>
            ₪{priceInfo.originalPrice}
          </span>
          <span className={cn('text-red-600 font-semibold', sizes.discountBadge)}>
            חסכון {priceInfo.discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}
