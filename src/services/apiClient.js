// src/services/apiClient.js
// REST API client for Ludora API server

import { getApiBase } from '@/utils/api.js';
import { clog, cerror } from '@/lib/utils';
import { showError } from '@/utils/messaging';
import { ApiError } from '@/utils/ApiError.js';

// Re-export clog and cerror for use by other modules
export { clog, cerror };

// Use centralized API base configuration
const API_BASE = getApiBase();

// Note: Authentication now uses httpOnly cookies instead of localStorage tokens

export async function getCurrentUser(suppressUserErrors = false) {
  return apiRequest('/auth/me', { suppressUserErrors });
}

export async function loginWithFirebase({ idToken }) {
  const response = await apiRequest('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ idToken })
  });

  // Note: Authentication tokens are now set as httpOnly cookies by the server
  return response;
}

export async function logout() {
  // Note: Authentication cookies are cleared by the server
  return apiRequest('/auth/logout', {
    method: 'POST'
  });
}

// Generic API request helper with cookie-based authentication
export async function apiRequest(endpoint, options = {}) {
  return apiRequestWithRetry(endpoint, options, false);
}

// Internal function to handle API requests with token refresh retry
async function apiRequestWithRetry(endpoint, options = {}, isRetryAttempt = false) {
  const url = `${API_BASE}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add timeout protection
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 15000); // 15 second timeout

  const defaultOptions = {
    credentials: 'include', // Automatically include cookies
    headers,
    signal: controller.signal
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    clearTimeout(timeoutId); // Clear timeout on successful response

    if (!response.ok) {
      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401 && !isRetryAttempt && !endpoint.includes('/auth/logout') && !endpoint.includes('/auth/refresh')) {
        try {
          // Attempt to refresh tokens by making a simple authenticated request
          // The auth middleware will automatically handle refresh token logic
          const refreshResponse = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (refreshResponse.ok) {
            // Retry the original request now that tokens are refreshed
            return apiRequestWithRetry(endpoint, options, true);
          }
        } catch (refreshError) {
          // Continue with original error handling
        }
      }

      const error = await response.json().catch(() => ({ error: response.statusText }));
      cerror('API Error:', error);

      // Log validation details if available
      if (error.details && Array.isArray(error.details)) {
        cerror('Validation Details:', error.details);
      }

      const errorMessage = typeof error.error === 'string' ? error.error :
                        error.message ||
                        JSON.stringify(error) ||
                        `API request failed: ${response.status}`;
      throw new ApiError(errorMessage, response.status, response);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId); // Clear timeout on error
    cerror('API Request Failed:', error);

    // Handle timeout specifically
    if (error.name === 'AbortError') {
      const timeoutError = new ApiError('Request timeout - please check your connection and try again', 408);

      // Only show user-facing error messages if not explicitly suppressed
      const suppressUserErrors = options.suppressUserErrors || false;
      if (!suppressUserErrors) {
        showError(
          "בקשה נכשלה",
          "הבקשה ארכה זמן רב מדי. אנא בדוק את החיבור לאינטרנט ונסה שוב."
        );
      }
      throw timeoutError;
    }

    // Only show user-facing error messages if not explicitly suppressed
    const suppressUserErrors = options.suppressUserErrors || false;

    if (!suppressUserErrors) {
      // Show user-friendly error for specific error types
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        showError(
          "בעיית חיבור",
          "לא הצלחנו להתחבר לשרת. אנא בדוק את החיבור לאינטרנט ונסה שוב."
        );
      } else if (error.message.includes('Access token required') || error.message.includes('Unauthorized')) {
        showError(
          "שגיאת הרשאה",
          "נדרשת התחברות מחדש. אנא רענן את הדף והתחבר שוב."
        );
      }
    }

    throw error;
  }
}

// Anonymous API request helper without credentials (for student portal)
export async function apiRequestAnonymous(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add timeout protection
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 15000); // 15 second timeout

  const defaultOptions = {
    credentials: 'omit', // No credentials for anonymous requests
    headers,
    signal: controller.signal
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    clearTimeout(timeoutId); // Clear timeout on successful response

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      cerror('Anonymous API Error:', error);

      // Log validation details if available
      if (error.details && Array.isArray(error.details)) {
        cerror('Anonymous Validation Details:', error.details);
      }

      const errorMessage = typeof error.error === 'string' ? error.error :
                        error.message ||
                        JSON.stringify(error) ||
                        `Anonymous API request failed: ${response.status}`;
      throw new ApiError(errorMessage, response.status, response);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId); // Clear timeout on error
    cerror('Anonymous API Request Failed:', error);

    // Handle timeout specifically
    if (error.name === 'AbortError') {
      const timeoutError = new ApiError('Request timeout - please check your connection and try again', 408);

      // Only show user-facing error messages if not explicitly suppressed
      const suppressUserErrors = options.suppressUserErrors || false;
      if (!suppressUserErrors) {
        showError(
          "בקשה נכשלה",
          "הבקשה ארכה זמן רב מדי. אנא בדוק את החיבור לאינטרנט ונסה שוב."
        );
      }
      throw timeoutError;
    }

    // Only show user-facing error messages if not explicitly suppressed
    const suppressUserErrors = options.suppressUserErrors || false;

    if (!suppressUserErrors) {
      // Show user-friendly error for specific error types
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        showError(
          "בעיית חיבור",
          "לא הצלחנו להתחבר לשרת. אנא בדוק את החיבור לאינטרנט ונסה שוב."
        );
      }
      // Note: Don't show auth errors for anonymous requests
    }

    throw error;
  }
}

// File download helper - returns blob instead of JSON
export async function apiDownload(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const headers = {
    ...options.headers
  };

  const defaultOptions = {
    credentials: 'include', // Automatically include cookies
    headers
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      cerror('Download Error:', error);

      const errorMessage = typeof error.error === 'string' ? error.error :
                        error.message ||
                        JSON.stringify(error) ||
                        `Download failed: ${response.status}`;
      throw new ApiError(errorMessage, response.status, response);
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    cerror('Download Failed:', error);

    // Show user-friendly error for network failures
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      showError(
        "בעיית הורדה",
        "לא הצלחנו להוריד את הקובץ. אנא נסה שוב.",
        { duration: 8000 }
      );
    }

    throw error;
  }
}

// File/video upload with progress tracking
export async function apiUploadWithProgress(endpoint, formData, onProgress = null, options = {}) {
  // IMPORTANT: Bypass Vite proxy for uploads in development to avoid content-type corruption
  // In development, Vite proxy can corrupt multipart/form-data, so we go directly to API server
  let url;
  if (import.meta.env.DEV) {
    // In development, bypass the Vite proxy and go directly to the API server
    const apiPort = import.meta.env.VITE_API_PORT || '3003';
    url = `http://localhost:${apiPort}/api${endpoint}`;
  } else {
    // In production, use the normal API base
    url = `${API_BASE}${endpoint}`;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          cerror('Invalid response format:', e);
          reject(new Error('Invalid response format'));
        }
      } else {
        cerror(`Upload failed: ${xhr.status}`, xhr.responseText);
        try {
          const errorData = JSON.parse(xhr.responseText);
          const errorMessage = errorData.error || errorData.message || `Upload failed with status: ${xhr.status}`;
          reject(new ApiError(errorMessage, xhr.status));
        } catch {
          reject(new ApiError(`Upload failed with status: ${xhr.status}`, xhr.status));
        }
      }
    });

    xhr.addEventListener('error', () => {
      cerror('Network error during upload');
      showError(
        "בעיית העלאה",
        "שגיאת רשת במהלך העלאת הקובץ. אנא נסה שוב.",
        { duration: 8000 }
      );
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('timeout', () => {
      cerror('Upload timeout');
      showError(
        "העלאה נכשלה",
        "העלאת הקובץ ארכה זמן רב מדי. אנא נסה שוב.",
        { duration: 10000 }
      );
      reject(new Error('Upload timeout'));
    });

    // Set timeout (default 30 minutes for large video files)
    xhr.timeout = options.timeout || (30 * 60 * 1000);

    xhr.open('POST', url, true);

    // XMLHttpRequest automatically includes cookies in requests to same origin
    // or when withCredentials is set to true
    xhr.withCredentials = true;

    // Add custom headers (but NOT Content-Type - let browser set it with boundary for multipart)
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, value);
        }
      });
    }

    xhr.send(formData);
  });
}

