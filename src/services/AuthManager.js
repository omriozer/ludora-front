/**
 * Unified Authentication Manager for Ludora
 *
 * Consolidates Firebase auth (teachers + students) and Player privacy code auth
 * into a single, coordinated authentication system to prevent race conditions
 * and ensure consistent authentication state.
 *
 * Architecture:
 * - Teachers Portal (main domain): Firebase only
 * - Students Portal (subdomain): Firebase first, then Player auth, then anonymous
 * - Sequential processing (no parallel auth attempts)
 * - Single loading state for all authentication
 * - Centralized session management
 */

import { User, Player, Settings } from '@/services/apiClient';
import { isStudentPortal } from '@/utils/domainUtils';
import { loadSettingsWithRetry } from '@/lib/appUser';
import { ludlog, luderror } from '@/lib/ludlog';
import { ACCESS_CONTROL_KEYS, getSetting, STUDENTS_ACCESS_MODES } from '@/constants/settings';

export class AuthManager {
  constructor() {
    this.isInitialized = false;
    this.isLoading = true;
    this.settings = null;
    this.currentAuth = null; // { type: 'user'|'player'|null, entity: user|player|null }
    this.authListeners = new Set();
    this._initializationPromise = null; // COOKIE PERSISTENCE FIX: Track ongoing initialization

  }

  /**
   * Add listener for authentication state changes
   */
  addAuthListener(callback) {
    this.authListeners.add(callback);
    // Immediately call with current state if initialized
    if (this.isInitialized) {
      callback(this.getAuthState());
    }
  }

  /**
   * Remove authentication state listener
   */
  removeAuthListener(callback) {
    this.authListeners.delete(callback);
  }

  /**
   * Notify all listeners of authentication state change
   */
  notifyAuthListeners() {
    const authState = this.getAuthState();
    this.authListeners.forEach(callback => {
      try {
        callback(authState);
      } catch (error) {
        luderror.auth('[AuthManager] Error in auth listener:', error);
      }
    });
  }

  /**
   * Get current authentication state
   */
  getAuthState() {
    return {
      isLoading: this.isLoading,
      isInitialized: this.isInitialized,
      authType: this.currentAuth?.type || null,
      user: this.currentAuth?.type === 'user' ? this.currentAuth.entity : null,
      player: this.currentAuth?.type === 'player' ? this.currentAuth.entity : null,
      isAuthenticated: !!this.currentAuth,
      settings: this.settings
    };
  }

  /**
   * Initialize authentication system
   * This should be called once at app startup, or on page reload with forceRefresh=true
   *
   * COOKIE PERSISTENCE FIX: Added forceRefresh parameter to ensure /players/me
   * is called on every page load, even if AuthManager was previously initialized.
   *
   * @param {boolean} forceRefresh - Force re-check authentication even if already initialized
   */
  async initialize(forceRefresh = false) {
    // COOKIE PERSISTENCE FIX: Allow re-initialization if forced or never successfully authenticated
    // This ensures /players/me is called on page reload to recover auth state from cookies
    if (this.isInitialized && !forceRefresh && this.currentAuth) {
      return this.getAuthState();
    }

    // Prevent concurrent initialization
    if (this._initializationPromise && !forceRefresh) {
      return this._initializationPromise;
    }

    this._initializationPromise = this._performInitialization(forceRefresh);

    try {
      const result = await this._initializationPromise;
      return result;
    } finally {
      this._initializationPromise = null;
    }
  }

  /**
   * Internal initialization logic - separated for better control flow
   */
  async _performInitialization(forceRefresh) {
    try {
      this.isLoading = true;
      this.notifyAuthListeners();

      // Step 1: Load settings (required for authentication decisions)
      await this.loadSettings();

      // Step 2: Determine authentication strategy based on domain and settings
      const authStrategy = this.determineAuthStrategy();

      // Step 3: Execute authentication strategy with retry logic
      await this.executeAuthStrategyWithRetry(authStrategy);

      // Only mark as initialized if we have a definitive result
      this.isInitialized = true;
      this.isLoading = false;

      this.notifyAuthListeners();

      return this.getAuthState();
    } catch (error) {
      luderror.auth('[AuthManager] Authentication initialization failed:', error);
      this.isLoading = false;
      // COOKIE PERSISTENCE FIX: Don't mark as initialized on failure
      // This allows retry on next page load
      this.notifyAuthListeners();
      throw error;
    }
  }

