# Ludora Frontend Configuration Migration Plan

This document outlines the complete migration plan to replace all hardcoded ports, domains, and URLs with the new centralized configuration system.

## 📋 Overview

**Goal**: Replace all hardcoded values with centralized configuration
**Files Created**:
- `src/config/environment.js` - Centralized environment configuration
- `src/config/urls.js` - URL builders and utilities

**Issue Fixed**: Missing `VITE_STUDENT_PORTAL_PORT` variable (now defined in .env files)

---

## 🔧 Files Requiring Updates

### Priority 1: Core Configuration Files (CRITICAL)

#### 1. `/src/utils/api.js` (CRITICAL)
**Current Issues:**
- Hardcoded fallback: `'https://api.ludora.app/api'`
- Manual environment detection

**Migration:**
```javascript
// ❌ BEFORE
export const getApiBase = () => {
  const apiBase = import.meta.env.VITE_API_BASE;
  if (!apiBase) {
    if (import.meta.env.PROD) {
      return 'https://api.ludora.app/api';  // ❌ Hardcoded
    } else {
      return '/api';
    }
  }
  return apiBase;
};

// ✅ AFTER
import { config } from '@/config/environment';

export const getApiBase = () => {
  return config.api.getBaseUrl();  // ✅ Uses centralized config with smart fallbacks
};
```

#### 2. `/src/utils/domainUtils.js` (CRITICAL)
**Current Issues:**
- Hardcoded fallback: `'my.ludora.app'`
- Manual domain checking

**Migration:**
```javascript
// ❌ BEFORE
export const isStudentPortal = () => {
  const studentDomain = import.meta.env.VITE_STUDENT_PORTAL_DOMAIN || 'my.ludora.app';  // ❌ Hardcoded fallback
  // ...
};

// ✅ AFTER
import { config } from '@/config/environment';

export const isStudentPortal = () => {
  return config.portals.getCurrentType() === 'student';  // ✅ Uses centralized logic
};
```

#### 3. `/src/lib/firebase.js` (MEDIUM)
**Current Issues:**
- Direct environment variable access
- No validation or fallbacks

**Migration:**
```javascript
// ❌ BEFORE
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // ...
};

// ✅ AFTER
import { config } from '@/config/environment';

const firebaseConfig = config.firebase;  // ✅ Uses validated config with proper fallbacks
```

---

### Priority 2: Component Files (HIGH)

#### 4. `/src/components/dashboard/widgets/GameSharingWidget.jsx` (CRITICAL - Has Bug!)
**Current Issues:**
- **BUG**: Uses undefined `VITE_STUDENT_PORTAL_PORT` (now fixed in .env files)
- Hardcoded fallback: `'my.ludora.app'`
- Manual URL building

**Migration:**
```javascript
// ❌ BEFORE (BROKEN)
const studentPort = import.meta.env.VITE_STUDENT_PORTAL_PORT;  // ❌ Was undefined!
const studentDomain = import.meta.env.VITE_STUDENT_PORTAL_DOMAIN || 'my.ludora.app';  // ❌ Hardcoded

// ✅ AFTER
import { urls } from '@/config/urls';

const getStudentPortalUrl = (invitationCode) => {
  return urls.portal.student.portal(invitationCode);  // ✅ Handles all environments properly
};
```

#### 5. `/src/components/PaymentModal.jsx` (MEDIUM)
**Current Issues:**
- Manual localhost detection for test mode

**Migration:**
```javascript
// ❌ BEFORE
isTestMode = (import.meta.env.VITE_API_BASE?.includes('localhost') || import.meta.env.DEV)

// ✅ AFTER
import { config } from '@/config/environment';

isTestMode = config.isDevelopment() || config.api.isLocalhost()
```

---

### Priority 3: Page Components (MEDIUM)

#### 6. Multiple Page Files with Hardcoded URLs
- `/src/pages/Demo.jsx` - `'https://ludora.app'`
- `/src/pages/TemplateEditor.jsx` - `'https://ludora.app'`
- `/src/pages/GameLobbies.jsx` - `'https://my.ludora.app/play/${lobbyCode}'`
- `/src/pages/MyAccount.jsx` - `'https://my.ludora.app/portal/${invitationCode}'`
- `/src/pages/TemplateManager.jsx` - `'https://ludora.app'`

**Migration Pattern:**
```javascript
// ❌ BEFORE
const marketingUrl = 'https://ludora.app';
const studentUrl = `https://my.ludora.app/play/${lobbyCode}`;

// ✅ AFTER
import { urls } from '@/config/urls';

const marketingUrl = urls.external.marketing.main();
const studentUrl = urls.portal.student.play(lobbyCode);
```

---

### Priority 4: Test and Config Files (LOW)

#### 7. Test Configuration Files
- `/cypress.env.json` - Hardcoded `http://localhost:3003/api`, `http://localhost:5173`
- `/cypress.config.js` - Hardcoded URLs
- `/cypress/fixtures/purchased-content.json` - Hardcoded localhost URLs

