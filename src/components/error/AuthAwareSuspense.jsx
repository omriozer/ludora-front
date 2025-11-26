import React, { Suspense, useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useLoginModal } from '@/hooks/useLoginModal';
import { ludlog, luderror } from '@/lib/ludlog';
import { SessionExpiredFallback } from './SessionExpiryFallback';
import LazyLoadErrorBoundary from './LazyLoadErrorBoundary';

/**
 * Enhanced Suspense wrapper with authentication state validation
 *
 * Provides additional protection against auth state inconsistencies
 * that can occur when sessions expire during lazy component loading.
 *
 * Features:
 * - Auth state validation after component loads
 * - Graceful session expiry handling
 * - Integration with error boundary system
 * - Loading state consistency
 */
function AuthAwareSuspense({
  children,
  fallback,
  requireAuth = false,
  onAuthRequired,
  authValidationDelay = 100,
  showSessionFallbackOnError = true
}) {
  const { currentUser, isLoading: authLoading, logout } = useUser();
  const { openLoginModal } = useLoginModal();
  const loadTimeRef = useRef(null);
  const [showSessionExpired, setShowSessionExpired] = React.useState(false);

  // Track when component starts loading
  useEffect(() => {
    loadTimeRef.current = Date.now();
  }, []);

  // Validate auth state after component loads (if required)
  const validateAuthAfterLoad = React.useCallback(() => {
    if (!requireAuth) return;

    const loadDuration = loadTimeRef.current ? Date.now() - loadTimeRef.current : 0;

    // Only validate if loading took significant time (potential for session expiry)
    if (loadDuration > 1000) {
      ludlog.auth('Validating auth state after lazy load', {
        loadDuration,
        hasUser: !!currentUser,
        userLoading: authLoading
      });

      // If we required auth but user is not authenticated after loading
      if (!authLoading && !currentUser) {
        luderror.auth('Auth required but user not authenticated after lazy load', null, {
          loadDuration,
          requireAuth,
          wasLoading: authLoading
        });

        // Show session expired fallback or trigger callback
        if (showSessionFallbackOnError) {
          setShowSessionExpired(true);
        } else if (onAuthRequired) {
          onAuthRequired();
        } else {
          // Fallback to login modal
          openLoginModal();
        }
      }
    }
  }, [requireAuth, currentUser, authLoading, onAuthRequired, openLoginModal, showSessionFallbackOnError]);

  // Validate auth on component load completion
  useEffect(() => {
    if (!authLoading) {
      // Small delay to ensure component has fully rendered
      const timeoutId = setTimeout(validateAuthAfterLoad, authValidationDelay);
      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, validateAuthAfterLoad, authValidationDelay]);

  // If we're showing session expired fallback
  if (showSessionExpired) {
    return (
      <SessionExpiredFallback
        reason="session_expired"
        title="פג תוקף ההתחברות"
        description="ההתחברות פגה במהלך טעינת הדף. אנא התחבר שנית להמשך השימוש."
        onCustomAction={() => {
          setShowSessionExpired(false);
          // Try to reload the component
          window.location.reload();
        }}
        customActionText="רענן דף"
      />
    );
  }

  // If auth is required and not authenticated, show appropriate state
  if (requireAuth && !authLoading && !currentUser) {
    return (
      <SessionExpiredFallback
        reason="auth_error"
        title="נדרש התחברות"
        description="דף זה דורש התחברות למערכת. אנא התחבר להמשך השימוש."
      />
    );
  }

  return (
    <LazyLoadErrorBoundary>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </LazyLoadErrorBoundary>
  );
}

/**
 * Higher-order component for creating auth-aware lazy components
 */
export function withAuthAwareSuspense(Component, suspenseProps = {}) {
  const WrappedComponent = React.forwardRef((props, ref) => {
    return (
      <AuthAwareSuspense {...suspenseProps}>
        <Component {...props} ref={ref} />
      </AuthAwareSuspense>
    );
  });

  WrappedComponent.displayName = `withAuthAwareSuspense(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook for lazy components to self-validate auth state
 */
export function useAuthValidation(options = {}) {
  const {
    requireAuth = false,
    onAuthFail = null,
    validateOnMount = true
  } = options;

  const { currentUser, isLoading } = useUser();
  const { openLoginModal } = useLoginModal();
  const hasValidated = useRef(false);

  const validateAuth = React.useCallback(() => {
    if (!requireAuth || hasValidated.current) return true;

    if (!isLoading && !currentUser) {
      hasValidated.current = true;
      luderror.auth('Auth validation failed in lazy component', null, {
        requireAuth,
        hasUser: !!currentUser,
        isLoading
      });

      if (onAuthFail) {
        onAuthFail();
      } else {
        openLoginModal();
      }
      return false;
    }

    return true;
  }, [requireAuth, currentUser, isLoading, onAuthFail, openLoginModal]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount && !isLoading) {
      validateAuth();
    }
  }, [validateOnMount, isLoading, validateAuth]);

  return {
    isAuthenticated: !!currentUser,
    isLoading,
    validateAuth,
    hasValidAuth: !isLoading && (!requireAuth || !!currentUser)
  };
}

/**
 * Predefined auth-aware suspense configurations
 */
export const AuthAwareSuspenseConfig = {
  // For protected routes that absolutely require authentication
  PROTECTED: {
    requireAuth: true,
    showSessionFallbackOnError: true,
    authValidationDelay: 200
  },

  // For public routes that work better with auth but don't require it
  ENHANCED: {
    requireAuth: false,
    showSessionFallbackOnError: false,
    authValidationDelay: 100
  },

  // For admin routes with strict auth requirements
  ADMIN: {
    requireAuth: true,
    showSessionFallbackOnError: true,
    authValidationDelay: 300
  }
};

export default AuthAwareSuspense;