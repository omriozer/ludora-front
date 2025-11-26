// src/services/publicApis.js
// Public APIs client for external data sources

import { ludlog, luderror } from '@/lib/ludlog';
import { getApiBase } from '@/utils/api';

/**
 * Fetch Israeli cities from government data portal
 * @returns {Promise<Array>} List of Israeli cities
 */
export async function getIsraeliCities() {
  ludlog.api('🏛️ PublicAPI: Fetching Israeli cities from data.gov.il');

  try {
    // First try direct API call to data.gov.il
    const params = new URLSearchParams({
      resource_id: 'b7cf8f14-64a2-4b33-8d4b-edb286fdbd37',
      limit: '1500'
    });

    const response = await fetch(`https://data.gov.il/api/action/datastore_search?${params}`, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.result || !data.result.records) {
      throw new Error('Invalid response format from data.gov.il');
    }

    // Extract city names and remove duplicates
    const cities = data.result.records
      .map(record => record.שם_ישוב || record.city_name || record.name)
      .filter(city => city && typeof city === 'string')
      .map(city => city.trim())
      .filter(city => city.length > 0)
      // Remove duplicates and sort alphabetically
      .reduce((unique, city) => {
        if (!unique.includes(city)) {
          unique.push(city);
        }
        return unique;
      }, [])
      .sort((a, b) => a.localeCompare(b, 'he'));

    ludlog.api(`✅ PublicAPI: Loaded ${cities.length} Israeli cities from data.gov.il`);
    return cities;

  } catch (error) {
    luderror.api('❌ PublicAPI: Direct API call failed:', error);

    // Fallback to backend proxy if direct call fails (CORS issues)
    try {
      ludlog.api('🔄 PublicAPI: Trying backend proxy for Israeli cities');

      const proxyResponse = await fetch(`${getApiBase()}/public/israeli-cities`);

      if (!proxyResponse.ok) {
        throw new Error(`Backend proxy error! status: ${proxyResponse.status}`);
      }

      const proxyData = await proxyResponse.json();

      if (proxyData.success && proxyData.cities && Array.isArray(proxyData.cities)) {
        ludlog.api(`✅ PublicAPI: Loaded ${proxyData.cities.length} Israeli cities via backend proxy`);
        return proxyData.cities;
      } else {
        throw new Error('Invalid response format from backend proxy');
      }

    } catch (proxyError) {
      luderror.api('❌ PublicAPI: Backend proxy also failed:', null, { context: proxyError });

      // Return fallback list of major Israeli cities
      const fallbackCities = [
        'ירושלים', 'תל אביב-יפו', 'חיפה', 'ראשון לציון', 'אשדוד', 'פתח תקווה',
        'באר שבע', 'נתניה', 'חולון', 'בני ברק', 'רמת גן', 'אשקלון',
        'רחובות', 'בת ים', 'הרצליה', 'כפר סבא', 'מודיעין-מכבים-רעות',
        'נצרת', 'רעננה', 'נהריה', 'לוד', 'רמלה', 'צפת', 'עכו',
        'קריית גת', 'קריית מוצקין', 'טבריה', 'עפולה', 'אילת', 'טירת כרמל',
        'גבעתיים', 'קריית אתא', 'מעלה אדומים', 'אלעד', 'קרית אונו', 'יבנה',
        'קרית ביאליק', 'קרית ים', 'ארד', 'כרמיאל', 'קדימה-צורן', 'בית שמש',
        'נשר', 'אור יהודה', 'נס ציונה', 'זכרון יעקב', 'קרית מלאכי',
        'דימונה', 'מגדל העמק', 'נתיבות', 'אור עקיבא', 'יקנעם עילית',
        'קלנסווה', 'שפרעם', 'הוד השרון', 'ביתר עילית', 'אפרתה'
      ].sort((a, b) => a.localeCompare(b, 'he'));

      ludlog.api(`🔄 PublicAPI: Using fallback cities list (${fallbackCities.length} cities);`);
      return fallbackCities;
    }
  }
}

/**
 * Generic function for fetching data from data.gov.il
 * @param {string} resourceId - The resource ID from data.gov.il
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Array>} The fetched records
 */
export async function fetchDataGovIl(resourceId, options = {}) {
  ludlog.api(`🏛️ PublicAPI: Fetching data from data.gov.il resource: ${resourceId}`);

  try {
    // First try direct API call to data.gov.il
    const params = new URLSearchParams({
      resource_id: resourceId,
      limit: (options.limit || 1000).toString(),
      ...options.filters
    });

    const response = await fetch(`https://data.gov.il/api/action/datastore_search?${params}`, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.result || !data.result.records) {
      throw new Error('Invalid response format from data.gov.il');
    }

    ludlog.api(`✅ PublicAPI: Fetched ${data.result.records.length} records from data.gov.il`);
    return data.result.records;

  } catch (error) {
    luderror.api(`❌ PublicAPI: Direct API call failed for resource ${resourceId}:`, error);

    // Fallback to backend proxy if direct call fails (CORS issues)
    try {
      ludlog.api(`🔄 PublicAPI: Trying backend proxy for resource: ${resourceId}`);

      const queryParams = new URLSearchParams({
        limit: (options.limit || 1000).toString(),
        ...options.filters
      });

      const proxyResponse = await fetch(`${getApiBase()}/public/data-gov-il/${resourceId}?${queryParams}`);

      if (!proxyResponse.ok) {
        throw new Error(`Backend proxy error! status: ${proxyResponse.status}`);
      }

      const proxyData = await proxyResponse.json();

      if (proxyData.success && proxyData.data && proxyData.data.records) {
        ludlog.api(`✅ PublicAPI: Fetched ${proxyData.data.records.length} records via backend proxy`);
        return proxyData.data.records;
      } else {
        throw new Error('Invalid response format from backend proxy');
      }

    } catch (proxyError) {
      luderror.api(`❌ PublicAPI: Backend proxy also failed for resource ${resourceId}:`, null, { context: proxyError });
      throw proxyError;
    }
  }
}

/**
 * Cache for API responses to avoid repeated requests
 */
const apiCache = new Map();

/**
 * Cached version of getIsraeliCities - fetches once per session
 * @returns {Promise<Array>} List of Israeli cities
 */
export async function getCachedIsraeliCities() {
  const cacheKey = 'israeli_cities';

  if (apiCache.has(cacheKey)) {
    ludlog.api('📋 PublicAPI: Using cached Israeli cities');
    return apiCache.get(cacheKey);
  }

  const cities = await getIsraeliCities();
  apiCache.set(cacheKey, cities);
  return cities;
}