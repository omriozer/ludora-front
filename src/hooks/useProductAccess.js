// Central business logic hook for product access and purchase states
import { useMemo } from 'react';
import { isBundle, getBundleComposition } from '@/lib/bundleUtils';
import { getProductTypeName as getProductTypeNameFromConfig } from '@/config/productTypes';

/**
 * Centralized function to find user purchase for a product
 * Handles both embedded purchase data and purchase arrays with polymorphic ID matching
 * @param {Object} product - Product object
 * @param {Array} userPurchases - Array of user purchases (optional)
 * @returns {Object|null} Found purchase or null
 */
const findUserPurchaseForProduct = (product, userPurchases = []) => {
  if (!product) return null;

  // 1. Check embedded purchase first (ProductDetails style)
  if (product.purchase) {
    return product.purchase;
  }

  // 2. Search in userPurchases array (ProductGrid style)
  if (!userPurchases || userPurchases.length === 0) {
    return null;
  }

  const productId = product.id;
  const entityId = product.entity_id;

  const foundPurchase = userPurchases.find(purchase => {
    // Use polymorphic structure: purchasable_id (new) or product_id (legacy)
    const purchaseEntityId = purchase.purchasable_id || purchase.product_id;
    // Handle 'paid', 'completed', and 'cart' statuses
    const isRelevant = ['paid', 'completed', 'cart', 'pending'].includes(purchase.payment_status);

    // For polymorphic associations (tools, games, etc.), match against entity_id
    // For legacy products, match against product ID
    // CRITICAL: Add null safety - don't match when both entityId and purchaseEntityId are null
    const matchesProductId = purchaseEntityId === productId;
    const matchesEntityId = entityId !== null && purchaseEntityId === entityId;
    const matches = (matchesProductId || matchesEntityId) && isRelevant;


    return matches;
  });

  return foundPurchase;
};

/**
 * Hook to determine product access state and available actions
 * @param {Object} product - Product object with embedded purchase data OR product object
 * @param {Array} userPurchases - Array of user purchases (optional, for ProductGrid style)
 * @returns {Object} Product access state and available actions
 */
export const useProductAccess = (product, userPurchases = []) => {
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
        productType: null,
        purchase: null
      };
    }

    // Use centralized purchase finding logic
    const purchase = findUserPurchaseForProduct(product, userPurchases);

    const productType = product.product_type || 'file';
    const isFree = !product.price || product.price === 0 || product.price === "0";

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
  }, [product, userPurchases]);
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
 * @param {Object} product - Full product object (needed for bundle composition)
 * @returns {string} Localized text
 */
export const getPurchaseActionText = (action, productType, product = null) => {
  switch (action) {
    case 'free':
      return 'הוספה לספרייה'; // Universal text for all free products
    case 'buy':
      // Check if it's a bundle product and generate appropriate text
      if (product && isBundle(product)) {
        const bundleComposition = getBundleComposition(product);
        const compositionTypes = Object.keys(bundleComposition);

        if (compositionTypes.length === 1) {
          // Single type bundle - show "רכוש קיט קבצים", "רכוש קיט מערכי שיעור", etc.
          const compositionType = compositionTypes[0];
          const pluralName = getProductTypeNameFromConfig(compositionType, 'plural');
          return `רכוש קיט ${pluralName}`;
        } else {
          // Mixed bundle - just show "רכוש קיט"
          return 'רכוש קיט';
        }
      }
      return `רכוש ${getProductTypeName(productType, product)}`;
    case 'checkout':
      return 'בעגלה - לתשלום';
    default:
      return 'רכישה';
  }
};

/**
 * Helper function to get product type name in Hebrew
 * @param {string} productType - Product type
 * @param {Object} product - Full product object (needed for bundle composition)
 * @returns {string} Hebrew product name
 */
const getProductTypeName = (productType, product = null) => {
  // Handle bundles specially - show bundle + composition type in plural
  if (productType === 'bundle' && product && isBundle(product)) {
    const bundleComposition = getBundleComposition(product);
    const compositionTypes = Object.keys(bundleComposition);

    if (compositionTypes.length === 1) {
      // Single type bundle - show "קיט קבצים", "קיט משחקים", etc.
      const compositionType = compositionTypes[0];
      const pluralName = getProductTypeNameFromConfig(compositionType, 'plural');
      return `קיט ${pluralName}`;
    } else {
      // Mixed bundle - just show "קיט"
      return 'קיט';
    }
  }

  // Use the centralized product type names from config (singular form)
  return getProductTypeNameFromConfig(productType, 'singular') || 'מוצר';
};