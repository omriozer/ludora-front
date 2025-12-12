/**
 * Type-Safe OpenAPI Client for Ludora Frontend
 *
 * This client provides full TypeScript type safety for all API calls.
 * Generated types are automatically derived from the backend OpenAPI schema.
 *
 * @module services/openApiClient
 */

import createClient from 'openapi-fetch';
import type { paths } from '../types/api';
import { ludlog, luderror } from '@/lib/ludlog';
import { isDev, getApiBaseUrl } from '@/utils/environment';

/**
 * Type-safe API client with automatic request/response validation
 *
 * Features:
 * - Full TypeScript autocomplete for all endpoints
 * - Automatic request/response type checking
 * - Built-in error handling
 * - Cookie-based authentication (handled automatically by browser)
 */
export const apiClient = createClient<paths>({
  baseUrl: getApiBaseUrl(),
  credentials: 'include',  // Include cookies in requests
});

/**
 * Request interceptor - runs before every API call
 *
 * Automatically includes authentication cookies (no manual header management needed)
 */
apiClient.use({
  async onRequest({ request }) {
    // Log requests in development
    if (isDev()) {
      ludlog.api('API Request:', request.method, request.url);
    }

    return request;
  },

  async onResponse({ response }) {
    // Log responses in development
    if (isDev()) {
      ludlog.api('API Response:', response.status, response.url);
    }

    // Handle common error statuses
    if (!response.ok) {
      const errorBody = await response.clone().json().catch(() => null);

      if (response.status === 401) {
        // Unauthorized - redirect to login
        ludlog.api('Unauthorized API call - authentication required');

        // You can dispatch a global auth error event here
        window.dispatchEvent(new CustomEvent('api:unauthorized'));
      }

      if (response.status === 403) {
        // Forbidden - user doesn't have permission
        ludlog.api('Forbidden API call - insufficient permissions');
      }

      if (response.status === 404) {
        // Not found
        ludlog.api('API endpoint not found:', response.url);
      }

      if (response.status >= 500) {
        // Server error
        luderror.api('Server error:', errorBody);
      }
    }

    return response;
  },
});

/**
 * Example Usage:
 *
 * ```typescript
 * import { apiClient } from '@/services/openApiClient';
 * import { luderror } from '@/lib/ludlog';
 *
 * // GET request with full type safety
 * const { data, error } = await apiClient.GET('/products/{id}', {
 *   params: {
 *     path: { id: 'product_123' }
 *   }
 * });
 *
 * if (error) {
 *   luderror.api('Failed to fetch product:', error);
 *   return;
 * }
 *
 * // data is fully typed as ProductWithAccess
 * ludlog.api('Product fetched:', data.title); // TypeScript knows this field exists
 * ludlog.api('Access status:', data.access.hasAccess); // Full nested type safety
 *
 * // POST request with type-safe body
 * const { data: newProduct, error: createError } = await apiClient.POST('/products', {
 *   body: {
 *     product_type: 'game',  // TypeScript enforces valid enum values
 *     title: 'New Game',
 *     price: 49.90
 *   }
 * });
 *
 * // TypeScript will show autocomplete for all available endpoints
 * // and will validate request/response types at compile time
 * ```
 */

export default apiClient;
