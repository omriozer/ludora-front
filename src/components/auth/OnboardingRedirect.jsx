import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { StudentInvitation } from '@/services/apiClient';
import { clog } from '@/lib/utils';

export default function OnboardingRedirect({ children }) {
  const { currentUser, needsOnboarding, isLoading, userDataFresh } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasCheckedInvitations, setHasCheckedInvitations] = useState(false);
  const [hasInvitations, setHasInvitations] = useState(false);

  useEffect(() => {
    const checkInvitations = async () => {
      if (!currentUser || hasCheckedInvitations) return;

      try {
        const studentInvitations = await StudentInvitation.filter({
          student_email: currentUser.email,
          status: ['pending_student_acceptance', 'pending_parent_consent']
        });

        const parentInvitations = await StudentInvitation.filter({
          parent_email: currentUser.email,
          status: ['pending_parent_consent']
        });

        const totalInvitations = [...studentInvitations, ...parentInvitations];
        setHasInvitations(totalInvitations.length > 0);
        setHasCheckedInvitations(true);

        if (totalInvitations.length > 0) {
          clog('[OnboardingRedirect] User has pending invitations, prioritizing invitations over onboarding');
        }
      } catch (error) {
        clog('[OnboardingRedirect] Error checking invitations:', error);
        setHasCheckedInvitations(true);
        setHasInvitations(false);
      }
    };

    checkInvitations();
  }, [currentUser, hasCheckedInvitations]);

  useEffect(() => {
    // Don't redirect if still loading, no user, or haven't checked invitations/fresh data
    if (isLoading || !currentUser || !hasCheckedInvitations || !userDataFresh) {
      clog('[OnboardingRedirect] ⏳ Waiting for complete data:', {
        isLoading,
        hasUser: !!currentUser,
        hasCheckedInvitations,
        userDataFresh,
        userEmail: currentUser?.email
      });
      return;
    }

    // Additional validation - ensure we have complete user data before proceeding
    if (!currentUser.email || currentUser.onboarding_completed === undefined) {
      clog('[OnboardingRedirect] ⚠️ User data incomplete, waiting for complete data:', {
        hasEmail: !!currentUser.email,
        onboarding_completed: currentUser.onboarding_completed,
        onboarding_completed_type: typeof currentUser.onboarding_completed
      });
      return;
    }

    // Don't redirect if already on onboarding page
    if (location.pathname.startsWith('/onboarding')) return;

    // Don't redirect if on invitation-related pages
    if (location.pathname.includes('student-invitations') ||
        location.pathname.includes('parent-consent')) return;

    // If user has invitations, redirect to invitations page instead of onboarding
    if (hasInvitations) {
      clog('[OnboardingRedirect] User has invitations, redirecting to student-invitations from:', location.pathname);
      navigate('/student-invitations', { replace: true });
      return;
    }

    // Check if user needs onboarding (only if no invitations)
    clog('[OnboardingRedirect] 🔍 Checking onboarding status for user:', currentUser?.email);
    clog('[OnboardingRedirect] 🔍 User onboarding_completed:', currentUser?.onboarding_completed);
    clog('[OnboardingRedirect] 🔍 User onboarding_completed type:', typeof currentUser?.onboarding_completed);
    clog('[OnboardingRedirect] 🔍 Complete user data available:', {
      birth_date: currentUser?.birth_date,
      user_type: currentUser?.user_type,
      email: currentUser?.email
    });

    const userNeedsOnboarding = needsOnboarding(currentUser);
    clog('[OnboardingRedirect] 🔍 needsOnboarding() result:', userNeedsOnboarding);

    if (userNeedsOnboarding) {
      clog('[OnboardingRedirect] User needs onboarding, redirecting from:', location.pathname);
      navigate('/onboarding', { replace: true });
    } else {
      clog('[OnboardingRedirect] ✅ User does NOT need onboarding, staying on:', location.pathname);
    }
  }, [currentUser, needsOnboarding, isLoading, navigate, location.pathname, hasCheckedInvitations, hasInvitations, userDataFresh]);

  // Show loading if we haven't checked invitations or fresh data yet (only for logged-in users)
  if ((!hasCheckedInvitations || !userDataFresh) && currentUser) {
    return null;
  }

  // If no current user, render children immediately (onboarding is only for authenticated users)
  if (!currentUser) {
    return children;
  }

  // If user has invitations and we're not on invitation pages, don't render content
  if (!isLoading && currentUser && hasInvitations &&
      !location.pathname.includes('student-invitations') &&
      !location.pathname.includes('parent-consent')) {
    return null; // Will redirect via useEffect
  }

  // If user needs onboarding and we're not on onboarding/invitation pages, don't render content
  if (!isLoading && currentUser && !hasInvitations && userDataFresh && needsOnboarding(currentUser) &&
      !location.pathname.startsWith('/onboarding') &&
      !location.pathname.includes('student-invitations') &&
      !location.pathname.includes('parent-consent')) {
    return null; // Will redirect via useEffect
  }

  return children;
}