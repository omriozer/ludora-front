# OpenAPI Client Quick Reference

**Fast lookup guide for daily development**

---

## Quick Start

### Generate Types
```bash
npm run generate-types
```

### Import OpenAPI Client
```typescript
import { apiClient } from '@/services/openApiClient';
import type { components } from '@/types/api';
```

---

## Common Patterns

### GET Request
```typescript
// Simple GET
const { data, error } = await apiClient.GET('/auth/me');

// GET with path parameters
const { data, error } = await apiClient.GET('/products/{id}', {
  params: {
    path: { id: 'product_123' }
  }
});

// GET with query parameters
const { data, error } = await apiClient.GET('/products', {
  params: {
    query: {
      category: 'games',
      include_access: true
    }
  }
});
```

### POST Request
```typescript
// Simple POST
const { data, error } = await apiClient.POST('/auth/verify', {
  body: { idToken: 'token_abc123' }
});

// POST with complex body
const { data, error } = await apiClient.POST('/products', {
  body: {
    product_type: 'game',
    title: 'Math Quiz',
    price: 49.90,
    type_attributes: {
      difficulty: 'medium'
    }
  }
});
```

### PUT Request
```typescript
const { data, error } = await apiClient.PUT('/products/{id}', {
  params: {
    path: { id: 'product_123' }
  },
  body: {
    title: 'Updated Title',
    price: 59.90
  }
});
```

### DELETE Request
```typescript
const { data, error } = await apiClient.DELETE('/products/{id}', {
  params: {
    path: { id: 'product_123' }
  }
});
```

---

## Type Safety

### Type Aliases
```typescript
// Import specific types
type User = components['schemas']['User'];
type Product = components['schemas']['ProductWithAccess'];
type AuthResponse = components['schemas']['AuthResponse'];

// Use in function signatures
async function loadUser(): Promise<User | null> {
  const { data, error } = await apiClient.GET('/auth/me');

  if (error) return null;

  return data; // TypeScript knows this is User type
}
```

### Response Handling
```typescript
// Destructure with types
const { data, error, response } = await apiClient.GET('/products/{id}', {
  params: { path: { id: productId } }
});

// data: ProductWithAccess | undefined
// error: ErrorResponse | undefined
// response: Response object
```

---

## Error Handling

### Basic Pattern
```typescript
const { data, error } = await apiClient.POST('/products', {
  body: productData
});

if (error) {
  // Handle error
  handleApiError(error, 'Failed to create product');
  return null;
}

// Use data safely
return data;
```

### Centralized Error Handler
```typescript
import { handleApiError } from '@/utils/apiErrorHandler';

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

## Authentication

### Check Current User
```typescript
const { data: user, error } = await apiClient.GET('/auth/me');

if (error || !user) {
  // Not authenticated
  return null;
}

// user is typed as UserProfile
console.log(user.email);
console.log(user.role);
console.log(user.onboarding_completed);
```

### Firebase Login
```typescript
const { data: authResponse, error } = await apiClient.POST('/auth/verify', {
  body: { idToken }
});

if (error) {
  throw new Error('Firebase authentication failed');
}

// authResponse is typed as AuthResponse
const user = authResponse.user;
const session = authResponse.session;
```

### Player Login
```typescript
const { data: player, error } = await apiClient.POST('/players/login', {
  body: { privacy_code: privacyCode }
});

if (error) {
  throw new Error('Invalid privacy code');
}

// player is typed as PlayerAuthResponse
console.log(player.display_name);
console.log(player.privacy_code);
```

### Logout
```typescript
// User logout
const { error } = await apiClient.POST('/auth/logout');

// Player logout
const { error } = await apiClient.POST('/players/logout');
```

---

## Product Management

### List Products
```typescript
const { data: products, error } = await apiClient.GET('/products', {
  params: {
    query: {
      category: 'games',
      include_access: true
    }
  }
});

if (error) {
  return [];
}

// products is typed as ProductWithAccess[]
products.forEach(product => {
  console.log(product.title);
  console.log(product.access.hasAccess);
  console.log(product.access.canDownload);
});
```

### Get Single Product
```typescript
const { data: product, error } = await apiClient.GET('/products/{id}', {
  params: {
    path: { id: productId }
  }
});

if (error) {
  return null;
}

// product is typed as ProductWithAccess
console.log(product.title);
console.log(product.price);
console.log(product.type_attributes);
```

### Create Product
```typescript
const { data: newProduct, error } = await apiClient.POST('/products', {
  body: {
    product_type: 'file',
    title: 'Math Worksheet',
    description: 'Practice problems',
    price: 9.90,
    type_attributes: {
      file_type: 'pdf',
      file_s3_keys: ['key1', 'key2']
    }
  }
});

if (error) {
  throw new Error('Failed to create product');
}

return newProduct;
```

---

## Common Types

### User Types
```typescript
type User = components['schemas']['User'];
type UserProfile = components['schemas']['UserProfile'];
type Player = components['schemas']['PlayerAuthResponse'];
```

### Product Types
```typescript
type Product = components['schemas']['Product'];
type ProductWithAccess = components['schemas']['ProductWithAccess'];
type ProductType = 'file' | 'game' | 'lesson_plan' | 'workshop' | 'course' | 'tool' | 'bundle';
```

### Auth Types
```typescript
type AuthResponse = components['schemas']['AuthResponse'];
type FirebaseLoginRequest = components['schemas']['FirebaseLoginRequest'];
type RegisterRequest = components['schemas']['RegisterRequest'];
```

### Access Control Types
```typescript
type AccessInfo = components['schemas']['AccessInfo'];
type AccessType = 'creator' | 'purchase' | 'subscription_claim' | 'student_via_teacher' | 'none';
```

---

## IDE Tips

### Autocomplete
1. Type `apiClient.` → See all HTTP methods (GET, POST, PUT, DELETE)
2. Type `apiClient.GET('/` → See all available endpoints
3. Type `params: {` → See required/optional parameters
4. Hover over `data` → See exact response type

### Type Checking
```typescript
// TypeScript will error if you:
// - Use wrong HTTP method for endpoint
// - Miss required parameters
// - Access non-existent fields
// - Pass wrong body structure

// Example: TypeScript catches this error
const { data } = await apiClient.GET('/products/{id}');
console.log(data.nonExistentField); // ❌ TypeScript error!
```

---

## Debugging

### Check Generated Types
```bash
# View available types
cat src/types/api.ts | grep "interface\|type" | head -20

# Search for specific type
grep -A 20 "UserProfile" src/types/api.ts
```

### Regenerate Types After Backend Changes
```bash
npm run generate-types
```

### View OpenAPI Spec
```bash
# Development
open http://localhost:3000/api-docs

# Production
open https://ludora.app/api-docs
```

---

## Migration Checklist

When migrating a component:

- [ ] Import `apiClient` and types
- [ ] Replace manual `fetch()` calls with `apiClient.GET/POST/etc`
- [ ] Add type annotations to function signatures
- [ ] Update error handling to use typed errors
- [ ] Test in both teacher and student portals
- [ ] Remove old API client imports

---

## Need Help?

- 📖 [Full Migration Guide](./OPENAPI_CLIENT_MIGRATION.md)
- 📝 [Team Migration Plan](./TEAM_MIGRATION_PLAN.md)
- 🔍 [API Types Reference](../src/types/api.ts)
- 🌐 [OpenAPI Spec](/api-docs)

---

**Happy coding with type safety! 🎉**
