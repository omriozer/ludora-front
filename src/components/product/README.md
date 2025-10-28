# Product Modal V2 - Refactored Architecture

This directory contains the new refactored ProductModal system designed with UI-agnostic architecture, making it easy to switch between different UI patterns (single modal, tabs, wizard, accordion, etc.) without refactoring business logic.

## 🎯 Key Benefits

- **Maintainable**: Small, focused components instead of one 2800+ line file
- **UI Flexible**: Easy to switch between different UI patterns
- **Testable**: Separated business logic from presentation
- **Scalable**: Easy to add new product types or modify existing flows
- **Developer Friendly**: Clear separation of concerns

## 📁 Architecture Overview

```
/src/components/product/
├── ProductModalV2.jsx          # Main entry point (drop-in replacement)
├── ProductModalContainer.jsx   # Business logic orchestrator
├── hooks/                      # Custom hooks for business logic
│   ├── useProductForm.js       # Form state management
│   ├── useProductUploads.js    # File upload handling
│   └── useProductAccess.js     # Access control & validation
├── sections/                   # UI-agnostic content components
│   ├── BasicInfoSection.jsx    # Product name, description, pricing
│   ├── MediaAssetsSection.jsx  # Images and videos
│   ├── ProductSpecificSection.jsx # Product type-specific fields
│   ├── AccessSettingsSection.jsx  # Access and pricing settings
│   ├── PublishSection.jsx      # Publishing controls
│   └── product-specific/       # Sub-components for each product type
├── layouts/                    # Interchangeable UI patterns
│   ├── SingleModalLayout.jsx   # Current modal style (default)
│   ├── WizardLayout.jsx        # Step-by-step wizard ✅
│   ├── TabbedLayout.jsx        # Tabs UI (can be added)
│   └── AccordionLayout.jsx     # Collapsible sections (can be added)
├── shared/                     # Reusable components
│   └── ProductTypeSelector.jsx # Product type selection
└── utils/                      # Configuration and helpers
```

## 🔄 How to Use

### Basic Usage (Drop-in Replacement)

```jsx
import ProductModalV2 from '@/components/product/ProductModalV2';

// Replace this:
// import ProductModal from '@/components/modals/ProductModal';

// With this:
<ProductModalV2
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  editingProduct={selectedProduct} // optional
  currentUser={currentUser}
  isContentCreatorMode={false}
  onSave={handleProductSave}
/>
```

### Switching UI Patterns

The beauty of this architecture is that you can easily switch UI patterns with a simple prop change:

#### Using the Convenient API
```jsx
// Single Modal (default)
<ProductModalV2 layout="single" {...props} />

// Wizard Steps
<ProductModalV2 layout="wizard" {...props} />

// Custom Layout Component
<ProductModalV2 layout={MyCustomLayout} {...props} />
```

#### Using the Container Directly
```jsx
import { ProductModalContainer } from '@/components/product/ProductModalContainer';
import { SingleModalLayout } from '@/components/product/layouts/SingleModalLayout';
import { WizardLayout } from '@/components/product/layouts/WizardLayout';

// Single Modal
<ProductModalContainer LayoutComponent={SingleModalLayout} {...props} />

// Wizard Layout
<ProductModalContainer LayoutComponent={WizardLayout} {...props} />
```

#### Try It Yourself!
Import and use the demo component to see layout switching in action:
```jsx
import ProductModalDemo from '@/components/product/ProductModalDemo';

<ProductModalDemo currentUser={currentUser} />
```

## 🧩 Component Separation

### Business Logic (Hooks)
- **useProductForm**: Form state, validation, data management
- **useProductUploads**: File uploads, progress tracking, error handling
- **useProductAccess**: Access control, section availability, validation rules

### Content Components (Sections)
- **BasicInfoSection**: Name, description, category, tags, pricing
- **MediaAssetsSection**: Product images, marketing videos (YouTube/upload)
- **ProductSpecificSection**: Dynamic fields based on product type
- **AccessSettingsSection**: Access days, lifetime access, purchase stats
- **PublishSection**: Publishing controls and status

### Layout Components
- **SingleModalLayout**: Single scrollable modal (current style)
- **WizardLayout**: Step-by-step wizard with progress tracking ✅
- **TabbedLayout**: Tab-based navigation (can be added)
- **AccordionLayout**: Collapsible sections (can be added)

