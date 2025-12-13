// User utility functions for clean role checking
// All user data comes from the database - no more customClaims mess!

import { haveAdminAccess } from '@/utils/adminCheck';

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SYSADMIN: 'sysadmin'
};

export const USER_TYPES = {
  TEACHER: 'teacher',
  STUDENT: 'student', 
  PARENT: 'parent',
  HEADMASTER: 'headmaster'
};

const ROLE_HIERARCHY = {
  [USER_ROLES.USER]: 0,
  [USER_ROLES.ADMIN]: 1,
  [USER_ROLES.SYSADMIN]: 2
};

/**
 * Check if user has a specific role
 */
export function hasRole(user, role) {
  if (!user || !user.role) return false;
  return user.role === role;
}

/**
 * Check if user has admin access for a specific action
 * @param {Object} user - User object
 * @param {string} action - The action to check access for (optional, defaults to 'admin_access')
 * @param {Object} globalSettings - Global settings object (optional)
 * @returns {boolean} True if user has admin access
 */
export function hasAdminAccess(user, action = 'admin_access', globalSettings = null) {
  if (!user || !user.role) return false;
  return haveAdminAccess(user.role, action, globalSettings);
}

/**
 * Check if user is admin (using centralized admin access)
 * @param {Object} user - User object
 * @param {Object} globalSettings - Global settings object (optional)
 */
export function isAdmin(user, globalSettings = null) {
  return hasAdminAccess(user, 'admin_access', globalSettings);
}

/**
 * Check if user is sysadmin (using centralized admin access)
 * @param {Object} user - User object
 * @param {Object} globalSettings - Global settings object (optional)
 */
export function isSysadmin(user, globalSettings = null) {
  // Sysadmin is checked through centralized admin access function
  if (!user || !user.role) return false;
  return haveAdminAccess(user.role, 'sysadmin_access', globalSettings);
}

/**
 * Check if user is staff (legacy compatibility - maps to admin or sysadmin access)
 * @param {Object} user - User object
 * @param {Object} globalSettings - Global settings object (optional)
 */
export function isStaff(user, globalSettings = null) {
  return hasAdminAccess(user, 'staff_access', globalSettings);
}

/**
 * Check if user has a specific user type
 */
export function hasUserType(user, userType) {
  if (!user || !user.user_type) return false;
  return user.user_type === userType;
}

/**
 * Check if user is teacher (by user_type)
 */
export function isTeacher(user) {
  return hasUserType(user, USER_TYPES.TEACHER);
}

/**
 * Check if user is student (by user_type)
 */
export function isStudent(user) {
  return hasUserType(user, USER_TYPES.STUDENT);
}

/**
 * Check if user is parent (by user_type)
 */
export function isParent(user) {
  return hasUserType(user, USER_TYPES.PARENT);
}

/**
 * Check if user is headmaster (by user_type)
 */
export function isHeadmaster(user) {
  return hasUserType(user, USER_TYPES.HEADMASTER);
}

/**
 * Check if user is school staff (headmaster or teacher)
 * This replaces the old isStaff function for school-level permissions
 */
export function isSchoolStaff(user) {
  if (!user || !user.user_type) return false;
  return user.user_type === USER_TYPES.TEACHER || user.user_type === USER_TYPES.HEADMASTER;
}

/**
 * Check if user has any teaching permissions (teacher or headmaster)
 * Useful for features that should be available to both teachers and headmasters
 */
export function canTeach(user) {
  return isSchoolStaff(user);
}

/**
 * Check if user has school management permissions
 * Currently only headmasters, but could be extended for other school admin roles
 */
export function canManageSchool(user) {
  return isHeadmaster(user);
}

/**
 * Check if user is associated with a school (has school_id)
 */
export function hasSchoolAffiliation(user) {
  return !!(user && user.school_id);
}

/**
 * Check if user can access student-related features
 * Includes parents, teachers, and headmasters
 */
export function canAccessStudentFeatures(user) {
  if (!user || !user.user_type) return false;
  return [USER_TYPES.PARENT, USER_TYPES.TEACHER, USER_TYPES.HEADMASTER].includes(user.user_type);
}

/**
 * Check if user needs parent consent verification
 * Students under 18 need parent consent unless age-verified by a teacher
 */
export function needsParentConsent(user) {
  if (!user || user.user_type !== USER_TYPES.STUDENT) return false;

  // If user has age verification from a teacher, no parent consent needed
  if (user.age_verified_by) return false;

  // If user has birth_date and is 18+, no parent consent needed
  if (user.birth_date) {
    const birthDate = new Date(user.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age >= 18) return false;
  }

  // Otherwise, parent consent is needed
  return true;
}

/**
 * Get user's role hierarchy level for comparison
 * Higher number = higher permissions
 */
export function getUserRoleLevel(user) {
  if (!user || !user.role) return 0;
  return ROLE_HIERARCHY[user.role] || 0;
}

/**
 * Check if user can access admin-level features
 * Alternative to hasAdminAccess for simple admin/non-admin checks
 */
export function isSystemAdmin(user, globalSettings = null) {
  return hasAdminAccess(user, 'system_admin_access', globalSettings);
}

/**
 * Check if user can access a feature requiring a minimum role
 */
export function canAccess(user, requiredRole) {
  if (!user || !user.role) return false;
  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Get user display name
 */
export function getUserDisplayName(user) {
  if (!user) return 'Guest';
  return user.full_name || user.email || 'Unknown User';
}

/**
 * Check if user is active and verified
 */
export function isActiveUser(user) {
  if (!user) return false;
  return user.is_active && user.is_verified;
}

/**
 * Get role display name in Hebrew
 */
export function getRoleDisplayName(role) {
  const roleNames = {
    [USER_ROLES.USER]: 'משתמש',
    [USER_ROLES.ADMIN]: 'מנהל',
    [USER_ROLES.SYSADMIN]: 'מנהל מערכת'
  };
  return roleNames[role] || 'לא ידוע';
}

/**
 * Get user type display name in Hebrew
 */
export function getUserTypeDisplayName(userType) {
  const userTypeNames = {
    [USER_TYPES.TEACHER]: 'מורה',
    [USER_TYPES.STUDENT]: 'תלמיד',
    [USER_TYPES.PARENT]: 'הורה',
    [USER_TYPES.HEADMASTER]: 'מנהל בית ספר'
  };
  return userTypeNames[userType] || 'לא ידוע';
}

/**
 * Get combined role and user type display name
 */
export function getFullRoleDisplayName(user) {
  if (!user) return 'אורח';
  
  const roleName = getRoleDisplayName(user.role);
  const userTypeName = user.user_type ? getUserTypeDisplayName(user.user_type) : null;
  
  if (userTypeName && user.role === 'user') {
    return userTypeName; // For users, show user type as primary
  } else if (userTypeName) {
    return `${roleName} (${userTypeName})`; // For admins with user types
  } else {
    return roleName; // Just role
  }
}