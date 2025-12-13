import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { isStudentPortal } from '@/utils/domainUtils';
import { STUDENTS_ACCESS_MODES } from '@/utils/portalContext';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import StudentLogin from './StudentLogin';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * ProtectedStudentRoute Component
 *
 * Route wrapper that enforces student portal authentication rules based on
 * the students_access setting. Extends existing ConditionalRoute patterns
 * for student-specific access control.
 *
 * Access Modes:
 * - invite_only: Requires player session (privacy code login)
 * - authed_only: Requires Firebase user authentication
 * - all: Allows any authenticated entity (user OR player)
 *
 * Admin Bypass:
 * - Admin users can always access regardless of mode
 * - Supports impersonation scenarios
 *
 * @param {React.ReactNode} children - Protected content to render when authenticated
 * @param {boolean} requireAuth - If false, allows unauthenticated access (default: true)
 */
export default function ProtectedStudentRoute({
  children,
  requireAuth = true
}) {
  const location = useLocation();
  const {
    currentUser,
    currentPlayer,
    isAuthenticated,
    isPlayerAuthenticated,
    hasAnyAuthentication,
    isLoading,
    settingsLoading,
    settings,
    isAdmin: isUserAdmin
  } = useUser();

  // Debug logging for development

  // Show loading while auth/settings are being resolved
  if (isLoading || settingsLoading) {
    return (
      <div className="min-h-screen student-portal-background flex items-center justify-center" dir="rtl">
        <LudoraLoadingSpinner size="lg" text="טוען..." />
      </div>
    );
  }

  // Get students_access mode from settings
  const studentsAccessMode = settings?.students_access || STUDENTS_ACCESS_MODES.ALL;

  // Admin bypass check - admins can always access
  const isAdmin = currentUser && isUserAdmin();
  if (isAdmin) {
    ludlog.navigation('[ProtectedStudentRoute] Admin bypass - allowing access');
    return children;
  }

  // If auth is not required, allow access
  if (!requireAuth) {
    return children;
  }

  // Check authentication based on students_access mode
  const checkAuthByMode = () => {
    switch (studentsAccessMode) {
      case STUDENTS_ACCESS_MODES.INVITE_ONLY:
        // Only player sessions allowed (privacy code login)
        // This is the privacy-compliant mode for younger students
        return isPlayerAuthenticated && !!currentPlayer;

      case STUDENTS_ACCESS_MODES.AUTHED_ONLY:
        // Only Firebase authenticated users allowed
        return isAuthenticated && !!currentUser;

      case STUDENTS_ACCESS_MODES.ALL:
      default:
        // Any authentication (user OR player) is acceptable
        return hasAnyAuthentication();
    }
  };

  const isAuthorized = checkAuthByMode();


  // If not authorized, show StudentLogin component
  if (!isAuthorized) {
    return (
      <StudentLogin
        returnPath={location.pathname + location.search}
        onLoginSuccess={() => {
          // The component will re-render with new auth state
          // Navigation happens automatically via auth state change
        }}
      />
    );
  }

  // Authorized - render protected content
  return children;
}

/**
 * useStudentAuth Hook
 *
 * Utility hook for components that need to check student authentication
 * state without wrapping in ProtectedStudentRoute.
 *
 * @returns {Object} Authentication state and helpers
 */
export function useStudentAuth() {
  const {
    currentUser,
    currentPlayer,
    isAuthenticated,
    isPlayerAuthenticated,
    hasAnyAuthentication,
    isLoading,
    settingsLoading,
    settings,
    isAdmin: isUserAdmin
  } = useUser();

  const studentsAccessMode = settings?.students_access || STUDENTS_ACCESS_MODES.ALL;
  const isAdmin = currentUser && isUserAdmin();

  const isAuthorized = (() => {
    // Admin bypass
    if (isAdmin) return true;

    switch (studentsAccessMode) {
      case STUDENTS_ACCESS_MODES.INVITE_ONLY:
        return isPlayerAuthenticated && !!currentPlayer;
      case STUDENTS_ACCESS_MODES.AUTHED_ONLY:
        return isAuthenticated && !!currentUser;
      case STUDENTS_ACCESS_MODES.ALL:
      default:
        return hasAnyAuthentication();
    }
  })();

  return {
    isAuthorized,
    isLoading: isLoading || settingsLoading,
    isAdmin,
    studentsAccessMode,
    currentUser,
    currentPlayer,
    isAuthenticated,
    isPlayerAuthenticated,
    // Helper to get current entity (user or player)
    getCurrentEntity: () => {
      if (isAuthenticated && currentUser) {
        return { type: 'user', entity: currentUser };
      }
      if (isPlayerAuthenticated && currentPlayer) {
        return { type: 'player', entity: currentPlayer };
      }
      return { type: null, entity: null };
    }
  };
}
