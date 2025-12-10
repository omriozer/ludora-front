import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { apiRequest } from '@/services/apiClient';
import { luderror } from '@/lib/ludlog';

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

      // Call the backend consent status endpoint using API client
      const statusData = await apiRequest('/auth/consent-status', {
        headers: {
          'Cache-Control': 'no-cache' // Ensure we get fresh data
        }
      });

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

      // Log error for debugging
      luderror.auth('Consent status check failed:', errorDetails);
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

      const result = await apiRequest('/auth/link-teacher', {
        method: 'POST',
        body: JSON.stringify({ invitation_code: invitationCode.trim() })
      });

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