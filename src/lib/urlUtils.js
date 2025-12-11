/**
 * URL Management Utilities for Ludora Educational Platform
 * Provides canonical URL generation, validation, and optimization
 */

/**
 * Base URLs for different environments and portals
 */
const BASE_URLS = {
  production: {
    teacher: 'https://ludora.app',
    student: 'https://my.ludora.app'
  },
  staging: {
    teacher: 'https://staging.ludora.app',
    student: 'https://my-staging.ludora.app'
  },
  development: {
    teacher: 'http://localhost:5173',
    student: 'http://localhost:5174'
  }
};

/**
 * Get the current environment
 * @returns {string} Environment name
 */
function getCurrentEnvironment() {
  if (typeof window === 'undefined') return 'production';

  const hostname = window.location.hostname;

  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development';
  } else if (hostname.includes('staging')) {
    return 'staging';
  } else {
    return 'production';
  }
}

/**
 * Detect if we're on the student portal
 * @returns {boolean} True if on student portal
 */
function isStudentPortal() {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  return hostname.includes('my.ludora') ||
         hostname === 'localhost' && window.location.port === '5174';
}

/**
 * Get the base URL for the current portal and environment
 * @returns {string} Base URL
 */
export function getBaseUrl() {
  const environment = getCurrentEnvironment();
  const portal = isStudentPortal() ? 'student' : 'teacher';

  return BASE_URLS[environment][portal];
}

/**
 * Get the base URL for a specific portal
 * @param {string} portal - 'teacher' or 'student'
 * @returns {string} Base URL
 */
export function getPortalBaseUrl(portal = 'teacher') {
  const environment = getCurrentEnvironment();
  return BASE_URLS[environment][portal];
}

/**
 * Generate canonical URL for the current page
 * @param {string} path - Current path (optional, defaults to current location)
 * @param {Object} options - Additional options
 * @returns {string} Canonical URL
 */
export function generateCanonicalUrl(path = null, options = {}) {
  const {
    removeQuery = true,
    removeHash = true,
    portal = null
  } = options;

  // Use provided path or current location
  let targetPath;
  if (path) {
    targetPath = path;
  } else if (typeof window !== 'undefined') {
    targetPath = window.location.pathname;
    if (!removeQuery && window.location.search) {
      targetPath += window.location.search;
    }
    if (!removeHash && window.location.hash) {
      targetPath += window.location.hash;
    }
  } else {
    targetPath = '/';
  }

  // Normalize path
  targetPath = normalizePath(targetPath);

  // Get base URL for the specified or current portal
  const baseUrl = portal ? getPortalBaseUrl(portal) : getBaseUrl();

  return `${baseUrl}${targetPath}`;
}

/**
 * Generate product URLs based on product type and ID
 * @param {Object} product - Product object
 * @param {string} portal - Portal type ('teacher' or 'student')
 * @returns {Object} URLs object
 */
export function generateProductUrls(product, portal = 'teacher') {
  if (!product || !product.id) return null;

  const baseUrl = getPortalBaseUrl(portal);
  const productType = product.product_type;
  const productId = product.id;

  const urls = {};

  if (portal === 'teacher') {
    // Teacher portal URLs
    switch (productType) {
      case 'game':
        urls.catalog = `${baseUrl}/games`;
        urls.details = `${baseUrl}/product-details?id=${productId}`;
        urls.edit = `${baseUrl}/products/edit/${productId}`;
        break;
      case 'file':
        urls.catalog = `${baseUrl}/files`;
        urls.details = `${baseUrl}/product-details?id=${productId}`;
        urls.edit = `${baseUrl}/products/edit/${productId}`;
        break;
      case 'lesson_plan':
        urls.catalog = `${baseUrl}/lesson-plans`;
        urls.details = `${baseUrl}/product-details?id=${productId}`;
        urls.edit = `${baseUrl}/products/edit/${productId}`;
        urls.presentation = `${baseUrl}/lesson-plan-presentation?id=${productId}`;
        break;
      case 'workshop':
        urls.catalog = `${baseUrl}/workshops`;
        urls.details = `${baseUrl}/product-details?id=${productId}`;
        urls.edit = `${baseUrl}/products/edit/${productId}`;
        break;
      case 'course':
        urls.catalog = `${baseUrl}/courses`;
        urls.details = `${baseUrl}/product-details?id=${productId}`;
        urls.edit = `${baseUrl}/products/edit/${productId}`;
        urls.viewer = `${baseUrl}/course?id=${productId}`;
        break;
      case 'tool':
        urls.catalog = `${baseUrl}/tools`;
        urls.details = `${baseUrl}/product-details?id=${productId}`;
        urls.edit = `${baseUrl}/products/edit/${productId}`;
        break;
      case 'bundle':
        urls.catalog = `${baseUrl}/products`;
        urls.details = `${baseUrl}/product-details?id=${productId}`;
        urls.edit = `${baseUrl}/products/edit/${productId}`;
        break;
      default:
        urls.details = `${baseUrl}/product-details?id=${productId}`;
    }

    // Add common teacher URLs
    urls.checkout = `${baseUrl}/checkout?product=${productId}`;

  } else if (portal === 'student') {
    // Student portal URLs (limited access)
    urls.details = `${baseUrl}/product-details?id=${productId}`;

    if (productType === 'game') {
      // Students can play games via lobby codes
      urls.catalog = `${baseUrl}/games`;
    }
  }

  return urls;
}

