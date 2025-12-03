# Frontend Development Guidelines for Ludora React App

## For architectural concepts and integration patterns, see the main `/ludora/CLAUDE.md` file

This file focuses on frontend-specific implementation patterns for the Ludora React application.

---

## 1. DUAL PORTAL DESIGN SYSTEM

### Portal Separation (CRITICAL)

Ludora serves **two completely different user experiences** from the same codebase:

**Teacher Portal (ludora.app):**
- Professional design for educators
- Complex workflows and comprehensive tools
- Business-appropriate colors and layouts

**Student Portal (my.ludora.app):**
- Kid-friendly design for students
- Simplified interactions and playful UI
- Bright colors and compact layouts

### Design System Usage

**Teacher Portal:**
```javascript
// Import teacher design system
import { COLORS, GRADIENTS } from '@/styles/colorSchema';

// Use teacher-specific CSS classes
<div className="card-teacher">
  <Button className="btn-primary-teacher">Create Game</Button>
</div>

// Loaded automatically via /src/App.css
```

**Student Portal:**
```javascript
// Import student design system
import { STUDENT_COLORS, STUDENT_GRADIENTS } from '@/styles/studentsColorSchema';

// Use student-specific CSS classes
<div className="student-card">
  <Button className="student-btn-primary">Let's Play!</Button>
</div>

// Loaded via StudentLayout.jsx importing studentsApp.css
```

### Component Portal Patterns

```javascript
// ✅ CORRECT: Structurally different layouts for different portals
function GameCard({ game, theme = 'teacher' }) {
  // Student version - compact, playful
  if (theme === 'student') {
    return (
      <div className="student-card student-game-card">
        <div className="student-card-image">
          <img src={game.thumbnail} alt={game.title} />
        </div>
        <div className="student-card-content">
          <h3 className="student-card-title">{game.title}</h3>
          <Button className="student-btn-primary">Play Now!</Button>
        </div>
      </div>
    );
  }

  // Teacher version - detailed, professional
  return (
    <div className="card-teacher game-card-teacher">
      <div className="card-teacher-header">
        <img src={game.thumbnail} alt={game.title} />
        <div className="game-meta">
          <h3>{game.title}</h3>
          <p>{game.description}</p>
          <span className="badge">{game.difficulty}</span>
        </div>
      </div>
      <div className="card-teacher-actions">
        <Button className="btn-secondary-teacher">Edit</Button>
        <Button className="btn-primary-teacher">View Details</Button>
      </div>
    </div>
  );
}
```

---

## 2. COMPONENT ORGANIZATION

### Directory Structure
```
src/components/
├── ui/                    # Reusable UI components
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Modal.jsx
│   └── KitBadge.jsx      # Bundle product visual indicator
├── auth/                  # Authentication components
│   ├── LoginForm.jsx
│   └── ProtectedRoute.jsx
├── product/               # Product creation/editing
│   ├── ProductEditor.jsx
│   ├── ProductUpload.jsx
│   └── sections/
│       └── product-specific/
│           └── BundleProductSection.jsx  # Bundle composition UI
├── catalog/               # Product browsing
│   ├── ProductGrid.jsx
│   └── FilterSidebar.jsx
├── game/                  # Game-specific UI
│   ├── GameEditor.jsx
│   ├── GameLobby.jsx
│   └── GameSession.jsx
├── classroom/             # Teacher management
│   ├── ClassroomList.jsx
│   └── StudentInvites.jsx
├── admin/                 # Admin-specific components
│   ├── FloatingAdminMenu.jsx
│   └── AdminRoute.jsx
└── email/                 # Email templates
    └── EmailTemplateBuilder.jsx
```

### Component Creation Guidelines

**Before creating a component, search for existing ones:**
```bash
# Search for similar components
rg "function.*Modal" src/components/
rg "function.*Card" src/components/
rg "function.*Button" src/components/

# Check UI components first
ls src/components/ui/
```

**Component naming patterns:**
- **Pages**: `ProductDetailsPage.jsx`
- **Components**: `ProductCard.jsx`
- **UI Components**: `Button.jsx`, `Modal.jsx`
- **Hooks**: `useProductAccess.js`, `useAuth.js`

---

## 3. API CLIENT PATTERNS

### Centralized API Client (MANDATORY)

```javascript
// ✅ ALWAYS use centralized API client
import { Product, Game, File, User } from '@/services/apiClient';

// ✅ CORRECT: Use service methods
const products = await Product.find({category: 'games'});
const game = await Game.findById(gameId);
const currentUser = await User.getCurrent();

// ❌ NEVER use direct fetch()
const response = await fetch(`${apiBase}/products`);
// ❌ Missing auth headers, error handling, consistent patterns
```

### Error Handling Patterns

