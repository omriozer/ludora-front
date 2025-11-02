import { getApiBase } from './api.js';

/**
 * Maps product types to backend-supported entity types for marketing assets (images, videos)
 * Marketing assets always belong to the Product layer and use the actual product type
 */
const getMarketingEntityType = (productType) => {
  // For marketing assets, use the actual product type as the entity type
  return productType;
};

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
 * Generate product image URL using standardized image fields
 * @param {Object} product - Product object with id and product_type
 * @returns {string|null} - Product image URL or null
 */
export function getProductImageUrl(product) {
  if (!product) return null;

  // Extract product type and ID
  const productType = product.product_type;
  const productId = product.id; // Marketing images always use Product ID

  if (!productId || !productType) return null;

  // Use standardized fields (has_image + image_filename) - preferred approach
  if (product.has_image !== undefined) {
    if (!product.has_image) {
      return null; // No image available
    }

    // Use standardized filename or default
    const filename = product.image_filename || 'image.jpg';

    // Map product types to backend-supported entity types for marketing assets
    const entityType = getMarketingEntityType(productType);

    // Use predictable path with mapped entityType
    let url = `${getApiBase()}/assets/image/${entityType}/${productId}/${filename}`;

    // Add cache busting parameter if content was updated
    if (product.updated_at) {
      const timestamp = new Date(product.updated_at).getTime();
      url += `?v=${timestamp}`;
    } else {
      // Always add some cache busting for uploaded images
      url += `?v=${Date.now()}`;
    }

    return url;
  }

  // Legacy fallback for backward compatibility during transition
  if (product.image_url) {
    // Handle HAS_IMAGE placeholder - deprecated pattern
    if (product.image_url === 'HAS_IMAGE') {
      const entityType = getMarketingEntityType(productType);
      let url = `${getApiBase()}/assets/image/${entityType}/${productId}/image.jpg`;

      if (product.updated_at) {
        const timestamp = new Date(product.updated_at).getTime();
        url += `?v=${timestamp}`;
      } else {
        url += `?v=${Date.now()}`;
      }

      return url;
    }

    // Handle direct URL storage - deprecated pattern
    if (product.image_url.includes('/')) {
      const parts = product.image_url.split('/');
      const filename = parts[parts.length - 1] || 'image.jpg';
      const entityType = getMarketingEntityType(productType);

      let url = `${getApiBase()}/assets/image/${entityType}/${productId}/${filename}`;

      if (product.updated_at) {
        const timestamp = new Date(product.updated_at).getTime();
        url += `?v=${timestamp}`;
      } else {
        url += `?v=${Date.now()}`;
      }

      return url;
    }
  }

  // No image available
  return null;
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

/**
 * Check if entity has video using standardized fields
 * @param {Object} entity - Entity object (Workshop, Course, etc.)
 * @returns {boolean} - True if entity has video
 */
export function hasVideo(entity) {
  if (!entity) return false;

  // Use standardized field if available
  if (entity.has_video !== undefined) {
    return entity.has_video;
  }

  // Legacy fallback for backward compatibility
  if (entity.video_file_url && entity.video_file_url !== '') {
    return true;
  }

  if (entity.recording_url && entity.recording_url !== '') {
    return true;
  }

  return false;
}

/**
 * Get video filename using standardized fields
 * @param {Object} entity - Entity object (Workshop, Course, etc.)
 * @returns {string|null} - Video filename or null
 */
export function getVideoFilename(entity) {
  if (!entity) return null;

  // Use standardized field if available
  if (entity.video_filename) {
    return entity.video_filename;
  }

  // Legacy fallback - extract from URL
  if (entity.video_file_url && entity.video_file_url.includes('/')) {
    const parts = entity.video_file_url.split('/');
    return parts[parts.length - 1] || 'video.mp4';
  }

  // Standard filename for legacy videos
  if (hasVideo(entity)) {
    return 'video.mp4';
  }

  return null;
}

/**
 * Generate entity video URL using standardized approach
 * @param {Object} entity - Entity object with id and type
 * @param {string} entityType - Entity type (workshop, course, etc.)
 * @returns {string|null} - Video URL or null
 */
export function getEntityVideoUrl(entity, entityType) {
  if (!entity || !entityType) return null;

  if (!hasVideo(entity)) {
    return null;
  }

  const entityId = entity.id;
  if (!entityId) return null;

  // Use unified streaming endpoint
  let url = `${getApiBase()}/media/stream/${entityType}/${entityId}`;

  // Add cache busting parameter if content was updated
  if (entity.updated_at) {
    const timestamp = new Date(entity.updated_at).getTime();
    url += `?v=${timestamp}`;
  }

  return url;
}

/**
 * Check if entity has image using standardized fields
 * @param {Object} entity - Entity object
 * @returns {boolean} - True if entity has image
 */
export function hasImage(entity) {
  if (!entity) return false;

  // Use standardized field if available
  if (entity.has_image !== undefined) {
    return entity.has_image;
  }

  if (entity.has_logo !== undefined) {
    return entity.has_logo;
  }

  // Legacy fallback
  if (entity.image_url && entity.image_url !== '' && entity.image_url !== 'HAS_IMAGE') {
    return true;
  }

  if (entity.logo_url && entity.logo_url !== '') {
    return true;
  }

  return false;
}

/**
 * Get image filename using standardized fields
 * @param {Object} entity - Entity object
 * @returns {string|null} - Image filename or null
 */
export function getImageFilename(entity) {
  if (!entity) return null;

  // Use standardized field if available
  if (entity.image_filename) {
    return entity.image_filename;
  }

  if (entity.logo_filename) {
    return entity.logo_filename;
  }

  // Legacy fallback - extract from URL
  if (entity.image_url && entity.image_url !== 'HAS_IMAGE' && entity.image_url.includes('/')) {
    const parts = entity.image_url.split('/');
    return parts[parts.length - 1] || 'image.jpg';
  }

  if (entity.logo_url && entity.logo_url.includes('/')) {
    const parts = entity.logo_url.split('/');
    return parts[parts.length - 1] || 'logo.jpg';
  }

  // Standard filename for legacy images
  if (hasImage(entity)) {
    return entity.logo_url ? 'logo.jpg' : 'image.jpg';
  }

  return null;
}