// Central business logic hook for product access and purchase states
import { useMemo, useState, useEffect } from 'react';
import { isBundle, getBundleComposition } from '@/lib/bundleUtils';
import { getProductTypeName as getProductTypeNameFromConfig } from '@/config/productTypes';
import { ludlog, luderror } from '@/lib/ludlog';
import { apiRequest } from '@/services/apiClient';

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
 * Check comprehensive access via backend AccessControlService
 * This checks Purchase records, SubscriptionPurchase records, and creator access
 * @param {string} productType - Product type (file, game, workshop, etc.)
 * @param {string} entityId - Entity ID
 * @returns {Promise<Object>} Access check result with hasAccess, accessType, reason
 */
const checkBackendAccess = async (productType, entityId) => {
  try {
      productType,
      entityId
    });

    const accessResult = await apiRequest(
      `/access/check/${productType}/${entityId}`,
      { suppressUserErrors: true }
    );

      hasAccess: accessResult.hasAccess,
      accessType: accessResult.accessType,
      reason: accessResult.reason
    });

    return accessResult;
  } catch (error) {

    // If 401/403, user doesn't have access - return no access
    if (error.statusCode === 401 || error.statusCode === 403) {
      return { hasAccess: false, accessType: 'none', reason: 'authentication_required' };
    }

    // For other errors, return error state
    return { hasAccess: false, accessType: 'error', reason: error.message };
  }
};

/**
 * Check if user has subscription benefits for a product (supports both single products and bundles)
 * @param {Object} product - Product object
 * @param {Object} allowanceData - User's subscription allowances data
 * @returns {boolean} Whether user can claim this product via subscription
 */
export const checkSubscriptionEligibility = (product, allowanceData) => {
    productId: product?.id,
    productType: product?.product_type,
    hasProduct: !!product,
    hasAllowanceData: !!allowanceData,
    hasAllowances: !!allowanceData?.allowances,
    allowanceData: allowanceData,
    allowanceStructure: allowanceData ? Object.keys(allowanceData) : null
  });

  if (!product || !allowanceData?.allowances) {
    ludlog.ui('checkSubscriptionEligibility: Early return false', {
      reason: !product ? 'no product' : 'no allowanceData.allowances',
      hasProduct: !!product,
      hasAllowanceData: !!allowanceData,
      hasAllowances: !!allowanceData?.allowances
    });
    return false;
  }

  // Handle bundle products - check if user has enough allowances for ALL products in bundle
  if (isBundle(product)) {
    const bundleItems = product.type_attributes?.bundle_items;
    if (!bundleItems || !Array.isArray(bundleItems)) {
      return false;
    }

    // Group bundle items by product type to count required allowances
    const requiredAllowances = {};
    bundleItems.forEach(item => {
      const productType = item.product_type;
      requiredAllowances[productType] = (requiredAllowances[productType] || 0) + 1;
    });

    // Check if user has enough allowances for each product type in the bundle
    for (const [productType, requiredCount] of Object.entries(requiredAllowances)) {
      const allowance = allowanceData.allowances[productType];

      if (!allowance) {
        return false; // No subscription benefit for this product type
      }

      if (allowance.unlimited) {
        continue; // Unlimited allowance for this type, OK
      }

      if (!allowance.remaining || allowance.remaining < requiredCount) {
        return false; // Not enough remaining allowances for this product type
      }
    }

    return true; // Has enough allowances for all product types in bundle
  }

  // Handle single products
  const productType = product.product_type;
  const allowance = allowanceData.allowances[productType];

    productType: productType,
    availableAllowanceTypes: Object.keys(allowanceData.allowances),
    allowance: allowance,
    hasAllowance: !!allowance,
    isUnlimited: allowance?.unlimited,
    remaining: allowance?.remaining
  });

  if (!allowance) {
    ludlog.ui('checkSubscriptionEligibility: No allowance for product type', {
      productType: productType,
      availableTypes: Object.keys(allowanceData.allowances)
    });
    return false; // No subscription benefit for this product type
  }

  if (allowance.unlimited) {
    ludlog.ui('checkSubscriptionEligibility: Unlimited allowance - returning true');
    return true; // Unlimited allowance
  }

  const hasRemaining = allowance.remaining > 0;
  ludlog.ui('checkSubscriptionEligibility: Final check', {
    remaining: allowance.remaining,
    hasRemaining: hasRemaining
  });

  return hasRemaining; // Has remaining allowances
};

