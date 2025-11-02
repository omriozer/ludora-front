# Authentication Architecture - Code Snippets Reference

This file contains important code excerpts from the current authentication system for easy reference.

## 1. API Client Core (apiClient.js)

### apiRequest Function (Lines 65-127)
```javascript
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const currentToken = getCurrentAuthToken();

  clog(`🌐 API Request: ${options.method || 'GET'} ${url}`);
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const defaultOptions = {
    credentials: 'include',
    headers
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    clog(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      cerror('❌ API Error:', error);

      const errorMessage = typeof error.error === 'string' ? error.error :
                        error.message ||
                        JSON.stringify(error) ||
                        `API request failed: ${response.status}`;
      
      // ⚠️ PROBLEM: Status code is thrown but lost in generic Error
      throw new Error(errorMessage);
    }

    const data = await response.json();
    clog('✅ API Response:', data);
    return data;
  } catch (error) {
    cerror('🚫 API Request Failed:', error);

    if (error.message.includes('fetch') || error.message.includes('network')) {
      showError("בעיית חיבור", "לא הצלחנו להתחבר לשרת...");
    }

    throw error;
  }
}
```

**Issues:**
- Line 108: Throws `new Error()` without preserving status code
- No 401/403 detection or special handling
- Generic network error shown for all failures

### Token Management (Lines 12-20)
```javascript
let authToken = null;

function getCurrentAuthToken() {
  if (typeof localStorage !== 'undefined') {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
}

export async function login({ email, password }) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  if (response.token) {
    authToken = response.token;
    localStorage.setItem('authToken', response.token);
  }
  
  return response;
}
```

**Notes:**
- Always reads fresh from localStorage (line 17)
- Stored in module-level variable for in-memory cache
- No expiry checking before requests
- No automatic refresh on 401

## 2. UserContext (UserContext.jsx)

### Authentication Check on App Load (Lines 43-112)
```javascript
useEffect(() => {
  const init = async () => {
    await loadSettings();
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

    // Try to get current user with existing token
    try {
      clog('[UserContext] 🔄 Calling User.getCurrentUser()...');
      const user = await User.getCurrentUser();
      if (user) {
        await loadUserData(user);
        updateLastActivity();
        setIsAuthenticated(true);
      } else {
        clearAuth();
      }
    } catch (getCurrentUserError) {
      // ⚠️ PROBLEM: All errors trigger logout
      cerror('[UserContext] Failed to get current user:', getCurrentUserError);
      clearAuth();
    }
  } catch (error) {
    cerror('Error checking persisted auth:', error);
    clearAuth();
  } finally {
    setIsLoading(false);
  }
}, []);
```

**Issues:**
- Line 96-105: All API errors trigger `clearAuth()` logout
- 401/403 not distinguished from network errors
- No retry mechanism
- No modal triggered after logout

### Login Method (Lines 329-356)
```javascript
const login = useCallback(async (userData, rememberMe = false) => {
  try {
    await loadUserData(userData);
    
    // Set remember me preference
    if (rememberMe) {
      const oneWeekFromNow = new Date().getTime() + (7 * 24 * 60 * 60 * 1000);
      localStorage.setItem('tokenExpiry', oneWeekFromNow.toString());
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('tokenExpiry');
      localStorage.setItem('rememberMe', 'false');
    }
    updateLastActivity();
    clog('[UserContext] User logged in successfully');
  } catch (error) {
    cerror('[UserContext] Login error:', error);

    toast({
      title: "שגיאה בהתחברות",
      description: "לא הצלחנו להתחבר למערכת. אנא נסה שוב.",
      variant: "destructive",
    });

    throw error;
  }
}, [loadUserData]);
```

### Logout and Clear Auth (Lines 358-397)
```javascript
const logout = useCallback(async () => {
  try {
    const { logout: apiLogout } = await import('@/services/apiClient');
    await apiLogout();
  } catch (error) {
    cerror('[UserContext] API logout error:', error);
  } finally {
    clearAuth();
  }
}, []);

const clearAuth = useCallback(() => {
  clog('[UserContext] Clearing authentication');
  setCurrentUser(null);
  setIsAuthenticated(false);
  setUserDataFresh(false);
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  localStorage.removeItem('tokenExpiry');
  localStorage.removeItem('rememberMe');
  localStorage.removeItem('lastActivity');

  // Clear Firebase session
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
```

