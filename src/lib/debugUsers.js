/**
 * Debug User Management for Frontend
 *
 * Determines which users should see debug logs in production.
 * This module helps with troubleshooting user-specific issues
 * without exposing logs to all users.
 */

// Debug users can be set via environment variable or localStorage
const DEBUG_USERS_KEY = 'ludora_debug_users';
const ENV_DEBUG_USERS = import.meta.env.VITE_DEBUG_USER_IDS ?
  import.meta.env.VITE_DEBUG_USER_IDS.split(',').map(id => id.trim()) :
  [];

// Load debug users from localStorage
function loadDebugUsers() {
  try {
    const stored = localStorage.getItem(DEBUG_USERS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return ENV_DEBUG_USERS;
}

// Current debug users list
let DEBUG_USERS = loadDebugUsers();

// Current user ID (set by auth system)
let currentUserId = null;

/**
 * Check if the current user is a debug user
 * @returns {boolean} True if current user should see debug logs
 */
export function isDebugUser() {
  if (!currentUserId) return false;
  return DEBUG_USERS.includes(String(currentUserId));
}

/**
 * Set the current user ID (typically called after authentication)
 * @param {string|number} userId - The authenticated user's ID
 */
export function setCurrentUser(userId) {
  currentUserId = userId ? String(userId) : null;
}

/**
 * Clear the current user (typically on logout)
 */
export function clearCurrentUser() {
  currentUserId = null;
}

/**
 * Get list of debug user IDs
 * @returns {string[]} Array of user IDs that are debug users
 */
export function getDebugUsers() {
  return [...DEBUG_USERS];
}

/**
 * Add a user to debug users list
 * @param {string|number} userId - User ID to add
 */
export function addDebugUser(userId) {
  const id = String(userId);
  if (!DEBUG_USERS.includes(id)) {
    DEBUG_USERS.push(id);
    saveDebugUsers();
  }
}

/**
 * Remove a user from debug users list
 * @param {string|number} userId - User ID to remove
 */
export function removeDebugUser(userId) {
  const id = String(userId);
  const index = DEBUG_USERS.indexOf(id);
  if (index > -1) {
    DEBUG_USERS.splice(index, 1);
    saveDebugUsers();
  }
}

/**
 * Save debug users to localStorage
 */
function saveDebugUsers() {
  try {
    localStorage.setItem(DEBUG_USERS_KEY, JSON.stringify(DEBUG_USERS));
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Enable debug mode for current session (development helper)
 */
export function enableDebugMode() {
  if (currentUserId) {
    addDebugUser(currentUserId);
    console.log('Debug mode enabled for user:', currentUserId);
  } else {
    console.warn('No user logged in. Cannot enable debug mode.');
  }
}

/**
 * Disable debug mode for current session
 */
export function disableDebugMode() {
  if (currentUserId) {
    removeDebugUser(currentUserId);
    console.log('Debug mode disabled for user:', currentUserId);
  }
}

// Export for browser console debugging
if (typeof window !== 'undefined' && import.meta.env.MODE === 'development') {
  window.ludoraDebug = {
    enableDebugMode,
    disableDebugMode,
    getDebugUsers,
    addDebugUser,
    removeDebugUser
  };
}