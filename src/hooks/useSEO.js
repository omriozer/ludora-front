import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook for managing SEO metadata
 * Provides utilities for setting page-specific SEO data
 *
 * @param {Object} initialSEO - Initial SEO configuration
 * @param {string} initialSEO.title - Page title
 * @param {string} initialSEO.description - Meta description
 * @param {string} initialSEO.keywords - Meta keywords
 * @param {string} initialSEO.image - Open Graph image
 * @param {Object} initialSEO.structuredData - JSON-LD structured data
 * @param {boolean} initialSEO.autoGenerateUrl - Auto-generate canonical URL from current path
 *
 * @returns {Object} SEO utilities and state
 */
export const useSEO = (initialSEO = {}) => {
  const location = useLocation();

  const [seoData, setSeoData] = useState({
    title: '',
    description: '',
    keywords: '',
    image: '',
    url: '',
    type: 'website',
    locale: 'he_IL',
    author: 'Ludora',
    structuredData: null,
    noIndex: false,
    noFollow: false,
    themeColor: '#3B82F6',
    alternateLanguages: [],
    siteName: 'Ludora',
    ...initialSEO
  });

  // Auto-generate canonical URL if enabled
  useEffect(() => {
    if (initialSEO.autoGenerateUrl !== false) {
      const baseUrl = getBaseUrl();
      setSeoData(prev => ({
        ...prev,
        url: `${baseUrl}${location.pathname}${location.search}`
      }));
    }
  }, [location.pathname, location.search, initialSEO.autoGenerateUrl]);

  /**
   * Update SEO data
   * @param {Object} updates - SEO data updates
   */
  const updateSEO = (updates) => {
    setSeoData(prev => ({ ...prev, ...updates }));
  };

  /**
   * Set page title
   * @param {string} title - Page title
   */
  const setTitle = (title) => {
    updateSEO({ title });
  };

  /**
   * Set meta description
   * @param {string} description - Meta description
   */
  const setDescription = (description) => {
    updateSEO({ description });
  };

  /**
   * Set keywords
   * @param {string|Array} keywords - Keywords (string or array)
   */
  const setKeywords = (keywords) => {
    const keywordString = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    updateSEO({ keywords: keywordString });
  };

  /**
   * Set Open Graph image
   * @param {string} image - Image URL
   */
  const setImage = (image) => {
    const imageUrl = image.startsWith('http') ? image : `${getBaseUrl()}${image}`;
    updateSEO({ image: imageUrl });
  };

  /**
   * Set structured data
   * @param {Object} data - JSON-LD structured data
   */
  const setStructuredData = (data) => {
    updateSEO({ structuredData: data });
  };

  /**
   * Configure for product page
   * @param {Object} product - Product data
   */
  const setProductMeta = (product) => {
    if (!product) return;

    const title = product.title || 'מוצר חינוכי';
    const description = product.description || 'מוצר חינוכי באיכות גבוהה מפלטפורמת לודורה';
    const image = product.thumbnail_url || product.image_url;

    updateSEO({
      title,
      description: stripHtml(description).substring(0, 160) + '...',
      keywords: `${product.title}, חינוך, ${product.product_type}, לודורה`,
      image: image ? (image.startsWith('http') ? image : `${getBaseUrl()}${image}`) : '',
      type: 'article',
      structuredData: generateProductStructuredData(product)
    });
  };

  /**
   * Configure for game page
   * @param {Object} game - Game data
   */
  const setGameMeta = (game) => {
    if (!game) return;

    const title = game.title || 'משחק חינוכי';
    const description = game.description || 'משחק חינוכי אינטראקטיבי מפלטפורמת לודורה';

    updateSEO({
      title,
      description: stripHtml(description).substring(0, 160) + '...',
      keywords: `${game.title}, משחק חינוכי, אינטראקטיבי, לודורה, ${game.difficulty || ''}`,
      type: 'article',
      structuredData: generateGameStructuredData(game)
    });
  };

  /**
   * Configure for workshop page
   * @param {Object} workshop - Workshop data
   */
  const setWorkshopMeta = (workshop) => {
    if (!workshop) return;

    const title = workshop.title || 'סדנה חינוכית';
    const description = workshop.description || 'סדנה חינוכית מקצועית מפלטפורמת לודורה';

    updateSEO({
      title,
      description: stripHtml(description).substring(0, 160) + '...',
      keywords: `${workshop.title}, סדנה, חינוך, מורים, פיתוח מקצועי, לודורה`,
      type: 'event',
      structuredData: generateWorkshopStructuredData(workshop)
    });
  };

  /**
   * Configure for user profile
   * @param {Object} user - User data
   */
  const setUserMeta = (user) => {
    if (!user) return;

    const title = user.display_name ? `פרופיל ${user.display_name}` : 'פרופיל משתמש';
    const description = `פרופיל המשתמש ${user.display_name || 'באנונימיות'} בפלטפורמת לודורא`;

    updateSEO({
      title,
      description,
      keywords: `פרופיל, משתמש, ${user.display_name || ''}, לודורה`,
      type: 'profile',
      noIndex: true, // User profiles should not be indexed
      structuredData: generatePersonStructuredData(user)
    });
  };

  /**
   * Reset SEO to defaults
   */
  const resetSEO = () => {
    setSeoData({
      title: '',
      description: '',
      keywords: '',
      image: '',
      url: '',
      type: 'website',
      locale: 'he_IL',
      author: 'Ludora',
      structuredData: null,
      noIndex: false,
      noFollow: false,
      themeColor: '#3B82F6',
      alternateLanguages: [],
      siteName: 'Ludora'
    });
  };

  return {
    seoData,
    updateSEO,
    setTitle,
    setDescription,
    setKeywords,
    setImage,
    setStructuredData,
    setProductMeta,
    setGameMeta,
    setWorkshopMeta,
    setUserMeta,
    resetSEO
  };
};