// Entity CRUD operations class
class EntityAPI {
  constructor(entityName) {
    this.entityName = entityName;
    this.basePath = `/entities/${entityName}`;
  }

  async find(query = {}) {
    const searchParams = new URLSearchParams();

    // Handle query parameters properly, including arrays
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        // For arrays, add multiple entries with the same key
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.set(key, value);
      }
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
    return apiRequest(endpoint);
  }

  // Add filter method as an alias to find for compatibility
  async filter(query = {}, options = null) {
    const searchParams = new URLSearchParams();

    // Handle query parameters properly, including arrays
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        // For arrays, add multiple entries with the same key
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.set(key, value);
      }
    }

    // Handle different option formats
    if (options) {
      if (options.order) {
        // If options has an order property, stringify it as sort parameter
        searchParams.set('sort', JSON.stringify(options.order));
      } else if (typeof options === 'string' || Array.isArray(options)) {
        // If options is a simple string or array, use it directly
        searchParams.set('sort', Array.isArray(options) ? JSON.stringify(options) : options);
      }

      // Handle other options like limit, offset
      if (options.limit) {
        searchParams.set('limit', options.limit.toString());
      }
      if (options.offset) {
        searchParams.set('offset', options.offset.toString());
      }
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
    return apiRequest(endpoint);
  }

  async findById(id) {
    return apiRequest(`${this.basePath}/${id}`);
  }

  async create(data) {
    return apiRequest(this.basePath, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async update(id, data) {
    return apiRequest(`${this.basePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(id) {
    return apiRequest(`${this.basePath}/${id}`, {
      method: 'DELETE'
    });
  }

  async bulk(operation, data) {
    return apiRequest(`${this.basePath}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ operation, data })
    });
  }

  // Add list method for backward compatibility
  async list(sortOrQuery = {}) {
    // Handle legacy sort parameter (string) or query object
    if (typeof sortOrQuery === 'string') {
      // Legacy format: list('-created_date') or list('name')
      const sortField = sortOrQuery.startsWith('-') ? sortOrQuery.substring(1) : sortOrQuery;
      const sortDirection = sortOrQuery.startsWith('-') ? 'DESC' : 'ASC';

      // Map common field names
      const fieldMapping = {
        'created_date': 'created_at',
        'updated_date': 'updated_at'
      };

      const mappedField = fieldMapping[sortField] || sortField;

      return this.find({}, { order: [[mappedField, sortDirection]] });
    } else {
      // New format: list({ field: 'value' })
      return this.find(sortOrQuery);
    }
  }
}