```javascript
// ✅ CORRECT: Error handling with API client
import { showError, showSuccess } from '@/utils/notifications';

const handleCreateGame = async (gameData) => {
  try {
    setLoading(true);
    const game = await Game.create(gameData);
    showSuccess('Game created successfully!');
    navigate(`/games/${game.id}`);
  } catch (error) {
    // API client automatically handles common errors
    showError(error.message || 'Failed to create game');
  } finally {
    setLoading(false);
  }
};

// ✅ CORRECT: Loading state management
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await Product.find();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

### Authentication Method Naming (CRITICAL)

**🚨 CRITICAL: Frontend-backend authentication method naming must match exactly**

```javascript
// ✅ CORRECT: Authentication method names that match backend Socket.IO authentication
export function getAuthMethod(studentsAccessMode) {
  switch (studentsAccessMode) {
    case STUDENTS_ACCESS_MODES.INVITE_ONLY:
      return 'student_access_token'; // ✅ Matches backend Socket.IO authentication
    case STUDENTS_ACCESS_MODES.AUTHED_ONLY:
      return 'firebase'; // ✅ Matches backend Firebase authentication
    case STUDENTS_ACCESS_MODES.ALL:
      return 'hybrid'; // ✅ Matches backend TRY_BOTH policy
    default:
      return 'hybrid'; // ✅ Safe fallback
  }
}

// ❌ WRONG: Mismatched authentication method names
return 'player_token'; // ❌ Backend expects 'student_access_token'
return 'student_session'; // ❌ Old authentication system name
```

**Why this matters:**
- Backend Socket.IO authentication sets `socket.authMethod = 'student_access_token'` for player tokens
- Frontend portal context must send matching `authMethod` values
- Mismatch causes Socket.IO to use wrong authentication strategy
- Cookie names and authentication flow depend on exact string matching

### File Upload Patterns

```javascript
// ✅ CORRECT: File upload with progress
import { FileService } from '@/services/apiClient';

const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const result = await FileService.uploadAsset(formData, {
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      }
    });

    // Use API streaming path, never direct S3 URL
    setFileUrl(`/api/files/${result.id}/download`);
  } catch (error) {
    showError('Upload failed: ' + error.message);
  }
};
```

---

## 4. STATE MANAGEMENT PATTERNS

### React Hook Patterns

```javascript
// ✅ CORRECT: Custom hooks for complex logic
const useProductAccess = (productId) => {
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const access = await Product.checkAccess(productId);
        setHasAccess(access.hasAccess);
      } catch (error) {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      checkAccess();
    }
  }, [productId]);

  return { hasAccess, loading };
};

// Usage in component
function ProductDetailsPage({ productId }) {
  const { hasAccess, loading } = useProductAccess(productId);

  if (loading) return <LoadingSpinner />;
  if (!hasAccess) return <AccessDeniedMessage />;

  return <ProductDetails productId={productId} />;
}
```

### Form State Management

```javascript
// ✅ CORRECT: React Hook Form + Zod validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const gameSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  is_published: z.boolean().default(false)
});

function GameCreateForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(gameSchema)
  });

  const onSubmit = async (data) => {
    try {
      const game = await Game.create(data);
      showSuccess('Game created!');
      reset();
      navigate(`/games/${game.id}`);
    } catch (error) {
      showError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('title')}
        placeholder="Game Title"
        className={errors.title ? 'input-error' : ''}
      />
      {errors.title && (
        <span className="error-message">{errors.title.message}</span>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Game'}
      </Button>
    </form>
  );
}
```

---

## 5. ROUTING & NAVIGATION

### Route Organization

```javascript
// ✅ CORRECT: Route structure with authentication guards
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      {
        path: 'dashboard',
        element: <ProtectedRoute><DashboardPage /></ProtectedRoute>
      },
      {
        path: 'games',
        children: [
          { index: true, element: <GameListPage /> },
          {
            path: 'create',
            element: <ProtectedRoute requiredRole="teacher"><GameCreatePage /></ProtectedRoute>
          },
          { path: ':id', element: <GameDetailsPage /> },
          {
            path: ':id/edit',
            element: <ProtectedRoute><GameEditPage /></ProtectedRoute>
          }
        ]
      }
    ]
  },
  {
    path: '/student',
    element: <StudentLayout />, // Different layout for student portal
    children: [
      { index: true, element: <StudentHomePage /> },
      { path: 'games', element: <StudentGameCatalog /> },
      { path: 'game/:id/play', element: <GamePlayPage /> }
    ]
  }
]);
```

### Navigation Patterns

```javascript
// ✅ CORRECT: Programmatic navigation with error handling
import { useNavigate } from 'react-router-dom';

function ProductCard({ product }) {
  const navigate = useNavigate();

  const handleViewProduct = async () => {
    try {
      // Check access before navigating
      const access = await Product.checkAccess(product.id);
      if (access.hasAccess) {
        navigate(`/products/${product.id}`);
      } else {
        showError('You need to purchase this product to view it.');
        navigate('/store');
      }
    } catch (error) {
      showError('Failed to check access');
    }
  };

  return (
    <Card onClick={handleViewProduct}>
      <h3>{product.title}</h3>
      <p>{product.description}</p>
    </Card>
  );
}
```

---

## 6. ADMIN PAGE PATTERNS (Nov 2025)

### Admin-Only Page Structure

**Admin pages follow specific patterns for consistency and security:**

```javascript
// ✅ CORRECT: Admin page with proper authentication
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Settings } from '@/services/entities';

