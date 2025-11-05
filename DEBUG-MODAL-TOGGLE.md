# 🐛 DEBUG: Modal Comparison Toggle

## Overview
A temporary debug feature to compare the old ProductModal with the new ProductModalV2 for field parity validation.

## Features
- **Development Only**: Only shows in `NODE_ENV === 'development'`
- **Visual Toggle**: Red-highlighted switch in the UI
- **Easy Removal**: All debug code is clearly marked with comments

## How to Use

### 1. Pages with Debug Toggle
- **Products.jsx** (`/products`) - Toggle between old and new modals

### 2. Using the Toggle
1. Navigate to `/products` or `/games` in development mode
2. Look for the red debug toggle in the header: `🐛 DEBUG: Modal ישן/חדש`
3. Toggle to switch between old and new modal versions
4. Create/edit products to compare field behavior
5. Take screenshots for comparison

### 3. Default Settings
- **Products.jsx**: Defaults to NEW modal (ProductModalV2)

## Files Modified

### Products.jsx
```javascript
// DEBUG: Import original modal for comparison
import ProductModal from '@/components/modals/ProductModal';

// DEBUG: State for modal comparison - REMOVE IN PRODUCTION
const [useOldModal, setUseOldModal] = useState(false);

// DEBUG: Modal comparison toggle - REMOVE IN PRODUCTION
{process.env.NODE_ENV === 'development' && (
  <div className="bg-red-50/70 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 border border-red-200">
    // ... toggle UI
  </div>
)}

// DEBUG: Conditional modal rendering - REMOVE IN PRODUCTION
{useOldModal ? <ProductModal .../> : <ProductModalV2 .../>}
```

## How to Remove (When Debugging Complete)

### 1. Search and Remove
Search for these patterns and remove all related code:
- `// DEBUG:`
- `useOldModal`
- `setUseOldModal`
- `process.env.NODE_ENV === 'development'` (in modal context)

### 2. Specific Removals

**Products.jsx:**
1. Remove import: `import ProductModal from '@/components/modals/ProductModal';`
2. Remove state: `const [useOldModal, setUseOldModal] = useState(false);`
3. Remove debug toggle UI (lines with red background)
4. Replace conditional modal with: `<ProductModalV2 .../>`

### 3. Files to Delete
After removal, delete this file:
- `DEBUG-MODAL-TOGGLE.md`

## Validation Checklist
Use this to validate field parity:
- [ ] Field names match (title vs name, category vs category_id)
- [ ] All product types render correctly (file, workshop, course, tool, game)
- [ ] Grade/subject fields work for files and games
- [ ] Workshop-specific fields (meeting details, video upload)
- [ ] Course modules functionality
- [ ] File-specific toggles (preview, copyright footer, ludora creator)
- [ ] Validation errors display correctly
- [ ] Form submission works for both modals

## Notes
- The debug toggle only affects which modal is shown
- Both modals use the same backend API endpoints
- Data validation should be identical between modals
- Screenshots should be taken with same test data for comparison

---
**⚠️ REMEMBER TO REMOVE THIS FEATURE BEFORE PRODUCTION DEPLOYMENT**