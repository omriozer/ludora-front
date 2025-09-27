// Enhanced API utility with comprehensive error handling
// This is the single utility function for all API requests in the frontend

import { clog, cerror } from '@/lib/utils';

// Get API base URL from environment
export const getApiBase = () => {
  const apiBase = import.meta.env.VITE_API_BASE;

  if (!apiBase) {
    console.error('❌ VITE_API_BASE environment variable is not set');
    if (import.meta.env.PROD) {
      return 'https://ludora-api.fly.dev/api';
    } else {
      return 'http://localhost:3003/api';
    }
  }

  return apiBase;
};

// Store authentication token
let authToken = null;

// Initialize auth token from localStorage
if (typeof localStorage !== 'undefined') {
  authToken = localStorage.getItem('authToken');
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Set authentication token
export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

// Get current auth token
export function getAuthToken() {
  return authToken;
}

// Main API request function with comprehensive error handling
export async function apiRequest(endpoint, options = {}) {
  const apiBase = getApiBase();

  // Handle special endpoints that are not under /api
  let url;
  if (endpoint === '/health' || endpoint === '/') {
    // Health and root endpoints are at server root, not under /api
    url = apiBase.replace('/api', '') + endpoint;
  } else {
    url = `${apiBase}${endpoint}`;
  }

  // Log request for debugging
  clog(`🌐 API Request: ${options.method || 'GET'} ${url}`);
  clog('📊 API Base:', apiBase);
  clog('🔑 Auth Token:', authToken ? `${authToken.substring(0, 20)}...` : 'None');

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // If body is FormData, remove Content-Type to let browser set boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const requestOptions = {
    credentials: 'include',
    headers,
    ...options
  };

  if (import.meta.env.DEV) {
    clog('📤 Request options:', requestOptions);
  }

  try {
    const response = await fetch(url, requestOptions);

    if (import.meta.env.DEV) {
      clog(`📥 Response status: ${response.status} ${response.statusText}`);
    }

    // Handle different response statuses
    if (!response.ok) {
      let errorData;
      const contentType = response.headers.get('content-type');

      try {
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = { error: await response.text() || response.statusText };
        }
      } catch (parseError) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }

      // Log error details in development
      if (import.meta.env.DEV) {
        cerror('❌ API Error:', errorData);

        // Log validation details if available
        if (errorData.details && Array.isArray(errorData.details)) {
          cerror('📋 Validation Details:', errorData.details);
        }
      }

      // Extract error message
      const errorMessage =
        errorData.error?.message ||
        errorData.message ||
        errorData.error ||
        `API request failed: ${response.status}`;

      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        setAuthToken(null);

        // Redirect to login if not already on login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }

      throw new ApiError(errorMessage, response.status, errorData.details);
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (import.meta.env.DEV) {
      clog('✅ API Response:', data);
    }

    return data;

  } catch (error) {
    // Network errors, parse errors, etc.
    if (error instanceof ApiError) {
      throw error;
    }

    if (import.meta.env.DEV) {
      cerror('🚫 API Request Failed:', error);
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new ApiError('Network error: Unable to connect to server', 0);
    }

    throw new ApiError(error.message || 'An unexpected error occurred', 0);
  }
}

// Convenience methods for different HTTP methods
export const api = {
  get: (endpoint, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, data, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data)
    }),

  put: (endpoint, data, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data)
    }),

  patch: (endpoint, data, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data)
    }),

  delete: (endpoint, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' })
};

// Auth-specific functions
export const auth = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  loginWithFirebase: async (idToken) => {
    const response = await api.post('/auth/verify', { idToken });
    if (response.valid && response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  register: async (userData) => {
    return api.post('/auth/register', userData);
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    setAuthToken(null);
    return response;
  },

  me: async () => {
    return api.get('/auth/me');
  },

  updateProfile: async (profileData) => {
    return api.put('/auth/update-profile', profileData);
  },

  forgotPassword: async (email) => {
    return api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (resetData) => {
    return api.post('/auth/reset-password', resetData);
  }
};

// Error handling helper
export function handleApiError(error, customHandlers = {}) {
  // Log error in development
  if (import.meta.env.DEV) {
    cerror('Handling API error:', error);
  }

  // Check for custom handlers
  if (error.status && customHandlers[error.status]) {
    return customHandlers[error.status](error);
  }

  // Default error handling
  switch (error.status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'Conflict: The resource already exists or there is a conflict.';
    case 422:
      return error.details && error.details.length > 0
        ? `Validation errors: ${error.details.map(d => d.message).join(', ')}`
        : 'Validation error. Please check your input.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    case 0:
      return 'Network error. Please check your connection and try again.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

// React hook for API calls (optional, for React components)
export function useApi() {
  return {
    api,
    auth,
    apiRequest,
    handleApiError,
    setAuthToken,
    getAuthToken,
    ApiError
  };
}

// Purchase schema utility functions
export const purchaseUtils = {
  // Check if purchase has lifetime access (new schema)
  hasLifetimeAccess: (purchase) => !purchase.access_expires_at,

  // Check if access is expired (new schema)
  isAccessExpired: (purchase) => {
    if (!purchase.access_expires_at) return false; // Lifetime access
    return new Date(purchase.access_expires_at) < new Date();
  },

  // Check if purchase is active (not expired)
  isAccessActive: (purchase) => {
    return purchase.payment_status === 'completed' && !purchaseUtils.isAccessExpired(purchase);
  },

  // Get buyer information from user association
  getBuyerInfo: (purchase) => {
    return purchase.buyer || {};
  },

  // Get purchasable entity ID based on type (new schema)
  getEntityId: (purchase) => {
    return purchase.purchasable_id || purchase.product_id || purchase.workshop_id; // Fallbacks for legacy
  },

  // Get purchasable entity type (new schema)
  getEntityType: (purchase) => {
    return purchase.purchasable_type || (purchase.product_id ? 'product' : 'workshop'); // Fallbacks for legacy
  },

  // Format access expiry date for display
  formatAccessExpiry: (purchase) => {
    if (purchaseUtils.hasLifetimeAccess(purchase)) {
      return 'גישה לכל החיים';
    }
    if (purchase.access_expires_at) {
      return new Date(purchase.access_expires_at).toLocaleDateString('he-IL');
    }
    // Legacy fallback
    if (purchase.access_until) {
      return new Date(purchase.access_until).toLocaleDateString('he-IL');
    }
    return 'לא ידוע';
  },

  // Check payment status (normalized)
  isPaymentCompleted: (purchase) => {
    return purchase.payment_status === 'completed' || purchase.payment_status === 'paid'; // Legacy support
  },

  // Get purchase display title
  getDisplayTitle: (purchase) => {
    // Try to get from associated entities first
    const entity = purchase.workshop || purchase.course || purchase.file ||
                  purchase.tool || purchase.game || purchase.product;

    if (entity && entity.title) {
      return entity.title;
    }

    // Legacy fallbacks
    return purchase.product_title || purchase.workshop_title || 'מוצר לא ידוע';
  }
};

export default api;