export default function PortalsSettings() {
  const navigate = useNavigate();
  const { currentUser, settings, isLoading: userLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    students_access: 'all',
    student_onboarding_enabled: false,
    teacher_onboarding_enabled: true
  });

  // Admin access check
  const loadData = useCallback(async () => {
    try {
      if (currentUser.role !== 'admin') {
        navigate('/');
        return;
      }

      // Initialize form with current settings
      const currentSettings = settings || {};
      setFormData({
        students_access: currentSettings.students_access || 'all',
        student_onboarding_enabled: currentSettings.student_onboarding_enabled || false,
        teacher_onboarding_enabled: currentSettings.teacher_onboarding_enabled || true
      });
    } catch (error) {
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  }, [currentUser, settings, navigate]);

  // Form submission with Settings entity
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings) {
        await Settings.update(settings.id, formData);
      } else {
        await Settings.create(formData);
      }
      showMessage('success', 'הגדרות נשמרו בהצלחה');
      await loadData(); // Reload updated data
    } catch (error) {
      showMessage('error', 'שגיאה בשמירת ההגדרות');
    }
    setIsSaving(false);
  };
}
```

### Admin Route Protection

```javascript
// ✅ CORRECT: Route protection in App.jsx
<Route
  path='/portals-settings'
  element={
    <AdminRoute>
      <AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
        <LazyPages.PortalsSettings />
      </AuthAwareSuspense>
    </AdminRoute>
  }
/>

// ✅ CORRECT: Lazy loading registration
export const PortalsSettings = lazy(() => import('./PortalsSettings'));
```

### Settings Management Patterns

```javascript
// ✅ CORRECT: Settings entity integration
import { Settings } from '@/services/entities';

// Read settings (automatically handled by UserContext)
const { settings } = useUser();

// Update settings with proper error handling
const updateSetting = async (key, value) => {
  try {
    await Settings.update(settings.id, { [key]: value });
    showSuccess('Setting updated successfully');
  } catch (error) {
    showError('Failed to update setting');
  }
};

// Bulk settings update
const updateMultipleSettings = async (updates) => {
  try {
    await Settings.update(settings.id, updates);
    showSuccess('Settings saved successfully');
  } catch (error) {
    showError('Failed to save settings');
  }
};
```

### Admin Navigation Integration

```javascript
// ✅ CORRECT: Adding items to FloatingAdminMenu.jsx
const adminMenuItems = [
  {
    title: "הגדרות פורטלים",
    url: "/portals-settings",
    icon: <Globe className="w-4 h-4" />,
    description: "הגדרות פורטל תלמידים ומורים"
  },
  // ... other items
];
```

**NEW: Portal Settings Management (Nov 2025):**
- **Route**: `/portals-settings` - Admin-only portal configuration
- **Settings Keys**: `student_onboarding_enabled`, `teacher_onboarding_enabled`
- **Access Control**: Admin role required, automatic redirect for non-admins
- **Form Pattern**: React Hook Form + Settings entity integration
- **UI Pattern**: Hebrew RTL with professional admin design

---

## 7. BUNDLE UI PATTERNS (NEW: Nov 2025, Enhanced: Nov 29-30)

### Bundle Product Components

**Bundle products (קיט) have specialized UI components for creation and display:**

```javascript
// ✅ CORRECT: Bundle detection and display
import { isBundle, getBundleItemCount } from '@/lib/bundleUtils';
import KitBadge from '@/components/ui/KitBadge';

function ProductCard({ product }) {
  return (
    <Card>
      <CardHeader>
        {isBundle(product) && (
          <KitBadge product={product} variant="default" size="md" />
        )}
        <h3>{product.title}</h3>
      </CardHeader>
      <CardBody>
        {isBundle(product) ? (
          <p>{getBundleItemCount(product)} items in bundle</p>
        ) : (
          <p>{product.description}</p>
        )}
      </CardBody>
    </Card>
  );
}
```

### Bundle Creation UI (Enhanced Nov 29, 2025)

```javascript
// ✅ CORRECT: Bundle composition interface with validation
import BundleProductSection from '@/components/product/sections/product-specific/BundleProductSection';

// Used in ProductEditor when product_type === 'bundle'
<BundleProductSection
  formData={formData}
  updateFormData={updateFormData}
  editingProduct={editingProduct}
  isFieldValid={isFieldValid}
  getFieldError={getFieldError}
/>

// Enhanced bundle publishing workflow:
// 1. Product search with real-time filtering
// 2. Visual product selection with thumbnails
// 3. Automatic pricing calculations
// 4. Live validation feedback
// 5. Publishing readiness indicators
```

### Bundle Publishing Validation (CRITICAL FIX - Nov 29, 2025)

**Frontend validation chain for bundle publishing:**

```javascript
// useProductFormValidation.js - Bundle-specific validation
const validateBundlePublishing = (formData) => {
  if (formData.product_type === 'bundle') {
    // Check bundle has items (not files)
    if (!formData.bundle_items?.length) {
      return { valid: false, error: 'Bundle must contain products' };
    }

    // Validate pricing requirements
    const totalOriginalPrice = calculateTotalPrice(formData.bundle_items);
    if (formData.price >= totalOriginalPrice) {
      return { valid: false, error: 'Bundle price must be less than total' };
    }

    // Check minimum savings (5%)
    const savings = ((totalOriginalPrice - formData.price) / totalOriginalPrice) * 100;
    if (savings < 5) {
      return { valid: false, error: 'Bundle must offer at least 5% savings' };
    }

    return { valid: true };
  }
  // Non-bundle validation...
};

