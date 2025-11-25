/**
 * Shared Navigation Utilities
 * Centralized visibility logic for both navbar and 404 page
 */

import { NAV_VISIBILITY_OPTIONS } from '@/constants/settingsKeys';

/**
 * Check if user can see a navigation item based on visibility setting
 * @param {string} visibility - The visibility setting ('public', 'logged_in_users', etc.)
 * @param {Object} currentUser - Current user object
 * @param {boolean} isActualAdmin - True if user is admin and not impersonating
 * @param {boolean} isContentCreator - True if user has content creator status
 * @returns {boolean} - Whether user can see the item
 */
export function canUserSeeItem(visibility, currentUser, isActualAdmin, isContentCreator) {
  switch (visibility) {
    case NAV_VISIBILITY_OPTIONS.PUBLIC:
      return true;
    case NAV_VISIBILITY_OPTIONS.LOGGED_IN_USERS:
      return !!currentUser;
    case NAV_VISIBILITY_OPTIONS.ADMIN_ONLY:
      return isActualAdmin;
    case NAV_VISIBILITY_OPTIONS.ADMINS_AND_CREATORS:
      return isActualAdmin || isContentCreator;
    case NAV_VISIBILITY_OPTIONS.HIDDEN:
      return false;
    default:
      return true; // Default to public
  }
}

/**
 * Check if user has admin privileges (admin role and not impersonating)
 * @param {Object} currentUser - Current user object
 * @param {boolean} isImpersonating - True if currently impersonating another user
 * @returns {boolean} - Whether user is an actual admin
 */
export function isActualAdmin(currentUser, isImpersonating = false) {
  return currentUser?.role === 'admin' && !isImpersonating;
}

/**
 * Check if user is a content creator (has signed content creator agreement)
 * @param {Object} currentUser - Current user object
 * @returns {boolean} - Whether user is a content creator
 */
export function isContentCreator(currentUser) {
  return !!currentUser?.content_creator_agreement_sign_date;
}

/**
 * Get visibility for a specific navigation item from settings
 * @param {Object} settings - Settings object
 * @param {string} navKey - Navigation setting key (e.g., 'nav_files_visibility')
 * @param {string} defaultValue - Default visibility if setting not found
 * @returns {string} - Visibility setting value
 */
export function getNavItemVisibility(settings, navKey, defaultValue = 'public') {
  if (!settings) return defaultValue;
  return settings[navKey] || defaultValue;
}

/**
 * Check if navigation item is enabled in settings
 * @param {Object} settings - Settings object
 * @param {string} navKey - Navigation setting key (e.g., 'nav_files_enabled')
 * @returns {boolean} - Whether the nav item is enabled
 */
export function isNavItemEnabled(settings, navKey) {
  if (!settings) return false;
  return settings[navKey] !== false;
}

/**
 * Get all visible navigation items for the current user
 * @param {Object} settings - Settings object
 * @param {Object} currentUser - Current user object
 * @param {boolean} isImpersonating - Whether currently impersonating
 * @param {Array} availableItems - Array of available nav item configs
 * @returns {Array} - Filtered array of visible nav items
 */
export function getVisibleNavItems(settings, currentUser, isImpersonating = false, availableItems = []) {
  if (!settings) return [];

  const actualAdmin = isActualAdmin(currentUser, isImpersonating);
  const contentCreator = isContentCreator(currentUser);

  return availableItems.filter(item => {
    // Check if item is enabled
    const enabledKey = `nav_${item.key}_enabled`;
    if (!isNavItemEnabled(settings, enabledKey)) {
      return false;
    }

    // Check visibility permissions
    const visibilityKey = `nav_${item.key}_visibility`;
    const visibility = getNavItemVisibility(settings, visibilityKey, 'public');

    return canUserSeeItem(visibility, currentUser, actualAdmin, contentCreator);
  });
}