/**
 * Generate sitemap URLs for all product types
 * @returns {Array} Array of URL objects for sitemap
 */
export function generateSitemapUrls() {
  const teacherBase = getPortalBaseUrl('teacher');
  const studentBase = getPortalBaseUrl('student');

  const urls = [
    // Teacher Portal - Main pages
    {
      url: teacherBase,
      priority: '1.0',
      changefreq: 'daily'
    },
    {
      url: `${teacherBase}/dashboard`,
      priority: '0.9',
      changefreq: 'daily'
    },
    {
      url: `${teacherBase}/games`,
      priority: '0.8',
      changefreq: 'daily'
    },
    {
      url: `${teacherBase}/files`,
      priority: '0.8',
      changefreq: 'daily'
    },
    {
      url: `${teacherBase}/lesson-plans`,
      priority: '0.8',
      changefreq: 'daily'
    },
    {
      url: `${teacherBase}/workshops`,
      priority: '0.7',
      changefreq: 'weekly'
    },
    {
      url: `${teacherBase}/courses`,
      priority: '0.7',
      changefreq: 'weekly'
    },
    {
      url: `${teacherBase}/tools`,
      priority: '0.6',
      changefreq: 'weekly'
    },

    // Student Portal - Main pages
    {
      url: studentBase,
      priority: '0.7',
      changefreq: 'daily'
    },

    // Legal and info pages (both portals)
    {
      url: `${teacherBase}/privacy`,
      priority: '0.3',
      changefreq: 'monthly'
    },
    {
      url: `${teacherBase}/terms`,
      priority: '0.3',
      changefreq: 'monthly'
    },
    {
      url: `${teacherBase}/accessibility`,
      priority: '0.3',
      changefreq: 'monthly'
    },
    {
      url: `${teacherBase}/contact`,
      priority: '0.4',
      changefreq: 'monthly'
    }
  ];

  return urls;
}

/**
 * Generate hreflang alternate URLs
 * @param {string} path - Current path
 * @returns {Array} Array of alternate language objects
 */
export function generateAlternateLanguages(path = '/') {
  const teacherBase = getPortalBaseUrl('teacher');
  const studentBase = getPortalBaseUrl('student');
  const normalizedPath = normalizePath(path);

  const alternates = [
    {
      hreflang: 'he',
      href: `${teacherBase}${normalizedPath}`
    },
    {
      hreflang: 'he-IL',
      href: `${teacherBase}${normalizedPath}`
    },
    {
      hreflang: 'x-default',
      href: `${teacherBase}${normalizedPath}`
    }
  ];

  // Add student portal alternate if applicable
  if (isStudentPortalPath(normalizedPath)) {
    alternates.push({
      hreflang: 'he-student',
      href: `${studentBase}${normalizedPath}`
    });
  }

  return alternates;
}

/**
 * Check if a path is valid for the student portal
 * @param {string} path - Path to check
 * @returns {boolean} True if valid for student portal
 */
function isStudentPortalPath(path) {
  const studentAllowedPaths = [
    '/',
    '/portal/',
    '/lobby/',
    '/play/',
    '/my-teachers',
    '/privacy',
    '/terms',
    '/accessibility',
    '/contact'
  ];

  return studentAllowedPaths.some(allowedPath =>
    path === allowedPath || path.startsWith(allowedPath)
  );
}

/**
 * Normalize URL path by removing extra slashes and ensuring proper format
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
export function normalizePath(path) {
  if (!path) return '/';

  // Remove query parameters and hash for canonical URLs
  let cleanPath = path.split('?')[0].split('#')[0];

  // Ensure starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  // Remove trailing slash (except for root)
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // Replace multiple slashes with single slash
  cleanPath = cleanPath.replace(/\/+/g, '/');

  return cleanPath;
}

/**
 * Extract product ID from various URL formats
 * @param {string} url - URL to extract from
 * @returns {string|null} Product ID or null
 */
export function extractProductId(url) {
  if (!url) return null;

  // Try query parameter format: ?id=product_123
  const urlParams = new URLSearchParams(url.split('?')[1] || '');
  const queryId = urlParams.get('id');
  if (queryId) return queryId;

  // Try path parameter format: /products/edit/product_123
  const pathMatch = url.match(/\/(?:products\/edit|product-details)\/([^\/\?]+)/);
  if (pathMatch) return pathMatch[1];

  // Try other formats as needed
  return null;
}

/**
 * Generate breadcrumb data for a given path
 * @param {string} path - Current path
 * @param {Object} additionalData - Additional data for dynamic breadcrumbs
 * @returns {Array} Breadcrumb objects
 */
