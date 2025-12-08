/**
 * Type-Safe Authentication Manager for Ludora (Production Migration)
 *
 * This is the production TypeScript version that will gradually replace
 * the JavaScript AuthManager. Uses OpenAPI client for full type safety.
 *
 * MIGRATION STATUS: Production Ready - Ready for Gradual Integration
 * - Uses OpenAPI client with full type safety
 * - Maintains backward compatibility with existing UserContext
 * - Ready for side-by-side testing with existing AuthManager
 *
 * @module services/AuthManager
 */

import { apiClient } from '@/services/openApiClient';
import type { components } from '@/types/api';
import { isStudentPortal } from '@/utils/domainUtils';
import { loadSettingsWithRetry } from '@/lib/appUser';
import { ludlog, luderror } from '@/lib/ludlog';
import { ACCESS_CONTROL_KEYS, getSetting, STUDENTS_ACCESS_MODES } from '@/constants/settings';

// Type aliases for better readability
type User = components['schemas']['User'];
type UserProfile = components['schemas']['UserProfile'];
type Player = components['schemas']['Player'];
type AuthResponse = components['schemas']['AuthResponse'];
type Settings = components['schemas']['Settings'];

interface AuthState {
  isLoading: boolean;
  isInitialized: boolean;
  authType: 'user' | 'player' | null;
  user: User | UserProfile | null;
  player: Player | null;
  isAuthenticated: boolean;
  settings: Settings | null;
}

type AuthCallback = (state: AuthState) => void;

interface AuthResult {
  success: boolean;
  authType?: 'user' | 'player';
  entity?: User | UserProfile | Player;
  reason?: string;
}

interface AuthStrategy {
  portal: 'teacher' | 'student';
  methods: Array<'firebase' | 'player'>;
  allowAnonymous: boolean;
}

/**
 * Type-Safe Authentication Manager
 *
 * Production TypeScript version with OpenAPI client integration.
 * Provides full type safety for all authentication operations.
 */
export class AuthManagerTS {
  private isInitialized = false;
  private isLoading = true;
  private settings: Settings | null = null;
  private currentAuth: { type: 'user' | 'player'; entity: User | UserProfile | Player } | null = null;
  private authListeners = new Set<AuthCallback>();
  private _initializationPromise: Promise<AuthState> | null = null;

  /**
   * Add listener for authentication state changes
   */
  addAuthListener(callback: AuthCallback): void {
    this.authListeners.add(callback);

    // Immediately call with current state if initialized
    if (this.isInitialized) {
      callback(this.getAuthState());
    }
  }

  /**
   * Remove authentication state listener
   */
  removeAuthListener(callback: AuthCallback): void {
    this.authListeners.delete(callback);
  }

  /**
   * Notify all listeners of authentication state change
   */
  private notifyAuthListeners(): void {
    const authState = this.getAuthState();
    this.authListeners.forEach(callback => {
      try {
        callback(authState);
      } catch (error) {
        luderror.auth('[AuthManagerTS] Error in auth listener:', error);
      }
    });
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return {
      isLoading: this.isLoading,
      isInitialized: this.isInitialized,
      authType: this.currentAuth?.type || null,
      user: this.currentAuth?.type === 'user' ? this.currentAuth.entity as User | UserProfile : null,
      player: this.currentAuth?.type === 'player' ? this.currentAuth.entity as Player : null,
      isAuthenticated: !!this.currentAuth,
      settings: this.settings
    };
  }

