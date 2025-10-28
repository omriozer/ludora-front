import React from 'react';
import { ProductModalContainer } from './ProductModalContainer';
import { SingleModalLayout } from './layouts/SingleModalLayout';
import { WizardLayout } from './layouts/WizardLayout';

/**
 * ProductModalV2 - New refactored product modal
 *
 * This is the main entry point for the new product modal system.
 * It's designed as a drop-in replacement for the original ProductModal.
 *
 * Key improvements:
 * - Modular component architecture
 * - Separated business logic from UI
 * - UI-agnostic design (can switch between layout patterns)
 * - Better maintainability and testability
 * - Cleaner separation of concerns
 *
 * Usage:
 * <ProductModalV2
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   editingProduct={product} // optional, for editing existing products
 *   currentUser={user}
 *   isContentCreatorMode={false}
 *   onSave={(formData, continueEditing) => handleSave(formData, continueEditing)}
 *   layout="single" // "single" | "wizard" | custom component
 * />
 */
export const ProductModalV2 = ({
  isOpen = false,
  onClose = () => {},
  editingProduct = null,
  currentUser = null,
  isContentCreatorMode = false,
  onSave = () => {},
  layout = 'wizard' // New prop for layout selection - using wizard by default
}) => {

  // Don't render anything if modal is not open
  if (!isOpen) {
    return null;
  }

  // Select layout component based on layout prop
  const getLayoutComponent = () => {
    if (typeof layout === 'string') {
      switch (layout) {
        case 'wizard':
          return WizardLayout;
        case 'single':
        default:
          return SingleModalLayout;
      }
    }

    // If layout is a custom component, use it directly
    return layout;
  };

  const LayoutComponent = getLayoutComponent();

  return (
    <ProductModalContainer
      editingProduct={editingProduct}
      currentUser={currentUser}
      isContentCreatorMode={isContentCreatorMode}
      onClose={onClose}
      onSave={onSave}
      LayoutComponent={LayoutComponent}
    />
  );
};

export default ProductModalV2;