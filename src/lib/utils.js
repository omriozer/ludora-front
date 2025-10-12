import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

const ENV = import.meta.env;

export function clog(...args) {
    if (ENV.NODE_ENV !== 'production' || ENV.DEBUG_USER) {
        // eslint-disable-next-line no-console
        console.log(...args);
    }
};

export function cerror(...args) {
    if (ENV.NODE_ENV !== 'production' || ENV.DEBUG_USER) {
        // eslint-disable-next-line no-console
        console.error(...args);
    }
}

/**
 * Formats price with consistent display rules
 * @param {number} price - Current price
 * @param {number|null} originalPrice - Original price (for discount calculation)
 * @param {boolean} wasFree - Whether the item was originally free (true for naturally free items)
 * @returns {object} - Formatted price information
 */
export function formatPrice(price, originalPrice = null, wasFree = false) {
    const numPrice = Number(price) || 0;
    const numOriginalPrice = originalPrice ? Number(originalPrice) : null;

    // If originally free (natural free item) - show "חינמי!"
    if (wasFree || (numPrice === 0 && !numOriginalPrice)) {
        return {
            display: 'חינמי!',
            isFree: true,
            isDiscounted: false,
            discountPercent: 0,
            currency: null,
            formatted: 'חינמי!'
        };
    }

    // If price is 0 because of discount - show "0 ₪"
    if (numPrice === 0 && numOriginalPrice && numOriginalPrice > 0) {
        return {
            display: '0 ₪',
            isFree: false,
            isDiscounted: true,
            discountPercent: 100,
            originalPrice: numOriginalPrice,
            currency: '₪',
            formatted: '0 ₪'
        };
    }

    // Regular price with optional discount
    const isDiscounted = numOriginalPrice && numOriginalPrice > numPrice;
    const discountPercent = isDiscounted ? Math.round(((numOriginalPrice - numPrice) / numOriginalPrice) * 100) : 0;

    return {
        display: `${numPrice} ₪`,
        isFree: false,
        isDiscounted,
        discountPercent,
        originalPrice: numOriginalPrice,
        currency: '₪',
        formatted: `${numPrice} ₪`
    };
}

/**
 * Simple price formatting for basic display
 * @param {number} price - The price to format
 * @param {boolean} wasFree - Whether originally free
 * @returns {string} - Formatted price string
 */
export function formatPriceSimple(price, wasFree = false) {
    return formatPrice(price, null, wasFree).formatted;
}

/**
 * Calculate final price after applying discount percentage
 * @param {number} originalPrice - The original price
 * @param {number|null} discount - The discount percentage (0-100) or null for no discount
 * @returns {number} - The final price after discount
 */
export function calculateFinalPrice(originalPrice, discount = null) {
    const numPrice = parseFloat(originalPrice) || 0;

    if (discount === null || discount === undefined || discount === 0) {
        return numPrice;
    }

    const numDiscount = parseFloat(discount) || 0;
    const discountAmount = (numPrice * numDiscount) / 100;
    const finalPrice = numPrice - discountAmount;

    return Math.max(0, Math.round(finalPrice * 100) / 100); // Round to 2 decimal places
}

/**
 * Format price with discount percentage (alternative to formatPrice)
 * @param {number} originalPrice - The original price
 * @param {number|null} discount - The discount percentage (0-100) or null for no discount
 * @returns {object} - Formatted price information
 */
export function formatPriceWithDiscount(originalPrice, discount = null) {
    const numOriginal = parseFloat(originalPrice) || 0;
    const finalPrice = calculateFinalPrice(numOriginal, discount);
    const hasDiscount = discount !== null && discount !== undefined && discount > 0;

    return formatPrice(finalPrice, hasDiscount ? numOriginal : null, numOriginal === 0 && !hasDiscount);
}
