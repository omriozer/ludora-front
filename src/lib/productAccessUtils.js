/**
 * Product Access Utilities
 *
 * UNIFIED SIMPLE LOGIC for determining product actions across the entire platform.
 *
 * User requirement: hasAccess ? getAccess : isFree ? addToLibrary : canClaim ? claim : buy + addToCart
 *
 * This module provides a single source of truth for ALL product action logic,
 * eliminating component-specific variations and ensuring consistency.
 */

/**
 * Get the recommended action for a product based on backend access information
 *
 * @param {Object} product - Product object with embedded access information
 * @returns {string} One of: 'access' | 'addToLibrary' | 'claim' | 'purchase'
 */
export function getProductAction(product) {
  // Use backend-provided recommendedAction if available (NEW unified field)
  if (product?.access?.recommendedAction) {
    return product.access.recommendedAction;
  }

  // Fallback: calculate from flags (for backward compatibility during transition)
  const access = product?.access || {};
  const hasAccess = access.hasAccess || false;
  const canClaim = access.canClaim || false;
  const isFree = !product?.price || product.price === 0;

  // SIMPLE UNIFIED LOGIC (matches backend exactly)
  if (hasAccess) {
    return 'access';
  }

  if (isFree) {
    return 'addToLibrary';
  }

  if (canClaim) {
    return 'claim';
  }

  return 'purchase';
}

/**
 * Check if a product action is one of the specified types
 *
 * @param {Object} product - Product object
 * @param {string[]} actions - Array of action types to check
 * @returns {boolean} Whether the product's action matches any of the specified types
 */
export function isProductAction(product, actions) {
  const action = getProductAction(product);
  return actions.includes(action);
}

/**
 * Get human-readable action label in Hebrew
 *
 * @param {string} action - Action type
 * @returns {string} Hebrew label for the action
 */
export function getActionLabel(action) {
  const labels = {
    access: 'יש לך גישה',
    addToLibrary: 'הוסף לספרייה',
    claim: 'תבע עם מנוי',
    purchase: 'רכישה'
  };

  return labels[action] || 'פעולה';
}

/**
 * Determine if the cart button should be shown alongside the main action button
 *
 * @param {Object} product - Product object
 * @returns {boolean} Whether to show cart button
 */
export function shouldShowCartButton(product) {
  const action = getProductAction(product);

  // Only show cart button for purchase action (paid products)
  return action === 'purchase';
}

/**
 * Check if a product is in draft state (not published)
 *
 * @param {Object} product - Product object
 * @returns {boolean} Whether the product is a draft (not published)
 */
export function isDraft(product) {
  if (!product) return false;

  // A product is a draft if is_published is false
  return product.is_published === false;
}
