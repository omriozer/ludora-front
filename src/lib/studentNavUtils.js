/**
 * Student Portal Navigation Utilities
 * Helper functions for building configurable student navigation from SP_FEATURES settings
 */

import {
  Keyboard,
  GraduationCap
} from 'lucide-react';
import { iconMap } from '@/lib/layoutUtils';
import {
  ADVANCED_FEATURES_KEYS,
  DEFAULT_SP_FEATURES,
  NAV_VISIBILITY_OPTIONS,
  getSetting
} from '@/constants/settingsKeys';

// Student portal display text constants
const STUDENT_DISPLAY_TEXT = {
  authenticatedUser: 'משתמש מחובר',
  anonymousPlayer: 'שחקן אנונימי',
  guest: 'אורח',
  connectedUserLabel: 'שחקן',
  authStatus: {
    registeredAccount: 'חשבון רשום',
    connectedAccount: 'מחובר לחשבון',
    anonymousAccess: 'גישה אנונימית',
    notConnected: 'לא מחובר'
  }
};

// Student portal authentication status color classes (using design system)
const STUDENT_AUTH_COLORS = {
  registered: 'text-emerald-600',    // Green for registered accounts
  connected: 'text-blue-600',       // Blue for connected accounts
  anonymous: 'text-orange-500',     // Orange for anonymous access
  disconnected: 'text-gray-500'     // Gray for not connected
};

/**
 * Get icon component from icon name string
 * @param {string} iconName - Icon name (e.g., 'Keyboard', 'GraduationCap')
 * @param {React.Component} fallback - Fallback icon component
 * @returns {React.Component} Icon component
 */
export function getIconComponent(iconName, fallback = Keyboard) {
  if (!iconName) return fallback;
  return iconMap[iconName] || fallback;
}

/**
 * Check if user can see a feature based on visibility setting
 * @param {string} visibility - Visibility level (public, logged_in_users, admin_only, hidden)
 * @param {Object} currentUser - Current authenticated user
 * @param {Object} currentPlayer - Current authenticated player
 * @param {boolean} isAuthenticated - Is user authenticated (Firebase)
 * @param {boolean} isPlayerAuthenticated - Is player authenticated (player session)
 * @returns {boolean} Whether user can see this feature
 */
export function canUserSeeFeature(visibility, currentUser, currentPlayer, isAuthenticated, isPlayerAuthenticated) {
  const hasAnyAuth = isAuthenticated || isPlayerAuthenticated;
  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = isAuthenticated && currentUser; // Firebase authenticated users are considered teachers
  const isStudent = isPlayerAuthenticated || (!isAuthenticated && currentPlayer); // Player auth or student users

  switch (visibility) {
    case NAV_VISIBILITY_OPTIONS.PUBLIC:
      return true;

    case NAV_VISIBILITY_OPTIONS.LOGGED_IN_USERS:
      return hasAnyAuth;

    case NAV_VISIBILITY_OPTIONS.ADMIN_ONLY:
      return isAdmin;

    case NAV_VISIBILITY_OPTIONS.ADMINS_AND_CREATORS:
      // Legacy option for teacher portal - admins and content creators
      return isAdmin || currentUser?.content_creator_agreement_sign_date;

    case NAV_VISIBILITY_OPTIONS.ADMINS_AND_TEACHERS:
      // Student portal option - admins and teachers (Firebase authenticated)
      return isAdmin || isTeacher;

    case NAV_VISIBILITY_OPTIONS.ADMINS_AND_STUDENTS:
      // Student portal option - admins and students (player authenticated or student users)
      return isAdmin || isStudent;

    case NAV_VISIBILITY_OPTIONS.HIDDEN:
      return false;

    default:
      return true; // Default to public for unknown values
  }
}

/**
 * Build student navigation features from SP_FEATURES configuration
 * @param {Object} params - Configuration parameters
 * @param {Object} params.settings - Settings object from UserContext
 * @param {Object} params.currentUser - Current authenticated user
 * @param {Object} params.currentPlayer - Current authenticated player
 * @param {boolean} params.isAuthenticated - Is user authenticated (Firebase)
 * @param {boolean} params.isPlayerAuthenticated - Is player authenticated (player session)
 * @returns {Array} Array of feature configuration objects
 */
