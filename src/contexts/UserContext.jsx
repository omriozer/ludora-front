import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, SubscriptionPlan, SubscriptionHistory, Settings } from '@/services/apiClient';
import { loadSettingsWithRetry } from '@/lib/appUser';

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

  // Load settings independently of user authentication
  const loadSettings = useCallback(async () => {
    try {
      const appSettings = await loadSettingsWithRetry(Settings);
      if (appSettings && appSettings.length > 0) {
        setSettings(appSettings[0]);
      } else {
        setSettings(null);
      }
    } catch (error) {
      console.error('[UserContext] Error loading settings:', error);
      setSettings(null);
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
      const user = await User.getCurrentUser();
      if (user) {
        await loadUserData(user);
        updateLastActivity();
        setIsAuthenticated(true);
      } else {
        clearAuth();
      }
    } catch (error) {
      console.error('Error checking persisted auth:', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUserData = useCallback(async (user) => {
    try {
      console.log('[UserContext] Loading user data for:', user.email);

      // User data is already clean from the API - no normalization needed
      // All user data comes from the database user table

      // Settings are already loaded independently, so get current settings
      const settingsObj = settings;
      if (settingsObj?.subscription_system_enabled) {
        try {
          const updatedUser = await checkUserSubscription(user);
          setCurrentUser(updatedUser);
        } catch (subscriptionError) {
          console.warn('[UserContext] Subscription check failed, proceeding without subscription:', subscriptionError);
          // If subscription check fails, proceed without it to allow login
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(user);
      }
      setIsAuthenticated(true);
    } catch (error) {
      console.error('[UserContext] Error loading user data:', error);
      throw error;
    }
  }, [settings]);

  const checkUserSubscription = useCallback(async (user) => {
    try {
      if (!user.current_subscription_plan_id || user.subscription_status !== 'active') {
        console.log('[UserContext] User has no active subscription, checking for free plans');
        
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
            console.error('[UserContext] Error recording subscription history:', historyError);
          }
          
          return updatedUser;
        }
      }
      return user;
    } catch (error) {
      console.error('[UserContext] Error checking subscription:', error);
      return user;
    }
  }, []);

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
      console.log('[UserContext] User logged in successfully');
    } catch (error) {
      console.error('[UserContext] Login error:', error);
      throw error;
    }
  }, [loadUserData]);

  const logout = useCallback(async () => {
    try {
      // Call API logout if available
      const { logout: apiLogout } = await import('@/services/apiClient');
      await apiLogout();
    } catch (error) {
      console.error('[UserContext] API logout error:', error);
    } finally {
      clearAuth();
    }
  }, []);

  const clearAuth = useCallback(() => {
    setCurrentUser(null);
    // Don't clear settings - they should remain available for non-logged-in users
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('lastActivity');
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
    login,
    logout,
    updateUser,
    clearAuth
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}