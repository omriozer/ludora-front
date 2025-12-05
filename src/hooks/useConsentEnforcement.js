import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';

/**
 * Hook for checking and enforcing parent consent requirements for students.
 * Used in student portal to determine if enforcement screens should be shown.
 */
export const useConsentEnforcement = () => {
  const [enforcementStatus, setEnforcementStatus] = useState({
    loading: true,
    enforcement: 'none', // 'none' | 'need_teacher' | 'need_consent' | 'error'
    needs_teacher: false,
    needs_consent: false,
    linked_teacher_id: null,
    has_parent_consent: false,
    error: null,
    lastChecked: null,
    retryCount: 0
  });

  const { currentUser, isLoading: userLoading } = useUser();

  const checkConsentStatus = async (isRetry = false) => {
    try {
      setEnforcementStatus(prev => ({
        ...prev,
        loading: true,
        error: null // Clear previous errors
      }));

      // Only check for Firebase authenticated users with student user_type
      if (!currentUser?.firebaseUser || currentUser.firebaseUser.user_type !== 'student') {
        setEnforcementStatus(prev => ({
          ...prev,
          loading: false,
          enforcement: 'none',
          needs_teacher: false,
          needs_consent: false,
          linked_teacher_id: null,
          has_parent_consent: false,
          error: null,
          lastChecked: new Date().toISOString(),
          retryCount: 0
        }));
        return;
      }

      // Call the backend consent status endpoint
      const response = await fetch('/api/auth/consent-status', {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Cache-Control': 'no-cache' // Ensure we get fresh data
        }
      });

      if (!response.ok) {
        // Handle specific HTTP error codes
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (response.status === 401) {
          errorMessage = 'Authentication expired. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Please check your permissions.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again in a few moments.';
        }
        throw new Error(errorMessage);
      }

      const statusData = await response.json();

      setEnforcementStatus(prev => ({
        ...prev,
        loading: false,
        enforcement: statusData.status === 'complete' ? 'none' : statusData.status,
        needs_teacher: statusData.needs_teacher,
        needs_consent: statusData.needs_consent,
        linked_teacher_id: statusData.linked_teacher_id,
        has_parent_consent: statusData.has_parent_consent,
        error: null,
        lastChecked: new Date().toISOString(),
        retryCount: 0
      }));

    } catch (error) {
      // Improved error handling - don't mask errors as 'none'
      const errorDetails = {
        message: error.message,
        timestamp: new Date().toISOString(),
        isNetworkError: !navigator.onLine || error.name === 'TypeError',
        isRetry: isRetry
      };

      setEnforcementStatus(prev => ({
        ...prev,
        loading: false,
        enforcement: 'error',
        error: errorDetails,
        retryCount: isRetry ? prev.retryCount + 1 : 1
      }));

      // Log error for debugging (development only)
      if (process.env.NODE_ENV === 'development') {
        console.error('Consent status check failed:', errorDetails);
      }
    }
  };

  // Check consent status when user loads or changes
  useEffect(() => {
    if (!userLoading) {
      checkConsentStatus();
    }
  }, [currentUser?.firebaseUser?.id, userLoading]);

  const linkToTeacher = async (invitationCode) => {
    try {
      if (!invitationCode || typeof invitationCode !== 'string') {
        throw new Error('Invitation code is required');
      }

      const response = await fetch('/api/auth/link-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ invitation_code: invitationCode.trim() })
      });

      const result = await response.json();

      if (!response.ok) {
        // Provide user-friendly error messages
        let errorMessage = result.error || `HTTP ${response.status}`;
        if (response.status === 400 && result.code === 'ALREADY_LINKED') {
          errorMessage = 'You are already linked to a teacher.';
        } else if (response.status === 404) {
          errorMessage = 'Invalid invitation code. Please check with your teacher.';
        } else if (response.status === 429) {
          errorMessage = 'Too many attempts. Please wait a moment and try again.';
        }
        throw new Error(errorMessage);
      }

      // Refresh consent status after linking
      await checkConsentStatus();

      return result;
    } catch (error) {
      // Re-throw with additional context if needed
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  };

  const refreshStatus = async () => {
    await checkConsentStatus();
  };

  const retryCheck = async () => {
    await checkConsentStatus(true);
  };

  return {
    ...enforcementStatus,
    linkToTeacher,
    refreshStatus,
    retryCheck
  };
};