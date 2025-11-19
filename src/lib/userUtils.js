// User utility functions for clean role checking
// All user data comes from the database - no more customClaims mess!

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
 * Check if user is admin
 */
export function isAdmin(user) {
  return hasRole(user, USER_ROLES.ADMIN);
}

/**
 * Check if user is sysadmin
 */
export function isSysadmin(user) {
  return hasRole(user, USER_ROLES.SYSADMIN);
}

/**
 * Check if user is staff (legacy compatibility - maps to admin or sysadmin)
 */
export function isStaff(user) {
  return isAdmin(user) || isSysadmin(user);
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