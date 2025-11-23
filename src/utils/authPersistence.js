/**
 * Authentication Persistence Utility
 *
 * Provides session storage fallback for development when cookies fail.
 * Production uses httpOnly cookies only - this is a development aid.
 *
 * COOKIE PERSISTENCE FIX: This utility helps debug authentication issues
 * by storing minimal auth state in sessionStorage when cookies don't work
 * properly in development environments.
 */

const AUTH_STATE_KEY = 'ludora_auth_state_dev';
const AUTH_STATE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if we're in development mode
 */
function isDevelopment() {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
}

/**
 * Persist minimal authentication state to sessionStorage (development only)
 *
 * NOTE: This is NOT a replacement for cookies - it's a debugging aid.
 * Production must always use httpOnly cookies for security.
 *
 * @param {Object} authState - Current authentication state from AuthManager
 */
export function persistAuthState(authState) {
  if (!isDevelopment()) return;

  try {
    // Only persist minimal state needed for recovery
    const minimalState = {
      authType: authState.authType,
      entityId: authState.player?.id || authState.user?.id || null,
      displayName: authState.player?.display_name || authState.user?.display_name || null,
      timestamp: Date.now()
    };

    sessionStorage.setItem(AUTH_STATE_KEY, JSON.stringify(minimalState));
  } catch (e) {
    // Silently fail in development - not critical
  }
}

/**
 * Get persisted authentication state (development only)
 *
 * @returns {Object|null} Persisted auth state or null if not available/expired
 */
export function getPersistedAuthState() {
  if (!isDevelopment()) return null;

  try {
    const stored = sessionStorage.getItem(AUTH_STATE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored);

    // Check if state is still valid (within TTL)
    if (Date.now() - state.timestamp > AUTH_STATE_TTL) {
      sessionStorage.removeItem(AUTH_STATE_KEY);
      return null;
    }

    return state;
  } catch (e) {
    return null;
  }
}

/**
 * Clear persisted authentication state
 */
export function clearPersistedAuthState() {
  try {
    sessionStorage.removeItem(AUTH_STATE_KEY);
  } catch (e) {
    // Silently fail - not critical
  }
}

/**
 * Check if there's any indication of a previous session
 * This helps AuthManager decide whether to retry authentication
 *
 * @returns {boolean} True if there was a previous session
 */
export function hadPreviousSession() {
  if (!isDevelopment()) return false;

  try {
    const state = getPersistedAuthState();
    return state !== null && state.entityId !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Log authentication state for debugging
 * Useful for troubleshooting cookie/session issues
 * NOTE: Only logs in development when explicitly called
 *
 * @param {string} context - Where this is being called from
 * @param {Object} authState - Current auth state
 */
export function logAuthDebugInfo(context, authState = {}) {
  // This function is intentionally a no-op in production
  // It exists as a development aid that can be enabled manually when debugging
  if (!isDevelopment()) return;
}

export default {
  persistAuthState,
  getPersistedAuthState,
  clearPersistedAuthState,
  hadPreviousSession,
  logAuthDebugInfo
};