// PublishSection.jsx - Bundle publishing UI
const canPublishBundle = () => {
  if (!formData.bundle_items?.length) return false;
  if (!formData.title || !formData.price) return false;
  if (!validateBundlePricing(formData)) return false;
  return true;
};

// Visual feedback for publishing readiness
{formData.product_type === 'bundle' && (
  <div className="bundle-publish-checklist">
    <ChecklistItem done={formData.bundle_items?.length >= 2}>
      At least 2 products added
    </ChecklistItem>
    <ChecklistItem done={formData.price < calculateTotal()}>
      Bundle price offers savings
    </ChecklistItem>
    <ChecklistItem done={allProductsPublished(formData.bundle_items)}>
      All products are published
    </ChecklistItem>
  </div>
)}
```

### Bundle Utilities (Enhanced)

```javascript
// ✅ CORRECT: Centralized bundle logic with validation
import {
  isBundle,                    // Check if product is a bundle
  isBundleable,                // Check if type can be bundled
  getBundleItemCount,          // Get number of items
  getBundleComposition,        // Get item counts by type
  getBundleCompositionLabel,   // Hebrew label for composition
  getBundleCompositionText,    // Full text description
  validateBundleItems,         // Validate bundle rules (max 50 items)
  formatBundleItemsForAPI,     // Format for backend submission
  areBundleCompositionsEqual,  // Compare bundle compositions
  getAllBundleableTypes        // Get all bundleable product types
} from '@/lib/bundleUtils';

// Bundle validation during creation (supports mixed types)
const validationResult = validateBundleItems(selectedItems);
if (!validationResult.valid) {
  showError(validationResult.error);
  return;
}

// Real-time pricing validation
const pricingValid = validateBundlePricing({
  price: bundlePrice,
  bundle_items: selectedItems
});
```

### Visual Indicators

**KitBadge Component Variants:**
- **default**: Standard badge with item count
- **compact**: Icon only for space-constrained layouts
- **full**: Badge with complete composition breakdown

```javascript
// Different badge variants for different contexts
<KitBadge product={product} variant="default" />   // "קיט • 5"
<KitBadge product={product} variant="compact" />   // Icon only
<KitBadge product={product} variant="full" />      // "קיט • 2 קבצים, 3 משחקים"
```

### Bundle Preview Modal (NEW: Nov 30, 2025)

**BundlePreviewModal component for viewing bundle contents:**

```javascript
import BundlePreviewModal from '@/components/BundlePreviewModal';

// Usage with callback patterns for navigation
<BundlePreviewModal
  bundle={bundleProduct}
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onProductPreview={(product) => {
    // Handle individual product preview
    // Only enabled for PDF files and lesson plans with preview enabled
  }}
  onProductView={(product) => {
    // Navigate to full product details
    navigate(`/products/${product.id}`);
  }}
/>

// Features:
// - Loads all bundle products with API details
// - Shows product type badges and icons
// - Preview button only for previewable products
// - Responsive card layout for bundle items
// - Loading states with LudoraLoadingSpinner
// - Error handling for failed product loads
```

### Bundle Step Validation UI

**Enhanced step validation in WizardLayout:**
```javascript
// Proper step validation for bundle products
const isStepValid = (step) => {
  if (formData.product_type === 'bundle') {
    switch(step) {
      case 'basic': return formData.title && formData.description;
      case 'specific': return formData.bundle_items?.length >= 2;
      case 'pricing': return validateBundlePricing(formData);
      case 'publish': return canPublishBundle();
    }
  }
  // Regular product validation...
};
```

---

## 8. SUBSCRIPTION UI PATTERNS (NEW: Nov 29-30, 2025)

### Subscription Payment Status Hook

**Automatic detection and handling of abandoned subscription payment pages:**

```javascript
import { useSubscriptionPaymentStatusCheck } from '@/hooks/useSubscriptionPaymentStatusCheck';

// Use in components that need subscription status awareness
const {
  isChecking,
  pendingCount,
  statusSummary,
  checkSubscriptionPaymentStatus,
  hasPendingSubscriptions,
  hasRecentlyChecked
} = useSubscriptionPaymentStatusCheck({
  enabled: true,                    // Auto-check on mount
  onStatusUpdate: (update) => {
    // Handle activation/cancellation
    if (update.type === 'subscription_activated') {
      refetchUserData();
    }
  },
  checkInterval: null,             // Optional periodic checking
  showToasts: true                 // User notifications
});

// Features:
// - Global request deduplication (prevents duplicate API calls)
// - 2-second debouncing to prevent rapid-fire requests
// - Automatic retry with backoff for processing delays
// - Toast notifications for status changes
// - Efficient pending check before full status check
```

### Subscription Layout Detection

**Automatic layout detection for subscription purchase flows:**

```javascript
// PaymentResult.jsx - Smart layout detection
const getLayoutForSubscription = (subscription) => {
  // Automatically chooses correct layout based on subscription state
  if (subscription?.status === 'active') {
    return 'subscription_success';  // Shows success UI
  } else if (subscription?.status === 'pending') {
    return 'subscription_pending';   // Shows processing UI
  } else {
    return 'subscription_failed';    // Shows failure UI
  }
};

