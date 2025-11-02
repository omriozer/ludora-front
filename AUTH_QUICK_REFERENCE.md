# Authentication Architecture - Quick Reference Guide

## File Locations

### Core Authentication Files
```
ludora-front/src/
├── services/apiClient.js              ← Main API client (NO 401/403 handling)
├── contexts/UserContext.jsx           ← Auth state management
├── hooks/useLoginModal.jsx            ← Login modal control
├── components/
│   ├── LoginModal.jsx                 ← Login UI (Google sign-in)
│   └── auth/
│       ├── ProtectedRoute.jsx         ← Route protection
│       ├── AdminRoute.jsx             ← Admin-only routes
│       └── ConditionalRoute.jsx       ← Conditional visibility
├── utils/
│   ├── api.js                         ← Deprecated wrapper
│   └── messaging.js                   ← Toast notifications
└── pages/Layout.jsx                   ← App layout with modal provider
```

## Key Components to Know

### 1. UserContext (State Management)
**File:** `/src/contexts/UserContext.jsx`
**Exports:**
- `useUser()` - Hook to access auth state
- `UserProvider` - Component wrapper

**Available State:**
```javascript
const {
  currentUser,        // User object or null
  isAuthenticated,    // Boolean
  isLoading,          // Boolean
  settings,           // App settings object
  login(),            // Function(userData, rememberMe)
  logout(),           // Function
  clearAuth()         // Function
} = useUser();
```

### 2. LoginModalContext (UI Control)
**File:** `/src/hooks/useLoginModal.jsx`
**Exports:**
- `useLoginModal()` - Hook to control modal
- `LoginModalProvider` - Component wrapper

**Available Methods:**
```javascript
const {
  showLoginModal,           // Boolean
  openLoginModal(callback), // Function with optional callback
  closeLoginModal(),        // Function
  executeCallback()         // Function to run after login
} = useLoginModal();
```

### 3. API Client
**File:** `/src/services/apiClient.js`
**Main Function:**
```javascript
export async function apiRequest(endpoint, options = {}) {
  // Automatically adds Authorization header with token
  // Throws generic Error on 401/403 (no status in error object)
}
```

**Entity APIs:**
- `User.getCurrentUser()`
- `User.login()`
- `Product.find()`, `Product.findById()`
- `Purchase.create()`, `Purchase.find()`
- And ~40 other entity types...

## How It Currently Works

### Login Flow (Manual)
1. User clicks navbar "Login" button
2. `Layout.jsx` calls `openLoginModal()`
3. `LoginModal.jsx` appears
4. User clicks Google sign-in
5. Firebase auth happens (via `firebaseAuth.signInWithGoogle()`)
6. `handleLoginSubmit()` calls `User.loginWithFirebase(idToken)`
7. Token stored in localStorage
8. `login()` called to load user into context
9. Modal closes

### Protected Route Flow
1. Component wrapped in `<ProtectedRoute>`
2. Route checks `currentUser` from context
3. If not logged in, redirects to home
4. **Note:** No API call happens, so no 401/403

### API Call Flow (Currently)
1. Component calls `apiRequest()` or entity method
2. `apiRequest()` adds auth header from localStorage
3. Fetch executes
4. If not `response.ok`:
   - Parses error JSON
   - **Throws Error** (status code lost)
5. Component's `catch()` block catches generic Error
6. Component handles error (usually with toast)

## Error Handling Gap

### The Missing Piece
When API returns 401/403:
- ❌ apiClient.js throws generic `Error("API request failed: 401")`
- ❌ Error object has NO `.status` property
- ❌ Component can't distinguish 401 from other errors
- ❌ No automatic modal trigger
- ❌ No automatic retry after re-login

### Current Workaround Examples
**In BuyProductButton.jsx (line 61-64):**
```javascript
if (!isAuthenticated()) {
  openLoginModal(() => handlePurchase());
  return;
}
// Only checks isAuthenticated flag, not actual API errors
```

**In UserContext.jsx (line 96-105):**
```javascript
try {
  const user = await User.getCurrentUser();
} catch (getCurrentUserError) {
  clearAuth(); // Logout on ANY error
}
```

## What Components Need to Know

### To Check Authentication
```javascript
import { useUser } from '@/contexts/UserContext';

const { currentUser, isAuthenticated } = useUser();

if (!isAuthenticated) {
  // User is not logged in
}
```

### To Trigger Login Modal
```javascript
import { useLoginModal } from '@/hooks/useLoginModal';

const { openLoginModal } = useLoginModal();

// Trigger modal
openLoginModal();

// Trigger modal with callback to retry action
openLoginModal(() => handlePurchase());
```

### To Make API Calls
```javascript
import { User, Product, Purchase } from '@/services/apiClient';

// Simple call
const user = await User.getCurrentUser();

// With error handling
try {
  const products = await Product.find({ limit: 10 });
} catch (error) {
  // error is generic Error with lost status code
  console.error(error.message);
}
```

### To Show Messages
```javascript
import { showError, showSuccess } from '@/utils/messaging';

showSuccess('Saved!', 'Your changes have been saved');
showError('Error', 'Failed to save changes');
```

## Implementation Checklist for Auto-Login

To add automatic 401/403 modal trigger:

- [ ] Modify `apiClient.js` to throw `ApiError` with status property
- [ ] Modify error handling to detect 401/403 status
- [ ] Export custom error class from apiClient
- [ ] Create global error handler hook or middleware
- [ ] Update all component error handlers to check for auth errors
- [ ] Add automatic logout on 401
- [ ] Add automatic modal open on 401
- [ ] Test with expired tokens
- [ ] Test with invalid tokens
- [ ] Add retry mechanism after modal closes

## Testing Commands

### Check API Response Structure
```javascript
// In browser console
fetch('/api/entities/user')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

### Monitor Auth State
```javascript
// Check localStorage
console.log('Token:', localStorage.getItem('authToken'));
console.log('Expiry:', localStorage.getItem('tokenExpiry'));
console.log('RememberMe:', localStorage.getItem('rememberMe'));
```

### Simulate 401
```javascript
// Delete token and make API call
localStorage.removeItem('authToken');
// Try any API call - should fail without modal opening
```

## Key Statistics

- **Total Auth-Related Files:** 7 main files
- **Total Context Providers:** 2 (UserContext, LoginModalContext)
- **Total Entity APIs:** 40+
- **Lines of Code in apiClient.js:** 806
- **Lines of Code in UserContext.jsx:** 441
- **Modal Triggers (Manual):** 3 locations in codebase

## Documentation Files to Check

1. **CLAUDE.md** - Project-specific instructions (includes footer settings, coupons, etc.)
2. **User instructions** - At `~/.claude/CLAUDE.md`
3. **Architecture analysis** - In this new document (AUTHENTICATION_ARCHITECTURE.md)

## Next Steps After Understanding

1. **Implement Custom Error Class** in apiClient.js
2. **Create Error Interceptor** for 401/403 responses
3. **Add Global Error Handler Hook** for components
4. **Update Component Patterns** to use new error handling
5. **Test Thoroughly** with various failure scenarios
6. **Document** the new pattern for team
