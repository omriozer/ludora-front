/**
 * Template Content Resolver
 * Provides resolved template content that matches PDF output for visual editor
 */

import { getApiBase } from '@/utils/api.js';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * Fetch resolved template content for a file
 * Returns template content with variable substitution applied, matching what appears in PDF output
 *
 * @param {string} fileId - File ID to get template content for
 * @returns {Promise<Object>} Resolved template data or null if error
 */
export async function fetchResolvedTemplateContent(fileId) {
  if (!fileId) {
    luderror.api('fetchResolvedTemplateContent: fileId is required');
    return null;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      luderror.auth('fetchResolvedTemplateContent: No authentication token available');
      return null;
    }

    const response = await fetch(`${getApiBase()}/assets/template-preview/${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      luderror.api('fetchResolvedTemplateContent: API returned error', result);
      return null;
    }

    return result.data;

  } catch (error) {
    luderror.api('fetchResolvedTemplateContent: Request failed', error);
    return null;
  }
}

/**
 * Get display content for an element, using resolved content if available
 * Falls back to original content if resolved content is not available
 *
 * @param {Object} element - Template element
 * @param {string} elementType - Element type ('text', 'url', 'user-info', etc.)
 * @param {Object} resolvedTemplate - Resolved template data from API (optional)
 * @returns {string} Display content for the element
 */
export function getElementDisplayContent(element, elementType, resolvedTemplate = null) {
  if (!element) return '';

  // Try to get resolved content first
  if (resolvedTemplate) {
    // Handle main template elements
    if (elementType === 'text' && resolvedTemplate.text?.content) {
      return resolvedTemplate.text.content;
    }

    if (elementType === 'url') {
      if (resolvedTemplate.url?.resolvedHref) {
        return resolvedTemplate.url.resolvedHref;
      }
      if (resolvedTemplate.url?.href || resolvedTemplate.url?.content) {
        return resolvedTemplate.url.href || resolvedTemplate.url.content;
      }
    }

    // Handle custom elements
    if (resolvedTemplate.customElements && element.id) {
      const resolvedElement = resolvedTemplate.customElements[element.id];
      if (resolvedElement?.resolvedContent) {
        return resolvedElement.resolvedContent;
      }
      if (resolvedElement?.resolvedHref && elementType === 'url') {
        return resolvedElement.resolvedHref;
      }
    }
  }

  // Fallback to original element content
  if (elementType === 'url') {
    return element.content || element.href || '';
  }

  // For user-info elements with no content, show the default template
  if (elementType === 'user-info' && (!element.content || element.content.trim() === '')) {
    return 'קובץ זה נוצר עבור {{user.email}}';
  }

  return element.content || '';
}

/**
 * Get display href for URL elements
 * Returns resolved href if available, falls back to original href
 *
 * @param {Object} element - URL element
 * @param {Object} resolvedTemplate - Resolved template data from API (optional)
 * @returns {string} Display href for the URL element
 */
export function getElementDisplayHref(element, resolvedTemplate = null) {
  if (!element) return '';

  // Try to get resolved href first
  if (resolvedTemplate) {
    // Handle main URL element
    if (resolvedTemplate.url?.resolvedHref) {
      return resolvedTemplate.url.resolvedHref;
    }

    // Handle custom URL elements
    if (resolvedTemplate.customElements && element.id) {
      const resolvedElement = resolvedTemplate.customElements[element.id];
      if (resolvedElement?.resolvedHref) {
        return resolvedElement.resolvedHref;
      }
    }
  }

  // Fallback to original href/content
  return element.href || element.content || '';
}

/**
 * Check if template content is loading
 * Useful for showing loading states in the UI
 *
 * @param {Object} resolvedTemplate - Resolved template data
 * @param {boolean} isLoading - Loading state
 * @returns {boolean} True if content is still loading
 */
export function isTemplateContentLoading(resolvedTemplate, isLoading) {
  return isLoading || !resolvedTemplate;
}

/**
 * Create a preview tooltip text that shows what variables will be substituted
 *
 * @param {string} originalContent - Original content with variables
 * @param {string} resolvedContent - Resolved content with substituted variables
 * @returns {string} Tooltip text explaining the substitution
 */
export function createSubstitutionTooltip(originalContent, resolvedContent) {
  if (!originalContent || !resolvedContent || originalContent === resolvedContent) {
    return '';
  }

  return `מקור: ${originalContent}\nמוצג: ${resolvedContent}`;
}

export default {
  fetchResolvedTemplateContent,
  getElementDisplayContent,
  getElementDisplayHref,
  isTemplateContentLoading,
  createSubstitutionTooltip
};