// Entity APIs
export const Registration = new EntityAPI('registration');
export const EmailTemplate = new EntityAPI('emailtemplate');
export const Settings = new EntityAPI('settings');
export const OldSettings = new EntityAPI('old_settings');
export const Category = new EntityAPI('category');
export const Coupon = new EntityAPI('coupon');
export const SupportMessage = new EntityAPI('supportmessage');
export const Notification = new EntityAPI('notification');

// New dedicated entity types
export const Product = new EntityAPI('product');
export const Workshop = new EntityAPI('workshop');
export const Course = new EntityAPI('course');
export const File = new EntityAPI('file');
export const Tool = new EntityAPI('tool');
export const LessonPlan = new EntityAPI('lessonplan');

export const Purchase = new EntityAPI('purchase');
export const EmailLog = new EntityAPI('emaillog');
export const Game = new EntityAPI('game');
export const AudioFile = new EntityAPI('audiofile');
export const Word = new EntityAPI('word');
export const WordEN = new EntityAPI('worden');
export const Image = new EntityAPI('image');
export const QA = new EntityAPI('qa');
export const Grammar = new EntityAPI('grammar');
export const ContentList = new EntityAPI('contentlist');

// ==========================================
// EDUCATIONAL CONTENT MANAGEMENT APIS
// ==========================================

/**
 * EduContent API - Educational content management with file upload support
 * Handles text content, image content, and card backgrounds with streaming URLs
 */