/**
 * Utility functions
 */

function getBaseUrl() {
  if (typeof window === 'undefined') return 'https://ludora.app';

  const { protocol, hostname, port } = window.location;
  const isStudentPortal = hostname.includes('my.ludora');

  return isStudentPortal
    ? 'https://my.ludora.app'
    : 'https://ludora.app';
}

function stripHtml(html) {
  if (!html) return '';
  if (typeof document === 'undefined') {
    // Server-side fallback - basic HTML removal
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

function generateProductStructuredData(product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": stripHtml(product.description),
    "image": product.thumbnail_url || product.image_url,
    "brand": {
      "@type": "Brand",
      "name": "Ludora"
    },
    "offers": product.price ? {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "ILS",
      "availability": product.is_published ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    } : undefined,
    "category": product.product_type,
    "educationalLevel": "K12",
    "inLanguage": "he"
  };
}

function generateGameStructuredData(game) {
  return {
    "@context": "https://schema.org",
    "@type": "Game",
    "name": game.title,
    "description": stripHtml(game.description),
    "gameLocation": "Online",
    "numberOfPlayers": {
      "@type": "QuantitativeValue",
      "minValue": 1,
      "maxValue": game.max_players || 50
    },
    "applicationCategory": "EducationalGame",
    "operatingSystem": "Web Browser",
    "inLanguage": "he"
  };
}

function generateWorkshopStructuredData(workshop) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": workshop.title,
    "description": stripHtml(workshop.description),
    "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
    "eventStatus": "https://schema.org/EventScheduled",
    "organizer": {
      "@type": "Organization",
      "name": "Ludora",
      "url": "https://ludora.app"
    },
    "inLanguage": "he"
  };
}

function generatePersonStructuredData(user) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": user.display_name,
    "memberOf": {
      "@type": "Organization",
      "name": "Ludora"
    }
  };
}

export default useSEO;