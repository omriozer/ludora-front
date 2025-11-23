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
import { clog, cerror } from '@/lib/utils';

export class AuthManager {
  constructor() {
    this.isInitialized = false;
    this.isLoading = true;
    this.settings = null;
    this.currentAuth = null; // { type: 'user'|'player'|null, entity: user|player|null }
    this.authListeners = new Set();

    // Immediate debug to confirm AuthManager is loading
    console.log('[AuthManager] 🚀 AuthManager class instantiated');
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
        cerror('[AuthManager] Error in auth listener:', error);
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
   * This should be called once at app startup
   */
  async initialize() {
    if (this.isInitialized) {
      clog('[AuthManager] Already initialized, returning current state');
      return this.getAuthState();
    }

    try {
      clog('[AuthManager] 🚀 Starting unified authentication initialization...');
      this.isLoading = true;
      this.notifyAuthListeners();

      // Player authentication is prioritized first in determineAuthStrategy()
      // No need to force clear Firebase - let the strategy handle conflicts

      // Step 1: Load settings (required for authentication decisions)
      await this.loadSettings();

      // Step 2: Determine authentication strategy based on domain and settings
      const authStrategy = this.determineAuthStrategy();
      clog('[AuthManager] 📋 Authentication strategy:', authStrategy);

      // Step 3: Execute authentication strategy sequentially
      await this.executeAuthStrategy(authStrategy);

      // Step 4: Mark as initialized and notify listeners
      this.isInitialized = true;
      this.isLoading = false;

      clog('[AuthManager] ✅ Authentication initialization complete:', this.getAuthState());
      this.notifyAuthListeners();

      return this.getAuthState();
    } catch (error) {
      cerror('[AuthManager] ❌ Authentication initialization failed:', error);
      this.isLoading = false;
      this.isInitialized = true; // Still mark as initialized to prevent retries
      this.notifyAuthListeners();
      throw error;
    }
  }

  /**
   * Clear Firebase authentication state on student portal
   * This prevents Firebase admin sessions from interfering with player auth
   */
  async clearFirebaseAuthenticationState() {
    try {
      clog('[AuthManager] 🧹 Clearing Firebase authentication state for student portal...');

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
          clog(`[AuthManager] 🗑️ Removing localStorage key: ${key}`);
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage Firebase tokens
      sessionStorage.clear();
      clog('[AuthManager] 🗑️ Cleared sessionStorage');

      // Force sign out from Firebase SDK and API
      try {
        // First try Firebase SDK signout
        try {
          const { getAuth, signOut } = await import('firebase/auth');
          const auth = getAuth();
          if (auth.currentUser) {
            await signOut(auth);
            clog('[AuthManager] 🚪 Firebase SDK signOut completed');
          } else {
            clog('[AuthManager] ℹ️ No Firebase currentUser to sign out');
          }
        } catch (firebaseError) {
          clog('[AuthManager] ⚠️ Firebase SDK signOut error:', firebaseError.message);
        }

        // Then API logout
        const { logout: apiLogout } = await import('@/services/apiClient');
        await apiLogout();
        clog('[AuthManager] 🚪 Firebase API logout completed');
      } catch (logoutError) {
        clog('[AuthManager] ⚠️ Firebase API logout error (expected on student portal):', logoutError.message);
      }

      // Clear any cached auth state
      this.currentAuth = null;

      clog('[AuthManager] ✅ Firebase authentication state cleared for student portal');
    } catch (error) {
      cerror('[AuthManager] ❌ Error clearing Firebase state:', error);
      // Continue anyway - this is a best effort cleanup
    }
  }

  /**
   * Load application settings
   */
  async loadSettings() {
    try {
      clog('[AuthManager] 📖 Loading application settings...');
      const appSettings = await loadSettingsWithRetry(Settings);
      this.settings = appSettings && appSettings.length > 0 ? appSettings[0] : null;
      clog('[AuthManager] ✅ Settings loaded:', {
        hasSettings: !!this.settings,
        studentsAccess: this.settings?.students_access
      });
    } catch (error) {
      cerror('[AuthManager] ❌ Failed to load settings:', error);
      this.settings = null;
      // Continue without settings - use defaults
    }
  }

  /**
   * Determine which authentication methods to try based on domain and settings
   */
  determineAuthStrategy() {
    const onStudentPortal = isStudentPortal();
    const studentsAccess = this.settings?.students_access || 'invite_only';

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
        allowAnonymous: studentsAccess !== 'invite_only'
      };

      // CRITICAL: Try Player authentication FIRST on student portal
      // This ensures player sessions take priority over admin Firebase sessions
      if (studentsAccess === 'invite_only' || studentsAccess === 'authed_only') {
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
   */
  async executeAuthStrategy(strategy) {
    clog('[AuthManager] 🔄 Executing auth strategy:', strategy);

    // TODO remove debug - fix player authentication persistence
    clog('[AuthManager] 🔍 DETAILED STRATEGY:', {
      portal: strategy.portal,
      methods: strategy.methods,
      allowAnonymous: strategy.allowAnonymous,
      methodCount: strategy.methods.length
    });

    for (const method of strategy.methods) {
      try {
        clog(`[AuthManager] 🔍 Trying authentication method: ${method}`);

        let result;
        switch (method) {
          case 'firebase':
            result = await this.checkFirebaseAuth(strategy);
            break;
          case 'player':
            result = await this.checkPlayerAuth(strategy);
            break;
          default:
            clog(`[AuthManager] ⚠️ Unknown auth method: ${method}`);
            continue;
        }

        if (result.success) {
          clog(`[AuthManager] ✅ Authentication successful via ${method}:`, result.authType);
          this.currentAuth = {
            type: result.authType,
            entity: result.entity
          };
          return;
        } else {
          clog(`[AuthManager] ❌ Authentication failed via ${method}:`, result.reason);
        }
      } catch (error) {
        cerror(`[AuthManager] ❌ Error during ${method} auth:`, error);
        // Continue to next method
      }
    }

    // No authentication method succeeded
    if (strategy.allowAnonymous) {
      clog('[AuthManager] 🔓 No authentication found, allowing anonymous access');
      this.currentAuth = null;
    } else {
      clog('[AuthManager] 🚫 No authentication found, anonymous access not allowed');
      this.currentAuth = null;
    }
  }

  /**
   * Check Firebase authentication
   */
  async checkFirebaseAuth(strategy) {
    try {
      clog('[AuthManager] 🔥 Checking Firebase authentication...');

      // Firebase authentication works as fallback after player auth

      // Special handling for student portal with invite_only
      if (strategy.portal === 'student' && this.settings?.students_access === 'invite_only') {
        clog('[AuthManager] 🔍 Student portal invite_only mode - checking for admin session...');

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

        clog('[AuthManager] ✅ Admin user authenticated for student portal');
        return {
          success: true,
          authType: 'user',
          entity: user
        };
      } else {
        // Standard Firebase auth check
        const user = await User.getCurrentUser(true);
        if (user) {
          clog('[AuthManager] ✅ Firebase user authenticated:', user.email);
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
      clog('[AuthManager] 🎮 Checking Player authentication...');

      // Add detailed debugging for player authentication
      clog('[AuthManager] 🔍 About to call Player.getCurrentPlayer(true)...');

      const player = await Player.getCurrentPlayer(true);

      clog('[AuthManager] 📊 Player.getCurrentPlayer result:', {
        hasPlayer: !!player,
        playerData: player ? {
          id: player.id,
          display_name: player.display_name,
          is_online: player.is_online
        } : null
      });

      if (player) {
        clog('[AuthManager] ✅ Player authenticated:', player.display_name);
        return {
          success: true,
          authType: 'player',
          entity: player
        };
      } else {
        clog('[AuthManager] ❌ No player data returned from getCurrentPlayer');
        return {
          success: false,
          reason: 'No Player session found'
        };
      }
    } catch (error) {
      cerror('[AuthManager] ❌ Player auth check failed:', error);
      return {
        success: false,
        reason: `Player auth error: ${error.message}`
      };
    }
  }

  /**
   * Login with Firebase credentials
   */
  async loginFirebase(userData, rememberMe = false) {
    try {
      clog('[AuthManager] 🔥 Firebase login initiated');

      // Firebase login is handled by Firebase SDK, we just need to update our state
      this.currentAuth = {
        type: 'user',
        entity: userData
      };

      this.notifyAuthListeners();

      // Update activity
      this.updateLastActivity();

      return { success: true, user: userData };
    } catch (error) {
      cerror('[AuthManager] Firebase login error:', error);
      throw error;
    }
  }

  /**
   * Login with Player privacy code
   */
  async loginPlayer(privacyCode) {
    try {
      clog('[AuthManager] 🎮 Player login initiated with code:', privacyCode);

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
      cerror('[AuthManager] Player login error:', error);
      throw error;
    }
  }

  /**
   * Logout current authentication
   */
  async logout() {
    try {
      clog('[AuthManager] 🚪 Logout initiated for:', this.currentAuth?.type);

      if (this.currentAuth?.type === 'user') {
        const { logout: apiLogout } = await import('@/services/apiClient');
        await apiLogout();
      } else if (this.currentAuth?.type === 'player') {
        await Player.logout();
      }

      // Clear authentication state
      this.currentAuth = null;
      this.notifyAuthListeners();

      clog('[AuthManager] ✅ Logout completed');
    } catch (error) {
      cerror('[AuthManager] Logout error:', error);
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
    if (!user || this.currentAuth?.type !== 'user') return false;

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