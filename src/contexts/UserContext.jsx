import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, SubscriptionPlan, SubscriptionHistory } from '@/services/apiClient';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { SETTINGS_RETRY_INTERVALS } from '@/constants/settings';
import { useAuthErrorHandler } from '@/hooks/useAuthErrorHandler';
import authManager from '@/services/AuthManager';

const UserContext = createContext(null);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function UserProvider({ children }) {
  // Unified authentication state from AuthManager
  const [authState, setAuthState] = useState({
    isLoading: true,
    isInitialized: false,
    authType: null,
    user: null,
    player: null,
    isAuthenticated: false,
    settings: null
  });

  // Additional state for user data management
  const [userDataFresh, setUserDataFresh] = useState(false);
  const [playerDataFresh, setPlayerDataFresh] = useState(false);
  const [settingsLoadFailed, setSettingsLoadFailed] = useState(false);

  // Auth error handling for session expiry modal
  const { handleAuthError } = useAuthErrorHandler();

  // Retry mechanism for settings loading
  const retryIntervalRef = useRef(null);

  // AuthManager authentication state listener
  const handleAuthStateChange = useCallback((newAuthState) => {
    clog('[UserContext] 🔄 AuthManager state changed:', newAuthState);
    setAuthState(newAuthState);

    // Update data freshness based on authentication type
    if (newAuthState.authType === 'user') {
      setUserDataFresh(true);
      setPlayerDataFresh(false);
    } else if (newAuthState.authType === 'player') {
      setPlayerDataFresh(true);
      setUserDataFresh(false);
    } else {
      setUserDataFresh(false);
      setPlayerDataFresh(false);
    }

    // Handle settings load failures
    if (newAuthState.settings === null && newAuthState.isInitialized) {
      setSettingsLoadFailed(true);
    } else {
      setSettingsLoadFailed(false);
    }
  }, []);

  // Stop the settings retry mechanism
  const stopSettingsRetry = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
  }, []);

  // Silent retry function for settings
  const retryLoadSettings = useCallback(async () => {
    try {
      clog('[UserContext] 🔄 Retrying authentication initialization...');
      await authManager.initialize();
    } catch (error) {
      cerror('[UserContext] Silent retry failed:', error);
    }
  }, []);

  // Start settings retry with appropriate interval based on current state
  const startSettingsRetry = useCallback(() => {
    stopSettingsRetry();

    let interval;
    if (settingsLoadFailed) {
      interval = SETTINGS_RETRY_INTERVALS.SYSTEM_ERROR;
    } else if (authState.settings?.maintenance_mode) {
      interval = SETTINGS_RETRY_INTERVALS.MAINTENANCE;
    } else {
      return;
    }

    retryIntervalRef.current = setInterval(() => {
      retryLoadSettings();
    }, interval);
  }, [settingsLoadFailed, authState.settings?.maintenance_mode, retryLoadSettings, stopSettingsRetry]);

  // Initialize AuthManager on mount
  useEffect(() => {
    console.log('[UserContext] 🚀 useEffect triggered for AuthManager initialization');
    const initAuth = async () => {
      try {
        console.log('[UserContext] 🚀 Starting AuthManager initialization...');
        clog('[UserContext] 🚀 Initializing AuthManager...');
        // Register for auth state changes
        authManager.addAuthListener(handleAuthStateChange);

        // Initialize authentication
        console.log('[UserContext] 🔄 Calling authManager.initialize()...');
        await authManager.initialize();
        console.log('[UserContext] ✅ AuthManager initialization completed');
      } catch (error) {
        console.error('[UserContext] ❌ AuthManager initialization failed:', error);
        cerror('[UserContext] ❌ AuthManager initialization failed:', error);
      }
    };

    initAuth();

    // Cleanup listener on unmount
    return () => {
      authManager.removeAuthListener(handleAuthStateChange);
      stopSettingsRetry();
    };
  }, [handleAuthStateChange, stopSettingsRetry]);

  // Start retry mechanism when settings fails to load or maintenance mode is active
  useEffect(() => {
    if (settingsLoadFailed || authState.settings?.maintenance_mode) {
      startSettingsRetry();
    } else {
      stopSettingsRetry();
    }
  }, [settingsLoadFailed, authState.settings?.maintenance_mode, startSettingsRetry, stopSettingsRetry]);

  // Delegate to AuthManager for onboarding check
  const needsOnboarding = useCallback((user) => {
    return authManager.needsOnboarding(user || authState.user);
  }, [authState.user]);

  const checkUserSubscription = useCallback(async (user) => {
    try {
      // Don't auto-assign subscription if user needs onboarding
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
          const updatedUser = await User.update(user.id, {
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

  const login = useCallback(async (userData, rememberMe = false) => {
    try {
      clog('[UserContext] 🔥 Delegating Firebase login to AuthManager');
      const result = await authManager.loginFirebase(userData, rememberMe);

      // Show success message
      toast({
        title: "התחברת בהצלחה! 👤",
        description: `ברוך הבא ${result.user?.email}`,
        variant: "default",
      });

      return result.user;
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
  }, []);

  const playerLogin = useCallback(async (privacyCode) => {
    try {
      clog('[UserContext] 🎮 Delegating player login to AuthManager');
      const result = await authManager.loginPlayer(privacyCode);

      // Show success message
      toast({
        title: "התחברת בהצלחה! 🎮",
        description: `ברוך הבא ${result.player?.display_name}`,
        variant: "default",
      });

      return result.player;
    } catch (error) {
      cerror('[UserContext] Player login error:', error);

      // Determine error message to display
      let errorDescription;
      if (error.message) {
        // For specific known errors, provide Hebrew translations
        if (error.message.includes('Invalid privacy code')) {
          errorDescription = 'קוד הפרטיות שהוזן אינו תקין';
        } else if (error.message.includes('Player not found')) {
          errorDescription = 'לא נמצא שחקן עם קוד זה';
        } else if (error.message.includes('Network Error')) {
          errorDescription = 'בעיית רשת. אנא בדוק את החיבור לאינטרנט';
        } else {
          // Show the actual API error message for everything else
          errorDescription = error.message;
        }
      } else {
        // Only use generic message as last resort
        errorDescription = "קוד פרטיות שגוי או לא קיים. אנא בדוק את הקוד ונסה שוב.";
      }

      // Show error message with actual API error content
      toast({
        title: "שגיאה בהתחברות 🎮",
        description: errorDescription,
        variant: "destructive",
      });

      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      clog('[UserContext] 🚪 Delegating logout to AuthManager');
      await authManager.logout();

      // Show success message
      toast({
        title: "התנתקת בהצלחה! 👋",
        description: "תודה שיצא לך להשתמש במערכת",
        variant: "default",
      });
    } catch (error) {
      cerror('[UserContext] Logout error:', error);

      // Show error message
      toast({
        title: "שגיאה בהתנתקות",
        description: "בעיה בהתנתקות, אך המערכת נוקתה מקומית.",
        variant: "destructive",
      });
    }
  }, []);

  const playerLogout = useCallback(async () => {
    try {
      clog('[UserContext] 🎮 Delegating player logout to AuthManager');
      await authManager.logout();

      // Show success message
      toast({
        title: "התנתקת בהצלחה! 👋",
        description: "תודה שיצא לך להשתמש במערכת",
        variant: "default",
      });
    } catch (error) {
      cerror('[UserContext] Player logout error:', error);

      // Show error message
      toast({
        title: "שגיאה בהתנתקות 🎮",
        description: "בעיה בהתנתקות, אך המערכת נוקתה מקומית.",
        variant: "destructive",
      });
    }
  }, []);

  const clearAuth = useCallback(() => {
    clog('[UserContext] 🚪 Clearing authentication via AuthManager');
    authManager.reset();

    // Clear any Firebase session data that might be persisting
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
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

  const clearPlayerAuth = useCallback(() => {
    clog('[UserContext] 🎮 Clearing player authentication via AuthManager');
    authManager.reset();
  }, []);

  const updateLastActivity = useCallback(() => {
    // Delegate to AuthManager
    authManager.updateLastActivity();
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    // For now, handle locally since AuthManager doesn't track partial updates
    // This could be enhanced to update AuthManager state as well
    if (authState.authType === 'user' && authState.user) {
      const updatedUser = { ...authState.user, ...updatedUserData };
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }));
    }
  }, [authState.authType, authState.user]);

  const updatePlayer = useCallback((updatedPlayerData) => {
    // For now, handle locally since AuthManager doesn't track partial updates
    // This could be enhanced to update AuthManager state as well
    if (authState.authType === 'player' && authState.player) {
      const updatedPlayer = { ...authState.player, ...updatedPlayerData };
      setAuthState(prev => ({
        ...prev,
        player: updatedPlayer
      }));
    }
  }, [authState.authType, authState.player]);

  // Helper functions to determine current entity type
  const isUserSession = useCallback(() => {
    return authState.authType === 'user' && !!authState.user;
  }, [authState.authType, authState.user]);

  const isPlayerSession = useCallback(() => {
    return authState.authType === 'player' && !!authState.player;
  }, [authState.authType, authState.player]);

  const getCurrentEntity = useCallback(() => {
    return authManager.getCurrentEntity() || { type: null, entity: null };
  }, []);

  const hasAnyAuthentication = useCallback(() => {
    return authState.isAuthenticated;
  }, [authState.isAuthenticated]);

  const isFullyLoaded = useCallback(() => {
    return !authState.isLoading && authState.isInitialized;
  }, [authState.isLoading, authState.isInitialized]);

  // Refresh user authentication state (for use after login/logout events)
  const refreshUser = useCallback(async () => {
    clog('[UserContext] 🔄 Refreshing authentication state via AuthManager...');
    await authManager.initialize();
  }, []);

  // Update last activity on user interactions
  useEffect(() => {
    if (hasAnyAuthentication()) {
      const handleActivity = () => updateLastActivity();

      document.addEventListener('click', handleActivity);
      document.addEventListener('keypress', handleActivity);

      return () => {
        document.removeEventListener('click', handleActivity);
        document.removeEventListener('keypress', handleActivity);
      };
    }
  }, [hasAnyAuthentication, updateLastActivity]);

  const value = {
    // User state
    currentUser: authState.user,
    isAuthenticated: authState.authType === 'user',
    userDataFresh,

    // Player state
    currentPlayer: authState.player,
    isPlayerAuthenticated: authState.authType === 'player',
    playerDataFresh,

    // Shared state
    settings: authState.settings,
    isLoading: authState.isLoading,
    settingsLoading: authState.isLoading, // Map to same loading state
    settingsLoadFailed,

    // User functions
    login,
    logout,
    updateUser,
    clearAuth,
    needsOnboarding,

    // Player functions
    playerLogin,
    playerLogout,
    updatePlayer,
    clearPlayerAuth,

    // Helper functions
    isUserSession,
    isPlayerSession,
    getCurrentEntity,
    hasAnyAuthentication,
    isFullyLoaded,
    refreshUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}