/**
 * Environment Utility Functions
 *
 * Provides consistent environment checking across the Ludora frontend.
 * Use these functions instead of directly checking import.meta.env values.
 */

/**
 * Check if running in development environment
 * @returns {boolean} true if NODE_ENV is 'development' or DEV mode is true
 */
export function isDev(): boolean {
  return import.meta.env.NODE_ENV === 'development' || import.meta.env.DEV === true;
}

/**
 * Check if running in staging environment
 * @returns {boolean} true if NODE_ENV is 'staging' or MODE is 'staging'
 */
export function isStaging(): boolean {
  return import.meta.env.NODE_ENV === 'staging' || import.meta.env.MODE === 'staging';
}

/**
 * Check if running in production environment
 * @returns {boolean} true if NODE_ENV is 'production' or MODE is 'production'
 */
export function isProd(): boolean {
  return import.meta.env.NODE_ENV === 'production' || import.meta.env.MODE === 'production';
}

/**
 * Get current environment name
 * @returns {string} Current environment ('development', 'staging', 'production', or 'unknown')
 */
export function getEnv(): string {
  return import.meta.env.NODE_ENV || import.meta.env.MODE || 'unknown';
}

/**
 * Check if running in a non-production environment (dev or staging)
 * @returns {boolean} true if not in production
 */
export function isNonProd(): boolean {
  return isDev() || isStaging();
}

/**
 * Get environment-specific API base URL
 * @returns {string} API base URL for current environment
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (isProd()) {
    return 'https://ludora.app/api';
  }

  if (isStaging()) {
    return 'https://staging.ludora.app/api';
  }

  // Development
  return 'http://localhost:3000/api';
}