#### 🧙‍♂️ Wizard Layout Features
- **Progress Tracking**: Visual progress bar and step indicators
- **Step Validation**: Prevents advancement without completing required fields
- **Smart Navigation**: Click to jump between completed steps
- **Access Control**: Respects section availability rules
- **Step Status**: Visual indicators for completed, current, and upcoming steps
- **Guided Flow**: Prevents incomplete submissions with clear error messages

## 🔧 Adding New UI Patterns

To add a new UI pattern (e.g., tabs), create a new layout component:

```jsx
// /layouts/TabbedLayout.jsx
export const TabbedLayout = ({ sections, ...props }) => {
  return (
    <Dialog>
      <Tabs>
        {sections.map(section => (
          <TabsContent key={section.id}>
            <section.component {...section.props} />
          </TabsContent>
        ))}
      </Tabs>
    </Dialog>
  );
};
```

Then use it:
```jsx
<ProductModalContainer LayoutComponent={TabbedLayout} />
```

## 📋 Section Access Control

The system includes sophisticated access control:

```jsx
const sectionAccess = {
  basicInfo: { available: true, required: true },
  mediaAssets: {
    available: !isNewProduct,
    reason: 'יש לשמור את המוצר תחילה'
  },
  productSpecific: {
    available: !!formData.product_type,
    reason: 'יש לבחור סוג מוצר תחילה'
  },
  // ...
};
```

## 🎨 Styling and Theming

All components use the existing UI component library:
- Consistent with current design system
- RTL support maintained
- Hebrew language support
- Responsive design

## 🧪 Testing Strategy

The modular architecture enables focused testing:

```jsx
// Test individual hooks
import { useProductForm } from '@/components/product/hooks/useProductForm';

// Test individual sections
import { BasicInfoSection } from '@/components/product/sections/BasicInfoSection';

// Test layout components
import { SingleModalLayout } from '@/components/product/layouts/SingleModalLayout';
```

## 🔄 Migration Strategy

1. **Phase 1**: Create V2 alongside existing modal
2. **Phase 2**: Test V2 in development environment
3. **Phase 3**: Gradually replace imports in parent components
4. **Phase 4**: Remove original ProductModal after thorough testing

## 🚀 Future Enhancements

The architecture makes it easy to add:
- **New Product Types**: Add to `product-specific/` directory
- **New UI Patterns**: Add to `layouts/` directory
- **New Validation Rules**: Extend `useProductAccess` hook
- **New Upload Types**: Extend `useProductUploads` hook
- **A/B Testing**: Switch layouts based on user groups

## 🎯 Layout Comparison

| Feature | Single Modal | Wizard Layout |
|---------|--------------|---------------|
| **UI Style** | All sections in one view | Step-by-step progression |
| **Best For** | Quick edits, familiar users | Complex products, new users |
| **Navigation** | Scroll to sections | Previous/Next buttons |
| **Progress** | No visual progress | Progress bar + step indicators |
| **Validation** | Form-level validation | Step-by-step validation |
| **User Guidance** | Minimal | High (guided flow) |
| **Error Prevention** | Basic | Advanced (step blocking) |
| **Mobile UX** | Scroll heavy | Step-focused |

## 🔍 Key Differences from Original

| Aspect | Original | V2 Refactored |
|--------|----------|---------------|
| File Size | 2800+ lines | ~300 lines per component |
| Maintainability | Hard to maintain | Easy to maintain |
| UI Flexibility | Fixed modal layout | Multiple layout options |
| Testing | Difficult | Easy (focused components) |
| Adding Features | Complex | Simple |
| Code Reuse | Limited | High |
| Layout Options | 1 (single modal) | 2+ (single, wizard, custom) |

## 🚀 Quick Start Examples

### Switch to Wizard Layout
```jsx
// Simply change the layout prop
<ProductModalV2 layout="wizard" {...existingProps} />
```

### A/B Test Different Layouts
```jsx
const layout = user.isNewUser ? 'wizard' : 'single';
<ProductModalV2 layout={layout} {...props} />
```

### Demo Component for Testing
```jsx
import ProductModalDemo from '@/components/product/ProductModalDemo';
// Includes live switching between layouts!
```

This architecture provides the flexibility you requested - you can easily experiment with different UI patterns (tabs, wizard, accordion) without having to refactor the entire business logic each time!