  /**
   * Execute authentication strategy with retry logic for network failures
   * COOKIE PERSISTENCE FIX: Added exponential backoff for transient network errors
   */
  async executeAuthStrategyWithRetry(strategy, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.executeAuthStrategy(strategy);

        // If we got here without error, auth completed (success or allowed anonymous)
        return;
      } catch (error) {
        lastError = error;

        // Check if it's a network error worth retrying
        const isNetworkError =
          error.message?.includes('network') ||
          error.message?.includes('fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('Failed to fetch') ||
          error.name === 'TypeError'; // fetch throws TypeError on network failure

        if (isNetworkError && attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s (max 5s)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (!isNetworkError) {
          // Other errors (auth failed) - don't retry
          throw error;
        }
      }
    }

    // All retries exhausted
    luderror.auth('[AuthManager] All auth retries exhausted');
    throw lastError || new Error('Auth failed after all retries');
  }

  /**
   * Clear Firebase authentication state on student portal
   * This prevents Firebase admin sessions from interfering with player auth
   */
  async clearFirebaseAuthenticationState() {
    try {
      // Clear localStorage Firebase tokens
      const firebaseKeys = [
        'firebase:authUser:ludora-af706:[DEFAULT]',
        'firebase:authUser:ludora-staging:[DEFAULT]',
        'firebase:authUser:[DEFAULT]',
        'firebaseui::rememberedAccounts',
        'firebaseui::pendingEmailCredential',
        'firebase:persistance:[DEFAULT]',
        'lastActivity'
      ];

      firebaseKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage Firebase tokens
      sessionStorage.clear();

      // Force sign out from Firebase SDK and API
      try {
        // First try Firebase SDK signout
        try {
          const { getAuth, signOut } = await import('firebase/auth');
          const auth = getAuth();
          if (auth.currentUser) {
            await signOut(auth);
          }
        } catch (firebaseError) {
          // Firebase SDK signOut error - continue
        }

        // Then API logout
        const { logout: apiLogout } = await import('@/services/apiClient');
        await apiLogout();
      } catch (logoutError) {
        // Firebase API logout error (expected on student portal) - continue
      }

      // Clear any cached auth state
      this.currentAuth = null;
    } catch (error) {
      luderror.auth('[AuthManager] Error clearing Firebase state:', error);
      // Continue anyway - this is a best effort cleanup
    }
  }

  /**
   * Load application settings
   */
  async loadSettings() {
    try {
      const appSettings = await loadSettingsWithRetry(Settings);
      this.settings = appSettings && appSettings.length > 0 ? appSettings[0] : null;
    } catch (error) {
      luderror.auth('[AuthManager] Failed to load settings:', error);
      this.settings = null;
      // Continue without settings - use defaults
    }
  }

  /**
   * Determine which authentication methods to try based on domain and settings
   */
  determineAuthStrategy() {
    const onStudentPortal = isStudentPortal();
    const studentsAccess = getSetting(this.settings, ACCESS_CONTROL_KEYS.STUDENTS_ACCESS, STUDENTS_ACCESS_MODES.INVITE_ONLY);

    if (!onStudentPortal) {
      // Teachers portal - Firebase only
      return {
        portal: 'teacher',
        methods: ['firebase'],
        allowAnonymous: false
      };
    } else {
      // Students portal - strategy depends on students_access setting
      const strategy = {
        portal: 'student',
        methods: [],
        allowAnonymous: studentsAccess !== STUDENTS_ACCESS_MODES.INVITE_ONLY
      };

      // CRITICAL: Try Player authentication FIRST on student portal
      // This ensures player sessions take priority over admin Firebase sessions
      if (studentsAccess === STUDENTS_ACCESS_MODES.INVITE_ONLY || studentsAccess === STUDENTS_ACCESS_MODES.AUTHED_ONLY) {
        strategy.methods.push('player');
      } else {
        // 'all' mode - always try player auth
        strategy.methods.push('player');
      }

      // Firebase auth as fallback (teachers/admins can access student portal)
      strategy.methods.push('firebase');

      return strategy;
    }
  }

  /**
   * Execute authentication strategy sequentially
   * COOKIE PERSISTENCE FIX: Added offline detection and handling
   */
  async executeAuthStrategy(strategy) {
    // COOKIE PERSISTENCE FIX: Handle offline scenarios gracefully
    if (!navigator.onLine) {
      // Allow anonymous access if strategy permits
      if (strategy.allowAnonymous) {
        this.currentAuth = null;
        return;
      }

      // No cached state and no network - throw to allow retry later
      throw new Error('Offline and no cached authentication');
    }

    for (const method of strategy.methods) {
      try {
        let result;
        switch (method) {
          case 'firebase':
            result = await this.checkFirebaseAuth(strategy);
            break;
          case 'player':
            result = await this.checkPlayerAuth(strategy);
            break;
          default:
            continue;
        }

        if (result.success) {
          this.currentAuth = {
            type: result.authType,
            entity: result.entity
          };
          return;
        }
      } catch (error) {
        luderror.auth(`[AuthManager] Error during ${method} auth:`, error);
        // Continue to next method
      }
    }

    // No authentication method succeeded
    this.currentAuth = null;
  }