/**
 * Hook to determine product access state and available actions
 * Enhanced to check backend AccessControlService for subscription claims
 * @param {Object} product - Product object with embedded purchase data OR product object
 * @param {Array} userPurchases - Array of user purchases (optional, for ProductGrid style)
 * @param {boolean} checkBackend - Whether to check backend for comprehensive access (default: true)
 * @returns {Object} Product access state and available actions
 */
export const useProductAccess = (product, userPurchases = [], checkBackend = true) => {
  const [backendAccessState, setBackendAccessState] = useState(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);

  // Check backend access when product changes (for subscription claims)
  useEffect(() => {
    const performBackendCheck = async () => {
      // Skip if no product, no entity_id, or backend check disabled
      if (!product || !product.entity_id || !checkBackend) {
        setBackendAccessState(null);
        return;
      }

      const productType = product.product_type || 'file';

        productId: product.id,
        productType,
        entityId: product.entity_id
      });

      setIsCheckingBackend(true);
      const accessResult = await checkBackendAccess(productType, product.entity_id);
      setBackendAccessState(accessResult);
      setIsCheckingBackend(false);

        hasAccess: accessResult.hasAccess,
        accessType: accessResult.accessType
      });
    };

    performBackendCheck();
  }, [product?.id, product?.entity_id, checkBackend]);

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
        purchase: null,
        accessType: null,
        isCheckingAccess: false
      };
    }

    // Use centralized purchase finding logic
    const purchase = findUserPurchaseForProduct(product, userPurchases);

    const productType = product.product_type || 'file';
    const isFree = !product.price || product.price === 0 || product.price === "0";

    // Determine access state - ENHANCED with backend check
    const isSuccessfullyPaid = purchase && (purchase.payment_status === 'paid' || purchase.payment_status === 'completed');
    const hasLocalAccess = isSuccessfullyPaid &&
                     (!purchase.access_expires_at || // null = lifetime access
                      (purchase.access_expires_at && new Date(purchase.access_expires_at) > new Date()));

    // CRITICAL: Check backend access (includes subscription claims)
    const hasBackendAccess = backendAccessState?.hasAccess || false;
    const hasAccess = hasLocalAccess || hasBackendAccess;
    const accessType = backendAccessState?.accessType || (hasLocalAccess ? 'purchase' : 'none');

    // Determine cart/purchase state
    const isInCart = purchase && purchase.payment_status === 'cart';
    const isPurchased = isSuccessfullyPaid;

    // Determine what actions are available
    const hasPurchaseRecord = !!purchase; // ANY purchase record exists
    const canAddToCart = !isFree && !hasPurchaseRecord; // No add to cart if ANY purchase exists
    const canPurchase = !hasAccess && !isPurchased;

      hasLocalAccess,
      hasBackendAccess,
      hasAccess,
      accessType,
      isCheckingBackend
    });

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
      purchase,
      accessType, // NEW: Type of access (creator, purchase, subscription_claim)
      isCheckingAccess: isCheckingBackend // NEW: Loading state for backend check
    };
  }, [product, userPurchases, backendAccessState, isCheckingBackend]);
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
 * @param {string} action - Action type (free, buy, checkout, claim)
 * @param {string} productType - Product type for context
 * @param {Object} product - Full product object (needed for bundle composition)
 * @param {boolean} hasSubscriptionBenefits - Whether user can claim via subscription
 * @returns {string} Localized text
 */
export const getPurchaseActionText = (action, productType, product = null, hasSubscriptionBenefits = false) => {
  switch (action) {
    case 'free':
      return 'הוספה לספרייה'; // Universal text for all free products
    case 'claim':
      // Subscription claim text
      if (product && isBundle(product)) {
        const bundleComposition = getBundleComposition(product);
        const compositionTypes = Object.keys(bundleComposition);

        if (compositionTypes.length === 1) {
          const compositionType = compositionTypes[0];
          const pluralName = getProductTypeNameFromConfig(compositionType, 'plural');
          return `קבלת קיט ${pluralName}`;
        } else {
          return 'קבלת קיט';
        }
      }
      return `קבלת ${getProductTypeName(productType, product)}`;
    case 'buy':
      // Check if user has subscription benefits for this product
      if (hasSubscriptionBenefits) {
        if (product && isBundle(product)) {
          const bundleComposition = getBundleComposition(product);
          const compositionTypes = Object.keys(bundleComposition);

          if (compositionTypes.length === 1) {
            const compositionType = compositionTypes[0];
            const pluralName = getProductTypeNameFromConfig(compositionType, 'plural');
            return `קבלת קיט ${pluralName}`;
          } else {
            return 'קבלת קיט';
          }
        }
        return `קבלת ${getProductTypeName(productType, product)}`;
      }

      // Regular purchase text
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