export function getStudentNavFeatures({
  settings,
  currentUser,
  currentPlayer,
  isAuthenticated,
  isPlayerAuthenticated
}) {
  // Get SP_FEATURES configuration with fallback to defaults
  const spFeatures = getSetting(settings, ADVANCED_FEATURES_KEYS.SP_FEATURES, DEFAULT_SP_FEATURES);

  // Validate structure
  if (!spFeatures || !spFeatures.features || !spFeatures.order) {
    return [];
  }

  const features = [];

  // Process features in order
  spFeatures.order.forEach((featureKey) => {
    const feature = spFeatures.features[featureKey];

    // Validate feature exists and is enabled
    if (!feature || feature.enabled === false) {
      return;
    }

    // Check visibility permissions
    const canSee = canUserSeeFeature(
      feature.visibility || NAV_VISIBILITY_OPTIONS.PUBLIC,
      currentUser,
      currentPlayer,
      isAuthenticated,
      isPlayerAuthenticated
    );

    if (!canSee) {
      return;
    }

    // Build feature configuration based on type
    const iconComponent = getIconComponent(feature.icon, Keyboard);

    const featureConfig = {
      key: featureKey,
      type: feature.type,
      text: feature.text || featureKey,
      icon: iconComponent,
      visibility: feature.visibility || NAV_VISIBILITY_OPTIONS.PUBLIC,
      enabled: feature.enabled !== false
    };

    // Add type-specific properties
    switch (feature.type) {
      case 'activity_input':
        featureConfig.placeholder = feature.placeholder || 'ABC12345';
        featureConfig.maxLength = feature.maxLength || 8;
        break;

      case 'navigation':
        featureConfig.url = feature.url || '/';
        break;

      case 'authentication':
        // Authentication is handled separately in the bottom section
        break;

      case 'teacher_info':
        // Teacher info display (future feature)
        break;

      default:
        // Unknown feature type - skip
        return;
    }

    features.push(featureConfig);
  });

  return features;
}

/**
 * Get default fallback features if settings are unavailable
 * @returns {Array} Array of default feature configurations
 */
export function getDefaultStudentNavFeatures() {
  return [
    {
      key: 'activity_search',
      type: 'activity_input',
      text: 'הזן קוד פעילות',
      icon: Keyboard,
      visibility: 'public',
      enabled: true,
      placeholder: 'ABC12345',
      maxLength: 8
    },
    {
      key: 'my_teachers',
      type: 'navigation',
      text: 'המורים שלי',
      icon: GraduationCap,
      visibility: 'admins_and_students', // Show to admins and students
      enabled: true,
      url: '/my-teachers'
    }
  ];
}

/**
 * Check if SP_FEATURES configuration is valid
 * @param {Object} spFeatures - SP_FEATURES object to validate
 * @returns {boolean} Whether configuration is valid
 */
