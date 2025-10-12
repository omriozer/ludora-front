// Purchase operation helpers
// Reusable functions for purchase creation and management

import { apiRequest } from '@/services/apiClient';
import { showInfo, showSuccess, showError } from '@/utils/messaging';
import { clog, cerror } from '@/lib/utils';
import { Product } from '@/services/entities';

/**
 * Get user ID from JWT token
 * @returns {string|null} User ID or null if not authenticated
 */
export function getUserIdFromToken() {
  try {
    // Use standardized 'token' key (legacy 'authToken' support removed)
    const authToken = localStorage.getItem('token');
    if (!authToken) return null;

    const payload = JSON.parse(atob(authToken.split('.')[1]));
    return payload.uid;
  } catch (error) {
    cerror('Error decoding auth token:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} Authentication status
 */
export function isAuthenticated() {
  // Use standardized 'token' key (legacy 'authToken' support removed)
  const authToken = localStorage.getItem('token');
  return !!authToken && !!getUserIdFromToken();
}

/**
 * Find Product record for an entity (handles polymorphic structure)
 * @param {string} entityType - Type of entity (file, workshop, course, tool, game)
 * @param {string} entityId - ID of the entity
 * @returns {Promise<object|null>} Product record or null if not found
 */
export async function findProductForEntity(entityType, entityId) {
  try {
    const products = await Product.filter({
      product_type: entityType,
      entity_id: entityId
    });

    return products && products.length > 0 ? products[0] : null;
  } catch (error) {
    cerror(`Error finding Product for ${entityType}:${entityId}:`, error);
    return null;
  }
}

/**
 * Create a pending purchase record (with duplicate prevention)
 * @param {object} params - Purchase parameters
 * @param {string} params.entityType - Type of entity being purchased
 * @param {string} params.entityId - ID of the entity being purchased
 * @param {number} params.price - Price amount
 * @param {string} params.userId - ID of the purchasing user
 * @param {object} params.metadata - Additional metadata
 * @returns {Promise<object>} Created or existing purchase record
 */
export async function createPendingPurchase({
  entityType,
  entityId,
  price,
  userId,
  metadata = {}
}) {
  try {
    clog('Creating pending purchase:', { entityType, entityId, price, userId });

    // Check if payment is currently in progress for this product
    const paymentInProgress = await isPaymentInProgress(userId, entityType, entityId);
    if (paymentInProgress) {
      throw new Error('תשלום עבור המוצר הזה כבר בתהליך. אנא המתן לסיום התשלום או נסה שוב מאוחר יותר.');
    }

    // Check if user already has any non-refunded purchase for this product
    const existingPurchases = await getAllNonRefundedPurchases(userId);
    const existingPurchase = existingPurchases.find(p =>
      p.purchasable_type === entityType && p.purchasable_id === entityId
    );

    if (existingPurchase) {
      clog('Found existing non-refunded purchase for this product:', existingPurchase);
      throw new Error(`כבר יש לך רכישה עבור המוצר הזה. סטטוס: ${existingPurchase.payment_status}. לא ניתן לרכוש מוצר כפול אלא אם הרכישה הקודמת הוחזרה.`);
    }

    const purchaseData = {
      buyer_user_id: userId,
      purchasable_type: entityType,
      purchasable_id: entityId,
      payment_amount: price,
      original_price: price,
      discount_amount: 0,
      payment_status: 'cart',
      metadata: {
        created_via: 'add_to_cart',
        ...metadata
      }
    };

    const purchase = await apiRequest('/entities/purchase', {
      method: 'POST',
      body: JSON.stringify(purchaseData)
    });

    clog('Pending purchase created successfully:', purchase);
    return purchase;

  } catch (error) {
    cerror('Error creating pending purchase:', error);
    throw error;
  }
}

/**
 * Create a completed purchase for free items
 * @param {object} params - Purchase parameters (same as createPendingPurchase)
 * @returns {Promise<object>} Created purchase record
 */
export async function createFreePurchase(params) {
  try {
    clog('Creating free purchase:', params);

    const purchaseData = {
      buyer_user_id: params.userId,
      purchasable_type: params.entityType,
      purchasable_id: params.entityId,
      payment_amount: 0,
      original_price: params.price || 0,
      discount_amount: 0,
      payment_status: 'completed',
      payment_method: 'free',
      metadata: {
        created_via: 'free_access',
        ...params.metadata
      }
    };

    const purchase = await apiRequest('/entities/purchase', {
      method: 'POST',
      body: JSON.stringify(purchaseData)
    });

    clog('Free purchase created successfully:', purchase);
    return purchase;

  } catch (error) {
    cerror('Error creating free purchase:', error);
    throw error;
  }
}

/**
 * Get all cart purchases for a user (only 'cart' status - items added to cart but not yet in checkout)
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of cart purchase records
 */
export async function getCartPurchases(userId) {
  try {
    // Import Purchase here to avoid circular dependency
    const { Purchase } = await import('@/services/entities');

    const purchases = await Purchase.filter({
      buyer_user_id: userId,
      payment_status: 'cart' // Only cart items, not pending payment processing
    });

    clog(`Found ${purchases.length} cart purchases for user ${userId}`);
    return purchases || [];

  } catch (error) {
    cerror('Error getting cart purchases:', error);
    return [];
  }
}

/**
 * Get all pending purchases for a user (legacy function for backward compatibility)
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of pending purchase records
 */
export async function getPendingPurchases(userId) {
  try {
    // Import Purchase here to avoid circular dependency
    const { Purchase } = await import('@/services/entities');

    const purchases = await Purchase.filter({
      buyer_user_id: userId,
      payment_status: 'pending'
    });

    clog(`Found ${purchases.length} pending purchases for user ${userId}`);
    return purchases || [];

  } catch (error) {
    cerror('Error getting pending purchases:', error);
    return [];
  }
}

/**
 * Get all non-refunded purchases for a user
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of non-refunded purchase records
 */
export async function getAllNonRefundedPurchases(userId) {
  try {
    // Import Purchase here to avoid circular dependency
    const { Purchase } = await import('@/services/entities');

    const allPurchases = await Purchase.filter({
      buyer_user_id: userId
    });

    // Filter out refunded purchases
    const nonRefundedPurchases = (allPurchases || []).filter(p => p.payment_status !== 'refunded');

    clog(`Found ${nonRefundedPurchases.length} non-refunded purchases for user ${userId}`);
    return nonRefundedPurchases;

  } catch (error) {
    cerror('Error getting non-refunded purchases:', error);
    return [];
  }
}

/**
 * Clear all cart and pending purchases for a user (e.g., after successful payment)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function clearCartPurchases(userId) {
  try {
    const cartPurchases = await getCartPurchases(userId);

    for (const purchase of cartPurchases) {
      await apiRequest(`/entities/purchase/${purchase.id}`, {
        method: 'DELETE'
      });
    }

    clog(`Cleared ${cartPurchases.length} cart purchases for user ${userId}`);
    return true;

  } catch (error) {
    cerror('Error clearing cart purchases:', error);
    return false;
  }
}

/**
 * Clear all pending purchases for a user (legacy function for backward compatibility)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function clearPendingPurchases(userId) {
  try {
    const pendingPurchases = await getPendingPurchases(userId);

    for (const purchase of pendingPurchases) {
      await apiRequest(`/entities/purchase/${purchase.id}`, {
        method: 'DELETE'
      });
    }

    clog(`Cleared ${pendingPurchases.length} pending purchases for user ${userId}`);
    return true;

  } catch (error) {
    cerror('Error clearing pending purchases:', error);
    return false;
  }
}

/**
 * Handle authentication requirement with toast (no redirect)
 * @param {function} navigate - React Router navigate function (unused but kept for compatibility)
 * @param {string} redirectTo - Where to redirect after login (unused but kept for compatibility)
 * @returns {boolean} False (indicating user is not authenticated)
 */
export function requireAuthentication(navigate, redirectTo = '/checkout') {
  if (!isAuthenticated()) {
    showError(
      "נדרשת התחברות",
      "יש להתחבר כדי לבצע פעולה זו. לחצו על כפתור 'התחבר' בתפריט העליון."
    );
    return false;
  }
  return true;
}

/**
 * Handle authentication requirement with login modal
 * @param {function} showLoginModal - Function to show login modal (from useLoginModal hook)
 * @param {function} setCallbackAction - Function to set action to perform after login
 * @returns {boolean} False (indicating user is not authenticated)
 */
export function requireAuthenticationWithModal(showLoginModal, setCallbackAction = null) {
  if (!isAuthenticated()) {
    if (typeof showLoginModal === 'function') {
      showLoginModal();
      return false;
    }

    // Fallback to console warning if modal function not available
    console.warn('Login modal function not available');
    return false;
  }
  return true;
}

/**
 * Show success toast for purchase operations
 * @param {string} productTitle - Title of the purchased product
 * @param {boolean} isFree - Whether this was a free purchase
 */
export function showPurchaseSuccessToast(productTitle, isFree = false) {
  const title = isFree ? "המוצר התקבל בהצלחה!" : "נוסף לעגלה!";
  const description = isFree
    ? `"${productTitle}" נוסף לחשבונך`
    : `"${productTitle}" נוסף לעגלת הקניות`;

  showSuccess(title, description);
}

/**
 * Show error toast for purchase operations
 * @param {Error|string} error - Error object or message
 * @param {string} context - Context of the error (e.g., "creating purchase")
 */
export function showPurchaseErrorToast(error, context = "בעת הרכישה") {
  let errorMessage = `אירעה שגיאה ${context}`;

  if (error && typeof error.message === 'string') {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  showError("שגיאה ברכישה", errorMessage);
}

/**
 * Calculate total price for multiple pending purchases
 * @param {array} purchases - Array of purchase records
 * @returns {number} Total price
 */
export function calculateTotalPrice(purchases) {
  return purchases.reduce((total, purchase) => {
    return total + (parseFloat(purchase.payment_amount) || 0);
  }, 0);
}

/**
 * Check if user has existing purchase for a specific product
 * @param {string} userId - User ID
 * @param {string} entityType - Type of entity (file, workshop, course, tool, game)
 * @param {string} entityId - ID of the entity
 * @returns {Promise<object|null>} Existing purchase record or null if none found
 */
export async function checkExistingPurchase(userId, entityType, entityId) {
  try {
    const allPurchases = await getAllNonRefundedPurchases(userId);
    const existingPurchase = allPurchases.find(p =>
      p.purchasable_type === entityType && p.purchasable_id === entityId
    );

    if (existingPurchase) {
      clog('Found existing purchase for product:', { entityType, entityId, purchase: existingPurchase });
    }

    return existingPurchase || null;
  } catch (error) {
    cerror('Error checking existing purchase:', error);
    return null;
  }
}

/**
 * Check if payment is currently in progress for a specific product
 * @param {string} userId - User ID
 * @param {string} entityType - Type of entity (file, workshop, course, tool, game)
 * @param {string} entityId - ID of the entity
 * @returns {Promise<boolean>} True if payment is in progress
 */
export async function isPaymentInProgress(userId, entityType, entityId) {
  try {
    const cartPurchases = await getCartPurchases(userId);
    const inProgressPurchase = cartPurchases.find(p =>
      p.purchasable_type === entityType &&
      p.purchasable_id === entityId &&
      p.metadata?.payment_in_progress === true
    );

    if (inProgressPurchase) {
      // Check if payment page was created more than 10 minutes ago (stale)
      const createdAt = new Date(inProgressPurchase.metadata.payment_page_created_at);
      const now = new Date();
      const minutesElapsed = (now - createdAt) / (1000 * 60);

      if (minutesElapsed > 10) {
        clog('Payment in progress but stale (>10 minutes), allowing retry');
        return false;
      }

      clog('Payment in progress for product:', { entityType, entityId, purchase: inProgressPurchase });
      return true;
    }

    return false;
  } catch (error) {
    cerror('Error checking payment in progress:', error);
    return false;
  }
}

/**
 * Group purchases by type for display
 * @param {array} purchases - Array of purchase records
 * @returns {object} Grouped purchases { products: [...], subscriptions: [...] }
 */
export function groupPurchasesByType(purchases) {
  return purchases.reduce((groups, purchase) => {
    const type = purchase.purchasable_type;

    if (type === 'subscription') {
      groups.subscriptions.push(purchase);
    } else {
      groups.products.push(purchase);
    }

    return groups;
  }, { products: [], subscriptions: [] });
}