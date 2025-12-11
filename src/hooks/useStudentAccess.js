import { useState, useEffect, useCallback } from 'react';
import { apiRequestAnonymous } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/logger';
import { ACCESS_CONTROL_KEYS, SYSTEM_KEYS, STUDENTS_ACCESS_MODES } from '@/constants/settingsKeys';

/**
 * useStudentAccess Hook
 *
 * Manages student portal access validation based on system settings.
 * Integrates with Ludora's settings system with data-driven caching.
 *
 * @param {Object} options - Hook options
 * @param {Object} options.accessContext - Access context information
 * @param {boolean} options.accessContext.has_invitation_code - Has valid invitation code
 * @param {boolean} options.accessContext.has_lobby_code - Has valid lobby code
 * @param {boolean} options.accessContext.is_authenticated - Is authenticated user
 * @param {string} options.accessContext.user_role - User role (student, teacher, admin)
 * @param {boolean} options.autoValidate - Automatically validate on mount (default: true)
 * @param {boolean} options.enabled - Enable the hook (default: true)
 *
 * @returns {Object} Access validation state and methods
 */
export function useStudentAccess({
  accessContext = {},
  autoValidate = true,
  enabled = true
} = {}) {
  // State
  const [isValidating, setIsValidating] = useState(false);
  const [accessAllowed, setAccessAllowed] = useState(null);
  const [accessMode, setAccessMode] = useState(STUDENTS_ACCESS_MODES.ALL);
  const [requirements, setRequirements] = useState({
    authentication_required: false,
    invitation_code_required: false,
    parent_consent_required: false
  });
  const [studentOnboardingEnabled, setStudentOnboardingEnabled] = useState(false);
  const [teacherOnboardingEnabled, setTeacherOnboardingEnabled] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Validate access with current context
   */
  const validateAccess = useCallback(async (overrideContext = null) => {
    if (!enabled) return;

    try {
      setIsValidating(true);
      setError(null);

      const contextToUse = overrideContext || accessContext;

      ludlog('useStudentAccess', 'Validating access:', {
        context: contextToUse,
        autoValidate
      });

      const response = await apiRequestAnonymous('/student-portal/settings/validate-access', {
        method: 'POST',
        body: JSON.stringify({
          access_context: contextToUse
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      ludlog('useStudentAccess', 'Validation result:', response);

      setAccessAllowed(response.access_allowed);
      setAccessMode(response.access_mode);
      setRequirements(response.requirements);
      setStudentOnboardingEnabled(response.student_onboarding_enabled);
      setTeacherOnboardingEnabled(response.teacher_onboarding_enabled);

      return response;
    } catch (err) {
      luderror('useStudentAccess', 'Validation error:', err);
      setError(err.message || 'Failed to validate access');

      // Fail-open: Allow access on error for graceful degradation
      setAccessAllowed(true);
      setAccessMode(STUDENTS_ACCESS_MODES.ALL);
      setRequirements({
        authentication_required: false,
        invitation_code_required: false,
        parent_consent_required: false
      });

      return null;
    } finally {
      setIsValidating(false);
    }
  }, [accessContext, enabled, autoValidate]);

  /**
   * Get access requirements without validation
   */
  const getAccessRequirements = useCallback(async () => {
    if (!enabled) return null;

    try {
      setIsValidating(true);
      setError(null);

      const response = await apiRequestAnonymous('/student-portal/settings/access-requirements');

      ludlog('useStudentAccess', 'Access requirements:', response);

      setAccessMode(response.access_mode);
      setRequirements(response.requirements);
      setStudentOnboardingEnabled(response.student_onboarding_enabled);
      setTeacherOnboardingEnabled(response.teacher_onboarding_enabled);

      return response;
    } catch (err) {
      luderror('useStudentAccess', 'Get requirements error:', err);
      setError(err.message || 'Failed to get requirements');
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [enabled]);

  /**
   * Check if specific requirement is met
   */
  const isRequirementMet = useCallback((requirement) => {
    switch (requirement) {
      case 'authentication':
        return !requirements.authentication_required || accessContext.is_authenticated;

      case 'invitation':
        return !requirements.invitation_code_required ||
               accessContext.has_invitation_code ||
               accessContext.has_lobby_code;

      case 'consent':
        // Consent is handled separately by ConsentEnforcement component
        return true;

      default:
        return true;
    }
  }, [requirements, accessContext]);

  /**
   * Get unmet requirements
   */
  const getUnmetRequirements = useCallback(() => {
    const unmet = [];

    if (requirements.authentication_required && !accessContext.is_authenticated) {
      unmet.push('authentication');
    }

    if (requirements.invitation_code_required &&
        !accessContext.has_invitation_code &&
        !accessContext.has_lobby_code) {
      unmet.push('invitation');
    }

    if (requirements.parent_consent_required) {
      // Consent checking is handled by ConsentEnforcement
      // We just note that it's required
      unmet.push('consent');
    }

    return unmet;
  }, [requirements, accessContext]);

  // Auto-validate on mount or context change
  useEffect(() => {
    if (autoValidate && enabled) {
      validateAccess();
    }
  }, [autoValidate, enabled]); // Don't include validateAccess to avoid infinite loop

  return {
    // State
    isValidating,
    accessAllowed,
    accessMode,
    requirements,
    studentOnboardingEnabled,
    teacherOnboardingEnabled,
    error,

    // Methods
    validateAccess,
    getAccessRequirements,
    isRequirementMet,
    getUnmetRequirements,

    // Computed
    hasAccess: accessAllowed === true,
    isBlocked: accessAllowed === false,
    isLoading: isValidating,
    unmetRequirements: getUnmetRequirements()
  };
}

/**
 * Helper to create access context from user state
 */
export function createAccessContext(user, invitationCode, lobbyCode) {
  return {
    is_authenticated: !!user?.firebaseUser,
    user_role: user?.firebaseUser?.role || 'guest',
    has_invitation_code: !!invitationCode,
    has_lobby_code: !!lobbyCode
  };
}

export default useStudentAccess;
