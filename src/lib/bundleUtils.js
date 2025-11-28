/**
 * Bundle Detection and Utility Functions
 *
 * Centralized utilities for working with bundle products (קיט).
 * All bundle-related logic should use these functions for consistency.
 */

/**
 * Check if a product is a bundle
 * @param {Object} product - Product object
 * @returns {boolean} True if product is a bundle
 */
export function isBundle(product) {
  return product?.product_type === 'bundle';
}

/**
 * Check if a product is bundleable (can be included in bundles)
 * Tools are not bundleable, all other product types are
 * @param {string} productType - Product type key
 * @returns {boolean} True if product type can be included in bundles
 */
export function isBundleable(productType) {
  return productType !== 'tool' && productType !== 'bundle';
}

/**
 * Get bundle item count from product
 * @param {Object} product - Product object with bundle_items JSONB field
 * @returns {number} Number of items in the bundle
 */
export function getBundleItemCount(product) {
  if (!isBundle(product)) return 0;
  return product?.bundle_items?.length || 0;
}

/**
 * Get bundle items from product
 * @param {Object} product - Product object with bundle_items JSONB field
 * @returns {Array} Array of bundle items with product_type and product_id
 */
export function getBundleItems(product) {
  if (!isBundle(product)) return [];
  return product?.bundle_items || [];
}

/**
 * Calculate bundle composition summary
 * Returns count by product type for display
 * @param {Object} product - Product object with bundle_items JSONB field
 * @returns {Object} Summary object with counts by type
 * Example: { file: 2, game: 3, workshop: 1 }
 */
export function getBundleComposition(product) {
  const items = getBundleItems(product);
  const composition = {};

  items.forEach(item => {
    composition[item.product_type] = (composition[item.product_type] || 0) + 1;
  });

  return composition;
}

/**
 * Get Hebrew label for bundle composition
 * @param {Object} composition - Composition object from getBundleComposition
 * @returns {string} Hebrew label like "2 קבצים, 3 משחקים"
 */
export function getBundleCompositionLabel(composition) {
  const { getProductTypeName } = require('@/config/productTypes');

  const parts = Object.entries(composition).map(([type, count]) => {
    const typeName = getProductTypeName(type, 'plural');
    return `${count} ${typeName}`;
  });

  return parts.join(', ');
}

/**
 * Get full bundle composition text for display
 * @param {Object} product - Product object
 * @returns {string} Full composition text like "קיט המכיל 2 קבצים ו-3 משחקים"
 */
export function getBundleCompositionText(product) {
  const count = getBundleItemCount(product);
  if (count === 0) return 'קיט ריק';

  const composition = getBundleComposition(product);
  const label = getBundleCompositionLabel(composition);

  return `קיט המכיל ${label}`;
}

/**
 * Validate bundle items array
 * @param {Array} items - Array of bundle items
 * @returns {Object} Validation result with { valid: boolean, error?: string }
 */
export function validateBundleItems(items) {
  if (!Array.isArray(items)) {
    return { valid: false, error: 'Bundle items must be an array' };
  }

  if (items.length === 0) {
    return { valid: false, error: 'Bundle must contain at least one item' };
  }

  if (items.length > 50) {
    return { valid: false, error: 'Bundle cannot contain more than 50 items' };
  }

  // Check each item has required fields
  for (const item of items) {
    if (!item.product_type || !item.product_id) {
      return { valid: false, error: 'Each bundle item must have product_type and product_id' };
    }

    if (!isBundleable(item.product_type)) {
      return { valid: false, error: `Product type ${item.product_type} cannot be bundled` };
    }
  }

  // Check for duplicates
  const seen = new Set();
  for (const item of items) {
    const key = `${item.product_type}:${item.product_id}`;
    if (seen.has(key)) {
      return { valid: false, error: 'Bundle contains duplicate items' };
    }
    seen.add(key);
  }

  return { valid: true };
}

/**
 * Format bundle items for API submission
 * @param {Array} items - Array of bundle items
 * @returns {Array} Formatted items ready for API
 */
export function formatBundleItemsForAPI(items) {
  return items.map(item => ({
    product_type: item.product_type,
    product_id: item.product_id
  }));
}

/**
 * Check if two bundle compositions are equal
 * @param {Array} items1 - First bundle items array
 * @param {Array} items2 - Second bundle items array
 * @returns {boolean} True if compositions are identical
 */
export function areBundleCompositionsEqual(items1, items2) {
  if (!Array.isArray(items1) || !Array.isArray(items2)) return false;
  if (items1.length !== items2.length) return false;

  // Create sorted string representations for comparison
  const sorted1 = [...items1]
    .map(i => `${i.product_type}:${i.product_id}`)
    .sort()
    .join(',');

  const sorted2 = [...items2]
    .map(i => `${i.product_type}:${i.product_id}`)
    .sort()
    .join(',');

  return sorted1 === sorted2;
}
