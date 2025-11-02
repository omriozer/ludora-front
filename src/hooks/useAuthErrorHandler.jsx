import { useCallback } from 'react';
import { useLoginModal } from './useLoginModal';
import { ApiError } from '@/utils/ApiError';
import { toast } from '@/components/ui/use-toast';

/**
 * Global authentication error handler hook
 *
 * Automatically detects 401/403 API errors and triggers login modal with Hebrew messages
 * Supports request retry after successful re-authentication
 */
export function useAuthErrorHandler() {
  const { openLoginModal } = useLoginModal();

  /**
   * Check if error is an authentication error that requires re-login
   */
  const isAuthError = useCallback((error) => {
    return error instanceof ApiError && error.requiresReauth();
  }, []);

  /**
   * Handle authentication errors automatically
   * @param {Error} error - The error to check and handle
   * @param {Function} retryCallback - Optional callback to execute after successful re-login
   * @returns {boolean} - True if error was handled, false if not an auth error
   */
  const handleAuthError = useCallback((error, retryCallback = null) => {
    if (!isAuthError(error)) {
      return false; // Not an auth error, let the caller handle it
    }

    // Show Hebrew error message as toast
    toast({
      title: "בעיה באימות המשתמש",
      description: error.getHebrewAuthMessage(),
      variant: "destructive",
      duration: 5000
    });

    // Open login modal with retry callback
    openLoginModal(() => {
      // After successful login, show success message
      toast({
        title: "התחברת בהצלחה",
        description: "תוכל עכשיו להמשיך בפעולה שלך",
        variant: "default",
        duration: 3000
      });

      // Execute retry callback if provided
      if (retryCallback && typeof retryCallback === 'function') {
        // Add small delay to ensure login has completed
        setTimeout(() => {
          retryCallback();
        }, 100);
      }
    });

    return true; // Error was handled
  }, [isAuthError, openLoginModal]);

  /**
   * Wrapper for API calls that automatically handles auth errors
   * @param {Function} apiCall - The API function to call
   * @param {Object} options - Options object
   * @param {boolean} options.autoRetry - Whether to automatically retry after successful login (default: true)
   * @param {Function} options.onSuccess - Callback for successful response
   * @param {Function} options.onError - Callback for non-auth errors
   * @returns {Promise} - The API response
   */
  const withAuthErrorHandling = useCallback(async (apiCall, options = {}) => {
    const { autoRetry = true, onSuccess, onError } = options;

    const executeCall = async () => {
      try {
        const response = await apiCall();
        if (onSuccess) {
          onSuccess(response);
        }
        return response;
      } catch (error) {
        // Try to handle as auth error
        const wasHandled = handleAuthError(error, autoRetry ? executeCall : null);

        if (!wasHandled) {
          // Not an auth error, call error handler or re-throw
          if (onError) {
            onError(error);
          } else {
            throw error;
          }
        }
        // Auth errors are handled by the modal, don't re-throw
      }
    };

    return executeCall();
  }, [handleAuthError]);

  return {
    isAuthError,
    handleAuthError,
    withAuthErrorHandling
  };
}

export default useAuthErrorHandler;