  /**
   * Check Firebase authentication
   */
  async checkFirebaseAuth(strategy) {
    try {
      // Special handling for student portal with invite_only
      const studentsAccess = getSetting(this.settings, ACCESS_CONTROL_KEYS.STUDENTS_ACCESS, STUDENTS_ACCESS_MODES.INVITE_ONLY);
      if (strategy.portal === 'student' && studentsAccess === STUDENTS_ACCESS_MODES.INVITE_ONLY) {
        const user = await User.getCurrentUser(true);
        if (!user) {
          return { success: false, reason: 'No Firebase session found' };
        }

        if (user.role !== 'admin' || user._isImpersonated) {
          return {
            success: false,
            reason: 'Non-admin user in invite_only mode'
          };
        }

        return {
          success: true,
          authType: 'user',
          entity: user
        };
      } else {
        // Standard Firebase auth check
        const user = await User.getCurrentUser(true);
        if (user) {
          return {
            success: true,
            authType: 'user',
            entity: user
          };
        } else {
          return {
            success: false,
            reason: 'No Firebase session found'
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        reason: `Firebase auth error: ${error.message}`
      };
    }
  }

  /**
   * Check Player privacy code authentication
   */
  async checkPlayerAuth(strategy) {
    try {
      const player = await Player.getCurrentPlayer(true);

      if (player) {
        return {
          success: true,
          authType: 'player',
          entity: player
        };
      } else {
        return {
          success: false,
          reason: 'No Player session found'
        };
      }
    } catch (error) {
      return {
        success: false,
        reason: `Player auth error: ${error.message}`
      };
    }
  }

  /**
   * Login with Firebase credentials
   *
   * IMPORTANT: After Firebase authentication, we must fetch fresh user data
   * from /auth/me to get computed fields like onboarding_completed.
   * The /auth/verify endpoint only returns basic user info without computed fields.
   */
  async loginFirebase(userData) {
    try {
      // Firebase login is handled by Firebase SDK and cookies are set
      // Now we need to fetch the COMPLETE user data from /auth/me
      // This ensures computed fields like onboarding_completed are available
      ludlog.auth('[AuthManager] Firebase login - fetching fresh user data from /auth/me');

      const freshUser = await User.getCurrentUser(true);

      if (!freshUser) {
        // Fallback to provided userData if /auth/me fails
        luderror.auth('[AuthManager] Failed to fetch fresh user data, using provided userData');
        this.currentAuth = {
          type: 'user',
          entity: userData
        };
      } else {
        // Use fresh user data with computed fields
        ludlog.auth('[AuthManager] Fresh user data fetched successfully', { data: { onboardingCompleted: freshUser.onboarding_completed } });
        this.currentAuth = {
          type: 'user',
          entity: freshUser
        };
      }

      this.notifyAuthListeners();

      // Update activity
      this.updateLastActivity();

      return { success: true, user: this.currentAuth.entity };
    } catch (error) {
      luderror.auth('[AuthManager] Firebase login error:', error);
      throw error;
    }
  }

  /**
   * Login with Player privacy code
   */
  async loginPlayer(privacyCode) {
    try {
      const response = await Player.login({ privacy_code: privacyCode });

      if (response.success && response.player) {
        this.currentAuth = {
          type: 'player',
          entity: response.player
        };

        this.notifyAuthListeners();
        this.updateLastActivity();

        return { success: true, player: response.player };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      luderror.auth('[AuthManager] Player login error:', error);
      throw error;
    }
  }

  /**
   * Logout current authentication
   */
  async logout() {
    try {
      if (this.currentAuth?.type === 'user') {
        const { logout: apiLogout } = await import('@/services/apiClient');
        await apiLogout();
      } else if (this.currentAuth?.type === 'player') {
        await Player.logout();
      }

      // Clear authentication state
      this.currentAuth = null;
      this.notifyAuthListeners();
    } catch (error) {
      luderror.auth('[AuthManager] Logout error:', error);
      // Still clear local state
      this.currentAuth = null;
      this.notifyAuthListeners();
      throw error;
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    localStorage.setItem('lastActivity', new Date().getTime().toString());
  }

  /**
   * Check if user needs onboarding
   */
  needsOnboarding(user) {
    if (!user || this.currentAuth?.type !== 'user') {
      return false;
    }

    if (user.onboarding_completed === true) {
      const hasRequiredFields = user.birth_date && user.user_type;
      return !hasRequiredFields;
    }

    return true;
  }

  /**
   * Get current authenticated entity (user or player)
   */
  getCurrentEntity() {
    return this.currentAuth ? {
      type: this.currentAuth.type,
      entity: this.currentAuth.entity
    } : null;
  }

  /**
   * Reset authentication manager (for testing)
   */
  reset() {
    this.isInitialized = false;
    this.isLoading = true;
    this.settings = null;
    this.currentAuth = null;
    this.authListeners.clear();
  }
}

// Export singleton instance
export const authManager = new AuthManager();
export default authManager;