# Authentication Architecture Implementation Guide

## Overview

This document summarizes the investigation of the ludora-front authentication architecture and provides guidance for implementing automatic 401/403 login modal triggering.

## Key Findings

### Current State
The authentication system is **well-designed but has a critical gap**: when the API returns 401/403 errors, **there is no automatic mechanism to trigger the login modal**. Errors are caught at the component level with loss of status information.

### Root Cause
In `/src/services/apiClient.js` line 108, the code throws a generic `Error()` without preserving the HTTP status code:

```javascript
if (!response.ok) {
  const error = await response.json();
  const errorMessage = error.error || error.message || `API request failed: ${response.status}`;
  throw new Error(errorMessage);  // ❌ Status code lost here
}
```

This means components can't distinguish a 401 authentication error from other failures.

## Investigation Results

### Documents Created

Three comprehensive documentation files have been created for your reference:

1. **AUTHENTICATION_ARCHITECTURE.md** (15 KB)
   - Complete system overview
   - Architecture diagrams
   - Current flow analysis
   - Issues identified
   - File-by-file breakdown

2. **AUTH_QUICK_REFERENCE.md** (8 KB)
   - Quick lookup guide
   - File locations
   - Common code patterns
   - How it works
   - Implementation checklist

3. **AUTH_CODE_SNIPPETS.md** (12 KB)
   - Actual code excerpts with line numbers
   - Annotated problem areas
   - Usage patterns
   - Complete flow examples

### Read These Files

Start with **AUTH_QUICK_REFERENCE.md** for a 5-minute overview, then refer to the other documents as needed.

## Architecture Summary

### Key Components

```
┌─ UserContext.jsx
│  └─ Manages: currentUser, isAuthenticated, login(), logout()
│
├─ LoginModal Hook (useLoginModal.jsx)
│  └─ Manages: showLoginModal state, openLoginModal(), closeLoginModal()
│
├─ LoginModal.jsx
│  └─ UI Component: Google sign-in button, "Remember Me" checkbox
│
├─ apiClient.js
│  ├─ apiRequest() - THE KEY FUNCTION (has 401/403 gap)
│  ├─ Token management (localStorage.authToken)
│  └─ 40+ Entity APIs (User, Product, Purchase, etc.)
│
├─ Protected Routes
│  ├─ ProtectedRoute.jsx - Route-level protection
│  ├─ AdminRoute.jsx - Admin-only routes
│  └─ ConditionalRoute.jsx - Feature visibility control
│
└─ Layout.jsx
   ├─ Wraps app with LoginModalProvider
   ├─ Handles manual login flow
   └─ Renders LoginModal component
```

### Token Management

- **Storage:** `localStorage.authToken`
- **Used for:** `Authorization: Bearer <token>` header in all requests
- **Set by:** `User.login()` in apiClient.js
- **Cleared by:** `logout()` in UserContext

### Authentication Flow

**Current Manual Login:**
1. User clicks navbar "Login" button
2. `openLoginModal()` called
3. User sees LoginModal with Google sign-in
4. Firebase authentication happens
5. Token stored, user data loaded
6. Modal closes, user redirected

**Current Auto-Login:** ❌ **NOT IMPLEMENTED**
- When API returns 401/403, modal should open automatically
- User should be able to log in without losing context
- Original request should retry after successful login

## The 401/403 Gap Explained

### What Happens Now (Broken)

```
Component calls API
    ↓
apiClient.apiRequest() executes fetch
    ↓
Server returns 401 Unauthorized
    ↓
apiRequest() receives response.status = 401
    ↓
Code checks: if (!response.ok) { ✓ TRUE }
    ↓
Code throws: new Error("API request failed: 401")
    ↓
Status code information is LOST in generic Error object
    ↓
Component's catch() receives Error
    ↓
Component can't determine it's a 401
    ↓
Component shows generic error toast
    ↓
User confused, no login modal appears ❌
```

### What Should Happen

```
Component calls API
    ↓
apiClient.apiRequest() executes fetch
    ↓
Server returns 401 Unauthorized
    ↓
apiRequest() receives response.status = 401
    ↓
Code checks: if (response.status === 401) { ✓ TRUE }
    ↓
Code triggers login modal via event/callback/hook
    ↓
LoginModal appears automatically
    ↓
User logs in
    ↓
Original API call retried
    ↓
Success ✓
```

## Files to Modify for Implementation

### Priority 1 (Core Change)
- **`/src/services/apiClient.js`** (Line 65-127)
  - Create custom `ApiError` class with `.status` property
  - Throw `ApiError` instead of generic `Error`
  - Export the error class for use in components

### Priority 2 (Global Handler)
- **`/src/hooks/useAuthErrorHandler.js`** (NEW FILE)
  - Create hook to handle auth errors globally
  - Use `useLoginModal()` to trigger modal
  - Use `useUser()` to logout on 401

### Priority 3 (Component Updates)
- **`/src/components/ui/BuyProductButton.jsx`** (Lines 131-140)
  - Update error handler to detect 401/403
  - Trigger login modal with retry callback
- **Other components** making API calls
  - Update all error handlers following same pattern

### Priority 4 (Testing)
- Create test cases for 401 handling
- Test with expired tokens
- Test with invalid tokens