  /**
   * Initialize authentication system
   *
   * @param forceRefresh - Force re-check authentication even if already initialized
   */
  async initialize(forceRefresh = false): Promise<AuthState> {
    // Allow re-initialization if forced or never successfully authenticated
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
   * Internal initialization logic
   */
  private async _performInitialization(forceRefresh: boolean): Promise<AuthState> {
    try {
      this.isLoading = true;
      this.notifyAuthListeners();

      ludlog.auth('[AuthManagerTS] Starting authentication initialization', { forceRefresh });

      // Step 1: Load settings
      await this.loadSettings();

      // Step 2: Determine authentication strategy
      const authStrategy = this.determineAuthStrategy();

      // Step 3: Execute authentication strategy
      await this.executeAuthStrategyWithRetry(authStrategy);

      this.isInitialized = true;
      this.isLoading = false;

      ludlog.auth('[AuthManagerTS] Authentication initialization completed', {
        authType: this.currentAuth?.type,
        hasSettings: !!this.settings
      });

      this.notifyAuthListeners();

      return this.getAuthState();
    } catch (error) {
      luderror.auth('[AuthManagerTS] Authentication initialization failed:', error);
      this.isLoading = false;
      this.notifyAuthListeners();
      throw error;
    }
  }

  /**
   * Execute authentication strategy with retry logic
   */
  private async executeAuthStrategyWithRetry(
    strategy: AuthStrategy,
    maxRetries = 3
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.executeAuthStrategy(strategy);
        return; // Success
      } catch (error) {
        lastError = error as Error;

        // Check if it's a network error worth retrying
        const isNetworkError =
          error instanceof TypeError ||
          (error as Error).message?.includes('network') ||
          (error as Error).message?.includes('fetch') ||
          (error as Error).message?.includes('NetworkError') ||
          (error as Error).message?.includes('Failed to fetch');

        if (isNetworkError && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          ludlog.auth(`[AuthManagerTS] Network error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (!isNetworkError) {
          throw error;
        }
      }
    }

    luderror.auth('[AuthManagerTS] All auth retries exhausted');
    throw lastError || new Error('Auth failed after all retries');
  }

  /**
   * Load application settings using OpenAPI client
   */
  private async loadSettings(): Promise<void> {
    try {
      ludlog.auth('[AuthManagerTS] Loading settings via OpenAPI client');

      // ✅ NEW: Type-safe settings fetch
      const { data, error } = await apiClient.GET('/settings');

      if (error) {
        luderror.auth('[AuthManagerTS] Settings API error:', error);
        this.settings = null;
        return;
      }

      // data is typed as Settings[]
      this.settings = data && data.length > 0 ? data[0] : null;

      ludlog.auth('[AuthManagerTS] Settings loaded successfully', {
        studentsAccess: this.settings?.students_access,
        hasSettings: !!this.settings
      });
    } catch (error) {
      luderror.auth('[AuthManagerTS] Settings load error:', error);
      this.settings = null;
    }
  }

  /**
   * Determine authentication strategy based on domain and settings
   */
  private determineAuthStrategy(): AuthStrategy {
    const onStudentPortal = isStudentPortal();
    const studentsAccess = getSetting(
      this.settings,
      ACCESS_CONTROL_KEYS.STUDENTS_ACCESS,
      STUDENTS_ACCESS_MODES.INVITE_ONLY
    );

    ludlog.auth('[AuthManagerTS] Determining auth strategy', {
      onStudentPortal,
      studentsAccess
    });

    if (!onStudentPortal) {
      // Teachers portal - Firebase only
      return {
        portal: 'teacher',
        methods: ['firebase'],
        allowAnonymous: false
      };
    } else {
      // Students portal - strategy depends on settings
      // CRITICAL: Firebase MUST come first (teachers/admins accessing student portal)
      const strategy: AuthStrategy = {
        portal: 'student',
        methods: ['firebase', 'player'],
        allowAnonymous: studentsAccess !== STUDENTS_ACCESS_MODES.INVITE_ONLY
      };

      return strategy;
    }
  }

  /**
   * Execute authentication strategy sequentially
   */
  private async executeAuthStrategy(strategy: AuthStrategy): Promise<void> {
    // Handle offline scenarios
    if (!navigator.onLine) {
      ludlog.auth('[AuthManagerTS] Offline detected');
      if (strategy.allowAnonymous) {
        this.currentAuth = null;
        return;
      }
      throw new Error('Offline and no cached authentication');
    }

    ludlog.auth('[AuthManagerTS] Executing auth strategy', {
      portal: strategy.portal,
      methods: strategy.methods
    });

    for (const method of strategy.methods) {
      try {
        ludlog.auth(`[AuthManagerTS] Trying ${method} authentication`);
        let result: AuthResult;

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

        if (result.success && result.entity) {
          this.currentAuth = {
            type: result.authType!,
            entity: result.entity
          };
          ludlog.auth('[AuthManagerTS] Authentication successful', {
            method,
            type: result.authType
          });
          return;
        } else {
          ludlog.auth(`[AuthManagerTS] ${method} auth failed:`, result.reason);
        }
      } catch (error) {
        luderror.auth(`[AuthManagerTS] Error during ${method} auth:`, error);
      }
    }

    // No authentication method succeeded
    ludlog.auth('[AuthManagerTS] All auth methods failed, allowing anonymous');
    this.currentAuth = null;
  }

  /**
   * Check Firebase authentication using OpenAPI client
   */
  private async checkFirebaseAuth(strategy: AuthStrategy): Promise<AuthResult> {
    try {
      // ✅ NEW: Type-safe API call with full response typing
      const { data: user, error } = await apiClient.GET('/auth/me');

      if (error || !user) {
        return {
          success: false,
          reason: error ? String(error) : 'No Firebase session found'
        };
      }

      // TypeScript knows exact structure of user
      ludlog.auth('[AuthManagerTS] Firebase user found', {
        email: user.email,
        role: user.role,
        impersonated: user._isImpersonated
      });

      // Special handling for student portal with invite_only
      const studentsAccess = getSetting(
        this.settings,
        ACCESS_CONTROL_KEYS.STUDENTS_ACCESS,
        STUDENTS_ACCESS_MODES.INVITE_ONLY
      );

      if (strategy.portal === 'student' && studentsAccess === STUDENTS_ACCESS_MODES.INVITE_ONLY) {
        // Only admin users in invite_only mode
        if (user.role !== 'admin' || user._isImpersonated) {
          return {
            success: false,
            reason: 'Non-admin user in invite_only mode'
          };
        }
      }

      return {
        success: true,
        authType: 'user',
        entity: user
      };
    } catch (error) {
      return {
        success: false,
        reason: `Firebase auth error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Check Player privacy code authentication using OpenAPI client
   */
  private async checkPlayerAuth(strategy: AuthStrategy): Promise<AuthResult> {
    try {
      // ✅ NEW: Type-safe player authentication check
      const { data: player, error } = await apiClient.GET('/players/me');

      if (error || !player) {
        return {
          success: false,
          reason: error ? String(error) : 'No Player session found'
        };
      }

      // TypeScript knows exact structure of player
      ludlog.auth('[AuthManagerTS] Player session found', {
        id: player.id,
        displayName: player.display_name
      });

      return {
        success: true,
        authType: 'player',
        entity: player
      };
    } catch (error) {
      return {
        success: false,
        reason: `Player auth error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Login with Firebase credentials using OpenAPI client
   */
  async loginFirebase(idToken: string): Promise<{ success: boolean; user: User | UserProfile }> {
    try {
      ludlog.auth('[AuthManagerTS] Firebase login initiated');

      // ✅ NEW: Type-safe Firebase verification
      const { data: authResponse, error } = await apiClient.POST('/auth/verify', {
        body: { idToken }
      });

      if (error || !authResponse) {
        luderror.auth('[AuthManagerTS] Firebase verification failed:', error);
        throw new Error('Failed to verify Firebase token');
      }

      // Fetch complete user data with computed fields
      const { data: user, error: userError } = await apiClient.GET('/auth/me');

      if (userError || !user) {
        luderror.auth('[AuthManagerTS] Failed to fetch user data:', userError);
        // Fallback to auth response user
        this.currentAuth = {
          type: 'user',
          entity: authResponse.user
        };
      } else {
        ludlog.auth('[AuthManagerTS] User data fetched successfully', {
          onboardingCompleted: user.onboarding_completed
        });

        this.currentAuth = {
          type: 'user',
          entity: user
        };
      }

      this.notifyAuthListeners();
      this.updateLastActivity();

      return {
        success: true,
        user: this.currentAuth.entity as User | UserProfile
      };
    } catch (error) {
      luderror.auth('[AuthManagerTS] Firebase login error:', error);
      throw error;
    }
  }

  /**
   * Login with Player privacy code using OpenAPI client
   */
  async loginPlayer(privacyCode: string): Promise<{ success: boolean; player: Player }> {
    try {
      ludlog.auth('[AuthManagerTS] Player login initiated');

      // ✅ NEW: Type-safe player login
      const { data: response, error } = await apiClient.POST('/players/login', {
        body: { privacy_code: privacyCode }
      });

      if (error || !response) {
        luderror.auth('[AuthManagerTS] Player login failed:', error);
        throw new Error('Invalid privacy code');
      }

      const player = response.player;

      ludlog.auth('[AuthManagerTS] Player login successful', {
        playerId: player.id,
        displayName: player.display_name
      });

      this.currentAuth = {
        type: 'player',
        entity: player
      };

      this.notifyAuthListeners();
      this.updateLastActivity();

      return { success: true, player };
    } catch (error) {
      luderror.auth('[AuthManagerTS] Player login error:', error);
      throw error;
    }
  }

  /**
   * Logout current authentication using OpenAPI client
   */
  async logout(): Promise<void> {
    try {
      if (this.currentAuth?.type === 'user') {
        // ✅ NEW: Type-safe user logout
        const { error } = await apiClient.POST('/auth/logout', { body: {} });

        if (error) {
          luderror.auth('[AuthManagerTS] User logout API error:', error);
        }
      } else if (this.currentAuth?.type === 'player') {
        // ✅ NEW: Type-safe player logout
        const { error } = await apiClient.POST('/players/logout', { body: {} });

        if (error) {
          luderror.auth('[AuthManagerTS] Player logout API error:', error);
        }
      }

      // Clear authentication state
      this.currentAuth = null;
      this.notifyAuthListeners();

      ludlog.auth('[AuthManagerTS] Logout successful');
    } catch (error) {
      luderror.auth('[AuthManagerTS] Logout error:', error);
      // Still clear local state
      this.currentAuth = null;
      this.notifyAuthListeners();
      throw error;
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    localStorage.setItem('lastActivity', new Date().getTime().toString());
  }

  /**
   * Check if user needs onboarding
   */
  needsOnboarding(user?: User | UserProfile): boolean {
    const targetUser = user || (this.currentAuth?.type === 'user' ? this.currentAuth.entity as User | UserProfile : null);

    if (!targetUser || this.currentAuth?.type !== 'user') {
      return false;
    }

    if (targetUser.onboarding_completed === true) {
      const hasRequiredFields = 'birth_date' in targetUser && targetUser.birth_date && 'user_type' in targetUser && targetUser.user_type;
      return !hasRequiredFields;
    }

    return true;
  }

  /**
   * Get current authenticated entity (user or player)
   */
  getCurrentEntity(): { type: 'user' | 'player'; entity: User | UserProfile | Player } | null {
    return this.currentAuth;
  }

  /**
   * Reset authentication manager (for testing)
   */
  reset(): void {
    this.isInitialized = false;
    this.isLoading = true;
    this.settings = null;
    this.currentAuth = null;
    this.authListeners.clear();
    this._initializationPromise = null;
  }

  /**
   * Clear Firebase authentication state on student portal
   */
  async clearFirebaseAuthenticationState(): Promise<void> {
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
        await this.logout();
      } catch (logoutError) {
        // Firebase API logout error (expected on student portal) - continue
      }

      // Clear any cached auth state
      this.currentAuth = null;
    } catch (error) {
      luderror.auth('[AuthManagerTS] Error clearing Firebase state:', error);
      // Continue anyway - this is a best effort cleanup
    }
  }
}

// Export singleton instance
export const authManagerTS = new AuthManagerTS();
export default authManagerTS;