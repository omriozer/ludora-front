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
  if (!product) return null;

  // Extract ID - can be id, entity_id, or marketing_video_id for uploaded videos
  const productId = product.id || product.entity_id;

  // Extract product type - can be product_type or itemType
  const productType = product.product_type;

  if (!productId || !productType) return null;

  let url = generateVideoUrl('marketing', productType, productId);

  // Add cache busting parameter if content was updated
  if (url && product.updated_at) {
    const timestamp = new Date(product.updated_at).getTime();
    url += `?v=${timestamp}`;
  }

  return url;
}

/**
 * Generate product image URL using predictable path
 * @param {Object} product - Product object with id and product_type
 * @returns {string|null} - Product image URL or null
 */
export function getProductImageUrl(product) {
  if (!product) return null;

  // Extract ID and product type
  const productId = product.id || product.entity_id;
  const productType = product.product_type;

  if (!productId || !productType) return null;

  // Determine filename - backward compatibility with old system
  let filename = 'image.jpg'; // Default for new system

  if (product.image_url && product.image_url !== 'HAS_IMAGE') {
    // Old system: extract filename from stored path
    const parts = product.image_url.split('/');
    if (parts.length > 0) {
      filename = parts[parts.length - 1];
    }
  }

  // Use predictable path with appropriate filename
  let url = `${getApiBase()}/assets/image/${productType}/${productId}/${filename}`;

  // Add cache busting parameter if content was updated
  if (product.updated_at) {
    const timestamp = new Date(product.updated_at).getTime();
    url += `?v=${timestamp}`;
  }

  return url;
}

/**
 * Generate content video URL for a product
 * @param {Object} product - Product object with id and product_type
 * @returns {string|null} - Content video URL or null
 */
export function getContentVideoUrl(product) {
  if (!product?.id || !product?.product_type) return null;

  let url = generateVideoUrl('content', product.product_type, product.id);

  // Add cache busting parameter if content was updated
  if (url && product.updated_at) {
    const timestamp = new Date(product.updated_at).getTime();
    url += `?v=${timestamp}`;
  }

  return url;
}