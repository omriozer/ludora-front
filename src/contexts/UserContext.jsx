import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, SubscriptionPlan, SubscriptionHistory, Settings, Player } from '@/services/apiClient';
import { loadSettingsWithRetry } from '@/lib/appUser';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { SETTINGS_RETRY_INTERVALS } from '@/constants/settings';
import { isStudentPortal } from '@/utils/domainUtils';

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
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPlayerAuthenticated, setIsPlayerAuthenticated] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsLoadFailed, setSettingsLoadFailed] = useState(false);
  const [userDataFresh, setUserDataFresh] = useState(false);
  const [playerDataFresh, setPlayerDataFresh] = useState(false);

  // Retry mechanism for settings loading
  const retryIntervalRef = useRef(null);

  // Load settings independently of user authentication (parallel to settings)
  const loadSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
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
    } finally {
      setSettingsLoading(false);
    }
  }, []);


  // Silent retry function - doesn't show loading states or errors in UI
  const retryLoadSettings = useCallback(async () => {
    try {
      const appSettings = await loadSettingsWithRetry(Settings);
      if (appSettings && appSettings.length > 0) {
        setSettings(appSettings[0]);
        setSettingsLoadFailed(false);
        // Stop retrying on successful load
        stopSettingsRetry();
      } else {
        setSettings(null);
        // Continue retrying if no settings returned
      }
    } catch (error) {
      cerror('[UserContext] Silent retry failed:', error);
      // Continue retrying on error (silent failure)
    }
  }, []);

  // Stop the settings retry mechanism
  const stopSettingsRetry = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
  }, []);

  // Start settings retry with appropriate interval based on current state
  const startSettingsRetry = useCallback(() => {
    // Stop any existing retry first
    stopSettingsRetry();

    // Determine retry interval based on current state
    let interval;
    if (settingsLoadFailed) {
      // System error mode - use faster interval
      interval = SETTINGS_RETRY_INTERVALS.SYSTEM_ERROR;
    } else if (settings?.maintenance_mode) {
      // Regular maintenance mode - use slower interval
      interval = SETTINGS_RETRY_INTERVALS.MAINTENANCE;
    } else {
      // No retry needed
      return;
    }

    // Start retry interval
    retryIntervalRef.current = setInterval(() => {
      retryLoadSettings();
    }, interval);
  }, [settingsLoadFailed, settings?.maintenance_mode, retryLoadSettings, stopSettingsRetry]);

  const checkPersistedAuth = useCallback(async (currentSettings = null) => {
    try {
      // Use passed settings or current settings
      const activeSettings = currentSettings || settings;

      // Check if we're on student portal and if students_access is invite_only
      const onStudentPortal = isStudentPortal();
      const studentsAccess = activeSettings?.students_access || 'invite_only'; // Default to invite_only

      clog('[UserContext] 🔄 Authentication check starting...', {
        onStudentPortal,
        studentsAccess,
        settingsLoaded: !!activeSettings
      });

      // Check both user and player sessions simultaneously
      const [userResult, playerResult] = await Promise.allSettled([
        checkUserSession(activeSettings, onStudentPortal, studentsAccess),
        checkPlayerSession()
      ]);

      if (userResult.status === 'rejected') {
        cerror('[UserContext] User session check failed:', userResult.reason);
      }
      if (playerResult.status === 'rejected') {
        cerror('[UserContext] Player session check failed:', playerResult.reason);
      }
    } catch (error) {
      cerror('[UserContext] Error in authentication check:', error);
      // Clear all auth state directly
      clearAllAuthState();
    } finally {
      setIsLoading(false);
    }
  }, []); // FIXED: Remove settings dependency to break circular dependency

  const checkUserSession = useCallback(async (activeSettings, onStudentPortal, studentsAccess) => {
    try {
      // On student portal with invite_only access, first check if there's a valid admin session
      if (onStudentPortal && studentsAccess === 'invite_only') {
        clog('[UserContext] 🔍 Student portal in invite_only mode - checking for admin session first...');

        try {
          // Attempt to get current user to check for admin privileges
          const user = await User.getCurrentUser(true); // Suppress errors

          if (user && user.role === 'admin' && !user._isImpersonated) {
            clog('[UserContext] ✅ Admin user detected on student portal - allowing authentication to proceed');
            // Admin user - proceed with normal authentication flow below
          } else {
            clog('[UserContext] 🚫 No admin session found - skipping user authentication for student portal invite_only mode');
            // Not an admin - skip user auth and mark as ready for invite-only access
            setCurrentUser(null);
            setIsAuthenticated(false);
            setUserDataFresh(true);
            return;
          }
        } catch (error) {
          clog('[UserContext] 🚫 Error checking for admin session - skipping user authentication for student portal invite_only mode');
          // Error checking session - skip user auth and mark as ready for invite-only access
          setCurrentUser(null);
          setIsAuthenticated(false);
          setUserDataFresh(true);
          return;
        }
      }

      // With httpOnly cookies, we simply try to get the current user
      // The cookies will be automatically sent with the request
      // If the session is valid, the API will return user data
      // If invalid/expired, the API will return an error

      clog('[UserContext] 🔄 Checking user authentication via cookie-based session...');

      try {
        clog('[UserContext] 🔄 Calling User.getCurrentUser() with suppressUserErrors=true...');
        const user = await User.getCurrentUser(true); // Suppress user errors for initial auth check
        clog('[UserContext] 🔄 User.getCurrentUser() response:', user);
        if (user) {
          clog('[UserContext] ✅ User.getCurrentUser() succeeded, setting user state directly...');
          // Set user state directly for now - full loadUserData will be called later if needed
          setCurrentUser(user);
          setIsAuthenticated(true);
          setUserDataFresh(true); // Mark data as fresh for existing users
          // Update activity directly
          localStorage.setItem('lastActivity', new Date().getTime().toString());
        } else {
          clog('[UserContext] ℹ️ User.getCurrentUser() returned null/undefined - no authenticated user found');
          // Clear user auth state directly
          setCurrentUser(null);
          setIsAuthenticated(false);
          setUserDataFresh(false);
        }
      } catch (getCurrentUserError) {
        // Use clog instead of cerror for legitimate non-authenticated states
        clog('[UserContext] ℹ️ No authenticated user found:', getCurrentUserError.message);
        clog('[UserContext] 📊 User authentication check details:', {
          errorName: getCurrentUserError.name,
          errorMessage: getCurrentUserError.message
        });
        // If we can't get user from API (401/403), user is not authenticated
        // Clear any local state to ensure clean state directly
        setCurrentUser(null);
        setIsAuthenticated(false);
        setUserDataFresh(false);
      }
    } catch (error) {
      cerror('[UserContext] Error in user session check:', error);
      // Clear user auth state directly
      setCurrentUser(null);
      setIsAuthenticated(false);
      setUserDataFresh(false);
    }
  }, []);

  const checkPlayerSession = useCallback(async () => {
    try {
      clog('[UserContext] 🎮 Checking player authentication via cookie-based session...');

      try {
        // Check for player session using Player API client
        const player = await Player.getCurrentPlayer(true); // Suppress errors for initial check
        clog('[UserContext] 🎮 Player.getCurrentPlayer() response:', player);

        if (player) {
          clog('[UserContext] ✅ Player.getCurrentPlayer() succeeded, setting player state...');
          setCurrentPlayer(player);
          setIsPlayerAuthenticated(true);
          setPlayerDataFresh(true);
          // Update activity for player as well
          localStorage.setItem('lastActivity', new Date().getTime().toString());
        } else {
          clog('[UserContext] ℹ️ Player.getCurrentPlayer() returned null/undefined - no authenticated player found');
          // Clear player auth state directly
          setCurrentPlayer(null);
          setIsPlayerAuthenticated(false);
          setPlayerDataFresh(false);
        }
      } catch (getCurrentPlayerError) {
        // Use clog instead of cerror for legitimate non-authenticated states
        clog('[UserContext] ℹ️ No authenticated player found:', getCurrentPlayerError.message);
        clog('[UserContext] 📊 Player authentication check details:', {
          errorName: getCurrentPlayerError.name,
          errorMessage: getCurrentPlayerError.message
        });
        // Clear player auth state
        setCurrentPlayer(null);
        setIsPlayerAuthenticated(false);
        setPlayerDataFresh(false);
      }
    } catch (error) {
      cerror('[UserContext] Error in player session check:', error);
      // Clear player auth state
      setCurrentPlayer(null);
      setIsPlayerAuthenticated(false);
      setPlayerDataFresh(false);
    }
  }, []);

  const clearAllAuthState = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setUserDataFresh(false);
    setCurrentPlayer(null);
    setIsPlayerAuthenticated(false);
    setPlayerDataFresh(false);
  }, []);

  // Check for persisted auth state on mount and load settings
  useEffect(() => {
    const init = async () => {
      // Load settings (independent of user)
      await loadSettings();
    };
    init();
  }, [loadSettings]);

  // Run auth check after settings is initially loaded
  useEffect(() => {
    if (settings !== null && !settingsLoading) {
      checkPersistedAuth(settings);
    }
  }, [settingsLoading]); // Run when settings finish loading (once)

  // Additional effect: Trigger auth check when settings is updated by retry
  // This handles the case where auto-retry succeeds but auth check doesn't re-run
  useEffect(() => {
    if (settings !== null && !settingsLoading && isLoading && !settingsLoadFailed) {
      // Settings was successfully loaded (either initially or via retry) but we're still in loading state
      // Re-run auth check to complete the initialization
      checkPersistedAuth(settings);
    }
  }, [settings, settingsLoading, isLoading, settingsLoadFailed, checkPersistedAuth]);

  // Start retry mechanism when settings fails to load or maintenance mode is active
  useEffect(() => {
    if (settingsLoadFailed || settings?.maintenance_mode) {
      startSettingsRetry();
    } else {
      stopSettingsRetry();
    }
  }, [settingsLoadFailed, settings?.maintenance_mode, startSettingsRetry, stopSettingsRetry]);

  // Cleanup retry interval on unmount
  useEffect(() => {
    return () => {
      stopSettingsRetry();
    };
  }, [stopSettingsRetry]);

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

  const loadUserData = useCallback(async (user) => {
    try {
      clog('[UserContext] 🚀 loadUserData called with user:', user);
      clog('[UserContext] 🔍 Input user data analysis:', {
        birth_date: user.birth_date,
        onboarding_completed: user.onboarding_completed,
        user_type: user.user_type,
        email: user.email,
        id: user.id,
        allKeys: Object.keys(user),
        userSource: user.providerData ? 'Firebase' : 'API'
      });

      // Ensure we have basic user info before proceeding
      if (!user || !user.email) {
        throw new Error('Incomplete user data received from API');
      }

      // ALWAYS fetch complete user data from database to ensure consistency
      // This fixes the issue where initial login has incomplete data
      clog('[UserContext] 🔄 Fetching complete user data from database...');
      let completeUser;
      try {
        completeUser = await User.getCurrentUser(true); // Suppress user errors for user data refresh
        clog('[UserContext] ✅ Complete user data fetched:', {
          birth_date: completeUser?.birth_date,
          onboarding_completed: completeUser?.onboarding_completed,
          user_type: completeUser?.user_type,
          email: completeUser?.email
        });
      } catch (fetchError) {
        clog('[UserContext] ⚠️ Failed to fetch complete user data, using provided data:', fetchError);
        completeUser = user; // Fallback to provided data if fetch fails
      }

      // Settings is already loaded independently, so get current settings
      const settingsObj = settings;
      let finalUser = completeUser;

      if (settingsObj?.subscription_system_enabled) {
        try {
          const updatedUser = await checkUserSubscription(completeUser);
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
          clog('[UserContext] 💾 Setting complete user in state:', {
            birth_date: completeUser.birth_date,
            onboarding_completed: completeUser.onboarding_completed,
            user_type: completeUser.user_type,
            email: completeUser.email
          });
          finalUser = completeUser;
        }
      } else {
        clog('[UserContext] 💾 Setting complete user in state (no subscription system):', {
          birth_date: completeUser.birth_date,
          onboarding_completed: completeUser.onboarding_completed,
          user_type: completeUser.user_type,
          email: completeUser.email
        });
        finalUser = completeUser;
      }

      // Ensure the final user object has all required fields
      const finalCompleteUser = {
        ...finalUser,
        // Ensure critical fields are preserved
        email: finalUser.email || user.email,
        id: finalUser.id || user.id,
        birth_date: finalUser.birth_date,
        onboarding_completed: finalUser.onboarding_completed,
        user_type: finalUser.user_type
      };

      clog('[UserContext] 🔧 Final complete user object being stored:', {
        email: finalCompleteUser.email,
        birth_date: finalCompleteUser.birth_date,
        onboarding_completed: finalCompleteUser.onboarding_completed,
        user_type: finalCompleteUser.user_type,
        hasAllFields: !!(finalCompleteUser.email && (finalCompleteUser.onboarding_completed !== undefined))
      });

      // Store the complete user data in React state
      setCurrentUser(finalCompleteUser);
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

      // Note: rememberMe functionality is now handled server-side via refresh token duration
      // The server sets appropriate cookie expiration times based on rememberMe preference
      // No need for client-side localStorage management

      updateLastActivity();
      clog('[UserContext] User logged in successfully with cookie-based session');
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

  const playerLogin = useCallback(async (privacyCode) => {
    try {
      clog('[UserContext] 🎮 Starting player login with privacy code:', privacyCode);

      // Call player login API
      const response = await Player.login({ privacy_code: privacyCode });

      if (response.success && response.player) {
        clog('[UserContext] ✅ Player logged in successfully:', response.player.display_name);

        // Set player state
        setCurrentPlayer(response.player);
        setIsPlayerAuthenticated(true);
        setPlayerDataFresh(true);

        updateLastActivity();

        // Show success message
        toast({
          title: "התחברת בהצלחה! 🎮",
          description: `ברוך הבא ${response.player.display_name}`,
          variant: "default",
        });

        return response.player;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      cerror('[UserContext] Player login error:', error);

      // Show user-friendly error message
      toast({
        title: "שגיאה בהתחברות 🎮",
        description: "קוד פרטיות שגוי או לא קיים. אנא בדוק את הקוד ונסה שוב.",
        variant: "destructive",
      });

      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Call API logout if available (handles user logout)
      const { logout: apiLogout } = await import('@/services/apiClient');
      await apiLogout();
    } catch (error) {
      cerror('[UserContext] API logout error:', error);
    } finally {
      clearAuth();
    }
  }, []);

  const playerLogout = useCallback(async () => {
    try {
      clog('[UserContext] 🎮 Starting player logout');

      // Call player logout API
      await Player.logout();

      clog('[UserContext] ✅ Player logged out successfully');

      // Clear player state
      setCurrentPlayer(null);
      setIsPlayerAuthenticated(false);
      setPlayerDataFresh(false);

      // Show success message
      toast({
        title: "התנתקת בהצלחה! 👋",
        description: "תודה שיצא לך להשתמש במערכת",
        variant: "default",
      });
    } catch (error) {
      cerror('[UserContext] Player logout error:', error);

      // Still clear local state even if API call fails
      setCurrentPlayer(null);
      setIsPlayerAuthenticated(false);
      setPlayerDataFresh(false);

      // Show error message
      toast({
        title: "שגיאה בהתנתקות 🎮",
        description: "בעיה בהתנתקות, אך המערכת נוקתה מקומית.",
        variant: "destructive",
      });
    }
  }, []);

  const clearAuth = useCallback(() => {
    clog('[UserContext] Clearing user authentication - user will be logged out');
    setCurrentUser(null);
    // Don't clear settings - it should remain available for non-logged-in users
    setIsAuthenticated(false);
    setUserDataFresh(false); // Reset fresh data flag when clearing auth

    // Note: Authentication cookies are cleared by the server via logout endpoint
    // No need to manage tokens in localStorage anymore

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

  const clearPlayerAuth = useCallback(() => {
    clog('[UserContext] 🎮 Clearing player authentication - player will be logged out');
    setCurrentPlayer(null);
    setIsPlayerAuthenticated(false);
    setPlayerDataFresh(false);
  }, []);

  const updateLastActivity = useCallback(() => {
    // Keep activity tracking for analytics/UX purposes (not for authentication)
    localStorage.setItem('lastActivity', new Date().getTime().toString());
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    setCurrentUser(prev => ({ ...prev, ...updatedUserData }));
  }, []);

  const updatePlayer = useCallback((updatedPlayerData) => {
    setCurrentPlayer(prev => ({ ...prev, ...updatedPlayerData }));
  }, []);

  // Helper functions to determine current entity type
  const isUserSession = useCallback(() => {
    return isAuthenticated && !!currentUser && !isPlayerAuthenticated;
  }, [isAuthenticated, currentUser, isPlayerAuthenticated]);

  const isPlayerSession = useCallback(() => {
    return isPlayerAuthenticated && !!currentPlayer && !isAuthenticated;
  }, [isPlayerAuthenticated, currentPlayer, isAuthenticated]);

  const getCurrentEntity = useCallback(() => {
    if (isUserSession()) {
      return { type: 'user', entity: currentUser };
    } else if (isPlayerSession()) {
      return { type: 'player', entity: currentPlayer };
    }
    return { type: null, entity: null };
  }, [isUserSession, isPlayerSession, currentUser, currentPlayer]);

  const hasAnyAuthentication = useCallback(() => {
    return isAuthenticated || isPlayerAuthenticated;
  }, [isAuthenticated, isPlayerAuthenticated]);

  const isFullyLoaded = useCallback(() => {
    return userDataFresh || playerDataFresh || (!isAuthenticated && !isPlayerAuthenticated);
  }, [userDataFresh, playerDataFresh, isAuthenticated, isPlayerAuthenticated]);

  // Update last activity on user interactions (for both users and players)
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
    currentUser,
    isAuthenticated,
    userDataFresh,

    // Player state
    currentPlayer,
    isPlayerAuthenticated,
    playerDataFresh,

    // Shared state
    settings,
    isLoading,
    settingsLoading,
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
    isFullyLoaded
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}