# User Data Architecture - Clean Implementation

## Overview
All user data is now stored and managed in the **database `user` table** as the single source of truth. No more confusion with customClaims, Firebase auth roles, or mixed data sources.

## Database Schema (`user` table)
```sql
- id (primary key)
- email
- full_name
- role (user|teacher|staff|admin)
- is_verified (boolean)
- is_active (boolean)
- created_at, updated_at, last_login
- Other app-specific fields...
```

## Role Hierarchy
```
user (0) < teacher (1) < staff (2) < admin (3)
```

## Data Flow

### 1. Authentication (Firebase/JWT)
- Firebase/JWT is only used to **verify the user is legitimate**
- Firebase provides: `uid`, `email`, `email_verified`
- Firebase does NOT provide roles or app-specific data

### 2. User Data Retrieval
- After auth verification, system looks up user in database by `email` or `uid`
- Database user record is the authoritative source for:
  - Role (admin/staff/teacher/user)
  - Full name, verification status
  - All application-specific data

### 3. API Response (`/auth/me`)
```json
{
  "id": "user123",
  "email": "user@example.com", 
  "full_name": "User Name",
  "role": "admin",
  "is_verified": true,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Frontend Usage

### UserContext
- Stores clean user object from database
- No more normalization or customClaims checking
- Direct access to `user.role`, `user.full_name`, etc.

### Role Checking (use utilities)
```javascript
import { isAdmin, isStaff, canAccess } from '@/lib/userUtils';

// Clean role checks
if (isAdmin(user)) { ... }
if (isStaff(user)) { ... }  // includes admin
if (canAccess(user, 'teacher')) { ... }
```

### Components
- `<AdminRoute>` - Uses `isStaff(user)` utility
- `<Layout>` - Uses `isStaff(user)` for admin menu
- All components get clean user data, no confusion

## Key Benefits

1. **Single Source of Truth**: All user data in database
2. **No More customClaims**: Eliminated confusing Firebase custom claims
3. **Clean Role Logic**: Simple, hierarchical role system
4. **Easy Maintenance**: Role changes only need database update
5. **Consistent API**: All endpoints return same user data format
6. **Type Safe**: Predictable user object structure

## Migration Notes

### Added Fields
- Clean role validation in User model
- Role hierarchy utility functions
- User helper methods (`isAdmin()`, `canAccess()`)

## Usage Examples

### Check if user can access admin features
```javascript
// OLD (confusing)
const isAdmin = user.role === 'admin' || user.customClaims?.role === 'admin';

// NEW (clean)
import { isAdmin } from '@/lib/userUtils';
const canAccessAdmin = isAdmin(user);
```

### Display user name
```javascript
// OLD
const name = user.displayName || user.full_name || user.email;

// NEW  
import { getUserDisplayName } from '@/lib/userUtils';
const name = getUserDisplayName(user);
```

## Important Rules

1. **Never use Firebase for app roles** - Firebase auth is just for identity verification
2. **Always use database user data** - Role, name, settings come from DB
3. **Use utility functions** - Don't inline role checks, use the helper functions
4. **Role changes in DB only** - Update user.role in database, nowhere else