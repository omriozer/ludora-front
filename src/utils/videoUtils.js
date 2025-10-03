import { getApiBase } from './api.js';

/**
 * Generate video URL for different content types - all videos go through unified API endpoint
 * @param {string} contentType - Type of content ('marketing', 'content') - now just for reference
 * @param {string} entityType - Entity type (product_type like 'game', 'file', etc.)
 * @param {string} entityId - Entity ID
 * @returns {string|null} - Video URL or null if parameters are missing
 *
 * Note: Both marketing and private videos now use the same streaming endpoint.
 * Backend automatically determines if video is public/marketing or private/content.
 */
export function generateVideoUrl(contentType, entityType, entityId) {
  if (!entityType || !entityId) return null;

  // Unified streaming endpoint - backend determines privacy and applies auth accordingly
  return `${getApiBase()}/media/stream/${entityType}/${entityId}`;
}

/**
 * Generate marketing video URL for a product
 * @param {Object} product - Product object with id and product_type
 * @returns {string|null} - Marketing video URL or null
 */
export function getMarketingVideoUrl(product) {
  if (!product?.id || !product?.product_type) return null;
  return generateVideoUrl('marketing', product.product_type, product.id);
}

/**
 * Generate content video URL for a product
 * @param {Object} product - Product object with id and product_type
 * @returns {string|null} - Content video URL or null
 */
export function getContentVideoUrl(product) {
  if (!product?.id || !product?.product_type) return null;
  return generateVideoUrl('content', product.product_type, product.id);
}