// Subscription-specific UI elements
// - Activation status indicators
// - Next billing date display
// - Benefits summary
// - Manage subscription button
```

### Enhanced Subscription Toggle

**Improved subscription system toggle with immediate UI updates:**

```javascript
// SubscriptionSettings.jsx - Fixed toggle behavior
const handleSubscriptionToggle = async (newValue) => {
  setLocalSubscriptionEnabled(newValue);  // Immediate UI update

  try {
    await Settings.update(settingId, {
      subscription_system_enabled: newValue
    });
    await refetchSettings();  // Sync with backend
  } catch (error) {
    setLocalSubscriptionEnabled(!newValue);  // Revert on error
    showError('Failed to update subscription settings');
  }
};
```

## 9. TESTING PATTERNS

### Component Testing with Cypress

```javascript
// ✅ CORRECT: E2E test structure
describe('Game Creation Flow', () => {
  beforeEach(() => {
    cy.login('teacher@example.com', 'password');
    cy.visit('/games/create');
  });

  it('should create a new game successfully', () => {
    // Fill form
    cy.get('[data-testid="game-title"]').type('Math Quiz Game');
    cy.get('[data-testid="game-description"]').type('A fun math quiz');
    cy.get('[data-testid="difficulty-select"]').select('easy');

    // Submit
    cy.get('[data-testid="create-game-btn"]').click();

    // Verify redirect and success
    cy.url().should('include', '/games/');
    cy.contains('Game created successfully').should('be.visible');

    // Verify game appears in list
    cy.visit('/games');
    cy.contains('Math Quiz Game').should('be.visible');
  });

  it('should show validation errors for invalid input', () => {
    cy.get('[data-testid="create-game-btn"]').click();
    cy.contains('Title is required').should('be.visible');
  });
});
```

### Accessibility Testing

```javascript
// ✅ CORRECT: Basic accessibility patterns
function GameCard({ game }) {
  return (
    <div
      className="game-card"
      role="button"
      tabIndex={0}
      aria-label={`Play ${game.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handlePlayGame();
        }
      }}
    >
      <h3 id={`game-title-${game.id}`}>{game.title}</h3>
      <p aria-describedby={`game-title-${game.id}`}>
        {game.description}
      </p>
      <Button
        onClick={handlePlayGame}
        aria-label={`Play ${game.title} game`}
      >
        Play Now
      </Button>
    </div>
  );
}
```

---

## 7. PERFORMANCE PATTERNS

### Code Splitting & Lazy Loading

```javascript
// ✅ CORRECT: Route-based code splitting
import { lazy, Suspense } from 'react';

const GameEditor = lazy(() => import('@/components/game/GameEditor'));
const ProductCatalog = lazy(() => import('@/pages/ProductCatalog'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/games/create" element={<GameEditor />} />
        <Route path="/catalog" element={<ProductCatalog />} />
      </Routes>
    </Suspense>
  );
}

// ✅ CORRECT: Component-level optimization
import { memo, useMemo, useCallback } from 'react';

const ProductCard = memo(({ product, onSelect }) => {
  const formattedPrice = useMemo(
    () => formatPrice(product.price),
    [product.price]
  );

  const handleSelect = useCallback(
    () => onSelect(product.id),
    [product.id, onSelect]
  );

  return (
    <Card onClick={handleSelect}>
      <h3>{product.title}</h3>
      <p className="price">{formattedPrice}</p>
    </Card>
  );
});
```

### Image Optimization

```javascript
// ✅ CORRECT: Responsive image loading
function ProductImage({ product, size = 'medium' }) {
  const imageSizes = {
    small: { width: 200, height: 150 },
    medium: { width: 400, height: 300 },
    large: { width: 800, height: 600 }
  };

  const { width, height } = imageSizes[size];

  return (
    <img
      src={`/api/products/${product.id}/image?w=${width}&h=${height}`}
      alt={product.title}
      loading="lazy"
      style={{ width: `${width}px`, height: `${height}px`, objectFit: 'cover' }}
      onError={(e) => {
        e.target.src = '/images/placeholder.png';
      }}
    />
  );
}
```

---

## 8. ANTI-PATTERNS REFERENCE

**See main `/ludora/CLAUDE.md` Section 12 for complete anti-patterns list.**

**Frontend-specific quick reference:**
- ❌ Never bypass API client with direct fetch()
- ❌ Never mix teacher/student design system classes
- ❌ Never skip loading/error states in components
- ❌ Never use time-based cache expiration in React
- ❌ Never use console.* (use ludlog/luderror)

---

## 9. CACHE INVALIDATION PATTERNS

**🚨 Frontend caching must follow data-driven principles. See main `/ludora/CLAUDE.md` for complete cache invalidation rules.**

**Quick reference:**
- ❌ Never use time-based cache expiration (setTimeout, TTL-only)
- ✅ Use data versions in cache keys
- ✅ Invalidate on mutations, not timers
- ✅ Use React Query with `staleTime: Infinity` + proper invalidation

**Frontend-specific patterns:**
```javascript
// ✅ CORRECT: Data-driven React Query
const { data } = useQuery(['settings', dataVersion], fetchSettings, {
  staleTime: Infinity, // Never stale by time
  refetchOnWindowFocus: true
});

// ✅ CORRECT: Invalidate on mutation
const mutation = useMutation(updateData, {
  onSuccess: () => queryClient.invalidateQueries(['settings'])
});
```

**CRITICAL: Time-based cache violations fixed (Nov 2025):**
```javascript
// ❌ REMOVED: Time-based cache duration
const CACHE_DURATION = 5 * 60 * 1000; // ❌ BLOCKS PR APPROVAL
if (Date.now() - cacheEntry.timestamp > CACHE_DURATION) { // ❌ BLOCKS PR APPROVAL

// ✅ ADDED: Data-driven cache invalidation
const cachedData = cache.get(cacheKey);
if (!cachedData || cachedData.dataVersion !== currentDataVersion) {
  // Invalidate based on data changes, not time
}
```

**Fixed in useSubscriptionState hook:** Replaced timestamp-based cache expiration with dataVersion-based invalidation to comply with architectural rules.

---

## 10. STUDENT PORTAL UTILITY PATTERNS (Nov 2025)

### Student Portal Navigation Utilities

**NEW: Centralized student display utilities for consistent user presentation across the portal:**

Located in `/src/lib/studentNavUtils.js`, these utilities provide reusable functions for displaying user information in the student portal:

```javascript
import {
  getStudentDisplayName,
  getStudentAuthStatus,
  getConnectedUser
} from '@/lib/studentNavUtils';

// Get display name with authentication hierarchy
const displayName = getStudentDisplayName(
  firebaseUser,      // From UserContext
  connectedPlayer,   // From StudentPortalContext
  anonymousPlayer   // From StudentPortalContext
);
// Returns: "יניב" (firebase) | "Player 123" | "אורח 456" | "אורח"

// Get authentication status with design system colors
const authStatus = getStudentAuthStatus(firebaseUser, connectedPlayer);
// Returns: { status: "מחובר", color: "text-emerald-600" }
//      or: { status: "אורח", color: "text-gray-500" }

// Get connected user object for display
const user = getConnectedUser(firebaseUser, connectedPlayer);
// Returns: { display_name: "יניב", isAuthenticated: true }
//      or: { display_name: "Player 123", isAuthenticated: false }
//      or: null
```

**Key Patterns:**
- **Authentication Hierarchy**: Firebase users > connected players > anonymous players > guests
- **Design System Integration**: Uses `STUDENT_AUTH_COLORS` constants with student portal colors
- **Hebrew Display Text**: All strings in `STUDENT_DISPLAY_TEXT` constants for consistency
- **Reusable Across Components**: Exported utilities for use in navigation, headers, game UI, etc.

**Design Constants:**
```javascript
// Text constants for Hebrew display
const STUDENT_DISPLAY_TEXT = {
  GUEST_PREFIX: 'אורח',
  PLAYER_PREFIX: 'Player',
  AUTHENTICATED_STATUS: 'מחובר',
  GUEST_STATUS: 'אורח'
};

// Student portal design system colors
const STUDENT_AUTH_COLORS = {
  AUTHENTICATED: 'text-emerald-600',  // Not text-green-600
  GUEST: 'text-gray-500'
};
```

**Usage in Components:**
```javascript
// In StudentsNav.jsx or any student portal component
const displayName = getStudentDisplayName(
  currentUser?.firebaseUser,
  studentPortal?.connectedPlayer,
  studentPortal?.anonymousPlayer
);

const { status, color } = getStudentAuthStatus(
  currentUser?.firebaseUser,
  studentPortal?.connectedPlayer
);

// Display with proper styling
<span className={color}>
  {displayName} • {status}
</span>
```

**Important Notes:**
- Always use these utilities in student portal components for consistency
- Never hardcode authentication display logic in components
- Use the exported constants for colors and text to maintain design system consistency
- These utilities handle all authentication modes: Firebase, player sessions, and anonymous

---

## 11. KEY FILE LOCATIONS

### Essential Frontend Files
- **API Client**: `/src/services/apiClient.js`
- **Teacher Design System**: `/src/styles/colorSchema.js`, `/src/styles/globalStyles.css`
- **Student Design System**: `/src/styles/studentsColorSchema.js`, `/src/styles/studentsGlobalStyles.css`
- **Student Portal Utilities**: `/src/lib/studentNavUtils.js`
- **Auth Components**: `/src/components/auth/`
- **Layouts**: `/src/components/layouts/`

### Configuration Files
- **Vite Config**: `/vite.config.js`
- **TailwindCSS**: `/tailwind.config.js`
- **Cypress Config**: `/cypress.config.js`

---

## 12. Frontend Development Checklist

**Before implementing:**
- [ ] Determine which portal this component/page serves (teacher vs student)
- [ ] Check for existing similar components in `/src/components/`
- [ ] Identify required API calls and use appropriate API client methods
- [ ] Plan state management (local state, custom hooks, or context)

**During implementation:**
- [ ] Use portal-appropriate design system and CSS classes
- [ ] Always use centralized API client, never direct fetch()
- [ ] Implement proper loading, error, and empty states
- [ ] Add accessibility attributes (aria-labels, roles, keyboard navigation)
- [ ] Handle responsive design for different screen sizes

**Before claiming done:**
- [ ] Test component in both portals (if applicable)
- [ ] Verify API integration works with real data
- [ ] Check loading states and error handling
- [ ] Test keyboard navigation and screen reader compatibility
- [ ] **Verify mobile responsiveness** - No horizontal scroll, content fits viewport
- [ ] Verify responsive design on mobile and desktop

**Remember:** The frontend serves both teacher and student portals with completely different design systems. Always use the appropriate design tokens and ensure your components work correctly in their intended portal context.

---

## 13. VISUAL TEMPLATE EDITOR SYSTEM (Dec 2025)

### Template Element Lock Functionality

**NEW: Complete lock/unlock functionality for template elements in the visual template editor.**

The visual template editor now includes comprehensive lock functionality that allows users to lock elements to prevent accidental modifications during template design.

### Lock Feature Overview

**Key Components:**
- **FloatingSettingsMenu**: Lock toggle button in the header
- **TemplateCanvas**: Drag prevention and visual feedback for locked elements
- **VisualTemplateEditor**: Handler functions for lock state management

### Implementation Details

#### Lock UI in FloatingSettingsMenu
```jsx
// Lock toggle button - always available for any element
<Button
  onClick={() => onLockToggle?.(selectedItem)}
  variant="outline"
  size="sm"
  className={`p-1 h-8 w-8 ${
    itemConfig.locked
      ? 'text-red-600 hover:bg-red-50 bg-red-50'
      : 'text-gray-600 hover:bg-gray-50'
  }`}
  title={itemConfig.locked ? "בטל נעילה" : "נעל אלמנט"}
>
  {itemConfig.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
</Button>
```

**Visual States:**
- **Unlocked**: Gray unlock icon with gray hover
- **Locked**: Red lock icon with red background
- **Hebrew tooltips**: "נעל אלמנט" / "בטל נעילה"

#### Drag Prevention in TemplateCanvas
```javascript
const handleMouseDown = (elementKey, event) => {
  // Find the element
  const elementInfo = findElement(elementKey);
  if (!elementInfo) return;

  // Check if the individual element is locked
  if (elementInfo.element.locked) {
    return; // Prevent dragging locked elements
  }

  // Check if element is in a locked group
  const elementGroup = getElementGroup(elementKey);
  if (elementGroup && isGroupLocked(elementGroup.id)) {
    return; // Prevent dragging locked groups
  }

  // Continue with normal drag behavior if not locked
  setIsDragging(elementKey);
  // ...
};
```

#### Visual Feedback for Locked Elements
```jsx
const renderElementByType = (elementType, element, elementKey, isFocused, isDraggingThis) => {
  const isLocked = element.locked;
  const commonClasses = `absolute pointer-events-auto select-none transition-all duration-200 group ${
    isDraggingThis ? 'cursor-grabbing scale-105 z-50' :
    isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-grab hover:scale-105'
  } ${isFocused ? 'ring-4 ring-blue-400 ring-opacity-75 rounded-lg' : ''} ${
    element.groupId ? 'ring-2 ring-purple-300' : ''
  } ${isLocked ? 'ring-2 ring-red-300' : ''}`;
  // ...
};
```

**Lock Visual Indicators:**
- **Red ring**: 2px red border around locked elements
- **Reduced opacity**: 75% opacity for locked elements
- **Cursor change**: `cursor-not-allowed` instead of `cursor-grab`
- **No hover scaling**: Locked elements don't scale on hover

#### Lock State Management in VisualTemplateEditor
```javascript
const handleLockToggle = (elementKey) => {
  const elementInfo = findElementForUpdate(elementKey);
  if (!elementInfo) return;

  const { elementType, index } = elementInfo;

  const newConfig = {
    ...templateConfig,
    elements: {
      ...templateConfig.elements,
      [elementType]: templateConfig.elements[elementType].map((item, idx) =>
        idx === index ? { ...item, locked: !item.locked } : item
      )
    }
  };

  setTemplateConfig(newConfig);
};
```

### Lock Functionality Features

**Individual Element Locking:**
- Lock/unlock individual elements via FloatingSettingsMenu button
- Locked state persists in element's `locked` property
- Works with all element types (text, logo, shapes, etc.)

**Group Lock Support:**
- Groups can be locked/unlocked as a unit
- All elements in a locked group are prevented from dragging
- Group lock state checked via `isGroupLocked()` function

**Integration Points:**
- **Undo/Redo System**: Lock state changes are tracked in undo history
- **Template Saving**: Lock state is preserved when saving templates
- **Unified Structure**: Works with both legacy and unified template structures

### User Experience

**Lock Workflow:**
1. Select an element by clicking on it
2. Click the lock/unlock button in FloatingSettingsMenu
3. Element shows visual lock indicators (red ring, reduced opacity)
4. Locked element cannot be dragged until unlocked
5. Lock state persists through save/load cycles

**Visual Feedback:**
- Immediate visual changes when locking/unlocking
- Clear differentiation between locked and unlocked states
- Cursor changes provide additional feedback

### Technical Considerations

**Performance:**
- Lock checks are lightweight and don't impact drag performance
- Visual updates use CSS transitions for smooth state changes

**Compatibility:**
- Works with all element types in the template editor
- Supports both individual and group locking
- Compatible with existing undo/redo system

---

## 14. MOBILE RESPONSIVENESS SYSTEM (Dec 2025)

### Critical Mobile Protection Rules

**🚨 CRITICAL: All pages and components MUST be mobile-responsive without horizontal scrolling.**

Ludora implements a comprehensive mobile viewport protection system to prevent layout breakage on mobile devices. **See `/ludora-front/MOBILE_RESPONSIVE_GUIDE.md` for complete documentation.**

### Quick Reference: Mobile-Safe Utilities

```jsx
// ✅ CORRECT: Page-level mobile protection
<div className="min-h-screen mobile-no-scroll-x mobile-safe-container">
  <div className="max-w-7xl mx-auto mobile-padding-x mobile-safe-container">
    {/* Page content */}
  </div>
</div>

// ✅ CORRECT: Mobile-safe flex container
<div className="mobile-safe-flex items-center mobile-gap">
  <div className="flex-1 min-w-0 mobile-safe-text">
    <h1 className="mobile-truncate">{title}</h1>
  </div>
</div>

// ✅ CORRECT: Mobile-safe grid container
<div className="mobile-safe-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mobile-gap">
  {items.map(item => (
    <div key={item.id} className="mobile-safe-card mobile-padding">
      <h3 className="mobile-truncate">{item.title}</h3>
      <p className="mobile-safe-text">{item.description}</p>
    </div>
  ))}
</div>
```

### Available Mobile Utilities

| Utility Class | Purpose | Usage |
|--------------|---------|-------|
| `.mobile-safe-container` | Prevents viewport overflow | All page containers |
| `.mobile-safe-flex` | Safe flex layouts | Flex containers with text |
| `.mobile-safe-grid` | Safe grid layouts | Grid containers |
| `.mobile-safe-text` | Prevents text overflow | Long text content |
| `.mobile-safe-card` | Complete card protection | Card components |
| `.mobile-truncate` | Single-line ellipsis | Titles and headers |
| `.mobile-line-clamp-2/3` | Multi-line truncation | Descriptions |
| `.mobile-no-scroll-x` | Prevent horizontal scroll | Page-level containers |
| `.mobile-padding` | Responsive padding | Dynamic spacing |
| `.mobile-gap` | Responsive gap | Flex/grid spacing |

### Mobile Responsiveness Checklist

For every new component/page:

- [ ] **No horizontal scrollbar** at 320px width (iPhone SE)
- [ ] **Text wraps properly** without overflowing containers
- [ ] **Images scale** without distortion or overflow
- [ ] **Buttons remain clickable** and don't overlap
- [ ] **Flex/Grid layouts** collapse properly on mobile
- [ ] **Headers truncate** long titles with ellipsis
- [ ] **Cards stack** vertically on mobile
- [ ] **Touch targets** are at least 44px × 44px

### Testing Mobile Layouts

**Browser DevTools Testing:**
```bash
# Chrome DevTools: Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows)
# Device Toolbar: Cmd+Shift+M (Mac) / Ctrl+Shift+M (Windows)

# Test at these critical widths:
- 320px (iPhone SE)
- 375px (iPhone 12 Pro)
- 390px (iPhone 12 Pro Max)
- 414px (iPhone Plus)
- 768px (iPad Portrait)
- 1024px (iPad Landscape)
```

**Debug Overflow Issues:**
```javascript
// Run in browser console to find overflowing elements
document.querySelectorAll('*').forEach(el => {
  if (el.scrollWidth > el.clientWidth) {
    console.log('Overflow detected:', el);
    el.style.outline = '2px solid red';
  }
});
```

### Common Mobile Anti-Patterns

```jsx
// ❌ WRONG: Fixed width without max constraint
<div className="w-[600px]">Content</div>

// ✅ CORRECT: Responsive width with mobile protection
<div className="w-full max-w-[600px] mobile-safe-container">Content</div>

// ❌ WRONG: Flex without min-w-0
<div className="flex">
  <div className="flex-1">Long content</div>
</div>

// ✅ CORRECT: Mobile-safe flex with proper constraints
<div className="mobile-safe-flex">
  <div className="flex-1 min-w-0 mobile-safe-text">Long content</div>
</div>

// ❌ WRONG: Text without word-break
<p className="whitespace-nowrap">{longText}</p>

// ✅ CORRECT: Mobile-safe text with truncation
<p className="mobile-truncate">{longText}</p>
```

### Global Mobile Safety Features

The following elements have automatic mobile protection via global CSS:

- **HTML/Body** - Prevent horizontal scroll
- **Images** - Constrained to container width
- **Videos** - Constrained to container width
- **Tables** - Horizontal scroll on overflow
- **Pre/Code blocks** - Scroll instead of overflow

### Mobile Responsiveness Resources

- **Complete Guide**: `/ludora-front/MOBILE_RESPONSIVE_GUIDE.md`
- **Test Files**: ProductDetails.jsx, ProductPage.jsx (reference implementations)
- **Global Styles**: `/src/index.css` (mobile utilities defined here)

**Remember:** Mobile responsiveness is NOT optional. Every component MUST work on mobile devices without horizontal scrolling or layout breakage.