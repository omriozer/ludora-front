/**
 * Portal context utility for determining authentication strategy
 * Used by Socket.IO and other services that need portal-aware behavior
 * Combines domain detection with settings to determine credential policy
 */

import { getDomainType, isStudentPortal } from './domainUtils.js';
import { apiRequestAnonymous } from '@/services/apiClient.js';

// Portal types
export const PORTAL_TYPES = {
  TEACHER: 'teacher',
  STUDENT: 'student'
};

// Credential policies for Socket.IO connections
export const CREDENTIAL_POLICY = {
  WITH_CREDENTIALS: 'with_credentials',    // Send cookies (Firebase auth)
  WITHOUT_CREDENTIALS: 'without_credentials', // No cookies (anonymous)
  TRY_BOTH: 'try_both'  // Try with credentials first, fallback to anonymous
};

// Students access modes (matches backend enum)
export const STUDENTS_ACCESS_MODES = {
  INVITE_ONLY: 'invite_only',  // Anonymous player sessions (privacy-compliant)
  AUTHED_ONLY: 'authed_only',  // Firebase authentication required
  ALL: 'all'  // Firebase first, player session fallback
};

/**
 * Get the current portal context including authentication strategy
 * @returns {Promise<Object>} Portal context with authentication strategy
 */
export async function getPortalContext() {
  try {
    // Step 1: Detect portal type from domain
    const portalType = getDomainType();

    // Step 2: For teacher portal - always use Firebase authentication
    if (portalType === PORTAL_TYPES.TEACHER) {
      return {
        portalType: PORTAL_TYPES.TEACHER,
        credentialPolicy: CREDENTIAL_POLICY.WITH_CREDENTIALS,
        studentsAccessMode: null, // Not applicable for teacher portal
        authMethod: 'firebase'
      };
    }

    // Step 3: For student portal - fetch students_access setting
    let studentsAccessMode;
    try {
      const response = await apiRequestAnonymous('/settings/public');
      studentsAccessMode = response.students_access || STUDENTS_ACCESS_MODES.ALL;
    } catch (error) {
      // Safe fallback to 'all' mode for privacy compliance
      studentsAccessMode = STUDENTS_ACCESS_MODES.ALL;
    }

    // Step 4: Determine credential policy based on students_access setting
    const credentialPolicy = getCredentialPolicy(portalType, studentsAccessMode);

    return {
      portalType: PORTAL_TYPES.STUDENT,
      credentialPolicy,
      studentsAccessMode,
      authMethod: getAuthMethod(studentsAccessMode)
    };

  } catch (error) {
    // Safe fallback: detect portal and use safe defaults
    const portalType = getDomainType();

    if (portalType === PORTAL_TYPES.TEACHER) {
      return {
        portalType: PORTAL_TYPES.TEACHER,
        credentialPolicy: CREDENTIAL_POLICY.WITH_CREDENTIALS,
        studentsAccessMode: null,
        authMethod: 'firebase'
      };
    } else {
      return {
        portalType: PORTAL_TYPES.STUDENT,
        credentialPolicy: CREDENTIAL_POLICY.TRY_BOTH, // Safe fallback
        studentsAccessMode: STUDENTS_ACCESS_MODES.ALL,
        authMethod: 'hybrid'
      };
    }
  }
}

/**
 * Determine credential policy based on portal type and students access mode
 * @param {string} portalType - Portal type (teacher|student)
 * @param {string} studentsAccessMode - Students access mode (invite_only|authed_only|all)
 * @returns {string} Credential policy
 */
export function getCredentialPolicy(portalType, studentsAccessMode) {
  // Teacher portal always uses Firebase authentication
  if (portalType === PORTAL_TYPES.TEACHER) {
    return CREDENTIAL_POLICY.WITH_CREDENTIALS;
  }

  // Student portal - policy based on access mode
  switch (studentsAccessMode) {
    case STUDENTS_ACCESS_MODES.INVITE_ONLY:
      // Privacy-compliant: player session only (try cookies for player auth, no Firebase required)
      return CREDENTIAL_POLICY.TRY_BOTH;

    case STUDENTS_ACCESS_MODES.AUTHED_ONLY:
      // Firebase authentication required
      return CREDENTIAL_POLICY.WITH_CREDENTIALS;

    case STUDENTS_ACCESS_MODES.ALL:
      // Hybrid: Firebase first, player session fallback
      return CREDENTIAL_POLICY.TRY_BOTH;

    default:
      // Safe fallback
      return CREDENTIAL_POLICY.TRY_BOTH;
  }
}

/**
 * Get authentication method string for debugging/logging
 * @param {string} studentsAccessMode - Students access mode
 * @returns {string} Authentication method description
 */
export function getAuthMethod(studentsAccessMode) {
  switch (studentsAccessMode) {
    case STUDENTS_ACCESS_MODES.INVITE_ONLY:
      return 'student_access_token'; // Student token authentication (matches backend)
    case STUDENTS_ACCESS_MODES.AUTHED_ONLY:
      return 'firebase'; // Firebase authentication required
    case STUDENTS_ACCESS_MODES.ALL:
      return 'hybrid'; // Firebase first, student token fallback
    default:
      return 'hybrid'; // Safe fallback
  }
}

/**
 * Check if current context requires anonymous connection (privacy-compliant)
 * @param {Object} portalContext - Portal context from getPortalContext()
 * @returns {boolean} True if anonymous connection is required/preferred
 */
export function shouldUseAnonymousConnection(portalContext) {
  return portalContext.credentialPolicy === CREDENTIAL_POLICY.WITHOUT_CREDENTIALS ||
         (portalContext.portalType === PORTAL_TYPES.STUDENT &&
          portalContext.studentsAccessMode === STUDENTS_ACCESS_MODES.INVITE_ONLY);
}

/**
 * Check if current context allows authenticated connection
 * @param {Object} portalContext - Portal context from getPortalContext()
 * @returns {boolean} True if authenticated connection is allowed
 */
export function shouldAllowAuthenticatedConnection(portalContext) {
  return portalContext.credentialPolicy === CREDENTIAL_POLICY.WITH_CREDENTIALS ||
         portalContext.credentialPolicy === CREDENTIAL_POLICY.TRY_BOTH;
}

/**
 * Get debug information about current portal context
 * @returns {Promise<Object>} Debug information
 */
export async function getPortalDebugInfo() {
  const context = await getPortalContext();
  const hostname = window.location.hostname;
  const port = window.location.port;
  const isStudent = isStudentPortal();

  return {
    ...context,
    debug: {
      hostname,
      port,
      fullUrl: window.location.href,
      isStudent,
      detectedPortal: getDomainType(),
      timestamp: new Date().toISOString()
    }
  };
}

// Export current portal type for convenience
export const getCurrentPortalType = getDomainType;
export const getCurrentIsStudentPortal = isStudentPortal;