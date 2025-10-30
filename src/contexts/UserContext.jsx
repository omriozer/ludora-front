import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, SubscriptionPlan, SubscriptionHistory, Settings } from '@/services/apiClient';
import { loadSettingsWithRetry } from '@/lib/appUser';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const UserContext = createContext(null);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settingsLoadFailed, setSettingsLoadFailed] = useState(false);
  const [userDataFresh, setUserDataFresh] = useState(false);

  // Load settings independently of user authentication
  const loadSettings = useCallback(async () => {
    try {
      setSettingsLoadFailed(false);
      const appSettings = await loadSettingsWithRetry(Settings);
      if (appSettings && appSettings.length > 0) {
        setSettings(appSettings[0]);
      } else {
        setSettings(null);
      }
    } catch (error) {
      cerror('[UserContext] Error loading settings:', error);
      setSettings(null);
      setSettingsLoadFailed(true);
    }
  }, []);

  // Check for persisted auth state on mount and load settings
  useEffect(() => {
    const init = async () => {
      // Load settings first (independent of user)
      await loadSettings();
      // Then check authentication
      await checkPersistedAuth();
    };
    init();
  }, [loadSettings]);

  const checkPersistedAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const tokenExpiry = localStorage.getItem('tokenExpiry');

      if (!token) {
        setIsLoading(false);
        return;
      }

      // Check if token is expired
      if (tokenExpiry && new Date().getTime() > parseInt(tokenExpiry)) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('rememberMe');
        setIsLoading(false);
        return;
      }

      // If rememberMe, persist for a week (handled by tokenExpiry). If not, persist for session only.
      if (!rememberMe) {
        // For session-only, do not expire until tab/window is closed (no expiry check needed)
        // Remove tokenExpiry if it exists
        if (tokenExpiry) {
          localStorage.removeItem('tokenExpiry');
        }
      }

      // Try to get current user with existing token
      try {
        clog('[UserContext] 🔄 Calling User.getCurrentUser()...');
        const user = await User.getCurrentUser();
        clog('[UserContext] 🔄 User.getCurrentUser() response:', user);
        if (user) {
          clog('[UserContext] ✅ User.getCurrentUser() succeeded, calling loadUserData...');
          await loadUserData(user);
          updateLastActivity();
          setIsAuthenticated(true);
        } else {
          clog('[UserContext] ❌ User.getCurrentUser() returned null/undefined');
          clearAuth();
        }
      } catch (getCurrentUserError) {
        cerror('[UserContext] ❌ Failed to get current user from API:', getCurrentUserError);
        cerror('[UserContext] ❌ Error details:', {
          message: getCurrentUserError.message,
          stack: getCurrentUserError.stack,
          name: getCurrentUserError.name
        });
        // If we can't get user from API, clear auth completely to force re-login
        clearAuth();
      }
    } catch (error) {
      cerror('Error checking persisted auth:', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if user needs onboarding
  const needsOnboarding = useCallback((user) => {
    clog('[UserContext] 🎯 needsOnboarding called with user:', {
      email: user?.email,
      birth_date: user?.birth_date,
      onboarding_completed: user?.onboarding_completed,
      onboarding_completed_type: typeof user?.onboarding_completed,
      user_type: user?.user_type,
      hasUser: !!user,
      userKeys: user ? Object.keys(user) : [],
      isFromReactState: user === currentUser
    });

    if (!user) {
      clog('[UserContext] ❌ No user provided to needsOnboarding - returning false');
      return false;
    }

    // Additional validation to ensure we have a complete user object
    if (!user.email) {
      clog('[UserContext] ⚠️ User object missing email field - possible incomplete data');
      return false; // Don't force onboarding for incomplete user objects
    }

    // Users with onboarding_completed true AND required fields present don't need onboarding
    if (user.onboarding_completed === true) {
      // Double-check that required onboarding fields are actually present
      const hasRequiredFields = user.birth_date && user.user_type;

      if (hasRequiredFields) {
        clog('[UserContext] ✅ User has onboarding_completed=true AND required fields - no onboarding needed');
        clog('[UserContext] ✅ Final decision: NO onboarding needed');
        return false;
      } else {
        clog('[UserContext] ⚠️ User has onboarding_completed=true but missing required fields:', {
          birth_date: user.birth_date,
          user_type: user.user_type,
          hasRequiredFields
        });
        clog('[UserContext] 🔄 Forcing onboarding to complete missing data');
        clog('[UserContext] 🔄 Final decision: Onboarding NEEDED (missing fields)');
        return true; // Force onboarding if data is incomplete
      }
    }

    // Check for explicit false or falsy values
    if (user.onboarding_completed === false || user.onboarding_completed === null || user.onboarding_completed === undefined) {
      clog('[UserContext] 🔄 User onboarding_completed is not true:', {
        value: user.onboarding_completed,
        type: typeof user.onboarding_completed
      });
      clog('[UserContext] 🔄 Final decision: Onboarding NEEDED (not completed)');
      return true; // User needs onboarding if onboarding_completed is false/null/undefined
    }

    // Fallback - if onboarding_completed is some other value, be conservative
    clog('[UserContext] ⚠️ User onboarding_completed has unexpected value:', {
      value: user.onboarding_completed,
      type: typeof user.onboarding_completed
    });
    clog('[UserContext] 🔄 Final decision: Onboarding NEEDED (unexpected value)');
    return true;
  }, [currentUser]);

  const checkUserSubscription = useCallback(async (user) => {
    try {
      // Don't auto-assign subscription if user needs onboarding
      // Let the onboarding flow handle subscription selection
      if (needsOnboarding(user)) {
        clog('[UserContext] User needs onboarding, skipping auto-subscription assignment');
        return user;
      }

      if (!user.current_subscription_plan_id || user.subscription_status !== 'active') {
        clog('[UserContext] User has no active subscription, checking for free plans');

        const allPlans = await SubscriptionPlan.find({ is_active: true });
        const freePlans = allPlans.filter(plan =>
          plan.plan_type === 'free' ||
          plan.price === 0 ||
          plan.price === '0' ||
          plan.price === null
        );

        if (freePlans && freePlans.length > 0) {
          const freePlan = freePlans[0];
          const updatedUser = await User.update(user.uid || user.id, {
            current_subscription_plan_id: freePlan.id,
            subscription_status: 'active',
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: null,
            subscription_status_updated_at: new Date().toISOString()
          });

          // Record in subscription history
          try {
            await SubscriptionHistory.create({
              user_id: user.id,
              subscription_plan_id: freePlan.id,
              action_type: 'started',
              start_date: new Date().toISOString(),
              metadata: JSON.stringify({ auto_assigned: true, plan_name: freePlan.name })
            });
          } catch (historyError) {
            cerror('[UserContext] Error recording subscription history:', historyError);
          }

          return updatedUser;
        }
      }
      return user;
    } catch (error) {
      cerror('[UserContext] Error checking subscription:', error);
      return user;
    }
  }, [needsOnboarding]);

  const loadUserData = useCallback(async (user) => {
    try {
      clog('[UserContext] 🚀 loadUserData called with user:', user);
      clog('[UserContext] 🔍 Input user data analysis:', {
        birth_date: user.birth_date,
        onboarding_completed: user.onboarding_completed,
        user_type: user.user_type,
        email: user.email,
        uid: user.uid,
        id: user.id,
        allKeys: Object.keys(user),
        userSource: user.providerData ? 'Firebase' : 'API'
      });

      // Ensure we have complete user data before proceeding
      if (!user || !user.email) {
        throw new Error('Incomplete user data received from API');
      }

      // User data is already clean from the API - no normalization needed
      // All user data comes from the database user table

      // Settings are already loaded independently, so get current settings
      const settingsObj = settings;
      let finalUser = user;

      if (settingsObj?.subscription_system_enabled) {
        try {
          const updatedUser = await checkUserSubscription(user);
          clog('[UserContext] 💾 Setting updated user in state:', {
            birth_date: updatedUser.birth_date,
            onboarding_completed: updatedUser.onboarding_completed,
            user_type: updatedUser.user_type,
            email: updatedUser.email
          });
          finalUser = updatedUser;
        } catch (subscriptionError) {
          clog('[UserContext] Subscription check failed, proceeding without subscription:', subscriptionError);
          // If subscription check fails, proceed without it to allow login
          clog('[UserContext] 💾 Setting original user in state:', {
            birth_date: user.birth_date,
            onboarding_completed: user.onboarding_completed,
            user_type: user.user_type,
            email: user.email
          });
          finalUser = user;
        }
      } else {
        clog('[UserContext] 💾 Setting user in state (no subscription system):', {
          birth_date: user.birth_date,
          onboarding_completed: user.onboarding_completed,
          user_type: user.user_type,
          email: user.email
        });
        finalUser = user;
      }

      // Ensure the final user object has all required fields
      const completeUser = {
        ...finalUser,
        // Ensure critical fields are preserved
        email: finalUser.email || user.email,
        uid: finalUser.uid || user.uid,
        id: finalUser.id || user.id,
        birth_date: finalUser.birth_date,
        onboarding_completed: finalUser.onboarding_completed,
        user_type: finalUser.user_type
      };

      clog('[UserContext] 🔧 Final complete user object being stored:', {
        email: completeUser.email,
        birth_date: completeUser.birth_date,
        onboarding_completed: completeUser.onboarding_completed,
        user_type: completeUser.user_type,
        hasAllFields: !!(completeUser.email && (completeUser.onboarding_completed !== undefined))
      });

      // Store the complete user data in React state
      setCurrentUser(completeUser);
      setIsAuthenticated(true);

      // Use setTimeout to ensure state update completes before marking data as fresh
      setTimeout(() => {
        setUserDataFresh(true);
        clog('[UserContext] ✅ User data loading completed, userDataFresh set to true');
        clog('[UserContext] 🔍 State should now contain complete user data');
      }, 0);

    } catch (error) {
      cerror('[UserContext] Error loading user data:', error);
      // Reset states on error
      setCurrentUser(null);
      setIsAuthenticated(false);
      setUserDataFresh(false);
      throw error;
    }
  }, [settings, checkUserSubscription]);

  const login = useCallback(async (userData, rememberMe = false) => {
    try {
      await loadUserData(userData);
      // Set remember me preference
      if (rememberMe) {
        const oneWeekFromNow = new Date().getTime() + (7 * 24 * 60 * 60 * 1000);
        localStorage.setItem('tokenExpiry', oneWeekFromNow.toString());
        localStorage.setItem('rememberMe', 'true');
      } else {
        // Session-only: remove tokenExpiry, set rememberMe false
        localStorage.removeItem('tokenExpiry');
        localStorage.setItem('rememberMe', 'false');
      }
      updateLastActivity();
      clog('[UserContext] User logged in successfully');
    } catch (error) {
      cerror('[UserContext] Login error:', error);

      // Show user-friendly error message
      toast({
        title: "שגיאה בהתחברות",
        description: "לא הצלחנו להתחבר למערכת. אנא נסה שוב.",
        variant: "destructive",
      });

      throw error;
    }
  }, [loadUserData]);

  const logout = useCallback(async () => {
    try {
      // Call API logout if available
      const { logout: apiLogout } = await import('@/services/apiClient');
      await apiLogout();
    } catch (error) {
      cerror('[UserContext] API logout error:', error);
    } finally {
      clearAuth();
    }
  }, []);

  const clearAuth = useCallback(() => {
    clog('[UserContext] Clearing authentication - user will be logged out');
    setCurrentUser(null);
    // Don't clear settings - they should remain available for non-logged-in users
    setIsAuthenticated(false);
    setUserDataFresh(false); // Reset fresh data flag when clearing auth
    localStorage.removeItem('authToken');
    localStorage.removeItem('token'); // Also clear backup token key
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('lastActivity');

    // Clear any Firebase session data that might be persisting
    try {
      // Clear any Firebase auth state
      if (typeof window !== 'undefined' && window.localStorage) {
        // Clear common Firebase keys
        const firebaseKeys = Object.keys(localStorage).filter(key =>
          key.startsWith('firebase:') ||
          key.startsWith('_firebase') ||
          key.startsWith('firebaseui')
        );
        firebaseKeys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      cerror('[UserContext] Error clearing Firebase session:', error);
    }
  }, []);

  const updateLastActivity = useCallback(() => {
    localStorage.setItem('lastActivity', new Date().getTime().toString());
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    setCurrentUser(prev => ({ ...prev, ...updatedUserData }));
  }, []);

  // Update last activity on user interactions
  useEffect(() => {
    if (isAuthenticated) {
      const handleActivity = () => updateLastActivity();

      document.addEventListener('click', handleActivity);
      document.addEventListener('keypress', handleActivity);

      return () => {
        document.removeEventListener('click', handleActivity);
        document.removeEventListener('keypress', handleActivity);
      };
    }
  }, [isAuthenticated, updateLastActivity]);

  const value = {
    currentUser,
    settings,
    isLoading,
    isAuthenticated,
    settingsLoadFailed,
    userDataFresh,
    login,
    logout,
    updateUser,
    clearAuth,
    needsOnboarding
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}