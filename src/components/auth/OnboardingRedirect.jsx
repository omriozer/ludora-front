import { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { StudentInvitation } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/ludlog';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import {
  isProtectedFlow,
  isOnboardingDeferred,
  shouldShowOnboardingNow,
  deferOnboarding,
  clearDeferredOnboarding
} from '@/utils/protectedFlowUtils';

/**
 * OnboardingRedirect component - handles redirecting users to onboarding or invitations
 *
 * Performance optimizations:
 * - Memoized all computed values to prevent unnecessary re-renders
 * - Single source of truth for redirect decisions
 * - Loading state shown consistently during any pending redirect
 * - No flash of content during navigation transitions
 */
export default function OnboardingRedirect({ children }) {
  const { currentUser, needsOnboarding, isLoading, settingsLoading, userDataFresh, settings } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if we should check invitations based on classroom feature flag
  const shouldCheckInvitations = useMemo(() => {
    // Only check invitations if classrooms feature is enabled
    // During settings loading, assume we might need to check (safer default)
    if (settings === null || settings === undefined) {
      return true; // Wait for settings to load before deciding
    }
    return settings.nav_classrooms_enabled === true;
  }, [settings]);

  // Invitation checking state - safer initialization that waits for settings
  const [hasCheckedInvitations, setHasCheckedInvitations] = useState(false);
  const [hasInvitations, setHasInvitations] = useState(false);

  // Memoize pathname checks to avoid recalculation on every render
  const pathname = location.pathname;

  const isOnOnboardingPage = useMemo(() => pathname.startsWith('/onboarding'), [pathname]);
  const isOnInvitationPage = useMemo(() =>
    pathname.includes('student-invitations') || pathname.includes('parent-consent'),
    [pathname]
  );
  const inProtectedFlow = useMemo(() => isProtectedFlow(pathname), [pathname]);
  const onboardingDeferred = useMemo(() => isOnboardingDeferred(), [pathname]);

  // Determine if data is ready for decision making
  const isDataReady = useMemo(() =>
    !isLoading && !settingsLoading && userDataFresh && currentUser?.email && hasCheckedInvitations,
    [isLoading, settingsLoading, userDataFresh, currentUser?.email, hasCheckedInvitations]
  );

  // Memoize the onboarding check result
  const userNeedsOnboarding = useMemo(() => {
    if (!currentUser) return false;
    return needsOnboarding(currentUser);
  }, [currentUser, needsOnboarding]);

  // Determine the redirect target (if any) - memoized for performance
  const redirectTarget = useMemo(() => {
    // Can't make decision yet
    if (!isDataReady || !currentUser) {
      ludlog.navigation('[OnboardingRedirect] Data not ready', { data: { status: 'noRedirect' } });
      return null;
    }

    // Already on target pages - no redirect needed
    if (isOnOnboardingPage || isOnInvitationPage) {
      ludlog.navigation('[OnboardingRedirect] Already on target page', { data: { status: 'noRedirectNeeded' } });
      return null;
    }

    // Priority 1: Invitations take precedence
    if (hasInvitations) {
      ludlog.navigation('[OnboardingRedirect] Has invitations', { data: { action: 'redirectingToStudentInvitations' } });
      return { path: '/student-invitations', text: 'מפנה לדף הזמנות...' };
    }

    // Priority 2: Onboarding (if needed and not in protected flow)
    if (userNeedsOnboarding) {
      ludlog.navigation('[OnboardingRedirect] User needs onboarding', { data: { status: 'checkingConditions' } });

      // In protected flow - defer onboarding, don't redirect
      if (inProtectedFlow) {
        ludlog.navigation('[OnboardingRedirect] In protected flow', { data: { action: 'deferringOnboarding' } });
        return null; // Will handle deferral in useEffect
      }

      // Onboarding was deferred - check if we should show it now
      if (onboardingDeferred && !shouldShowOnboardingNow(pathname, location.search)) {
        ludlog.navigation('[OnboardingRedirect] Onboarding deferred', { data: { status: 'notShowingNow' } });
        return null;
      }

      ludlog.navigation('[OnboardingRedirect] Will redirect to onboarding');
      return { path: '/onboarding', text: 'מפנה לדף הרשמה...' };
    }

    ludlog.navigation('[OnboardingRedirect] No redirect needed');
    return null;
  }, [
    isDataReady, currentUser, isOnOnboardingPage, isOnInvitationPage,
    hasInvitations, userNeedsOnboarding, inProtectedFlow, onboardingDeferred,
    pathname, location.search
  ]);

  // Check invitations effect - only when classroom feature is enabled
  useEffect(() => {
    const checkInvitations = async () => {
      // Skip invitation checks if classrooms are disabled
      if (!shouldCheckInvitations) {
        ludlog.navigation('[OnboardingRedirect] Skipping invitation checks - classrooms disabled');
        setHasCheckedInvitations(true);
        setHasInvitations(false);
        return;
      }

      if (!currentUser || hasCheckedInvitations) return;

      ludlog.navigation('[OnboardingRedirect] Starting invitation check for user:', { data: currentUser.email });

      const timeoutId = setTimeout(() => {
        ludlog.navigation('[OnboardingRedirect] Invitation check timeout', { data: { action: 'proceedingWithoutInvitations' } });
        setHasCheckedInvitations(true);
        setHasInvitations(false);
      }, 5000);

      try {
        const [studentInvitations, parentInvitations] = await Promise.all([
          StudentInvitation.filter({
            student_email: currentUser.email,
            status: ['pending_student_acceptance', 'pending_parent_consent']
          }),
          StudentInvitation.filter({
            parent_email: currentUser.email,
            status: ['pending_parent_consent']
          })
        ]);

        const totalInvitations = [...studentInvitations, ...parentInvitations];
        setHasInvitations(totalInvitations.length > 0);
        setHasCheckedInvitations(true);
        clearTimeout(timeoutId);
      } catch (error) {
        ludlog.navigation('[OnboardingRedirect] Error checking invitations:', { data: error });
        setHasCheckedInvitations(true);
        setHasInvitations(false);
        clearTimeout(timeoutId);
      }
    };

    checkInvitations();
  }, [currentUser, hasCheckedInvitations, shouldCheckInvitations]);

  // Reset invitation state when shouldCheckInvitations changes
  useEffect(() => {
    // Only act when settings are loaded (not null/undefined)
    if (settings !== null && settings !== undefined) {
      if (!shouldCheckInvitations) {
        // Classrooms disabled - mark as checked and no invitations
        ludlog.navigation('[OnboardingRedirect] Classrooms disabled in settings - skipping invitation checks');
        setHasCheckedInvitations(true);
        setHasInvitations(false);
      } else {
        // Classrooms enabled - reset to check invitations
        ludlog.navigation('[OnboardingRedirect] Classrooms enabled in settings - will check invitations');
        setHasCheckedInvitations(false);
      }
    }
  }, [shouldCheckInvitations, settings]);

  // Handle redirect effect - executes when redirectTarget changes
  useEffect(() => {
    if (!isDataReady || !currentUser) return;

    // Handle protected flow deferral
    if (userNeedsOnboarding && inProtectedFlow && !isOnOnboardingPage) {
      ludlog.navigation('[OnboardingRedirect] User in protected flow - deferring onboarding');
      deferOnboarding();
      return;
    }

    // Clear deferred onboarding if user doesn't need it anymore
    if (!userNeedsOnboarding && onboardingDeferred) {
      clearDeferredOnboarding();
    }

    // Execute redirect if needed
    if (redirectTarget) {
      ludlog.navigation('[OnboardingRedirect] Redirecting to:', { data: redirectTarget.path });
      if (onboardingDeferred && redirectTarget.path === '/onboarding') {
        clearDeferredOnboarding();
      }
      navigate(redirectTarget.path, { replace: true });
    }
  }, [
    isDataReady, currentUser, userNeedsOnboarding, inProtectedFlow,
    isOnOnboardingPage, onboardingDeferred, redirectTarget, navigate
  ]);

  // RENDER LOGIC - optimized to prevent flash of content

  // No user - render children immediately (onboarding is only for authenticated users)
  if (!currentUser) {
    return children;
  }

  // Data not ready - show loading with appropriate text
  if (!isDataReady) {
    const loadingText = shouldCheckInvitations
      ? "בודק הזמנות והגדרות..."
      : "טוען הגדרות...";

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" dir="rtl">
        <LudoraLoadingSpinner size="lg" text={loadingText} />
      </div>
    );
  }

  // Redirect pending - show loading with specific text
  // This prevents flash of content during redirect
  if (redirectTarget) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" dir="rtl">
        <LudoraLoadingSpinner size="lg" text={redirectTarget.text} />
      </div>
    );
  }

  // All checks passed - render children
  return children;
}

OnboardingRedirect.propTypes = {
  children: PropTypes.node.isRequired
};