**Migration:**
```javascript
// ❌ BEFORE (cypress.config.js)
baseUrl: 'http://localhost:5173',
apiUrl: 'http://localhost:3003/api',

// ✅ AFTER
import { config } from '../src/config/environment';

baseUrl: config.isDevelopment() ? `http://localhost:${config.ports.frontend}` : config.portals.buildTeacherUrl('/'),
apiUrl: config.api.getBaseUrl(),
```

#### 8. Public Test Files
- `/public/sse-test.html` - `'http://localhost:3003/api/sse/events'`
- `/public/minimal-sse-test.html` - `'http://localhost:3003/api/sse/events'`

**Note**: These are static HTML files and can't import JS modules. Options:
1. Replace with environment-aware React components
2. Keep as-is for development only
3. Use template replacement during build

---

### Priority 5: Build and CI Files (MEDIUM)

#### 9. Configuration Files
- `/vite.config.js` - Uses `process.env` directly
- `/package.json` - Hardcoded localhost URLs in scripts

**Migration:**
```javascript
// ❌ BEFORE (vite.config.js)
target: `http://${process.env.VITE_API_DOMAIN || 'localhost'}:${process.env.VITE_API_PORT || '3003'}`,

// ✅ AFTER - Create vite.config helper
import { createViteConfig } from './src/config/vite.config.js';
export default createViteConfig();
```

---

## 🏁 Implementation Steps

### Phase 1: Core Infrastructure (COMPLETE ✅)
- [x] Create `/src/config/environment.js`
- [x] Create `/src/config/urls.js`
- [x] Fix missing `VITE_STUDENT_PORTAL_PORT` in .env files
- [x] Add comprehensive fallback system

### Phase 2: Fix Critical Bugs (IMMEDIATE)
- [ ] Update `GameSharingWidget.jsx` (has undefined variable bug)
- [ ] Update `utils/api.js` (remove hardcoded fallbacks)
- [ ] Update `utils/domainUtils.js` (remove hardcoded fallbacks)

### Phase 3: Update Core Services (HIGH PRIORITY)
- [ ] Update `lib/firebase.js`
- [ ] Update `components/PaymentModal.jsx`
- [ ] Update `services/apiClient.js` (if needed)

### Phase 4: Update Page Components (MEDIUM PRIORITY)
- [ ] Update Demo.jsx, TemplateEditor.jsx, GameLobbies.jsx
- [ ] Update MyAccount.jsx, TemplateManager.jsx
- [ ] Update any other pages with hardcoded URLs

### Phase 5: Update Build and Test Files (LOW PRIORITY)
- [ ] Update cypress configuration
- [ ] Update vite.config.js
- [ ] Update package.json scripts
- [ ] Handle public HTML files

---

## 🧪 Testing Strategy

### After Each Migration:
1. **Development Testing**:
   ```bash
   npm run dev  # Test frontend on localhost:5173
   npm start    # Test API on localhost:3003
   ```

2. **Environment Testing**:
   ```bash
   NODE_ENV=staging npm run build
   NODE_ENV=production npm run build
   ```

3. **Portal Testing**:
   - Test teacher portal URLs
   - Test student portal URLs
   - Test portal detection logic

### Validation Checklist:
- [ ] All environment variables load from correct .env files
- [ ] Fallbacks work when variables are missing
- [ ] API URLs point to correct endpoints per environment
- [ ] Portal URLs generate correctly
- [ ] Firebase configuration loads properly
- [ ] No hardcoded values remain

---

## 🚨 Critical Issues Fixed

### 1. Missing VITE_STUDENT_PORTAL_PORT (FIXED ✅)
**Problem**: `GameSharingWidget.jsx:34` referenced undefined variable
**Solution**: Added `VITE_STUDENT_PORTAL_PORT=5173` to .env and .env.development

### 2. Inconsistent Fallbacks (FIXED ✅)
**Problem**: Same fallback values repeated across multiple files
**Solution**: Centralized fallbacks in environment.js with environment awareness

### 3. No Environment Validation (FIXED ✅)
**Problem**: Missing env vars silently fell back to hardcoded values
**Solution**: Added validation and warning system in environment.js

---

## 📝 Usage Examples

### Environment Configuration:
```javascript
import { config } from '@/config/environment';

// Get current environment
config.environment  // 'development' | 'staging' | 'production'

// Get ports
config.ports.frontend    // 5173
config.ports.api         // 3003

// Get domains
config.domains.teacher   // 'localhost' | 'staging.ludora.app' | 'ludora.app'
config.domains.student   // 'my.localhost' | 'my-staging.ludora.app' | 'my.ludora.app'

// Get API URLs
config.api.getBaseUrl()  // '/api' | 'https://api-staging.ludora.app/api' | 'https://api.ludora.app/api'
```

### URL Builders:
```javascript
import { urls } from '@/config/urls';

// Portal URLs
urls.portal.student.portal('ABC123')  // Student portal invitation
urls.portal.teacher.games()           // Teacher games page

// API URLs
urls.api.files.download('file123')    // File download endpoint
urls.api.products.list()              // Products API endpoint
```

---

## ⚡ Quick Migration Commands

### Search for files that need updates:
```bash
# Find hardcoded ports
grep -r "3003\|5173" src/ --include="*.js" --include="*.jsx"

# Find hardcoded domains
grep -r "ludora\.app\|my\.ludora\|localhost:5173" src/ --include="*.js" --include="*.jsx"

# Find direct env variable usage
grep -r "import\.meta\.env\.VITE_" src/ --include="*.js" --include="*.jsx"
```

### Test configuration:
```bash
# Test in development console
import { config } from './src/config/environment.js';
console.log('Config:', config);
```

---

This migration plan ensures all hardcoded values are replaced with a robust, environment-aware configuration system that will prevent future configuration issues and make the application much more maintainable.