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