export function validateSPFeatures(spFeatures) {
  if (!spFeatures || typeof spFeatures !== 'object') {
    return false;
  }

  // Check required properties
  if (!spFeatures.features || typeof spFeatures.features !== 'object') {
    return false;
  }

  if (!Array.isArray(spFeatures.order)) {
    return false;
  }

  // Check that all order items exist in features
  for (const key of spFeatures.order) {
    if (!spFeatures.features[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Get connected user from player object checking multiple possible property paths
 * Checks various naming conventions and nested structures for connected user data
 * @param {Object} currentPlayer - Player object that may have connected user
 * @returns {Object|null} Connected user object or null if not found
 * @example
 * const connectedUser = getConnectedUser(currentPlayer);
 * if (connectedUser) {
 *   // Connected user found: connectedUser.full_name || connectedUser.email
 * }
 */
export function getConnectedUser(currentPlayer) {
  if (!currentPlayer) return null;

  // Check for connected user in various property names and nested paths
  return currentPlayer.user ||
         currentPlayer.User ||
         currentPlayer.connected_user ||
         currentPlayer.connectedUser ||
         currentPlayer.user_info ||
         currentPlayer.userInfo ||
         currentPlayer.profile?.user ||
         currentPlayer.userData ||
         currentPlayer.accountInfo ||
         null;
}

/**
 * Get the best available display name for student portal
 * Prioritizes connected user names over anonymous player names
 * @param {Object} currentUser - Current authenticated user (Firebase)
 * @param {Object} currentPlayer - Current authenticated player
 * @param {boolean} isAuthenticated - Is user authenticated (Firebase)
 * @param {boolean} isPlayerAuthenticated - Is player authenticated (player session)
 * @returns {string} Display name to show in UI
 * @example
 * // Returns: "שם המשתמש" for Firebase authenticated users
 * // Returns: "שם תלמיד" for players connected to users
 * // Returns: "שחקן אנונימי" for anonymous players
 * // Returns: "אורח" for guests
 * const displayName = getStudentDisplayName(currentUser, currentPlayer, isAuth, isPlayerAuth);
 */
export function getStudentDisplayName(currentUser, currentPlayer, isAuthenticated, isPlayerAuthenticated) {
  // Priority 1: Firebase authenticated user (highest priority)
  if (isAuthenticated && currentUser) {
    return currentUser.full_name || currentUser.email || STUDENT_DISPLAY_TEXT.authenticatedUser;
  }

  // Priority 2: Player with connected user (check multiple possible property names)
  if (isPlayerAuthenticated && currentPlayer) {
    const connectedUser = getConnectedUser(currentPlayer);

    if (connectedUser) {
      return connectedUser.full_name ||
             connectedUser.name ||
             connectedUser.email ||
             connectedUser.display_name ||
             `${STUDENT_DISPLAY_TEXT.authenticatedUser} (${currentPlayer.display_name || STUDENT_DISPLAY_TEXT.connectedUserLabel})`;
    }

    // Priority 3: Player display name (no connected user)
    return currentPlayer.display_name || STUDENT_DISPLAY_TEXT.anonymousPlayer;
  }

  // Fallback: Generic name
  return STUDENT_DISPLAY_TEXT.guest;
}

/**
 * Get authentication status information for display
 * @param {Object} currentUser - Current authenticated user (Firebase)
 * @param {Object} currentPlayer - Current authenticated player
 * @param {boolean} isAuthenticated - Is user authenticated (Firebase)
 * @param {boolean} isPlayerAuthenticated - Is player authenticated (player session)
 * @returns {Object} Authentication status with text and color class from student design system
 * @example
 * // Returns: { text: "חשבון רשום", color: "text-emerald-600" }
 * // Returns: { text: "מחובר לחשבון", color: "text-blue-600" }
 * // Returns: { text: "גישה אנונימית", color: "text-orange-500" }
 * // Returns: { text: "לא מחובר", color: "text-gray-500" }
 * const authStatus = getStudentAuthStatus(currentUser, currentPlayer, isAuth, isPlayerAuth);
 */
export function getStudentAuthStatus(currentUser, currentPlayer, isAuthenticated, isPlayerAuthenticated) {
  if (isAuthenticated && currentUser) {
    return {
      text: STUDENT_DISPLAY_TEXT.authStatus.registeredAccount,
      color: STUDENT_AUTH_COLORS.registered
    };
  }

  if (isPlayerAuthenticated && currentPlayer) {
    // Check for connected user
    const connectedUser = getConnectedUser(currentPlayer);

    if (connectedUser) {
      return {
        text: STUDENT_DISPLAY_TEXT.authStatus.connectedAccount,
        color: STUDENT_AUTH_COLORS.connected
      };
    }

    return {
      text: STUDENT_DISPLAY_TEXT.authStatus.anonymousAccess,
      color: STUDENT_AUTH_COLORS.anonymous
    };
  }

  return {
    text: STUDENT_DISPLAY_TEXT.authStatus.notConnected,
    color: STUDENT_AUTH_COLORS.disconnected
  };
}