export function generateBreadcrumbs(path, additionalData = {}) {
  const baseUrl = getBaseUrl();
  const normalizedPath = normalizePath(path);
  const segments = normalizedPath.split('/').filter(Boolean);

  const breadcrumbs = [
    {
      name: 'בית',
      url: baseUrl
    }
  ];

  // Build breadcrumbs based on path segments
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    currentPath += '/' + segments[i];

    let name = segments[i];

    // Translate common path segments to Hebrew
    switch (segments[i]) {
      case 'dashboard':
        name = 'לוח בקרה';
        break;
      case 'games':
        name = 'משחקים';
        break;
      case 'files':
        name = 'קבצים';
        break;
      case 'lesson-plans':
        name = 'תוכניות לימוד';
        break;
      case 'workshops':
        name = 'סדנאות';
        break;
      case 'courses':
        name = 'קורסים';
        break;
      case 'tools':
        name = 'כלים';
        break;
      case 'products':
        name = 'מוצרים';
        break;
      case 'create':
        name = 'יצירה';
        break;
      case 'edit':
        name = 'עריכה';
        break;
      case 'product-details':
        name = additionalData.productTitle || 'פרטי מוצר';
        break;
      case 'checkout':
        name = 'קופה';
        break;
      case 'privacy':
        name = 'מדיניות פרטיות';
        break;
      case 'terms':
        name = 'תנאי שימוש';
        break;
      case 'accessibility':
        name = 'נגישות';
        break;
      case 'contact':
        name = 'צור קשר';
        break;
      default:
        // For IDs and unknown segments, use additional data or capitalize
        if (additionalData[segments[i]]) {
          name = additionalData[segments[i]];
        } else {
          // Capitalize first letter for unknown segments
          name = segments[i].charAt(0).toUpperCase() + segments[i].slice(1);
        }
    }

    breadcrumbs.push({
      name,
      url: baseUrl + currentPath
    });
  }

  return breadcrumbs;
}

/**
 * Validate URL structure and suggest improvements
 * @param {string} url - URL to validate
 * @returns {Object} Validation result with suggestions
 */
export function validateUrlStructure(url) {
  const issues = [];
  const suggestions = [];

  if (!url) {
    return {
      isValid: false,
      issues: ['URL is required'],
      suggestions: ['Provide a valid URL']
    };
  }

  try {
    const urlObj = new URL(url);

    // Check for double slashes
    if (urlObj.pathname.includes('//')) {
      issues.push('URL contains double slashes');
      suggestions.push('Remove extra slashes from the path');
    }

    // Check for trailing slashes (except root)
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      issues.push('URL has trailing slash');
      suggestions.push('Remove trailing slash for consistency');
    }

    // Check for uppercase letters
    if (/[A-Z]/.test(urlObj.pathname)) {
      issues.push('URL contains uppercase letters');
      suggestions.push('Use lowercase letters for better SEO');
    }

    // Check for underscores (prefer hyphens)
    if (urlObj.pathname.includes('_')) {
      issues.push('URL contains underscores');
      suggestions.push('Replace underscores with hyphens for better SEO');
    }

    // Check for very long URLs
    if (url.length > 100) {
      issues.push('URL is very long');
      suggestions.push('Consider shortening the URL structure');
    }

    // Check for too many query parameters
    const paramCount = Array.from(urlObj.searchParams.keys()).length;
    if (paramCount > 5) {
      issues.push('Too many query parameters');
      suggestions.push('Consider reducing the number of query parameters');
    }

  } catch (error) {
    issues.push('Invalid URL format');
    suggestions.push('Ensure URL is properly formatted');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}

/**
 * Generate clean URLs for sharing (removes tracking params, etc.)
 * @param {string} url - URL to clean
 * @param {Array} preserveParams - Parameters to preserve
 * @returns {string} Clean URL
 */
export function generateCleanUrl(url, preserveParams = ['id']) {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    const cleanUrl = new URL(urlObj.origin + urlObj.pathname);

    // Only preserve specified parameters
    preserveParams.forEach(param => {
      const value = urlObj.searchParams.get(param);
      if (value) {
        cleanUrl.searchParams.set(param, value);
      }
    });

    return cleanUrl.toString();
  } catch (error) {
    return url;
  }
}

/**
 * Generate URLs for different portal contexts
 * @param {string} path - Path to generate URLs for
 * @returns {Object} URLs for different contexts
 */
export function generateCrossPortalUrls(path) {
  const normalizedPath = normalizePath(path);

  return {
    teacher: generateCanonicalUrl(normalizedPath, { portal: 'teacher' }),
    student: isStudentPortalPath(normalizedPath)
      ? generateCanonicalUrl(normalizedPath, { portal: 'student' })
      : null,
    canonical: generateCanonicalUrl(normalizedPath),
    alternates: generateAlternateLanguages(normalizedPath)
  };
}

export default {
  getBaseUrl,
  getPortalBaseUrl,
  generateCanonicalUrl,
  generateProductUrls,
  generateSitemapUrls,
  generateAlternateLanguages,
  generateBreadcrumbs,
  generateCrossPortalUrls,
  generateCleanUrl,
  normalizePath,
  extractProductId,
  validateUrlStructure
};