## 3. LoginModal Hook (useLoginModal.jsx)

```javascript
import { useState, createContext, useContext } from 'react';

const LoginModalContext = createContext();

export function LoginModalProvider({ children }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCallback, setLoginCallback] = useState(null);

  const openLoginModal = (callback = null) => {
    setLoginCallback(() => callback); // Wrap in function to store function reference
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginCallback(null);
  };

  const executeCallback = () => {
    if (loginCallback && typeof loginCallback === 'function') {
      loginCallback();
      setLoginCallback(null);
    }
  };

  return (
    <LoginModalContext.Provider value={{
      showLoginModal,
      openLoginModal,
      closeLoginModal,
      executeCallback
    }}>
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (!context) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return context;
}
```

**Note:** No automatic triggering - `openLoginModal()` must be called explicitly.

## 4. LoginModal Component (LoginModal.jsx)

```javascript
export default function LoginModal({ onClose, onLogin }) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleGoogleSignIn = async () => {
    console.log('🔵 LoginModal: handleGoogleSignIn clicked');
    setIsLoggingIn(true);
    setError('');

    try {
      console.log('🔵 LoginModal: Calling onLogin function...');
      await onLogin(rememberMe);
      console.log('🔵 LoginModal: onLogin completed successfully');
      onClose();
    } catch (err) {
      console.error('❌ Google sign-in error:', err);
      
      let errorMessage = 'שגיאה בכניסה. נסו שוב.';
      
      if (err.message) {
        if (err.message.includes('popup-closed-by-user')) {
          errorMessage = 'ההתחברות בוטלה על ידי המשתמש.';
        } else if (err.message.includes('Firebase not initialized')) {
          errorMessage = 'שירות ההתחברות אינו זמין כעת.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto bg-white shadow-2xl">
        {/* Header with close button */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold text-gray-900">
            התחברות ללודורה
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        {/* Content */}
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600 mb-6">
            השתמשו בחשבון הגוגל שלכם כדי להתחבר
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-right">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                מתחבר...
              </>
            ) : (
              <>
                {/* Google logo SVG */}
                המשיכו עם Google
              </>
            )}
          </Button>

          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
            />
            <Label htmlFor="remember-me" className="text-sm font-medium cursor-pointer">
              זכור אותי במחשב זה
            </Label>
          </div>

          {/* Terms and Privacy */}
          <div className="text-center text-sm text-gray-500 mt-4">
            על ידי התחברות, אתם מסכימים ל
            <Link to="/terms" className="text-blue-600 hover:text-blue-800 underline mx-1" onClick={onClose}>
              תנאי השימוש
            </Link>
            ול
            <Link to="/privacy" className="text-blue-600 hover:text-blue-800 underline mx-1" onClick={onClose}>
              מדיניות הפרטיות
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 5. Layout Component - Login Handler (Layout.jsx)

```javascript
const handleLoginSubmit = async (rememberMe = false) => {
  console.log('🟢 Layout: handleLoginSubmit started');
  try {
    // Use Firebase helper for Google sign-in
    const { user, idToken } = await firebaseAuth.signInWithGoogle();
    console.log('🟢 Layout: Firebase user:', user);

    const firebaseResult = { user, idToken };
    console.log('🟢 Layout: Calling loginWithFirebase API...');
    const apiResult = await loginWithFirebase({ idToken: firebaseResult.idToken });
    console.log('🟢 Layout: API result:', apiResult);

    if (apiResult.valid && apiResult.user) {
      console.log('🟢 Layout: Login successful, setting user...');
      await login(apiResult.user, rememberMe);
      showSuccess('התחברת בהצלחה!');
      closeLoginModal();

      // Execute any pending callback after successful login
      setTimeout(() => executeCallback(), 100);
    } else {
      console.log('❌ Layout: API result invalid');
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('❌ Layout: Login error:', error);
    let errorMessage = 'שגיאה בכניסה. נסו שוב.';
    if (error.message.includes('popup-closed-by-user')) {
      errorMessage = 'ההתחברות בוטלה על ידי המשתמש.';
    }
    showError(errorMessage);
    throw error;
  }
};
```

## 6. Component Using Auth - BuyProductButton Example

```javascript
export default function BuyProductButton({ product, onSuccess }) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const { openLoginModal } = useLoginModal();
  const { addToCart } = useCart();

  const handlePurchase = async (e) => {
    e.stopPropagation();

    if (!product) {
      cerror('No product provided to BuyProductButton');
      return;
    }

    // Check authentication BEFORE API call
    if (!isAuthenticated()) {
      openLoginModal(() => handlePurchase());
      return;
    }

    setIsProcessing(true);

    try {
      const entityType = productType;
      const entityId = product.entity_id || product.id;

      // Make API call
      const result = await paymentClient.createPurchase(entityType, entityId, {
        product_title: product.title,
        source: 'BuyProductButton'
      });

      if (result.success) {
        const { data } = result;
        const isCompleted = data.completed || data.purchase?.payment_status === 'completed';
        const isFreeItem = data.isFree;

        if (isCompleted || isFreeItem) {
          toast({
            title: "מוצר התקבל בהצלחה!",
            description: `${product.title} נוסף לספרייה שלך`,
            variant: "default",
          });

          if (onSuccess) {
            onSuccess(data.purchase);
          }

          // Redirect based on product type
          if (entityType === 'file') {
            navigate(`/product-details?type=${entityType}&id=${entityId}`);
          } else {
            window.location.reload();
          }
        } else {
          addToCart();
          toast({
            title: "נוסף לעגלה",
            description: `${product.title} נוסף לעגלת הקניות`,
            variant: "default",
          });
          navigate('/checkout');
        }
      } else {
        throw new Error(result.error || 'שגיאה ביצירת הרכישה');
      }

    } catch (error) {
      // ⚠️ PROBLEM: Can't distinguish 401 from other errors
      cerror('Error in purchase flow:', error);
      toast({
        title: "שגיאה ברכישה",
        description: error.message || "אירעה שגיאה בעת הרכישה.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ... render button
}
```

## 7. Entity API Pattern

All entity APIs follow this pattern (apiClient.js lines 278-392):

```javascript
class EntityAPI {
  constructor(entityName) {
    this.entityName = entityName;
    this.basePath = `/entities/${entityName}`;
  }

  async find(query = {}) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.set(key, value);
      }
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
    return apiRequest(endpoint);
  }

  async findById(id) {
    return apiRequest(`${this.basePath}/${id}`);
  }

  async create(data) {
    return apiRequest(this.basePath, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async update(id, data) {
    return apiRequest(`${this.basePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(id) {
    return apiRequest(`${this.basePath}/${id}`, {
      method: 'DELETE'
    });
  }
}

// Export instances
export const User = { ...UserEntityAPI, getCurrentUser, login, logout };
export const Product = new EntityAPI('product');
export const Purchase = new EntityAPI('purchase');
// ... 40+ more entity APIs
```

All entity calls go through `apiRequest()` which has the 401/403 gap.

## 8. Protected Route Pattern

```javascript
export default function ProtectedRoute({ children }) {
  const { currentUser, isLoading } = useUser();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

// Used in App.jsx:
<Route
  path='/dashboard'
  element={
    <ProtectedRoute>
      <OnboardingRedirect>
        <Pages.Dashboard />
      </OnboardingRedirect>
    </ProtectedRoute>
  }
/>
```

**Note:** Route redirects to home, doesn't trigger login modal.

## Summary of Code Flows

### 1. Where 401/403 Could Be Detected
- **apiClient.js line 95:** `if (!response.ok)` - Has status code here
- **apiClient.js line 108:** Throws error - Status lost here
- **Components line ~catch:** Error caught but can't determine status

### 2. Where Auto-Modal Should Trigger
- **apiClient.js:** Right after detecting 401/403 status
- **OR:** In a global error handler hook that components use
- **OR:** In a middleware wrapper around apiRequest

### 3. Current Workarounds in Codebase
- **BuyProductButton.jsx:** Check `isAuthenticated()` before making purchase
- **UserContext.jsx:** Treat all API errors as logout
- **Layout.jsx:** Manually call `openLoginModal()` only on button click

