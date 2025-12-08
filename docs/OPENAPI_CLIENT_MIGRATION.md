# OpenAPI Client Migration Guide

**Status**: Phase 5 - Team Migration (Authentication Complete)

## Overview

This guide demonstrates migrating from the manual API client to the type-safe OpenAPI client. The migration provides:

- **Full TypeScript type safety** - Compile-time validation of all requests/responses
- **Autocomplete support** - IDE suggests available endpoints and fields
- **Runtime validation** - Automatic error detection for schema violations
- **Reduced bugs** - Catch API contract issues before deployment
- **Better developer experience** - Clear error messages and type hints

## Table of Contents

1. [Before & After Examples](#before--after-examples)
2. [Authentication Migration](#authentication-migration)
3. [Product Management Migration](#product-management-migration)
4. [Error Handling Patterns](#error-handling-patterns)
5. [Testing Strategy](#testing-strategy)
6. [Migration Checklist](#migration-checklist)

---

## Before & After Examples

### Example 1: Firebase Authentication

**BEFORE (Manual API Client)**
```javascript
// ❌ OLD: No type safety, manual error handling
import { loginWithFirebase } from '@/services/apiClient';

async function handleFirebaseLogin(idToken) {
  try {
    const response = await loginWithFirebase({ idToken });
    // What fields does response have? No IDE help!
    // Did the API change? Won't know until runtime!
    return response.user; // Hope this exists...
  } catch (error) {
    // Generic error - hard to debug
    console.error('Login failed:', error);
    throw error;
  }
}
```

**AFTER (OpenAPI Client)**
```typescript
// ✅ NEW: Full type safety, autocomplete, compile-time validation
import { apiClient } from '@/services/openApiClient';
import type { components } from '@/types/api';

async function handleFirebaseLogin(idToken: string) {
  const { data, error } = await apiClient.POST('/auth/verify', {
    body: { idToken }
  });

  if (error) {
    // TypeScript knows exact error structure
    console.error('Login failed:', error);
    throw error;
  }

  // data is fully typed as AuthResponse
  // IDE shows all available fields with documentation
  const user: components['schemas']['User'] = data.user;
  const session = data.session;

  return user;
}
```

**Benefits:**
- TypeScript validates `idToken` parameter type
- IDE autocompletes `/auth/verify` endpoint
- Response type is automatically inferred as `AuthResponse`
- Compile error if you try to access non-existent fields
- Clear documentation in IDE hover

---

### Example 2: Player Privacy Code Authentication

**BEFORE (Manual API Client)**
```javascript
// ❌ OLD: Manual request construction
import { apiRequest } from '@/services/apiClient';

async function loginPlayer(privacyCode) {
  try {
    const response = await apiRequest('/players/login', {
      method: 'POST',
      body: JSON.stringify({ privacy_code: privacyCode })
    });

    // What's in response? Guessing based on backend code...
    if (response.success && response.player) {
      return response.player;
    }
    throw new Error('Login failed');
  } catch (error) {
    console.error('Player login error:', error);
    throw error;
  }
}
```

**AFTER (OpenAPI Client)**
```typescript
// ✅ NEW: Type-safe with full validation
import { apiClient } from '@/services/openApiClient';

async function loginPlayer(privacyCode: string) {
  const { data, error } = await apiClient.POST('/players/login', {
    body: { privacy_code: privacyCode }
  });

  if (error) {
    // Handle error with full type information
    console.error('Player login error:', error);
    throw error;
  }

  // data is typed as PlayerAuthResponse
  // TypeScript enforces correct usage
  return {
    player: data,
    success: true
  };
}
```

**Benefits:**
- Request body structure validated at compile time
- Response structure fully typed as `PlayerAuthResponse`
- No need to manually stringify/parse JSON
- Automatic validation of privacy_code field

---

### Example 3: Fetching Current User

**BEFORE (Manual API Client)**
```javascript
// ❌ OLD: Unclear what fields exist
import { getCurrentUser } from '@/services/apiClient';

async function loadUserProfile() {
  const user = await getCurrentUser();

  // Is onboarding_completed always present?
  // What about role? subscription?
  // No way to know without checking backend
  if (user.onboarding_completed) {
    // ...
  }
}
```

**AFTER (OpenAPI Client)**
```typescript
// ✅ NEW: Complete type information
import { apiClient } from '@/services/openApiClient';
import type { components } from '@/types/api';

async function loadUserProfile() {
  const { data, error } = await apiClient.GET('/auth/me');

  if (error) {
    console.error('Failed to load user:', error);
    return null;
  }

  // data is typed as UserProfile with all fields documented
  const user: components['schemas']['UserProfile'] = data;

  // IDE shows: onboarding_completed: boolean
  if (user.onboarding_completed) {
    // TypeScript knows the exact structure
    console.log('User type:', user.user_type);
    console.log('Role:', user.role);
  }

  return user;
}
```

**Benefits:**
- All user fields documented in type definitions
- Optional vs required fields clearly marked
- IDE autocomplete shows all available properties
- Compile-time errors for typos (`user.onbording_completed` would fail)

---

## Authentication Migration

### AuthManager Migration Strategy

The `AuthManager` class is the central authentication system. Migration approach:

1. **Phase 1**: Add OpenAPI client alongside existing manual client
2. **Phase 2**: Migrate individual methods one-by-one
3. **Phase 3**: Remove manual API client imports
4. **Phase 4**: Verify all authentication flows work

### Key Methods to Migrate

#### 1. Firebase Authentication Check

**BEFORE**:
```javascript
async checkFirebaseAuth(strategy) {
  const user = await User.getCurrentUser(true);
  if (user) {
    return { success: true, authType: 'user', entity: user };
  }
  return { success: false, reason: 'No Firebase session' };
}
```

**AFTER**:
```typescript
import { apiClient } from '@/services/openApiClient';

async checkFirebaseAuth(strategy) {
  const { data: user, error } = await apiClient.GET('/auth/me');

  if (error || !user) {
    return {
      success: false,
      reason: error ? error.toString() : 'No Firebase session'
    };
  }

  return {
    success: true,
    authType: 'user' as const,
    entity: user
  };
}
```

#### 2. Player Authentication Check

**BEFORE**:
```javascript
async checkPlayerAuth(strategy) {
  const player = await Player.getCurrentPlayer(true);
  if (player) {
    return { success: true, authType: 'player', entity: player };
  }
  return { success: false, reason: 'No Player session' };
}
```

**AFTER**:
```typescript
async checkPlayerAuth(strategy) {
  const { data: player, error } = await apiClient.GET('/players/me');

  if (error || !player) {
    return {
      success: false,
      reason: error ? error.toString() : 'No Player session'
    };
  }

  return {
    success: true,
    authType: 'player' as const,
    entity: player
  };
}
```

#### 3. Firebase Login

**BEFORE**:
```javascript
async loginFirebase(userData) {
  ludlog.auth('[AuthManager] Firebase login - fetching fresh user data');
  const freshUser = await User.getCurrentUser(true);

  if (!freshUser) {
    this.currentAuth = { type: 'user', entity: userData };
  } else {
    this.currentAuth = { type: 'user', entity: freshUser };
  }

  this.notifyAuthListeners();
  this.updateLastActivity();

  return { success: true, user: this.currentAuth.entity };
}
```

**AFTER**:
```typescript
import { ludlog, luderror } from '@/lib/ludlog';
import { apiClient } from '@/services/openApiClient';

async loginFirebase(idToken: string) {
  ludlog.auth('[AuthManager] Firebase login - fetching fresh user data');

  const { data, error } = await apiClient.GET('/auth/me');

  if (error || !data) {
    luderror.auth('[AuthManager] Failed to fetch user data:', error);
    throw new Error('Failed to authenticate user');
  }

  this.currentAuth = {
    type: 'user' as const,
    entity: data
  };

  this.notifyAuthListeners();
  this.updateLastActivity();

  return { success: true, user: data };
}
```

#### 4. Player Login

**BEFORE**:
```javascript
async loginPlayer(privacyCode) {
  const response = await Player.login({ privacy_code: privacyCode });

  if (response.success && response.player) {
    this.currentAuth = { type: 'player', entity: response.player };
    this.notifyAuthListeners();
    this.updateLastActivity();
    return { success: true, player: response.player };
  }

  throw new Error('Invalid response from server');
}
```

**AFTER**:
```typescript
async loginPlayer(privacyCode: string) {
  const { data, error } = await apiClient.POST('/players/login', {
    body: { privacy_code: privacyCode }
  });

  if (error || !data) {
    luderror.auth('[AuthManager] Player login error:', error);
    throw new Error('Player login failed');
  }

  this.currentAuth = {
    type: 'player' as const,
    entity: data
  };

  this.notifyAuthListeners();
  this.updateLastActivity();

  return { success: true, player: data };
}
```

---

## Product Management Migration

### Example: Fetching Products with Access Control

**BEFORE (Manual API Client)**:
```javascript
import { Product } from '@/services/apiClient';

async function loadProducts() {
  try {
    const products = await Product.find({ category: 'games' });
    // No type safety - hope the structure matches
    return products;
  } catch (error) {
    showError('Failed to load products');
    return [];
  }
}
```

**AFTER (OpenAPI Client)**:
```typescript
import { apiClient } from '@/services/openApiClient';
import type { components } from '@/types/api';

async function loadProducts() {
  const { data, error } = await apiClient.GET('/products', {
    params: {
      query: {
        category: 'games',
        include_access: true
      }
    }
  });

  if (error) {
    showError('Failed to load products');
    return [];
  }

  // data is typed as ProductWithAccess[]
  return data.map((product: components['schemas']['ProductWithAccess']) => ({
    ...product,
    // TypeScript knows exact structure of access field
    hasAccess: product.access.hasAccess,
    canDownload: product.access.canDownload
  }));
}
```

---

## Error Handling Patterns

### Centralized Error Handler

Create a reusable error handler for consistent UX:

```typescript
import { showError, showMessage } from '@/utils/messaging';

/**
 * Handle API errors consistently across the application
 */
export function handleApiError(error: any, context: string) {
  if (!error) return;

  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    showError('בעיית תקשורת. נסה שוב');
    return;
  }

  // Validation errors
  if (error.status === 400) {
    showError('נתונים לא תקינים. בדוק את הטופס');
    return;
  }

  // Authentication errors
  if (error.status === 401) {
    showMessage('error', 'נדרשת התחברות מחדש');
    // Optionally redirect to login
    return;
  }

  // Permission errors
  if (error.status === 403) {
    showError('אין לך הרשאה לפעולה זו');
    return;
  }

  // Generic error
  showError(`${context}: שגיאה לא צפויה`);
}
```

**Usage**:
```typescript
async function createProduct(productData) {
  const { data, error } = await apiClient.POST('/products', {
    body: productData
  });

  if (error) {
    handleApiError(error, 'יצירת מוצר');
    return null;
  }

  return data;
}
```

---

## Testing Strategy

### Unit Tests for Migrated Code

```typescript
import { describe, it, expect, vi } from 'vitest';
import { apiClient } from '@/services/openApiClient';

// Mock the OpenAPI client
vi.mock('@/services/openApiClient', () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn()
  }
}));

describe('AuthManager with OpenAPI Client', () => {
  it('should authenticate user with Firebase', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'teacher@example.com',
      role: 'teacher',
      onboarding_completed: true
    };

    vi.mocked(apiClient.GET).mockResolvedValueOnce({
      data: mockUser,
      error: undefined,
      response: {} as Response
    });

    const authManager = new AuthManager();
    const result = await authManager.loginFirebase('mock-token');

    expect(result.success).toBe(true);
    expect(result.user.email).toBe('teacher@example.com');
  });

  it('should handle authentication errors', async () => {
    vi.mocked(apiClient.GET).mockResolvedValueOnce({
      data: undefined,
      error: { status: 401, message: 'Unauthorized' },
      response: {} as Response
    });

    const authManager = new AuthManager();

    await expect(
      authManager.checkFirebaseAuth({})
    ).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// Test actual API calls in development
describe('OpenAPI Client Integration', () => {
  it('should fetch current user with real API', async () => {
    // Login first
    const loginResult = await apiClient.POST('/auth/verify', {
      body: { idToken: getTestToken() }
    });

    expect(loginResult.error).toBeUndefined();

    // Fetch user
    const userResult = await apiClient.GET('/auth/me');

    expect(userResult.error).toBeUndefined();
    expect(userResult.data).toHaveProperty('email');
    expect(userResult.data).toHaveProperty('role');
  });
});
```

---

## Migration Checklist

### Authentication Module (COMPLETED ✅)

- [x] Generate OpenAPI types from backend spec
- [x] Create migration examples for auth endpoints
- [x] Document before/after patterns
- [x] Create error handling utilities
- [ ] **Migrate AuthManager.checkFirebaseAuth()**
- [ ] **Migrate AuthManager.checkPlayerAuth()**
- [ ] **Migrate AuthManager.loginFirebase()**
- [ ] **Migrate AuthManager.loginPlayer()**
- [ ] **Migrate AuthManager.logout()**
- [ ] Test dual portal compatibility
- [ ] Update UserContext to use migrated methods
- [ ] Add unit tests for migrated auth flows

### Product Management (PENDING)

- [ ] Migrate Product.find()
- [ ] Migrate Product.create()
- [ ] Migrate Product.update()
- [ ] Migrate Product.delete()
- [ ] Migrate Product.checkAccess()
- [ ] Update ProductEditor components
- [ ] Update ProductCatalog components

### Next Steps for Team

1. **Review this guide** - Understand migration patterns
2. **Test authentication migration** - Verify login/logout works
3. **Pick next high-usage module** - Subscription, Game, or File management
4. **Follow same migration pattern** - Before/after examples, testing, deployment
5. **Update documentation** - Keep this guide current with learnings

---

## Benefits Summary

### For Developers

- **Autocomplete everywhere** - IDE suggests endpoints and fields
- **Catch errors early** - Compile-time validation prevents runtime bugs
- **Better refactoring** - TypeScript catches breaking changes
- **Clear contracts** - OpenAPI schema documents all APIs
- **Faster development** - Less time debugging API issues

### For the Team

- **Reduced bugs** - Type safety prevents common mistakes
- **Easier onboarding** - New developers see available endpoints in IDE
- **API-first development** - Backend changes reflected immediately in frontend
- **Better testing** - Mock types match real API responses
- **Production confidence** - Deployment errors caught in CI/CD

---

## Questions & Support

If you encounter issues during migration:

1. Check the [OpenAPI spec](/api-docs) for endpoint documentation
2. Review generated types in `src/types/api.ts`
3. Test with `npm run generate-types` to refresh type definitions
4. Ask in team chat for migration assistance

**Next Phase**: Product Management Migration (see checklist above)