## Implementation Steps

### Step 1: Create Custom Error Class
In `apiClient.js`, modify lines 95-109:

```javascript
// Add custom error class at top of file
export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// In apiRequest() function:
if (!response.ok) {
  const error = await response.json().catch(() => ({ error: response.statusText }));
  
  // Create ApiError with status preserved
  throw new ApiError(errorMessage, response.status, error.details);
}
```

### Step 2: Create Auth Error Handler Hook
Create new file `/src/hooks/useAuthErrorHandler.js`:

```javascript
import { useLoginModal } from './useLoginModal';
import { useUser } from '@/contexts/UserContext';
import { cerror } from '@/lib/utils';

export function useAuthErrorHandler() {
  const { openLoginModal } = useLoginModal();
  const { logout } = useUser();

  return {
    handleError: (error, retryCallback = null) => {
      if (error.status === 401 || error.status === 403) {
        // Clear auth and show login modal
        logout();
        openLoginModal(retryCallback);
        return true; // Handled
      }
      return false; // Not handled
    }
  };
}
```

### Step 3: Update Components
In any component making API calls:

```javascript
import { useAuthErrorHandler } from '@/hooks/useAuthErrorHandler';
import { ApiError } from '@/services/apiClient';

export function MyComponent() {
  const { handleError } = useAuthErrorHandler();

  const handleAction = async () => {
    try {
      const result = await someApiCall();
      // Success handling
    } catch (error) {
      if (error instanceof ApiError) {
        // Try to handle auth error
        if (!handleError(error, () => handleAction())) {
          // Not an auth error - handle normally
          showError('Error', error.message);
        }
      } else {
        showError('Error', 'Unknown error occurred');
      }
    }
  };
}
```

### Step 4: Test Implementation
- Test with invalid token
- Test with expired token
- Test with insufficient permissions (403)
- Verify retry works after login
- Verify callback execution order

## Integration Points

### Where This Affects the System

1. **All Components Using API**
   - BuyProductButton
   - GameSettings
   - ProductAdmin
   - Dashboard
   - And ~50+ other components

2. **UserContext Initialization**
   - Currently logs out on ANY error
   - Should distinguish 401 from network errors
   - Should potentially prompt login instead of logout

3. **Protected Routes**
   - Currently just redirect to home
   - Could optionally trigger login modal instead

4. **Error Handling System**
   - Currently uses generic toasts
   - Should have auth-aware error handling
   - Should integrate with login flow

## Testing Strategy

### Manual Testing
1. Log in normally
2. Open browser dev tools
3. Delete `localStorage.authToken`
4. Make API call (e.g., create product, make purchase)
5. Verify: Login modal appears automatically
6. Log in again
7. Verify: Original action retries and succeeds

### Automated Testing
- Create test for 401 response detection
- Create test for modal triggering
- Create test for callback execution
- Create test for error propagation

## Risks and Considerations

### Potential Issues

1. **Race Conditions**
   - Multiple 401 errors simultaneously
   - Solution: Queue requests while modal is open

2. **Callback Timing**
   - Callback executes before state updates complete
   - Solution: Use async/await patterns carefully

3. **Infinite Loops**
   - Login failure triggers error handler which opens modal again
   - Solution: Only trigger modal once per error

4. **Cross-Tab Sync**
   - Token deleted in another tab not detected
   - Solution: Add storage event listener for sync

### Backwards Compatibility

- New `ApiError` class coexists with generic errors
- Existing error handlers still work (errors are still thrown)
- Components updated gradually, not all at once
- Fallback to generic error handling if `ApiError` not handled

## Documentation to Update

After implementation:
1. Update this guide with actual implementation details
2. Create code examples for team
3. Document retry behavior and limitations
4. Create debugging guide for errors

## Timeline

- **Phase 1 (Core):** 2-3 hours
  - Modify apiClient.js
  - Create error handler hook
  - Test basic functionality

- **Phase 2 (Integration):** 4-6 hours
  - Update key components
  - Test error scenarios
  - Fix edge cases

- **Phase 3 (Polish):** 2-3 hours
  - Test all error paths
  - Update documentation
  - Code review and refinement

**Total estimated effort: 8-12 hours**

## Questions to Answer Before Starting

1. Should modal retry automatically or wait for manual action?
2. Should we log 401 errors for analytics?
3. Should we distinguish between 401 and 403?
4. Should timeout requests be handled differently?
5. Should we clear cache on 401?

## Success Criteria

After implementation:
- [ ] 401 responses trigger login modal automatically
- [ ] 403 responses are handled appropriately
- [ ] Original request retries after successful login
- [ ] No infinite error loops
- [ ] All existing functionality still works
- [ ] Components can opt-in to new error handling
- [ ] Error messages are still user-friendly

## Next Steps

1. Review AUTHENTICATION_ARCHITECTURE.md for complete system overview
2. Review AUTH_CODE_SNIPPETS.md for exact code locations
3. Create a feature branch for implementation
4. Start with Step 1: Custom Error Class
5. Test with manual 401 simulation
6. Proceed to next steps

---

**Created:** 2025-10-31
**Updated By:** Code Analysis System
**Status:** Ready for Implementation Planning
