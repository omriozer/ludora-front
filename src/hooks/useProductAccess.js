// Central business logic hook for product access and purchase states
import { useMemo } from 'react';
import { hasActiveAccess } from '@/components/files/fileAccessUtils';

/**
 * Hook to determine product access state and available actions
 * @param {Object} product - Product object with purchase data
 * @returns {Object} Product access state and available actions
 */
export const useProductAccess = (product) => {
  return useMemo(() => {
    if (!product) {
      return {
        hasAccess: false,
        isInCart: false,
        isPurchased: false,
        canAddToCart: false,
        canPurchase: false,
        accessAction: null,
        purchaseAction: null,
        productType: null
      };
    }

    const purchase = product.purchase;
    const productType = product.product_type || 'file';
    const isFree = !product.price || product.price === 0;

    // Determine access state (handle both 'paid' and 'completed' like PurchaseHistory)
    const isSuccessfullyPaid = purchase && (purchase.payment_status === 'paid' || purchase.payment_status === 'completed');
    const hasAccess = isSuccessfullyPaid &&
                     (!purchase.access_expires_at || // null = lifetime access
                      (purchase.access_expires_at && new Date(purchase.access_expires_at) > new Date()));

    // Determine cart/purchase state
    const isInCart = purchase && purchase.payment_status === 'cart';
    const isPurchased = isSuccessfullyPaid;

    // Determine what actions are available
    const hasPurchaseRecord = !!purchase; // ANY purchase record exists
    const canAddToCart = !isFree && !hasPurchaseRecord; // No add to cart if ANY purchase exists
    const canPurchase = !hasAccess && !isPurchased;

    // Determine access action based on product type
    let accessAction = null;
    if (hasAccess) {
      switch (productType) {
        case 'file':
          accessAction = 'view'; // צפיה בקובץ
          break;
        case 'course':
          accessAction = 'start'; // התחל קורס / המשך קורס
          break;
        case 'workshop':
          accessAction = 'join'; // הצטרף לסדנה / צפה בהקלטה
          break;
        case 'tool':
          accessAction = 'use'; // השתמש בכלי
          break;
        case 'game':
          accessAction = 'play'; // שחק במשחק
          break;
        default:
          accessAction = 'access';
      }
    }

    // Determine purchase action
    let purchaseAction = null;
    if (canPurchase) {
      if (isFree) {
        purchaseAction = 'free';
      } else if (isInCart) {
        purchaseAction = 'checkout';
      } else {
        purchaseAction = 'buy';
      }
    }

    return {
      hasAccess,
      isInCart,
      isPurchased,
      canAddToCart,
      canPurchase,
      isFree,
      accessAction,
      purchaseAction,
      productType,
      purchase
    };
  }, [product]);
};

/**
 * Get localized text for access actions
 * @param {string} action - Action type (view, start, join, use, play)
 * @param {string} productType - Product type for context
 * @returns {string} Localized text
 */
export const getAccessActionText = (action, productType) => {
  switch (action) {
    case 'view':
      return 'צפיה בקובץ';
    case 'start':
      return 'התחל קורס';
    case 'continue':
      return 'המשך קורס';
    case 'join':
      return 'הצטרף לסדנה';
    case 'watch':
      return 'צפה בהקלטה';
    case 'use':
      return 'השתמש בכלי';
    case 'play':
      return 'שחק במשחק';
    default:
      return 'גישה למוצר';
  }
};

/**
 * Get localized text for purchase actions
 * @param {string} action - Action type (free, buy, checkout)
 * @param {string} productType - Product type for context
 * @returns {string} Localized text
 */
export const getPurchaseActionText = (action, productType) => {
  switch (action) {
    case 'free':
      return `קבל ${getProductTypeName(productType)}`;
    case 'buy':
      return `רכוש ${getProductTypeName(productType)}`;
    case 'checkout':
      return 'בעגלה - לתשלום';
    default:
      return 'רכישה';
  }
};

/**
 * Helper function to get product type name in Hebrew
 * @param {string} productType - Product type
 * @returns {string} Hebrew product name
 */
const getProductTypeName = (productType) => {
  switch (productType) {
    case 'file':
      return 'קובץ';
    case 'course':
      return 'קורס';
    case 'workshop':
      return 'סדנה';
    case 'tool':
      return 'כלי';
    case 'game':
      return 'משחק';
    default:
      return 'מוצר';
  }
};