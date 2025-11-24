/**
 * Utility functions for checking admin status across portals during maintenance mode
 */

/**
 * Check if there are admin-level access tokens in either portal
 * This helps with maintenance mode bypass when admin is logged into one portal but not the other
 */
export function hasAdminTokensInEitherPortal() {
  // Get all cookies
  const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=');
    acc[key] = value;
    return acc;
  }, {});

  // Check for access tokens in both portals
  const teacherToken = cookies.teacher_access_token;
  const studentToken = cookies.student_access_token;

  // If either token exists, we potentially have admin access
  // This is a quick check - the actual admin verification happens server-side
  return !!(teacherToken || studentToken);
}

/**
 * Quick admin verification by making a lightweight API call
 * Only called if we have tokens and maintenance mode is enabled
 */
export async function quickAdminCheck() {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const user = await response.json();
      return user && user.role === 'admin' && !user._isImpersonated;
    }
  } catch (error) {
    // If API call fails, don't bypass maintenance mode
    console.warn('Quick admin check failed:', error);
  }

  return false;
}

/**
 * Comprehensive admin check for maintenance mode bypass
 * Checks admin password bypass first, then current user, then tokens across portals
 */
export async function canBypassMaintenance(currentUser, studentsAccessMode = null) {
  // Primary check: anonymous admin password bypass (always available)
  if (isAnonymousAdmin()) {
    return true;
  }

  // Secondary check: current user is admin and not impersonated
  if (currentUser?.role === 'admin' && !currentUser?._isImpersonated) {
    return true;
  }

  // Tertiary check: look for admin tokens in either portal
  if (hasAdminTokensInEitherPortal()) {
    // Make a quick API call to verify admin status
    return await quickAdminCheck();
  }

  return false;
}

// =============================================
// ANONYMOUS ADMIN FUNCTIONS
// =============================================

/**
 * Local storage key for anonymous admin token
 */
const ANONYMOUS_ADMIN_TOKEN_KEY = 'ludora_anonymous_admin_token';

/**
 * Store anonymous admin token in localStorage
 * @param {string} token - JWT token from server
 */
export function storeAnonymousAdminToken(token) {
  try {
    if (!token || typeof token !== 'string') {
      console.warn('Invalid token provided to storeAnonymousAdminToken');
      return false;
    }
    localStorage.setItem(ANONYMOUS_ADMIN_TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.warn('Failed to store anonymous admin token:', error);
    return false;
  }
}

/**
 * Get anonymous admin token from localStorage
 * @returns {string|null} Token or null if not found
 */
export function getAnonymousAdminToken() {
  try {
    return localStorage.getItem(ANONYMOUS_ADMIN_TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to get anonymous admin token:', error);
    return null;
  }
}

/**
 * Clear anonymous admin token from localStorage
 */
export function clearAnonymousAdminToken() {
  try {
    localStorage.removeItem(ANONYMOUS_ADMIN_TOKEN_KEY);
    return true;
  } catch (error) {
    console.warn('Failed to clear anonymous admin token:', error);
    return false;
  }
}

/**
 * Check if user has valid anonymous admin access
 * @returns {boolean} True if token exists and is valid
 */
export function isAnonymousAdmin() {
  try {
    const token = getAnonymousAdminToken();
    if (!token) {
      return false;
    }

    // Decode token without verification to check expiry
    // Note: We trust this token was signed by our server
    const parts = token.split('.');
    if (parts.length !== 3) {
      clearAnonymousAdminToken(); // Invalid token format
      return false;
    }

    try {
      const payload = JSON.parse(atob(parts[1]));

      // Check if token is expired
      const now = Date.now();
      if (payload.exp && payload.exp * 1000 < now) {
        clearAnonymousAdminToken(); // Expired token
        return false;
      }

      // Check if it's the right type of token
      if (payload.type !== 'anonymous_admin') {
        clearAnonymousAdminToken(); // Wrong token type
        return false;
      }

      // Check if it's for a valid portal
      const validAudiences = ['ludora-student-portal', 'ludora-teacher-portal'];
      if (!validAudiences.includes(payload.aud)) {
        clearAnonymousAdminToken(); // Wrong audience
        return false;
      }

      return true;
    } catch (decodeError) {
      console.warn('Failed to decode anonymous admin token:', decodeError);
      clearAnonymousAdminToken(); // Invalid token
      return false;
    }
  } catch (error) {
    console.warn('Error checking anonymous admin status:', error);
    return false;
  }
}

/**
 * Validate admin password with server
 * @param {string} password - Password to validate
 * @returns {Promise<object>} Result with success, token, and expiry
 */
export async function validateAdminPassword(password) {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }

    const response = await fetch('/api/auth/validate-admin-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Password validation failed');
    }

    // Store the token if validation successful
    if (result.success && result.anonymousAdminToken) {
      const stored = storeAnonymousAdminToken(result.anonymousAdminToken);
      if (!stored) {
        throw new Error('Failed to store admin token');
      }
    }

    return result;
  } catch (error) {
    console.warn('Admin password validation failed:', error);
    throw error;
  }
}

/**
 * Check if anonymous admin can bypass maintenance (always allowed now)
 * @returns {boolean} True if anonymous admin access is allowed
 */
export function canBypassMaintenanceAnonymously() {
  // Anonymous admin always works regardless of access mode
  return isAnonymousAdmin();
}

/**
 * Get expiry date of current anonymous admin token
 * @returns {Date|null} Expiry date or null if no valid token
 */
export function getAnonymousAdminExpiry() {
  try {
    const token = getAnonymousAdminToken();
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }

    return null;
  } catch (error) {
    console.warn('Failed to get anonymous admin expiry:', error);
    return null;
  }
}

// Clean up expired tokens on page load
if (typeof window !== 'undefined') {
  // Check and clean expired tokens when module loads
  setTimeout(() => {
    if (!isAnonymousAdmin()) {
      clearAnonymousAdminToken();
    }
  }, 100);

  // Clean up on page unload for security
  window.addEventListener('beforeunload', () => {
    // Optional: Clear token on page unload for extra security
    // Uncomment if you want tokens to only last for single session
    // clearAnonymousAdminToken();
  });
}