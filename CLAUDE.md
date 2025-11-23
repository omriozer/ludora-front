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
│   └── Modal.jsx
├── auth/                  # Authentication components
│   ├── LoginForm.jsx
│   └── ProtectedRoute.jsx
├── product/               # Product creation/editing
│   ├── ProductEditor.jsx
│   └── ProductUpload.jsx
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

## 6. TESTING PATTERNS

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

## 8. COMMON FRONTEND ANTI-PATTERNS

### ❌ Direct API Access
```javascript
// ❌ WRONG: Bypassing API client
const response = await fetch('/api/games', {
  headers: { Authorization: `Bearer ${token}` }
});

// ✅ CORRECT: Use API client
const games = await Game.find();
```

### ❌ Mixed Design Systems
```javascript
// ❌ WRONG: Using teacher classes in student portal
<div className="card-teacher">  {/* In student portal */}
  <Button className="btn-primary-teacher">Play</Button>
</div>

// ✅ CORRECT: Use portal-appropriate classes
<div className="student-card">  {/* In student portal */}
  <Button className="student-btn-primary">Play</Button>
</div>
```

### ❌ State Management Issues
```javascript
// ❌ WRONG: Missing loading states
const [games, setGames] = useState([]);
useEffect(() => {
  Game.find().then(setGames);  // No loading or error handling
}, []);

// ✅ CORRECT: Proper state management
const [games, setGames] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchGames = async () => {
    try {
      setLoading(true);
      const data = await Game.find();
      setGames(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchGames();
}, []);
```

---

## 9. CACHE INVALIDATION PATTERNS (FRONTEND)

### 🚨 CRITICAL: Data-Driven Cache Invalidation Only

**This is a HARD ARCHITECTURAL RULE that blocks PR approval if violated:**

Frontend caching must follow the same data-driven principles as backend. Never use time-based expiration.

### ❌ PROHIBITED: Time-Based Cache Patterns

```javascript
// ❌ NEVER: Time-based cache expiration in React
const [cache, setCache] = useState({});
useEffect(() => {
  const timer = setTimeout(() => setCache({}), 60000); // BLOCKS PR
  return () => clearTimeout(timer);
}, []);

// ❌ NEVER: localStorage with time-based expiration
localStorage.setItem('data', JSON.stringify({ value, expires: Date.now() + 60000 }));

// ❌ NEVER: React Query with only time-based stale time
useQuery('key', fetchData, {
  staleTime: 5 * 60 * 1000, // BLOCKS PR without refetchOnWindowFocus
  cacheTime: 10 * 60 * 1000  // BLOCKS PR without data validation
});
```

### ✅ REQUIRED: Data-Driven Cache Patterns

```javascript
// ✅ CORRECT: Cache key includes data version from API
const { data: settings } = useQuery(
  ['settings', settingsVersion], // Version in cache key
  fetchSettings,
  {
    staleTime: Infinity, // Never stale by time
    refetchOnWindowFocus: true, // Check on focus
    refetchOnReconnect: true // Check on reconnect
  }
);

// ✅ CORRECT: Invalidate cache on data mutation
const mutation = useMutation(updateSettings, {
  onSuccess: () => {
    // Invalidate all settings queries
    queryClient.invalidateQueries(['settings']);
  }
});

// ✅ CORRECT: Event-driven cache invalidation via WebSocket/SSE
useEffect(() => {
  const eventSource = new EventSource('/api/sse/events');

  eventSource.addEventListener('settings-updated', (event) => {
    // Invalidate cache when server notifies of change
    queryClient.invalidateQueries(['settings']);
  });

  return () => eventSource.close();
}, []);

// ✅ CORRECT: localStorage with version checking
function getCachedData(key) {
  const cached = JSON.parse(localStorage.getItem(key) || '{}');

  // Validate against server version
  if (cached.version !== serverDataVersion) {
    localStorage.removeItem(key);
    return null;
  }

  return cached.data;
}
```

### Why This Matters for Frontend

- **User experience:** Stale data confuses users
- **Data consistency:** Frontend/backend data must match
- **Performance:** Unnecessary refetches waste resources
- **Offline support:** Data-driven caching enables better offline behavior

### ESLint Automated Enforcement (NEW)

**🚨 CRITICAL: ESLint rules now automatically detect and block time-based caching patterns.**

```bash
# Run linting before ANY code submission
npm run lint        # Check for violations
npm run lint:fix    # Auto-fix where possible
```

**Ludora Custom ESLint Rules:**
- **`ludora/no-time-based-caching`** (Error) - BLOCKS PR APPROVAL
- **`ludora/require-data-driven-cache`** (Warning) - Suggests proper patterns
- **`ludora/no-unused-cache-keys`** (Warning) - Detects orphaned cache operations
- **`ludora/no-console-log`** (Error) - Enforces clog/cerror usage

**See `/ludora-utils/eslint-plugin-ludora/README.md` for full documentation.**

---

## 10. KEY FILE LOCATIONS

### Essential Frontend Files
- **API Client**: `/src/services/apiClient.js`
- **Teacher Design System**: `/src/styles/colorSchema.js`, `/src/styles/globalStyles.css`
- **Student Design System**: `/src/styles/studentsColorSchema.js`, `/src/styles/studentsGlobalStyles.css`
- **Auth Components**: `/src/components/auth/`
- **Layouts**: `/src/components/layouts/`

### Configuration Files
- **Vite Config**: `/vite.config.js`
- **TailwindCSS**: `/tailwind.config.js`
- **Cypress Config**: `/cypress.config.js`

---

## 11. Frontend Development Checklist

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
- [ ] Verify responsive design on mobile and desktop

**Remember:** The frontend serves both teacher and student portals with completely different design systems. Always use the appropriate design tokens and ensure your components work correctly in their intended portal context.