export const EduContent = {
  /**
   * List/search educational content with pagination
   * @param {Object} params - Query parameters
   * @param {string} params.search - Search term
   * @param {string} params.element_type - Filter by element type
   * @param {number} params.limit - Results per page (max 100)
   * @param {number} params.offset - Results offset
   * @returns {Promise<Object>} Paginated content results with fileUrls
   */
  async find(params = {}) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value);
      }
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/edu-content?${queryString}` : '/edu-content';
    return apiRequest(endpoint);
  },

  /**
   * Get single educational content item
   * @param {string} id - Content ID
   * @returns {Promise<Object>} Content with fileUrl if file exists
   */
  async findById(id) {
    return apiRequest(`/edu-content/${id}`);
  },

  /**
   * Create new text-based educational content
   * @param {Object} data - Content data
   * @param {string} data.element_type - 'data', 'playing_card_complete', 'playing_card_bg'
   * @param {string} data.content - Content text/description
   * @param {Object} data.content_metadata - Additional metadata
   * @returns {Promise<Object>} Created content
   */
  async create(data) {
    return apiRequest('/edu-content', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Create educational content with file upload
   * @param {FormData} formData - Form data with file and content info
   * @param {Function} onProgress - Progress callback (optional)
   * @returns {Promise<Object>} Created content with fileUrl
   */
  async upload(formData, onProgress = null) {
    return apiUploadWithProgress('/edu-content/upload', formData, onProgress);
  },

  /**
   * Update educational content metadata (not file)
   * @param {string} id - Content ID
   * @param {Object} data - Updates to apply
   * @returns {Promise<Object>} Updated content
   */
  async update(id, data) {
    return apiRequest(`/edu-content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Delete educational content with S3 cleanup
   * @param {string} id - Content ID
   * @returns {Promise<Object>} Success response
   */
  async delete(id) {
    return apiRequest(`/edu-content/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Get content usage statistics
   * @param {string} id - Content ID
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsage(id) {
    return apiRequest(`/edu-content/${id}/usage`);
  }
};

/**
 * GameContent API - Game content management via EduContentUse relationships
 * Handles the relationship between games and educational content
 */
export const GameContent = {
  /**
   * Get all content usage for a game with populated content and streaming URLs
   * @param {string} gameId - Game ID
   * @param {string} useType - Optional filter by use type ('pair', 'single_content', 'group')
   * @returns {Promise<Array>} Content usage records with populated content
   */
  async getGameContents(gameId, useType = null) {
    const params = useType ? `?use_type=${useType}` : '';
    return apiRequest(`/games/${gameId}/contents${params}`);
  },

  /**
   * Create new content usage for a game
   * @param {string} gameId - Game ID
   * @param {Object} data - Content usage data
   * @param {string} data.use_type - 'pair', 'single_content', or 'group'
   * @param {Array<string>} data.contents - Array of content IDs
   * @returns {Promise<Object>} Created content usage with populated content
   */
  async createContentUse(gameId, data) {
    return apiRequest(`/games/${gameId}/content-use`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Update existing content usage for a game
   * @param {string} gameId - Game ID
   * @param {string} useId - Content usage ID
   * @param {Object} data - Updates to apply
   * @param {Array<string>} data.contents - New content IDs
   * @returns {Promise<Object>} Updated content usage with populated content
   */
  async updateContentUse(gameId, useId, data) {
    return apiRequest(`/games/${gameId}/content-use/${useId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Delete content usage from a game
   * @param {string} gameId - Game ID
   * @param {string} useId - Content usage ID
   * @returns {Promise<Object>} Success response
   */
  async deleteContentUse(gameId, useId) {
    return apiRequest(`/games/${gameId}/content-use/${useId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Get content statistics for a game
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} Content statistics
   */
  async getGameContentStats(gameId) {
    return apiRequest(`/games/${gameId}/content-stats`);
  }
};

// Add custom method to ContentList
ContentList.getContentItems = async function(listId) {
  // Note: The /entities/contentlist/:id/items endpoint doesn't exist in the backend
  // So we'll throw an error immediately to trigger the relationship-based fallback
  throw new Error('ContentList items endpoint not implemented - using relationship fallback');
};
export const ContentRelationship = new EntityAPI('contentrelationship');
export const SubscriptionPlan = new EntityAPI('subscriptionplan');
export const WebhookLog = new EntityAPI('webhooklog');
export const PendingSubscription = new EntityAPI('pendingsubscription');
export const SubscriptionHistory = new EntityAPI('subscriptionhistory');
export const GameSession = new EntityAPI('gamesession');
export const Attribute = new EntityAPI('attribute');
export const GameContentTag = new EntityAPI('gamecontenttag');
export const ContentTag = new EntityAPI('contenttag');
export const School = new EntityAPI('school');
export const Classroom = new EntityAPI('classroom');
export const StudentInvitation = new EntityAPI('studentinvitation');
export const ParentConsent = new EntityAPI('parentconsent');
export const ClassroomMembership = new EntityAPI('classroommembership');

// Curriculum entities
export const Curriculum = new EntityAPI('curriculum');
export const CurriculumItem = new EntityAPI('curriculumitem');

// Content Topic entities
export const ContentTopic = new EntityAPI('contenttopic');
export const ContentTopicProduct = new EntityAPI('contenttopicproduct');
export const CurriculumItemContentTopic = new EntityAPI('curriculumitemcontenttopic');

// User entity API with auth methods
const UserEntityAPI = new EntityAPI('user');

// Firebase auth integration for login with redirect
async function loginWithFirebaseAuth() {
  try {
    // Import Firebase auth dynamically to avoid issues if not available
    const { initializeApp } = await import('firebase/app');
    const { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult } = await import('firebase/auth');
    
    // Firebase config from environment variables
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    // Check for redirect result first
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const idToken = await result.user.getIdToken();
      return await loginWithFirebase({ idToken });
    }

    // If no redirect result, trigger redirect
    await signInWithRedirect(auth, provider);
    
  } catch (error) {
    cerror('Firebase login error:', error);

    // Show user-friendly error message
    showError(
      "שגיאה בהתחברות",
      "לא הצלחנו להתחבר עם Google. אנא נסה שוב.",
      { duration: 8000 }
    );

    throw new Error('שגיאה בהתחברות עם Google');
  }
}

export const User = {
  ...UserEntityAPI,
  find: UserEntityAPI.find.bind(UserEntityAPI), // Ensure find is exposed
  findById: UserEntityAPI.findById.bind(UserEntityAPI), // Ensure findById is exposed
  update: UserEntityAPI.update.bind(UserEntityAPI), // Ensure update is exposed
  getCurrentUser,
  login: loginWithFirebaseAuth, // Use Firebase auth for login
  loginWithRedirect: loginWithFirebaseAuth, // Alias for compatibility
  logout,
  // Alias for compatibility that supports suppressUserErrors parameter
  me: getCurrentUser,
  filter: UserEntityAPI.find.bind(UserEntityAPI),
  // Add updateMyUserData method for content creator signup
  async updateMyUserData(data) {
    return apiRequest('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

// Player authentication API for anonymous student authentication
export const Player = {
  /**
   * Login with privacy code for anonymous player authentication
   * @param {Object} data - Login data
   * @param {string} data.privacy_code - 8-character privacy code
   * @returns {Promise<Object>} Login response with player data
   */
  async login(data) {
    return apiRequest('/players/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Logout current player session
   * @returns {Promise<Object>} Logout response
   */
  async logout() {
    return apiRequest('/players/logout', {
      method: 'POST'
    });
  },

  /**
   * Get current player information (equivalent to User.getCurrentUser)
   * @param {boolean} suppressUserErrors - Whether to suppress error messages
   * @returns {Promise<Object>} Current player data
   */
  async getCurrentPlayer(suppressUserErrors = false) {
    return apiRequest('/players/me', { suppressUserErrors });
  },

  /**
   * Update current player profile
   * @param {Object} data - Profile updates
   * @param {string} data.display_name - Updated display name
   * @param {Object} data.preferences - Updated preferences
   * @param {Array} data.achievements - Updated achievements
   * @returns {Promise<Object>} Updated player data
   */
  async updateProfile(data) {
    return apiRequest('/players/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Alias for getCurrentPlayer for consistency with User API
   */
  get me() {
    return this.getCurrentPlayer;
  }
};

// Unified Product API for all product types
export const ProductAPI = {
  async create(data) {
    return apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async findById(id) {
    return apiRequest(`/entities/product/${id}`, {
      method: 'GET'
    });
  },

  async update(id, data) {
    return apiRequest(`/entities/product/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async list(query = {}) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.set(key, value);
      }
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    return apiRequest(endpoint);
  }
};

// Function APIs

export async function applyCoupon(data) {
  return apiRequest('/functions/applyCoupon', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateExistingRegistrations(data) {
  return apiRequest('/functions/updateExistingRegistrations', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function sendRegistrationEmail(data) {
  return apiRequest('/functions/sendRegistrationEmail', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function handlePayplusCallback(data) {
  return apiRequest('/functions/handlePayplusCallback', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Unified PayPlus payment page creation for both checkout and subscriptions
 *
 * This function handles the frontend side of PayPlus payment page creation.
 * The actual PayPlus API integration and validation happens on the backend for security.
 *
 * PayPlus API Flow:
 * 1. Frontend calls this function with cart data
 * 2. Backend receives request at /payments/createPayplusPaymentPage
 * 3. Backend calls shouldOpenPayplusPage() to validate if any paid items exist
 * 4. If validation passes, backend calls PayPlus API: POST /api/v1.0/PaymentPages/GenerateLink
 * 5. Backend returns payment URL to frontend
 * 6. Frontend opens PayPlus payment page in modal/iframe
 *
 * @param {Object} data - Payment request data
 * @param {Array} data.cartItems - Cart items to process
 * @param {string} data.environment - 'production' or 'staging'
 * @param {string} data.frontendOrigin - Source of payment request
 * @returns {Promise<Object>} Payment page creation response
 */
export async function createPayplusPaymentPage(data) {
  return apiRequest('/payments/createPayplusPaymentPage', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function processEmailTriggers(data) {
  return apiRequest('/functions/processEmailTriggers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function scheduleEmailProcessor(data) {
  return apiRequest('/functions/scheduleEmailProcessor', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function triggerEmailAutomation(data) {
  return apiRequest('/functions/triggerEmailAutomation', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateExistingGames(data) {
  return apiRequest('/functions/updateExistingGames', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function uploadVerbsBulk(data) {
  return apiRequest('/functions/uploadVerbsBulk', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function cleanupStaticTexts(data) {
  return apiRequest('/functions/cleanupStaticTexts', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}


export async function deleteFile(data) {
  return apiRequest('/functions/deleteFile', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function createSignedUrl(data) {
  return apiRequest('/functions/createSignedUrl', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function initializeSystemEmailTemplates(data) {
  return apiRequest('/functions/initializeSystemEmailTemplates', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateSystemEmailTemplates(data) {
  return apiRequest('/functions/updateSystemEmailTemplates', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function sendInvitationEmails(data) {
  return apiRequest('/functions/sendInvitationEmails', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// Integration APIs
export const Core = {
  SendEmail: async (data) => apiRequest('/integrations/sendEmail', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  UploadFile: async (data) => {
    const formData = new FormData();
    
    // Handle file upload
    if (data.file) {
      formData.append('file', data.file);
    }
    
    // Add other form fields
    Object.keys(data).forEach(key => {
      if (key !== 'file') {
        formData.append(key, data[key]);
      }
    });
    
    return apiRequest('/integrations/uploadFile', {
      method: 'POST',
      body: formData,
      headers: {} // Remove Content-Type header to let browser set multipart boundary
    });
  },
  ExtractDataFromUploadedFile: async (data) => {
    const formData = new FormData();
    
    if (data.file) {
      formData.append('file', data.file);
    }
    
    Object.keys(data).forEach(key => {
      if (key !== 'file') {
        formData.append(key, data[key]);
      }
    });
    
    return apiRequest('/integrations/extractDataFromUploadedFile', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  },
};

export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;

// Add more user-related API calls as needed

// ---
// Required .env variables (example):
// VITE_API_BASE=https://api.example.com
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// VITE_FIREBASE_PROJECT_ID=...
// VITE_FIREBASE_STORAGE_BUCKET=...
// VITE_FIREBASE_MESSAGING_SENDER_ID=...
// VITE_FIREBASE_APP_ID=...
// VITE_FIREBASE_MEASUREMENT_ID=...
// ---
